"""Repos de barberos y servicios (SQL crudo sobre asyncpg)."""

import asyncio
from typing import Any

import asyncpg

BARBER_COLS = "id, slug, name, role, photo_url, bio, instagram, active, sort_order"
SERVICE_COLS = (
    "id, slug, name, description, price, duration_min, badge, variable_price, active, sort_order"
)


async def list_barbers(
    pool: asyncpg.Pool, service_slug: str | None = None, only_active: bool = True
) -> list[dict[str, Any]]:
    if service_slug:
        rows = await pool.fetch(
            f"""
            SELECT {BARBER_COLS} FROM barbers b
            WHERE (NOT $2 OR b.active)
              AND EXISTS (
                SELECT 1 FROM barber_services bs
                JOIN services s ON s.id = bs.service_id
                WHERE bs.barber_id = b.id AND s.slug = $1
              )
            ORDER BY sort_order
            """,
            service_slug,
            only_active,
        )
    else:
        rows = await pool.fetch(
            f"SELECT {BARBER_COLS} FROM barbers WHERE (NOT $1 OR active) ORDER BY sort_order",
            only_active,
        )
    return [dict(r) for r in rows]


async def get_barber_by_slug(pool: asyncpg.Pool, slug: str) -> dict[str, Any] | None:
    row = await pool.fetchrow(f"SELECT {BARBER_COLS} FROM barbers WHERE slug = $1", slug)
    return dict(row) if row else None


async def list_services(
    pool: asyncpg.Pool, barber_slug: str | None = None, only_active: bool = True
) -> list[dict[str, Any]]:
    if barber_slug:
        rows = await pool.fetch(
            f"""
            SELECT {SERVICE_COLS} FROM services s
            WHERE (NOT $2 OR s.active)
              AND EXISTS (
                SELECT 1 FROM barber_services bs
                JOIN barbers b ON b.id = bs.barber_id
                WHERE bs.service_id = s.id AND b.slug = $1
              )
            ORDER BY sort_order
            """,
            barber_slug,
            only_active,
        )
    else:
        rows = await pool.fetch(
            f"SELECT {SERVICE_COLS} FROM services WHERE (NOT $1 OR active) ORDER BY sort_order",
            only_active,
        )
    return [dict(r) for r in rows]


async def get_service_by_slug(pool: asyncpg.Pool, slug: str) -> dict[str, Any] | None:
    row = await pool.fetchrow(f"SELECT {SERVICE_COLS} FROM services WHERE slug = $1", slug)
    return dict(row) if row else None


async def barber_offers_service(pool: asyncpg.Pool, barber_id, service_id) -> bool:
    return bool(
        await pool.fetchval(
            "SELECT 1 FROM barber_services WHERE barber_id = $1 AND service_id = $2",
            barber_id,
            service_id,
        )
    )


async def booking_bootstrap(pool: asyncpg.Pool) -> dict[str, Any]:
    """Catálogo completo del wizard en un solo request HTTP.

    Las tres lecturas son independientes y usan conexiones del pool en paralelo.
    """
    barbers, services, pairs = await asyncio.gather(
        list_barbers(pool),
        list_services(pool),
        pool.fetch(
            """
            SELECT b.slug AS barber_slug, s.slug AS service_slug
            FROM barber_services bs
            JOIN barbers b ON b.id = bs.barber_id AND b.active
            JOIN services s ON s.id = bs.service_id AND s.active
            ORDER BY b.sort_order, s.sort_order
            """
        ),
    )
    public_barbers = [
        {key: barber[key] for key in ("slug", "name", "role", "photo_url", "bio", "instagram")}
        for barber in barbers
    ]
    public_services = {
        service["slug"]: {
            key: service[key]
            for key in (
                "slug",
                "name",
                "description",
                "price",
                "duration_min",
                "badge",
                "variable_price",
            )
        }
        for service in services
    }
    by_barber: dict[str, list[dict[str, Any]]] = {barber["slug"]: [] for barber in barbers}
    for pair in pairs:
        service = public_services.get(pair["service_slug"])
        if service is not None:
            by_barber[pair["barber_slug"]].append(service)
    return {"barbers": public_barbers, "services_by_barber": by_barber}


async def get_booking_selection(
    pool: asyncpg.Pool, barber_slug: str, service_slug: str
) -> tuple[dict[str, Any], dict[str, Any]] | None:
    """Valida y obtiene profesional + servicio + relación en una sola consulta."""
    row = await pool.fetchrow(
        """
        SELECT b.id AS barber_id, b.slug AS barber_slug, b.name AS barber_name,
               b.role AS barber_role, b.photo_url AS barber_photo_url,
               s.id AS service_id, s.slug AS service_slug, s.name AS service_name,
               s.description AS service_description, s.price AS service_price,
               s.duration_min, s.badge, s.variable_price
        FROM barbers b
        JOIN barber_services bs ON bs.barber_id = b.id
        JOIN services s ON s.id = bs.service_id
        WHERE b.slug = $1 AND s.slug = $2 AND b.active AND s.active
        """,
        barber_slug,
        service_slug,
    )
    if row is None:
        return None
    barber = {
        "id": row["barber_id"],
        "slug": row["barber_slug"],
        "name": row["barber_name"],
        "role": row["barber_role"],
        "photo_url": row["barber_photo_url"],
        "active": True,
    }
    service = {
        "id": row["service_id"],
        "slug": row["service_slug"],
        "name": row["service_name"],
        "description": row["service_description"],
        "price": row["service_price"],
        "duration_min": row["duration_min"],
        "badge": row["badge"],
        "variable_price": row["variable_price"],
        "active": True,
    }
    return barber, service
