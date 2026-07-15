"""Admin: staff, precios, settings, horarios, bloqueos y usuarios admin."""

from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...db.pool import get_pool
from ...db.repositories import settings_repo
from ..deps import AdminUser

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# ── Staff ──────────────────────────────────────────────────────────────


@router.get("/barbers")
async def list_barbers_admin(admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT id, slug, name, role, photo_url, active, sort_order FROM barbers ORDER BY sort_order"
    )
    return [dict(r) for r in rows]


class BarberIn(BaseModel):
    slug: str
    name: str
    role: str = "BARBERO"
    photo_url: str | None = None


@router.post("/barbers", status_code=201)
async def create_barber(body: BarberIn, admin: dict = AdminUser):
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO barbers (slug, name, role, photo_url, sort_order)
        VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM barbers))
        RETURNING id, slug, name, role, active
        """,
        body.slug,
        body.name,
        body.role,
        body.photo_url,
    )
    return dict(row)


class BarberPatch(BaseModel):
    active: bool | None = None
    name: str | None = None
    photo_url: str | None = None
    email: str | None = None  # vincula al barbero con su login Keycloak (portal /barbero)


@router.patch("/barbers/{barber_id}")
async def patch_barber(barber_id: UUID, body: BarberPatch, admin: dict = AdminUser):
    pool = await get_pool()
    new_email = (body.email or "").strip().lower() or None
    async with pool.acquire() as conn:
        async with conn.transaction():
            old_email = await conn.fetchval("SELECT email FROM barbers WHERE id = $1", barber_id)
            if old_email is None and not await conn.fetchval(
                "SELECT 1 FROM barbers WHERE id = $1", barber_id
            ):
                raise HTTPException(404, "barbero no encontrado")
            row = await conn.fetchrow(
                """
                UPDATE barbers SET
                    active = COALESCE($2, active),
                    name = COALESCE($3, name),
                    photo_url = COALESCE($4, photo_url),
                    email = COALESCE($5, email)
                WHERE id = $1 RETURNING id, slug, name, role, active, email
                """,
                barber_id,
                body.active,
                body.name,
                body.photo_url,
                new_email,
            )
            # Rebind de login (barbers.email) es sensible: auditar quién y cuándo,
            # igual que service_price_history para cambios de precio.
            if new_email is not None and new_email != old_email:
                await conn.execute(
                    """
                    INSERT INTO barber_email_history (barber_id, old_email, new_email, changed_by)
                    VALUES ($1, $2, $3, $4)
                    """,
                    barber_id,
                    old_email,
                    new_email,
                    admin["email"],
                )
    return dict(row)


# ── Precios ────────────────────────────────────────────────────────────


class PricePatch(BaseModel):
    new_price: int


@router.patch("/services/{service_id}/price")
async def patch_price(service_id: UUID, body: PricePatch, admin: dict = AdminUser):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            current = await conn.fetchval("SELECT price FROM services WHERE id = $1", service_id)
            if current is None:
                raise HTTPException(404, "servicio no encontrado")
            # El dueño fija sus propios precios: se permite cualquier valor positivo
            # (antes había un cap ±10% por cambio que impedía ajustes legítimos).
            # Queda auditado en service_price_history.
            if body.new_price <= 0 or body.new_price > 100_000_000:
                raise HTTPException(422, "precio inválido")
            await conn.execute(
                "UPDATE services SET price = $2 WHERE id = $1", service_id, body.new_price
            )
            await conn.execute(
                """
                INSERT INTO service_price_history (service_id, old_price, new_price, changed_by)
                VALUES ($1, $2, $3, $4)
                """,
                service_id,
                current,
                body.new_price,
                admin["email"],
            )
    return {"id": service_id, "old_price": current, "new_price": body.new_price}


# ── Settings ───────────────────────────────────────────────────────────


@router.get("/settings")
async def get_settings_admin(admin: dict = AdminUser):
    pool = await get_pool()
    return await settings_repo.get_all(pool)


class SettingsPatch(BaseModel):
    values: dict[str, Any]


ALLOWED_SETTINGS = set(settings_repo.DEFAULTS.keys())


@router.patch("/settings")
async def patch_settings(body: SettingsPatch, admin: dict = AdminUser):
    pool = await get_pool()
    unknown = set(body.values) - ALLOWED_SETTINGS
    if unknown:
        raise HTTPException(422, f"settings desconocidos: {sorted(unknown)}")
    for k, v in body.values.items():
        await settings_repo.set_value(pool, k, v)
    return await settings_repo.get_all(pool)


# ── Horarios y bloqueos ────────────────────────────────────────────────


@router.get("/blocks")
async def list_blocks(admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT ab.id, ab.starts_at, ab.ends_at, ab.reason, ab.created_by, b.name AS barber
        FROM availability_blocks ab LEFT JOIN barbers b ON b.id = ab.barber_id
        WHERE ab.ends_at > now() ORDER BY ab.starts_at
        """
    )
    return [dict(r) for r in rows]


class BlockIn(BaseModel):
    barber: str | None = None  # slug; None = todo el local
    starts_at: datetime
    ends_at: datetime
    reason: str = ""


@router.post("/blocks", status_code=201)
async def create_block(body: BlockIn, admin: dict = AdminUser):
    pool = await get_pool()
    barber_id = None
    if body.barber:
        barber_id = await pool.fetchval("SELECT id FROM barbers WHERE slug = $1", body.barber)
        if barber_id is None:
            raise HTTPException(404, "barbero no encontrado")
    row = await pool.fetchrow(
        """
        INSERT INTO availability_blocks (barber_id, starts_at, ends_at, reason, created_by)
        VALUES ($1, $2, $3, $4, $5) RETURNING id, starts_at, ends_at, reason
        """,
        barber_id,
        body.starts_at,
        body.ends_at,
        body.reason,
        admin["email"],
    )
    return dict(row)


@router.delete("/blocks/{block_id}", status_code=204)
async def delete_block(block_id: UUID, admin: dict = AdminUser):
    pool = await get_pool()
    deleted = await pool.execute("DELETE FROM availability_blocks WHERE id = $1", block_id)
    if deleted == "DELETE 0":
        raise HTTPException(404, "bloqueo no encontrado")


# ── Admins ─────────────────────────────────────────────────────────────


@router.get("/admins")
async def list_admins(admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch("SELECT id, email, name, role, active FROM admin_users ORDER BY email")
    return [dict(r) for r in rows]


class AdminIn(BaseModel):
    email: str
    name: str = ""
    role: str = "admin"


@router.post("/admins", status_code=201)
async def create_admin(body: AdminIn, admin: dict = AdminUser):
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO admin_users (email, name, role) VALUES (lower($1), $2, $3)
        ON CONFLICT (email) DO UPDATE SET active = true, role = EXCLUDED.role
        RETURNING id, email, name, role, active
        """,
        body.email,
        body.name,
        body.role,
    )
    return dict(row)


@router.delete("/admins/{admin_id}", status_code=204)
async def delete_admin(admin_id: UUID, admin: dict = AdminUser):
    pool = await get_pool()
    row = await pool.fetchrow(
        "UPDATE admin_users SET active = false WHERE id = $1 AND role != 'owner' RETURNING id",
        admin_id,
    )
    if row is None:
        raise HTTPException(422, "no se puede desactivar (inexistente u owner)")
