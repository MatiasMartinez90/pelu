"""Admin: catálogo, productos y stock con movimientos auditados."""

import json
import re
from uuid import UUID

import asyncpg
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...db.pool import get_pool
from ..deps import AdminUser
from ..shop_schemas import CategoryIn, ProductShopPatch

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/product-categories")
async def list_product_categories(admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT id, slug, name, description, sort_order, active
           FROM product_categories ORDER BY sort_order, name"""
    )
    return [dict(row) for row in rows]


@router.post("/product-categories", status_code=201)
async def create_product_category(body: CategoryIn, admin: dict = AdminUser):
    pool = await get_pool()
    try:
        row = await pool.fetchrow(
            """INSERT INTO product_categories (slug, name, description, sort_order)
               VALUES ($1, $2, $3, $4)
               RETURNING id, slug, name, description, sort_order, active""",
            body.slug, body.name.strip(), body.description.strip(), body.sort_order,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, "ya existe una categoría con ese slug") from None
    return dict(row)


@router.get("/products")
async def list_products(admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT p.id, p.name, p.sku, p.slug, p.qty, p.min_qty, p.price, p.active,
                  p.description, p.short_description, p.image_url, p.gallery,
                  p.featured, p.sort_order, c.slug AS category_slug
           FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
           ORDER BY p.name"""
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
    slug = re.sub(r"[^a-z0-9]+", "-", body.sku.lower()).strip("-")
    try:
        row = await pool.fetchrow(
            """
            INSERT INTO products (name, sku, slug, price, qty, min_qty, category_id)
            VALUES ($1, $2, $3, $4, $5, $6,
                    (SELECT id FROM product_categories WHERE slug = 'cuidado-personal'))
            RETURNING id, name, sku, slug, qty, min_qty, price, active
            """,
            body.name,
            body.sku,
            slug,
            body.price,
            body.qty,
            body.min_qty,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, "ya existe un producto con ese SKU o slug") from None
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


class ProductPatch(BaseModel):
    name: str | None = None
    price: int | None = None
    min_qty: int | None = None


@router.patch("/products/{product_id}")
async def patch_product(product_id: UUID, body: ProductPatch, admin: dict = AdminUser):
    """Edita datos del producto (precio, nombre, stock mínimo). El stock (qty) va por /adjust."""
    if body.price is not None and (body.price <= 0 or body.price > 100_000_000):
        raise HTTPException(422, "precio inválido")
    if body.min_qty is not None and body.min_qty < 0:
        raise HTTPException(422, "stock mínimo inválido")
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        UPDATE products SET
            name = COALESCE($2, name),
            price = COALESCE($3, price),
            min_qty = COALESCE($4, min_qty)
        WHERE id = $1
        RETURNING id, name, sku, slug, qty, min_qty, price, active
        """,
        product_id,
        body.name,
        body.price,
        body.min_qty,
    )
    if row is None:
        raise HTTPException(404, "producto no encontrado")
    return dict(row)


@router.patch("/products/{product_id}/shop")
async def patch_product_shop(product_id: UUID, body: ProductShopPatch, admin: dict = AdminUser):
    """Edita la ficha pública sin permitir cambios de stock fuera del ledger."""
    pool = await get_pool()
    current = await pool.fetchrow(
        """SELECT slug, description, short_description, category_id, image_url,
                  gallery, featured, sort_order, active
           FROM products WHERE id = $1""",
        product_id,
    )
    if current is None:
        raise HTTPException(404, "producto no encontrado")
    category_id = current["category_id"]
    if body.category_slug is not None:
        category_id = await pool.fetchval(
            "SELECT id FROM product_categories WHERE slug = $1 AND active", body.category_slug
        )
        if category_id is None:
            raise HTTPException(422, "categoría inexistente")
    values = {
        "slug": body.slug if body.slug is not None else current["slug"],
        "description": body.description if body.description is not None else current["description"],
        "short_description": body.short_description if body.short_description is not None else current["short_description"],
        "image_url": body.image_url if "image_url" in body.model_fields_set else current["image_url"],
        "gallery": body.gallery if body.gallery is not None else list(current["gallery"] or []),
        "featured": body.featured if body.featured is not None else current["featured"],
        "sort_order": body.sort_order if body.sort_order is not None else current["sort_order"],
        "active": body.active if body.active is not None else current["active"],
    }
    try:
        row = await pool.fetchrow(
            """UPDATE products SET slug = $2, description = $3, short_description = $4,
                      category_id = $5, image_url = $6, gallery = $7::jsonb,
                      featured = $8, sort_order = $9, active = $10, updated_at = now()
               WHERE id = $1
               RETURNING id, name, sku, slug, qty, min_qty, price, description,
                         short_description, image_url, gallery, featured, sort_order, active""",
            product_id, values["slug"], values["description"], values["short_description"],
            category_id, values["image_url"], json.dumps(values["gallery"]), values["featured"],
            values["sort_order"], values["active"],
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, "ya existe un producto con ese slug") from None
    return dict(row)
