import os

import asyncpg
import pytest

from src.db.repositories import commerce


pytestmark = pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"), reason="requires disposable PostgreSQL"
)


async def _reset(connection: asyncpg.Connection) -> None:
    await connection.execute("DELETE FROM shop_order_status_history")
    await connection.execute("DELETE FROM shop_order_items")
    await connection.execute("DELETE FROM shop_orders")
    await connection.execute("DELETE FROM shopping_cart_items")
    await connection.execute("DELETE FROM shopping_carts")
    await connection.execute("DELETE FROM stock_movements WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'TEST-SHOP-%')")
    await connection.execute("DELETE FROM products WHERE sku LIKE 'TEST-SHOP-%'")
    await connection.execute("DELETE FROM product_categories WHERE slug = 'test-shop'")
    category_id = await connection.fetchval(
        """INSERT INTO product_categories (slug, name) VALUES ('test-shop', 'Test shop')
           RETURNING id"""
    )
    await connection.execute(
        """INSERT INTO products (
               slug, name, sku, description, short_description, category_id,
               price, qty, min_qty, active, featured
           ) VALUES ('producto-test', 'Producto Test', 'TEST-SHOP-01',
                     'Descripción', 'Resumen', $1, 1200, 5, 1, true, true)""",
        category_id,
    )


@pytest.mark.asyncio
async def test_cart_checkout_is_idempotent_and_stock_is_ledgered():
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=3)
    assert pool is not None
    async with pool.acquire() as connection:
        await _reset(connection)
    try:
        listing = await commerce.list_products(
            pool, category="test-shop", search="Producto", featured=True, limit=10, offset=0
        )
        assert listing["total"] == 1
        assert listing["items"][0]["slug"] == "producto-test"

        cart = await commerce.create_cart(pool, "cliente@example.test", "ARS")
        cart = await commerce.set_cart_item(pool, cart["token"], "producto-test", 2)
        assert cart["subtotal"] == 2400
        assert cart["total_quantity"] == 2

        kwargs = {
            "cart_token": cart["token"],
            "idempotency_key": "checkout-test-key-0001",
            "customer_name": "Cliente Test",
            "customer_email": "cliente@example.test",
            "customer_phone": "+5491112345678",
            "payment_method": "pay_at_store",
            "customer_notes": "Retiro por la tarde",
        }
        order, created = await commerce.checkout(pool, **kwargs)
        repeated, repeated_created = await commerce.checkout(pool, **kwargs)

        assert created is True
        assert repeated_created is False
        assert repeated["id"] == order["id"]
        assert order["status"] == "confirmed"
        assert order["payment_status"] == "unpaid"
        assert order["total"] == 2400
        assert await pool.fetchval("SELECT qty FROM products WHERE sku = 'TEST-SHOP-01'") == 3
        assert (
            await pool.fetchval(
                "SELECT count(*) FROM stock_movements WHERE product_id = (SELECT id FROM products WHERE sku = 'TEST-SHOP-01') AND delta = -2"
            )
            == 1
        )

        other_cart = await commerce.create_cart(pool, None, "ARS")
        with pytest.raises(commerce.CommerceError, match="otro carrito"):
            await commerce.checkout(
                pool,
                **{**kwargs, "cart_token": other_cart["token"]},
            )

        ready = await commerce.transition_order(pool, order["id"], "ready", "", "admin@test")
        completed = await commerce.transition_order(
            pool, order["id"], "completed", "entregado", "admin@test"
        )
        assert ready["status"] == "ready"
        assert completed["status"] == "completed"
        with pytest.raises(commerce.InvalidOrderTransition):
            await commerce.transition_order(pool, order["id"], "cancelled", "tarde", "admin@test")
    finally:
        await pool.close()


@pytest.mark.asyncio
async def test_cancelling_order_restores_stock_once():
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=3)
    assert pool is not None
    async with pool.acquire() as connection:
        await _reset(connection)
    try:
        cart = await commerce.create_cart(pool, None, "ARS")
        await commerce.set_cart_item(pool, cart["token"], "producto-test", 3)
        order, _ = await commerce.checkout(
            pool,
            cart_token=cart["token"],
            idempotency_key="checkout-test-key-0002",
            customer_name="Otra Persona",
            customer_email="otra@example.test",
            customer_phone="+5491187654321",
            payment_method="pay_at_store",
            customer_notes="",
        )
        assert await pool.fetchval("SELECT qty FROM products WHERE sku = 'TEST-SHOP-01'") == 2
        cancelled = await commerce.transition_order(
            pool, order["id"], "cancelled", "cliente desistió", "admin@test"
        )
        assert cancelled["status"] == "cancelled"
        assert cancelled["cancellation_reason"] == "cliente desistió"
        assert await pool.fetchval("SELECT qty FROM products WHERE sku = 'TEST-SHOP-01'") == 5
        repeated = await commerce.transition_order(
            pool, order["id"], "cancelled", "", "admin@test"
        )
        assert repeated["status"] == "cancelled"
        assert await pool.fetchval("SELECT qty FROM products WHERE sku = 'TEST-SHOP-01'") == 5
    finally:
        await pool.close()
