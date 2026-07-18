import hashlib
import hmac
import json
import time
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from fastapi import HTTPException, Response
from starlette.requests import Request

from src.api.payment_schemas import AppointmentPaymentPreferenceIn, ShopPaymentPreferenceIn
from src.api.routers import payment_webhook, payments as payments_router
from src.config import Settings


def request_for(
    path: str,
    *,
    body: bytes = b"",
    query: bytes = b"",
    headers: list[tuple[bytes, bytes]] | None = None,
) -> Request:
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": path,
            "query_string": query,
            "headers": headers or [],
            "client": ("127.0.0.1", 1234),
            "server": ("test", 80),
            "scheme": "http",
        },
        receive,
    )


@pytest.mark.asyncio
async def test_shop_preference_requires_cart_capability(monkeypatch):
    monkeypatch.setattr(payments_router, "rate_limit_exceeded", AsyncMock(return_value=False))
    monkeypatch.setattr(payments_router, "get_pool", AsyncMock(return_value=object()))
    monkeypatch.setattr(
        payments_router.payments, "shop_order_belongs_to_cart", AsyncMock(return_value=False)
    )
    with pytest.raises(HTTPException) as error:
        await payments_router.create_shop_preference(
            UUID("11111111-1111-4111-8111-111111111111"),
            ShopPaymentPreferenceIn(cart_token="x" * 32),
            request_for("/api/v1/payments/shop-orders/1/preference"),
            Response(),
            "idempotency-key-with-16-chars",
        )
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_appointment_preference_rejects_wrong_capability(monkeypatch):
    monkeypatch.setattr(payments_router, "rate_limit_exceeded", AsyncMock(return_value=False))
    monkeypatch.setattr(
        payments_router,
        "get_settings",
        lambda: Settings(payment_link_secret="payment-link-secret-with-more-than-32-chars"),
    )
    create = AsyncMock()
    monkeypatch.setattr(
        payments_router.payment_service, "create_appointment_preference", create
    )
    with pytest.raises(HTTPException) as error:
        await payments_router.create_appointment_preference(
            UUID("11111111-1111-4111-8111-111111111111"),
            AppointmentPaymentPreferenceIn(capability_token="x" * 40),
            request_for("/api/v1/payments/appointments/1/preference"),
            Response(),
            "idempotency-key-with-16-chars",
        )
    assert error.value.status_code == 404
    create.assert_not_awaited()


@pytest.mark.asyncio
async def test_mercado_pago_webhook_validates_then_reconciles(monkeypatch):
    secret = "mercado-pago-webhook-secret"
    timestamp = int(time.time() * 1000)
    data_id = "PAYMENT987"
    request_id = "request-987"
    manifest = f"id:{data_id.lower()};request-id:{request_id};ts:{timestamp};"
    signature = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    raw = json.dumps({
        "id": 42,
        "type": "payment",
        "action": "payment.updated",
        "data": {"id": data_id},
    }).encode()
    request = request_for(
        "/webhook/mercado-pago",
        body=raw,
        query=f"data.id={data_id}".encode(),
        headers=[
            (b"x-signature", f"ts={timestamp},v1={signature}".encode()),
            (b"x-request-id", request_id.encode()),
        ],
    )
    settings = Settings(
        mercado_pago_access_token="APP_USR-secret",
        mercado_pago_webhook_secret=secret,
    )
    monkeypatch.setattr(payment_webhook, "get_settings", lambda: settings)
    monkeypatch.setattr(payment_webhook, "get_pool", AsyncMock(return_value=object()))
    register = AsyncMock(return_value=(7, True))
    finish = AsyncMock()
    monkeypatch.setattr(payment_webhook.payments, "register_event", register)
    monkeypatch.setattr(payment_webhook.payments, "finish_event", finish)
    reconcile = AsyncMock(return_value={"id": UUID("22222222-2222-4222-8222-222222222222")})
    monkeypatch.setattr(payment_webhook.payment_service, "reconcile_provider_payment", reconcile)

    result = await payment_webhook.mercado_pago_webhook(request)
    assert result == {"status": "processed"}
    assert register.await_args.kwargs["provider_event_id"] == "payment:payment.updated:42"
    assert reconcile.await_args.args == (data_id,)
    assert finish.await_args.kwargs["status"] == "processed"


@pytest.mark.asyncio
async def test_mercado_pago_webhook_rejects_bad_signature(monkeypatch):
    settings = Settings(
        mercado_pago_access_token="APP_USR-secret",
        mercado_pago_webhook_secret="mercado-pago-webhook-secret",
    )
    monkeypatch.setattr(payment_webhook, "get_settings", lambda: settings)
    request = request_for(
        "/webhook/mercado-pago",
        body=b'{"type":"payment"}',
        query=b"data.id=987",
        headers=[(b"x-signature", b"ts=1,v1=bad")],
    )
    with pytest.raises(HTTPException) as error:
        await payment_webhook.mercado_pago_webhook(request)
    assert error.value.status_code == 401
