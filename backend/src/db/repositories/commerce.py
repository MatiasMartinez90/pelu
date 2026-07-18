"""Persistencia transaccional de catálogo, carritos, pedidos y stock."""

import hashlib
import secrets
from datetime import datetime, timezone

import asyncpg


class CommerceError(Exception):
    """Error de negocio esperable."""


class CartNotFound(CommerceError):
    pass


class CartUnavailable(CommerceError):
    pass


class ProductUnavailable(CommerceError):
    pass


class StockConflict(CommerceError):
    pass


class InvalidOrderTransition(CommerceError):
    pass


def _token_hash(token: str) -> bytes:
    if not 32 <= len(token) <= 128:
        raise CartNotFound("carrito inexistente")
    return hashlib.sha256(token.encode()).digest()


def _idempotency_hash(value: str) -> bytes:
    if not 16 <= len(value) <= 128:
        raise CommerceError("Idempotency-Key debe tener entre 16 y 128 caracteres")
    return hashlib.sha256(value.encode()).digest()


def _product(row: asyncpg.Record) -> dict:
    value = dict(row)
    value["gallery"] = list(value.get("gallery") or [])
    value["available_qty"] = value.pop("qty")
    value["in_stock"] = value["available_qty"] > 0
    return value


PRODUCT_SELECT = """
    SELECT p.slug, p.name, p.sku, p.description, p.short_description,
           c.slug AS category_slug, c.name AS category_name,
           p.image_url, p.gallery, p.price, p.qty, p.featured
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id AND c.active
"""


async def list_categories(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch(
        """
        SELECT c.slug, c.name, c.description, count(p.id)::int AS product_count
        FROM product_categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.active
        WHERE c.active
        GROUP BY c.id
        HAVING count(p.id) > 0
        ORDER BY c.sort_order, c.name
        """
    )
    return [dict(row) for row in rows]


async def list_products(
    pool: asyncpg.Pool,
    *,
    category: str | None,
    search: str | None,
    featured: bool | None,
    limit: int,
    offset: int,
) -> dict:
    conditions = ["p.active"]
    values: list[object] = []
    if category:
        values.append(category)
        conditions.append(f"c.slug = ${len(values)}")
    if search:
        values.append(f"%{search.strip()}%")
        index = len(values)
        conditions.append(
            f"(p.name ILIKE ${index} OR p.description ILIKE ${index} OR p.sku ILIKE ${index})"
        )
    if featured is not None:
        values.append(featured)
        conditions.append(f"p.featured = ${len(values)}")
    where = " AND ".join(conditions)
    total = await pool.fetchval(
        f"""SELECT count(*) FROM products p
            LEFT JOIN product_categories c ON c.id = p.category_id
            WHERE {where}""",
        *values,
    )
    values.extend([limit, offset])
    rows = await pool.fetch(
        f"""{PRODUCT_SELECT}
            WHERE {where}
            ORDER BY p.featured DESC, p.sort_order, p.name
            LIMIT ${len(values) - 1} OFFSET ${len(values)}""",
        *values,
    )
    return {"items": [_product(row) for row in rows], "total": total, "limit": limit, "offset": offset}


async def get_product(pool: asyncpg.Pool, slug: str) -> dict | None:
    row = await pool.fetchrow(f"{PRODUCT_SELECT} WHERE p.active AND p.slug = $1", slug)
    return _product(row) if row else None


async def create_cart(pool: asyncpg.Pool, customer_email: str | None, currency: str) -> dict:
    token = secrets.token_urlsafe(32)
    await pool.execute(
        "INSERT INTO shopping_carts (token_hash, customer_email, currency) VALUES ($1, $2, $3)",
        _token_hash(token),
        customer_email.lower() if customer_email else None,
        currency,
    )
    return await get_cart(pool, token)


async def _cart_row(connection: asyncpg.Connection | asyncpg.Pool, token: str, lock: bool = False):
    suffix = " FOR UPDATE" if lock else ""
    return await connection.fetchrow(
        """
        SELECT id, status, currency, expires_at
        FROM shopping_carts
        WHERE token_hash = $1
        """ + suffix,
        _token_hash(token),
    )


async def _render_cart(connection: asyncpg.Connection | asyncpg.Pool, cart, token: str) -> dict:
    rows = await connection.fetch(
        """
        SELECT ci.quantity, p.slug, p.name, p.sku, p.description, p.short_description,
               c.slug AS category_slug, c.name AS category_name, p.image_url, p.gallery,
               p.price, p.qty, p.featured
        FROM shopping_cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN product_categories c ON c.id = p.category_id AND c.active
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at
        """,
        cart["id"],
    )
    items = []
    for row in rows:
        product = _product(row)
        quantity = row["quantity"]
        items.append({"product": product, "quantity": quantity, "line_total": product["price"] * quantity})
    return {
        "token": token,
        "status": cart["status"],
        "currency": cart["currency"],
        "items": items,
        "subtotal": sum(item["line_total"] for item in items),
        "total_quantity": sum(item["quantity"] for item in items),
        "expires_at": cart["expires_at"].isoformat(),
    }


async def get_cart(pool: asyncpg.Pool, token: str) -> dict:
    cart = await _cart_row(pool, token)
    if cart is None:
        raise CartNotFound("carrito inexistente")
    if cart["status"] != "active" or cart["expires_at"] <= datetime.now(timezone.utc):
        raise CartUnavailable("carrito vencido o cerrado")
    return await _render_cart(pool, cart, token)


async def set_cart_item(pool: asyncpg.Pool, token: str, product_slug: str, quantity: int) -> dict:
    async with pool.acquire() as connection, connection.transaction():
        cart = await _cart_row(connection, token, lock=True)
        if cart is None:
            raise CartNotFound("carrito inexistente")
        if cart["status"] != "active" or cart["expires_at"] <= datetime.now(timezone.utc):
            raise CartUnavailable("carrito vencido o cerrado")
        product = await connection.fetchrow(
            "SELECT id, qty FROM products WHERE slug = $1 AND active FOR UPDATE",
            product_slug,
        )
        if product is None:
            raise ProductUnavailable("producto no disponible")
        if quantity > product["qty"]:
            raise StockConflict("stock insuficiente")
        await connection.execute(
            """
            INSERT INTO shopping_cart_items (cart_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (cart_id, product_id) DO UPDATE
            SET quantity = EXCLUDED.quantity, updated_at = now()
            """,
            cart["id"],
            product["id"],
            quantity,
        )
        await connection.execute(
            "UPDATE shopping_carts SET last_activity = now(), updated_at = now() WHERE id = $1",
            cart["id"],
        )
        return await _render_cart(connection, cart, token)


async def remove_cart_item(pool: asyncpg.Pool, token: str, product_slug: str) -> dict:
    async with pool.acquire() as connection, connection.transaction():
        cart = await _cart_row(connection, token, lock=True)
        if cart is None:
            raise CartNotFound("carrito inexistente")
        if cart["status"] != "active":
            raise CartUnavailable("carrito cerrado")
        await connection.execute(
            """DELETE FROM shopping_cart_items ci USING products p
               WHERE ci.cart_id = $1 AND ci.product_id = p.id AND p.slug = $2""",
            cart["id"],
            product_slug,
        )
        await connection.execute(
            "UPDATE shopping_carts SET last_activity = now(), updated_at = now() WHERE id = $1",
            cart["id"],
        )
        return await _render_cart(connection, cart, token)


async def _load_order(connection: asyncpg.Connection | asyncpg.Pool, order_id) -> dict:
    order = await connection.fetchrow(
        """SELECT id, order_number, customer_name, customer_email, customer_phone,
                  status, payment_method, payment_status, currency, subtotal, total,
                  pickup_location, customer_notes, cancellation_reason, created_at, updated_at
           FROM shop_orders WHERE id = $1""",
        order_id,
    )
    if order is None:
        raise CommerceError("pedido inexistente")
    items = await connection.fetch(
        """SELECT product_slug, product_name, sku, unit_price, quantity, line_total
           FROM shop_order_items WHERE order_id = $1 ORDER BY id""",
        order_id,
    )
    value = dict(order)
    value["created_at"] = value["created_at"].isoformat()
    value["updated_at"] = value["updated_at"].isoformat()
    value["items"] = [dict(item) for item in items]
    return value


async def checkout(
    pool: asyncpg.Pool,
    *,
    cart_token: str,
    idempotency_key: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    payment_method: str,
    customer_notes: str,
) -> tuple[dict, bool]:
    idempotency_hash = _idempotency_hash(idempotency_key)
    cart_token_hash = _token_hash(cart_token)
    async with pool.acquire() as connection, connection.transaction():
        await connection.execute("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", idempotency_key)
        existing = await connection.fetchrow(
            """SELECT o.id, c.token_hash = $2 AS same_cart
               FROM shop_orders o
               JOIN shopping_carts c ON c.id = o.cart_id
               WHERE o.idempotency_hash = $1""",
            idempotency_hash,
            cart_token_hash,
        )
        if existing:
            if not existing["same_cart"]:
                raise CommerceError("Idempotency-Key ya fue usada por otro carrito")
            return await _load_order(connection, existing["id"]), False

        cart = await _cart_row(connection, cart_token, lock=True)
        if cart is None:
            raise CartNotFound("carrito inexistente")
        if cart["status"] != "active" or cart["expires_at"] <= datetime.now(timezone.utc):
            raise CartUnavailable("carrito vencido o cerrado")

        rows = await connection.fetch(
            """
            SELECT p.id, p.slug, p.name, p.sku, p.price, p.qty, ci.quantity
            FROM shopping_cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.cart_id = $1 AND p.active
            ORDER BY p.id
            FOR UPDATE OF p
            """,
            cart["id"],
        )
        if not rows:
            raise CartUnavailable("el carrito está vacío")
        for row in rows:
            if row["qty"] < row["quantity"]:
                raise StockConflict(f"stock insuficiente para {row['name']}")

        subtotal = sum(row["price"] * row["quantity"] for row in rows)
        pickup_location = await connection.fetchval(
            "SELECT address FROM site_profile WHERE singleton"
        ) or "Retiro en el local"
        order = await connection.fetchrow(
            """
            INSERT INTO shop_orders (
                cart_id, idempotency_hash, customer_name, customer_email, customer_phone,
                payment_method, payment_status, currency, subtotal, total,
                pickup_location, customer_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, 'unpaid', $7, $8, $8, $9, $10)
            RETURNING id, order_number
            """,
            cart["id"], idempotency_hash, customer_name, customer_email.lower(),
            customer_phone, payment_method, cart["currency"], subtotal,
            pickup_location, customer_notes,
        )
        for row in rows:
            updated = await connection.fetchval(
                "UPDATE products SET qty = qty - $2, updated_at = now() WHERE id = $1 AND qty >= $2 RETURNING qty",
                row["id"], row["quantity"],
            )
            if updated is None:
                raise StockConflict(f"stock insuficiente para {row['name']}")
            await connection.execute(
                """INSERT INTO shop_order_items
                   (order_id, product_id, product_slug, product_name, sku, unit_price, quantity, line_total)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                order["id"], row["id"], row["slug"], row["name"], row["sku"],
                row["price"], row["quantity"], row["price"] * row["quantity"],
            )
            await connection.execute(
                """INSERT INTO stock_movements (product_id, delta, reason, created_by)
                   VALUES ($1, $2, $3, 'shop')""",
                row["id"], -row["quantity"], f"pedido {order['order_number']}",
            )
        await connection.execute(
            """UPDATE shopping_carts SET status = 'converted', converted_at = now(),
                   updated_at = now(), customer_email = $2 WHERE id = $1""",
            cart["id"], customer_email.lower(),
        )
        await connection.execute(
            """INSERT INTO shop_order_status_history (order_id, from_status, to_status)
               VALUES ($1, NULL, 'confirmed')""",
            order["id"],
        )
        return await _load_order(connection, order["id"]), True


async def list_orders(pool: asyncpg.Pool, status: str | None, limit: int, offset: int) -> list[dict]:
    rows = await pool.fetch(
        """
        SELECT o.id, o.order_number, o.customer_name, o.status, o.payment_method,
               o.payment_status, o.total, o.currency, count(i.id)::int AS item_count, o.created_at
        FROM shop_orders o
        LEFT JOIN shop_order_items i ON i.order_id = o.id
        WHERE ($1::text IS NULL OR o.status = $1)
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
        """,
        status, limit, offset,
    )
    return [{**dict(row), "created_at": row["created_at"].isoformat()} for row in rows]


async def get_order(pool: asyncpg.Pool, order_id) -> dict:
    return await _load_order(pool, order_id)


async def transition_order(pool: asyncpg.Pool, order_id, status: str, note: str, actor: str) -> dict:
    transitions = {
        "pending": {"confirmed", "cancelled"},
        "confirmed": {"ready", "cancelled"},
        "ready": {"completed", "cancelled"},
        "completed": set(),
        "cancelled": set(),
    }
    async with pool.acquire() as connection, connection.transaction():
        order = await connection.fetchrow(
            "SELECT id, status FROM shop_orders WHERE id = $1 FOR UPDATE", order_id
        )
        if order is None:
            raise CommerceError("pedido inexistente")
        current = order["status"]
        if status == current:
            return await _load_order(connection, order_id)
        if status not in transitions[current]:
            raise InvalidOrderTransition(f"transición inválida: {current} → {status}")
        if status == "cancelled":
            items = await connection.fetch(
                "SELECT product_id, quantity FROM shop_order_items WHERE order_id = $1 AND product_id IS NOT NULL",
                order_id,
            )
            for item in items:
                await connection.execute(
                    "UPDATE products SET qty = qty + $2, updated_at = now() WHERE id = $1",
                    item["product_id"], item["quantity"],
                )
                await connection.execute(
                    """INSERT INTO stock_movements (product_id, delta, reason, created_by)
                       VALUES ($1, $2, $3, $4)""",
                    item["product_id"], item["quantity"], "cancelación de pedido", actor,
                )
        await connection.execute(
            """UPDATE shop_orders SET status = $2, updated_at = now(),
                   completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END,
                   cancelled_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE cancelled_at END,
                   cancellation_reason = CASE WHEN $2 = 'cancelled' THEN $3 ELSE cancellation_reason END
               WHERE id = $1""",
            order_id, status, note,
        )
        await connection.execute(
            """INSERT INTO shop_order_status_history (order_id, from_status, to_status, note, actor)
               VALUES ($1, $2, $3, $4, $5)""",
            order_id, current, status, note, actor,
        )
        return await _load_order(connection, order_id)
