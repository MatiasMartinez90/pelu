import asyncio
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock
from urllib.parse import unquote

import asyncpg
import pytest

from src.db.repositories import commerce, payments
from src.config import Settings
from src.services import payment_service


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
    order["_cart_token"] = cart["token"]
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


@pytest.mark.asyncio
async def test_expired_shop_payment_releases_reserved_stock_exactly_once():
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
            idempotency_key="payment-intent-expiry-0003",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        assert await pool.fetchval(
            "SELECT qty FROM products WHERE sku = 'TEST-PAY-01'"
        ) == 3
        kwargs = dict(
            external_reference=intent["external_reference"],
            provider_payment_id=f"expired-{intent['id']}",
            status="expired",
            amount=21000,
            currency="ARS",
            provider_event_id=f"expiry:{intent['id']}",
            actor="reconciliation",
        )
        await payments.apply_provider_payment(pool, **kwargs)
        await payments.apply_provider_payment(pool, **kwargs)
        assert await pool.fetchval(
            "SELECT status FROM shop_orders WHERE id = $1", order["id"]
        ) == "cancelled"
        assert await pool.fetchval(
            "SELECT qty FROM products WHERE sku = 'TEST-PAY-01'"
        ) == 4
        assert await pool.fetchval(
            """SELECT count(*) FROM stock_movements
               WHERE reason = 'pago online vencido'"""
        ) == 1
    finally:
        await _cleanup(pool)
        await pool.close()


@pytest.mark.asyncio
async def test_expired_appointment_payment_falls_back_to_store_without_cancelling():
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=3)
    async with pool.acquire() as connection, connection.transaction():
        customer_id = await connection.fetchval(
            """INSERT INTO customers (phone, name, email, first_channel)
               VALUES ('+5491100000999', 'Pago Turno', 'turno@example.com', 'admin')
               RETURNING id"""
        )
        barber_id = await connection.fetchval(
            "SELECT id FROM barbers WHERE active ORDER BY sort_order LIMIT 1"
        )
        service = await connection.fetchrow(
            "SELECT id, price FROM services WHERE active ORDER BY sort_order LIMIT 1"
        )
        starts_at = datetime.now(timezone.utc) + timedelta(days=365)
        appointment_id = await connection.fetchval(
            """INSERT INTO appointments
                   (customer_id, barber_id, service_id, starts_at, ends_at,
                    price_at_booking, channel)
               VALUES ($1,$2,$3,$4,$5,$6,'admin') RETURNING id""",
            customer_id, barber_id, service["id"], starts_at,
            starts_at + timedelta(minutes=30), service["price"],
        )
    try:
        intent, _ = await payments.create_intent(
            pool,
            installation_id="test",
            purpose="appointment",
            target_id=appointment_id,
            provider="demo",
            payer_email="turno@example.com",
            idempotency_key="appointment-payment-expiry-0004",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        await payments.apply_provider_payment(
            pool,
            external_reference=intent["external_reference"],
            provider_payment_id=f"expired-{intent['id']}",
            status="expired",
            amount=service["price"],
            currency="ARS",
            provider_event_id=f"expiry:{intent['id']}",
            actor="reconciliation",
        )
        state = await pool.fetchrow(
            """SELECT status, payment_method, payment_status
               FROM appointments WHERE id = $1""",
            appointment_id,
        )
        assert dict(state) == {
            "status": "active", "payment_method": "pay_at_store", "payment_status": "unpaid"
        }
    finally:
        await pool.execute("DELETE FROM payment_events")
        await pool.execute("DELETE FROM payment_status_history")
        await pool.execute("DELETE FROM payment_intents")
        await pool.execute("DELETE FROM appointments WHERE id = $1", appointment_id)
        await pool.execute("DELETE FROM customers WHERE id = $1", customer_id)
        await pool.close()


@pytest.mark.asyncio
async def test_appointment_allows_one_active_link_and_safe_store_fallback():
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=4)
    async with pool.acquire() as connection, connection.transaction():
        customer_id = await connection.fetchval(
            """INSERT INTO customers (phone, name, email, first_channel)
               VALUES ('telegram:payment-test', 'Pago Agente', NULL, 'telegram')
               RETURNING id"""
        )
        barber_id = await connection.fetchval(
            "SELECT id FROM barbers WHERE active ORDER BY sort_order LIMIT 1"
        )
        service = await connection.fetchrow(
            "SELECT id, price FROM services WHERE active ORDER BY sort_order LIMIT 1"
        )
        starts_at = datetime.now(timezone.utc) + timedelta(days=366)
        appointment_id = await connection.fetchval(
            """INSERT INTO appointments
                   (customer_id, barber_id, service_id, starts_at, ends_at,
                    price_at_booking, channel)
               VALUES ($1,$2,$3,$4,$5,$6,'telegram') RETURNING id""",
            customer_id, barber_id, service["id"], starts_at,
            starts_at + timedelta(minutes=30), service["price"],
        )
    try:
        common = dict(
            pool=pool,
            installation_id="test",
            purpose="appointment",
            target_id=appointment_id,
            provider="demo",
            payer_email=None,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        first, second = await asyncio.gather(
            payments.create_intent(idempotency_key="appointment-race-key-one", **common),
            payments.create_intent(idempotency_key="appointment-race-key-two", **common),
        )
        assert first[0]["id"] == second[0]["id"]
        assert sorted([first[1], second[1]]) == [False, True]
        assert await pool.fetchval(
            """SELECT count(*) FROM payment_intents
               WHERE appointment_id = $1 AND status IN ('created', 'pending')""",
            appointment_id,
        ) == 1

        await payments.cancel_appointment_payment_to_store(
            pool, appointment_id, "telegram:payment-test", actor="test_customer_choice"
        )
        state = await pool.fetchrow(
            """SELECT status, payment_method, payment_status
               FROM appointments WHERE id = $1""",
            appointment_id,
        )
        assert dict(state) == {
            "status": "active", "payment_method": "pay_at_store", "payment_status": "unpaid"
        }
        replacement, created = await payments.create_intent(
            idempotency_key="appointment-replacement-key", **common
        )
        assert created is True
        assert replacement["id"] != first[0]["id"]
        await payments.attach_preference(
            pool,
            replacement["id"],
            provider_preference_id="appointment-expiring-preference",
            checkout_url="https://example.com/appointment-checkout",
            sandbox=True,
        )
        await pool.execute(
            "UPDATE payment_intents SET expires_at = now() - interval '1 minute' WHERE id = $1",
            replacement["id"],
        )
        assert await payments.expire_stale_appointment_intent(pool, appointment_id) is True
        renewed, renewed_created = await payments.create_intent(
            idempotency_key="appointment-renewed-key", **common
        )
        assert renewed_created is True
        assert renewed["id"] != replacement["id"]
        assert await pool.fetchval(
            "SELECT status FROM payment_intents WHERE id = $1", replacement["id"]
        ) == "expired"
    finally:
        await pool.execute("DELETE FROM payment_events")
        await pool.execute("DELETE FROM payment_status_history")
        await pool.execute("DELETE FROM payment_intents")
        await pool.execute("DELETE FROM appointments WHERE id = $1", appointment_id)
        await pool.execute("DELETE FROM customers WHERE id = $1", customer_id)
        await pool.close()


@pytest.mark.asyncio
async def test_demo_checkout_uses_the_same_signed_end_to_end_flow(monkeypatch):
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=3)
    order = await _prepare(pool)
    monkeypatch.setattr(payment_service, "get_pool", AsyncMock(return_value=pool))
    settings = Settings(
        installation_id="test",
        payment_provider="demo",
        payment_public_url="https://shop-dev.example.com",
        payment_webhook_url="https://api-dev.example.com/webhook/mercado-pago",
        payment_link_secret="payment-link-secret-with-more-than-32-chars",
    )
    try:
        intent, created = await payment_service.create_preference(
            purpose="shop_order",
            target_id=order["id"],
            idempotency_key="demo-checkout-end-to-end-0005",
            settings=settings,
        )
        assert created is True
        token = unquote(intent["checkout_url"].rsplit("/", 1)[-1])
        status = await payment_service.settle_demo_payment(
            token, "approved", settings=settings
        )
        assert status["status"] == "approved"
        assert await pool.fetchval(
            "SELECT status FROM shop_orders WHERE id = $1", order["id"]
        ) == "confirmed"
    finally:
        await _cleanup(pool)
        await pool.close()


@pytest.mark.asyncio
async def test_online_payment_can_fall_back_to_store_without_releasing_stock():
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
            idempotency_key="fallback-payment-intent-key",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        await payments.cancel_shop_payment_to_store(pool, order["id"], order["_cart_token"])
        await payments.cancel_shop_payment_to_store(pool, order["id"], order["_cart_token"])
        state = await pool.fetchrow(
            """SELECT status, payment_method, payment_status
               FROM shop_orders WHERE id = $1""",
            order["id"],
        )
        assert dict(state) == {
            "status": "confirmed", "payment_method": "pay_at_store", "payment_status": "unpaid"
        }
        assert await pool.fetchval(
            "SELECT status FROM payment_intents WHERE id = $1", intent["id"]
        ) == "cancelled"
        assert await pool.fetchval(
            "SELECT qty FROM products WHERE sku = 'TEST-PAY-01'"
        ) == 3
        assert await pool.fetchval(
            """SELECT count(*) FROM payment_status_history
               WHERE payment_intent_id = $1 AND to_status = 'cancelled'""",
            intent["id"],
        ) == 1
    finally:
        await _cleanup(pool)
        await pool.close()
