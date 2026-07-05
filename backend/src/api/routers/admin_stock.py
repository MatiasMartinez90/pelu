"""Admin: productos y stock con movimientos auditados."""

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...db.pool import get_pool
from ..deps import AdminUser

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/products")
async def list_products(admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT id, name, sku, qty, min_qty, price, active FROM products ORDER BY name"
    )
    return [dict(r) for r in rows]


class ProductIn(BaseModel):
    name: str
    sku: str
    price: int
    qty: int = 0
    min_qty: int = 0


@router.post("/products", status_code=201)
async def create_product(body: ProductIn, admin: dict = AdminUser):
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO products (name, sku, price, qty, min_qty)
        VALUES ($1, $2, $3, $4, $5) RETURNING id, name, sku, qty, min_qty, price, active
        """,
        body.name,
        body.sku,
        body.price,
        body.qty,
        body.min_qty,
    )
    return dict(row)


class AdjustIn(BaseModel):
    delta: int
    reason: str = ""


@router.post("/products/{product_id}/adjust")
async def adjust_stock(product_id: UUID, body: AdjustIn, admin: dict = AdminUser):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                UPDATE products SET qty = qty + $2
                WHERE id = $1 AND qty + $2 >= 0
                RETURNING id, name, sku, qty, min_qty, price
                """,
                product_id,
                body.delta,
            )
            if row is None:
                raise HTTPException(422, "producto inexistente o stock insuficiente")
            await conn.execute(
                """
                INSERT INTO stock_movements (product_id, delta, reason, created_by)
                VALUES ($1, $2, $3, $4)
                """,
                product_id,
                body.delta,
                body.reason,
                admin["email"],
            )
    return dict(row)
