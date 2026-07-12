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
) -> dict[str, Any]:
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
                 price_at_booking, channel)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, starts_at, ends_at, status, price_at_booking, channel
            """,
            customer["id"],
            barber["id"],
            service["id"],
            starts_at,
            ends_at,
            service["price"],
            channel,
        )
    except asyncpg.ExclusionViolationError:
        raise SlotTakenError() from None

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
) -> dict[str, Any]:
    """Cancela un turno activo futuro. Si se pasa phone, valida pertenencia."""
    row = await pool.fetchrow(
        """
        UPDATE appointments a SET status = 'cancelled', cancelled_at = now(),
               cancel_reason = $2, updated_at = now()
        FROM customers c
        WHERE a.id = $1 AND a.customer_id = c.id AND a.status = 'active'
          AND a.starts_at > now()
          AND ($3::text IS NULL OR c.phone = $3)
        RETURNING a.id, a.starts_at
        """,
        appointment_id,
        reason,
        phone,
    )
    if row is None:
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
) -> dict[str, Any]:
    """Reprograma: cancela el turno actual y crea uno nuevo en una transacción."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            old = await conn.fetchrow(
                """
                SELECT a.id, c.phone, c.name AS customer_name,
                       b.slug AS barber_slug, s.slug AS service_slug
                FROM appointments a
                JOIN customers c ON c.id = a.customer_id
                JOIN barbers b ON b.id = a.barber_id
                JOIN services s ON s.id = a.service_id
                WHERE a.id = $1 AND a.status = 'active' AND a.starts_at > now()
                  AND ($2::text IS NULL OR c.phone = $2)
                FOR UPDATE OF a
                """,
                appointment_id,
                phone,
            )
            if old is None:
                raise BookingError("No encontré un turno activo futuro con esos datos.")
            await conn.execute(
                """
                UPDATE appointments SET status = 'cancelled', cancelled_at = now(),
                       cancel_reason = 'reprogramado', updated_at = now()
                WHERE id = $1
                """,
                appointment_id,
            )
    # Fuera de la transacción: el turno viejo ya no bloquea el slot nuevo.
    return await create_booking(
        pool,
        barber_slug=old["barber_slug"],
        service_slug=old["service_slug"],
        day=day,
        hhmm=hhmm,
        phone=old["phone"],
        customer_name=old["customer_name"],
        channel=channel,
    )


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
