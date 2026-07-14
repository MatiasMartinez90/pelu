"""Creación, reprogramación y cancelación de turnos.

Lógica compartida por la API REST y las tools del agente. El anti doble-booking
NO vive acá: lo garantiza el exclusion constraint `no_overlap` de la DB; acá
solo se traduce la violación a SlotTakenError.
"""

from datetime import date, datetime, timezone
from typing import Any

import asyncpg

from ..db.repositories import catalog, settings_repo
from . import availability_service


class BookingError(Exception):
    """Error de negocio con mensaje apto para el usuario final."""


class SlotTakenError(BookingError):
    def __init__(self) -> None:
        super().__init__("Ese horario se acaba de ocupar. Elegí otro, por favor.")


class SlotUnavailableError(BookingError):
    def __init__(self) -> None:
        super().__init__("Ese horario no está disponible para ese profesional y servicio.")


async def upsert_customer(
    pool: asyncpg.Pool,
    phone: str,
    name: str | None = None,
    email: str | None = None,
    channel: str = "web",
) -> dict[str, Any]:
    row = await pool.fetchrow(
        """
        INSERT INTO customers (phone, name, email, first_channel)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (phone) DO UPDATE SET
            name = COALESCE(customers.name, EXCLUDED.name)
        RETURNING id, phone, name, email, first_channel
        """,
        phone,
        name,
        email,
        channel,
    )
    return dict(row)


async def create_booking(
    pool: asyncpg.Pool,
    *,
    barber_slug: str,
    service_slug: str,
    day: date,
    hhmm: str,
    phone: str,
    customer_name: str | None,
    email: str | None = None,
    channel: str = "web",
    skip_slot_validation: bool = False,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    if idempotency_key:
        existing = await _get_booking_by_idempotency_key(pool, idempotency_key)
        if existing:
            return existing
    barber = await catalog.get_barber_by_slug(pool, barber_slug)
    service = await catalog.get_service_by_slug(pool, service_slug)
    if barber is None or not barber["active"]:
        raise BookingError("Ese profesional no existe o no está disponible.")
    if service is None or not service["active"]:
        raise BookingError("Ese servicio no existe o no está disponible.")
    if not await catalog.barber_offers_service(pool, barber["id"], service["id"]):
        raise BookingError(f"{barber['name']} no ofrece ese servicio.")

    app = await settings_repo.get_all(pool)
    if not app["agenda_open"]:
        raise BookingError("La agenda está cerrada por el momento.")
    if not app["booking_channels"].get(channel, True):
        raise BookingError("Las reservas por este canal están pausadas.")

    if not skip_slot_validation:
        slots = await availability_service.get_slots(pool, barber, service, day)
        if hhmm not in slots:
            raise SlotUnavailableError()

    starts_at, ends_at = availability_service.slot_to_range(day, hhmm, service["duration_min"])
    # Un email recibido por un canal anónimo no prueba que quien reserva sea
    # dueño del teléfono. En conflictos, upsert_customer preserva siempre la
    # identidad existente; el vínculo se cambia sólo mediante el flujo
    # autenticado + prueba de posesión por WhatsApp.
    customer = await upsert_customer(pool, phone, customer_name, email, channel)

    try:
        row = await pool.fetchrow(
            """
            INSERT INTO appointments
                (customer_id, barber_id, service_id, starts_at, ends_at,
                price_at_booking, channel, idempotency_key)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, starts_at, ends_at, status, price_at_booking, channel
            """,
            customer["id"],
            barber["id"],
            service["id"],
            starts_at,
            ends_at,
            service["price"],
            channel,
            idempotency_key,
        )
    except asyncpg.ExclusionViolationError:
        raise SlotTakenError() from None
    except asyncpg.UniqueViolationError:
        if idempotency_key:
            existing = await _get_booking_by_idempotency_key(pool, idempotency_key)
            if existing:
                return existing
        raise

    return {
        **dict(row),
        "barber": barber["name"],
        "barber_slug": barber_slug,
        "service": service["name"],
        "service_slug": service_slug,
        "customer_name": customer["name"],
        "phone": customer["phone"],
    }


async def cancel_booking(
    pool: asyncpg.Pool,
    appointment_id,
    *,
    reason: str = "",
    phone: str | None = None,
    command_key: str | None = None,
) -> dict[str, Any]:
    """Cancela un turno activo futuro. Si se pasa phone, valida pertenencia."""
    row = await pool.fetchrow(
        """
        UPDATE appointments a SET status = 'cancelled', cancelled_at = now(),
               cancel_reason = $2, updated_at = now(), last_command_key = $4
        FROM customers c
        WHERE a.id = $1 AND a.customer_id = c.id AND a.status = 'active'
          AND a.starts_at > now()
          AND ($3::text IS NULL OR c.phone = $3)
        RETURNING a.id, a.starts_at
        """,
        appointment_id,
        reason,
        phone,
        command_key,
    )
    if row is None:
        if command_key:
            previous = await pool.fetchrow(
                """
                SELECT a.id, a.starts_at FROM appointments a
                JOIN customers c ON c.id = a.customer_id
                WHERE a.id = $1 AND a.last_command_key = $2
                  AND ($3::text IS NULL OR c.phone = $3)
                """,
                appointment_id,
                command_key,
                phone,
            )
            if previous:
                return dict(previous)
        raise BookingError("No encontré un turno activo futuro con esos datos.")
    return dict(row)


async def reschedule_booking(
    pool: asyncpg.Pool,
    appointment_id,
    *,
    day: date,
    hhmm: str,
    phone: str | None = None,
    channel: str = "web",
    command_key: str | None = None,
) -> dict[str, Any]:
    """Atomically cancel the old appointment and insert the replacement."""
    if command_key:
        existing = await _get_booking_by_idempotency_key(pool, command_key)
        if existing:
            return existing

    old = await pool.fetchrow(
        """
        SELECT a.id, a.customer_id, a.starts_at, a.price_at_booking,
               c.phone, c.name AS customer_name,
               b.id AS barber_id, b.slug AS barber_slug, b.name AS barber,
               s.id AS service_id, s.slug AS service_slug, s.name AS service,
               s.duration_min
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        JOIN barbers b ON b.id = a.barber_id
        JOIN services s ON s.id = a.service_id
        WHERE a.id = $1 AND a.status = 'active' AND a.starts_at > now()
          AND ($2::text IS NULL OR c.phone = $2)
        """,
        appointment_id,
        phone,
    )
    if old is None:
        raise BookingError("No encontré un turno activo futuro con esos datos.")

    starts_at, ends_at = availability_service.slot_to_range(day, hhmm, old["duration_min"])
    if starts_at != old["starts_at"]:
        barber = await catalog.get_barber_by_slug(pool, old["barber_slug"])
        service = await catalog.get_service_by_slug(pool, old["service_slug"])
        slots = await availability_service.get_slots(pool, barber, service, day)
        if hhmm not in slots:
            raise SlotUnavailableError()

    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                locked = await conn.fetchrow(
                    """
                    SELECT id FROM appointments
                    WHERE id = $1 AND status = 'active' AND starts_at > now()
                    FOR UPDATE
                    """,
                    appointment_id,
                )
                if locked is None:
                    raise BookingError("El turno ya no está activo.")
                await conn.execute(
                    """
                    UPDATE appointments SET status = 'cancelled', cancelled_at = now(),
                           cancel_reason = 'reprogramado', updated_at = now(),
                           last_command_key = $2
                    WHERE id = $1
                    """,
                    appointment_id,
                    command_key,
                )
                row = await conn.fetchrow(
                    """
                    INSERT INTO appointments
                        (customer_id, barber_id, service_id, starts_at, ends_at,
                         price_at_booking, channel, idempotency_key)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id, starts_at, ends_at, status, price_at_booking, channel
                    """,
                    old["customer_id"],
                    old["barber_id"],
                    old["service_id"],
                    starts_at,
                    ends_at,
                    old["price_at_booking"],
                    channel,
                    command_key,
                )
        except asyncpg.ExclusionViolationError:
            raise SlotTakenError() from None
        except asyncpg.UniqueViolationError:
            if command_key:
                existing = await _get_booking_by_idempotency_key(pool, command_key)
                if existing:
                    return existing
            raise

    return {
        **dict(row),
        "barber": old["barber"],
        "barber_slug": old["barber_slug"],
        "service": old["service"],
        "service_slug": old["service_slug"],
        "customer_name": old["customer_name"],
        "phone": old["phone"],
    }


async def _get_booking_by_idempotency_key(
    pool: asyncpg.Pool, idempotency_key: str
) -> dict[str, Any] | None:
    row = await pool.fetchrow(
        """
        SELECT a.id, a.starts_at, a.ends_at, a.status, a.price_at_booking, a.channel,
               b.name AS barber, b.slug AS barber_slug,
               s.name AS service, s.slug AS service_slug,
               c.name AS customer_name, c.phone
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        JOIN barbers b ON b.id = a.barber_id
        JOIN services s ON s.id = a.service_id
        WHERE a.idempotency_key = $1
        """,
        idempotency_key,
    )
    return dict(row) if row else None


async def get_bookings_by_phone(
    pool: asyncpg.Pool, phone: str, *, only_future: bool = True
) -> list[dict[str, Any]]:
    rows = await pool.fetch(
        """
        SELECT a.id, a.starts_at, a.ends_at, a.status, a.price_at_booking, a.channel,
               b.name AS barber, s.name AS service
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        JOIN barbers b ON b.id = a.barber_id
        JOIN services s ON s.id = a.service_id
        WHERE c.phone = $1
          AND (NOT $2 OR (a.status = 'active' AND a.starts_at > now()))
        ORDER BY a.starts_at DESC
        LIMIT 50
        """,
        phone,
        only_future,
    )
    return [dict(r) for r in rows]


async def get_bookings_by_email(
    pool: asyncpg.Pool, email: str, *, only_future: bool = True
) -> list[dict[str, Any]]:
    """Turnos de un cliente identificado por email (portal /mi-cuenta)."""
    rows = await pool.fetch(
        """
        SELECT a.id, a.starts_at, a.ends_at, a.status, a.price_at_booking, a.channel,
               b.name AS barber, s.name AS service
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        JOIN barbers b ON b.id = a.barber_id
        JOIN services s ON s.id = a.service_id
        WHERE lower(c.email) = lower($1)
          AND (NOT $2 OR (a.status = 'active' AND a.starts_at > now()))
        ORDER BY a.starts_at DESC
        LIMIT 50
        """,
        email,
        only_future,
    )
    return [dict(r) for r in rows]


async def get_bookings_summary_by_email(pool: asyncpg.Pool, email: str) -> dict[str, Any]:
    """upcoming + history de un cliente en una sola query (history ya incluye upcoming).

    Reemplaza dos llamadas a get_bookings_by_email (una con only_future=True
    y otra con False) que traían el mismo dataset dos veces.
    """
    rows = await pool.fetch(
        """
        SELECT a.id, a.starts_at, a.ends_at, a.status, a.price_at_booking, a.channel,
               b.name AS barber, s.name AS service
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        JOIN barbers b ON b.id = a.barber_id
        JOIN services s ON s.id = a.service_id
        WHERE lower(c.email) = lower($1)
        ORDER BY a.starts_at DESC
        LIMIT 50
        """,
        email,
    )
    history = [dict(r) for r in rows]
    now = utcnow()
    upcoming = [b for b in history if b["status"] == "active" and b["starts_at"] > now]
    return {"upcoming": upcoming, "history": history}


async def cancel_booking_by_email(
    pool: asyncpg.Pool, appointment_id, *, email: str, reason: str = "cliente"
) -> dict[str, Any]:
    """Cancela un turno activo futuro validando que sea del cliente (por email)."""
    row = await pool.fetchrow(
        """
        UPDATE appointments a SET status = 'cancelled', cancelled_at = now(),
               cancel_reason = $2, updated_at = now()
        FROM customers c
        WHERE a.id = $1 AND a.customer_id = c.id AND a.status = 'active'
          AND a.starts_at > now() AND lower(c.email) = lower($3)
        RETURNING a.id, a.starts_at
        """,
        appointment_id,
        reason,
        email,
    )
    if row is None:
        raise BookingError("No encontré un turno activo futuro tuyo con esos datos.")
    return dict(row)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
