import os
from datetime import datetime, timedelta, timezone

import asyncpg
import pytest

from src.db.repositories import commerce, payments


pytestmark = pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"), reason="requires disposable PostgreSQL"
)


async def _prepare(pool: asyncpg.Pool) -> dict:
    async with pool.acquire() as connection, connection.transaction():
        await connection.execute("DELETE FROM payment_events")
        await connection.execute("DELETE FROM payment_status_history")
        await connection.execute("DELETE FROM payment_intents")
        await connection.execute("DELETE FROM shop_order_status_history")
        await connection.execute("DELETE FROM shop_order_items")
        await connection.execute("DELETE FROM shop_orders")
        await connection.execute("DELETE FROM shopping_cart_items")
        await connection.execute("DELETE FROM shopping_carts")
        await connection.execute(
            "DELETE FROM stock_movements WHERE product_id IN "
            "(SELECT id FROM products WHERE sku = 'TEST-PAY-01')"
        )
        await connection.execute("DELETE FROM products WHERE sku = 'TEST-PAY-01'")
        await connection.execute("DELETE FROM product_categories WHERE slug = 'test-payments'")
        category_id = await connection.fetchval(
            """INSERT INTO product_categories (slug, name)
               VALUES ('test-payments', 'Test payments') RETURNING id"""
        )
        await connection.execute(
            """INSERT INTO products
                   (slug, name, sku, category_id, price, qty, min_qty, active)
               VALUES ('producto-pago', 'Producto Pago', 'TEST-PAY-01', $1, 21000, 4, 1, true)""",
            category_id,
        )
    cart = await commerce.create_cart(pool, "payer@example.com", "ARS")
    await commerce.set_cart_item(pool, cart["token"], "producto-pago", 1)
    order, _ = await commerce.checkout(
        pool,
        cart_token=cart["token"],
        idempotency_key="payment-order-checkout-key",
        customer_name="Payment Test",
        customer_email="payer@example.com",
        customer_phone="+5491112345678",
        payment_method="pay_at_store",
        customer_notes="",
    )
    return order


async def _cleanup(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as connection, connection.transaction():
        await connection.execute("DELETE FROM payment_events")
        await connection.execute("DELETE FROM payment_status_history")
        await connection.execute("DELETE FROM payment_intents")
        await connection.execute("DELETE FROM shop_order_status_history")
        await connection.execute("DELETE FROM shop_order_items")
        await connection.execute("DELETE FROM shop_orders")
        await connection.execute("DELETE FROM shopping_cart_items")
        await connection.execute("DELETE FROM shopping_carts")
        await connection.execute(
            "DELETE FROM stock_movements WHERE product_id IN "
            "(SELECT id FROM products WHERE sku = 'TEST-PAY-01')"
        )
        await connection.execute("DELETE FROM products WHERE sku = 'TEST-PAY-01'")
        await connection.execute("DELETE FROM product_categories WHERE slug = 'test-payments'")


@pytest.mark.asyncio
async def test_payment_intent_webhook_and_order_are_idempotent():
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=3)
    order = await _prepare(pool)
    try:
        kwargs = dict(
            installation_id="test",
            purpose="shop_order",
            target_id=order["id"],
            provider="demo",
            payer_email="payer@example.com",
            idempotency_key="payment-intent-key-0001",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        intent, created = await payments.create_intent(pool, **kwargs)
        repeated, repeated_created = await payments.create_intent(pool, **kwargs)
        assert created is True
        assert repeated_created is False
        assert repeated["id"] == intent["id"]
        state = await pool.fetchrow(
            "SELECT status, payment_method, payment_status FROM shop_orders WHERE id = $1",
            order["id"],
        )
        assert dict(state) == {
            "status": "pending", "payment_method": "mercado_pago", "payment_status": "pending"
        }

        intent = await payments.attach_preference(
            pool,
            intent["id"],
            provider_preference_id="demo-pref-1",
            checkout_url="https://example.com/pago-demo/token",
            sandbox=True,
        )
        assert intent["status"] == "pending"

        event_id, event_created = await payments.register_event(
            pool,
            provider="demo",
            provider_event_id="event-1",
            event_type="payment",
            action="approved",
            signature_valid=True,
            payload={
                "id": "demo-payment-1", "status": "approved",
                "external_reference": intent["external_reference"],
                "payer": {"email": "must-not-be-stored@example.com"},
            },
        )
        repeated_event_id, duplicate_created = await payments.register_event(
            pool,
            provider="demo",
            provider_event_id="event-1",
            event_type="payment",
            action="approved",
            signature_valid=True,
            payload={"id": "demo-payment-1"},
        )
        assert event_created is True
        assert duplicate_created is False
        assert repeated_event_id == event_id
        stored_payload = await pool.fetchval("SELECT payload FROM payment_events WHERE id = $1", event_id)
        assert "payer" not in stored_payload

        approved = await payments.apply_provider_payment(
            pool,
            external_reference=intent["external_reference"],
            provider_payment_id="demo-payment-1",
            status="approved",
            amount=21000,
            currency="ARS",
            provider_event_id="event-1",
        )
        await payments.finish_event(
            pool, event_id, intent_id=approved["id"], status="processed"
        )
        assert approved["status"] == "approved"
        state = await pool.fetchrow(
            "SELECT status, payment_status FROM shop_orders WHERE id = $1", order["id"]
        )
        assert dict(state) == {"status": "confirmed", "payment_status": "approved"}
        assert await pool.fetchval(
            "SELECT count(*) FROM payment_status_history WHERE payment_intent_id = $1 AND to_status = 'approved'",
            intent["id"],
        ) == 1

        repeated_approved = await payments.apply_provider_payment(
            pool,
            external_reference=intent["external_reference"],
            provider_payment_id="demo-payment-1",
            status="approved",
            amount=21000,
            currency="ARS",
            provider_event_id="event-1",
        )
        assert repeated_approved["status"] == "approved"
        assert await pool.fetchval(
            "SELECT count(*) FROM payment_status_history WHERE payment_intent_id = $1 AND to_status = 'approved'",
            intent["id"],
        ) == 1
    finally:
        await _cleanup(pool)
        await pool.close()


@pytest.mark.asyncio
async def test_payment_amount_mismatch_never_accredits_order():
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=3)
    order = await _prepare(pool)
    try:
        intent, _ = await payments.create_intent(
            pool,
            installation_id="test",
            purpose="shop_order",
            target_id=order["id"],
            provider="demo",
            payer_email=None,
            idempotency_key="payment-intent-key-0002",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        with pytest.raises(payments.PaymentMismatch):
            await payments.apply_provider_payment(
                pool,
                external_reference=intent["external_reference"],
                provider_payment_id="fraud-payment",
                status="approved",
                amount=1,
                currency="ARS",
                provider_event_id="event-fraud",
            )
        assert await pool.fetchval(
            "SELECT payment_status FROM shop_orders WHERE id = $1", order["id"]
        ) == "pending"
    finally:
        await _cleanup(pool)
        await pool.close()
