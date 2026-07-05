"""Repos de barberos y servicios (SQL crudo sobre asyncpg)."""

from typing import Any

import asyncpg

BARBER_COLS = "id, slug, name, role, photo_url, active, sort_order"
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
