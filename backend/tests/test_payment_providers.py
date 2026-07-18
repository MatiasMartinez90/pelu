from datetime import datetime, timedelta, timezone

import httpx
import pytest

from src.payments.providers import (
    DemoPaymentProvider,
    MercadoPagoProvider,
    PaymentItem,
    PaymentProviderError,
    PreferenceRequest,
)


def preference() -> PreferenceRequest:
    return PreferenceRequest(
        external_reference="nox:shop_order:11111111-1111-4111-8111-111111111111",
        description="Compra",
        amount=21000,
        currency="ARS",
        payer_email="cliente@example.com",
        items=(PaymentItem(id="SKU-1", title="Producto", quantity=1, unit_price=21000),),
        success_url="https://example.com/pago?result=success",
        pending_url="https://example.com/pago?result=pending",
        failure_url="https://example.com/pago?result=failure",
        notification_url="https://example.com/api/webhooks/mercado-pago",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        idempotency_key="11111111-1111-4111-8111-111111111111",
    )


@pytest.mark.asyncio
async def test_demo_provider_returns_signed_local_checkout():
    provider = DemoPaymentProvider(
        "https://dev.example.com", "payment-link-secret-with-more-than-32-chars"
    )
    result = await provider.create_preference(preference())
    assert result.provider_preference_id.startswith("demo-")
    assert result.checkout_url.startswith("https://dev.example.com/pago-demo/")
    assert result.sandbox is True


@pytest.mark.asyncio
async def test_mercado_pago_preference_uses_server_credentials_and_idempotency():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["request"] = request
        return httpx.Response(
            201,
            json={"id": "pref-42", "init_point": "https://www.mercadopago.com/checkout/start"},
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = MercadoPagoProvider(access_token="APP_USR-secret", client=client)
        result = await provider.create_preference(preference())
    request = captured["request"]
    assert request.headers["authorization"] == "Bearer APP_USR-secret"
    assert request.headers["x-idempotency-key"] == preference().idempotency_key
    payload = __import__("json").loads(request.content)
    assert payload["external_reference"] == preference().external_reference
    assert payload["notification_url"].startswith("https://")
    assert payload["items"][0]["unit_price"] == 21000
    assert result.provider_preference_id == "pref-42"


@pytest.mark.asyncio
async def test_mercado_pago_payment_is_normalized_server_side():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/payments/987"
        return httpx.Response(200, json={
            "id": 987,
            "status": "approved",
            "transaction_amount": 21000.0,
            "currency_id": "ARS",
            "external_reference": preference().external_reference,
            "payer": {"email": "must-not-be-persisted@example.com"},
        })

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        payment = await MercadoPagoProvider(
            access_token="APP_USR-secret", client=client
        ).get_payment("987")
    assert payment.status == "approved"
    assert payment.amount == 21000
    assert payment.external_reference == preference().external_reference


@pytest.mark.asyncio
async def test_mercado_pago_reconciliation_searches_by_external_reference():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["request"] = request
        return httpx.Response(200, json={"results": [{
            "id": 988,
            "status": "approved",
            "transaction_amount": 21000,
            "currency_id": "ARS",
            "external_reference": preference().external_reference,
        }]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        payment = await MercadoPagoProvider(
            access_token="APP_USR-secret", client=client
        ).find_payment(preference().external_reference)
    assert captured["request"].url.path == "/v1/payments/search"
    assert captured["request"].url.params["external_reference"] == preference().external_reference
    assert payment is not None
    assert payment.provider_payment_id == "988"


@pytest.mark.asyncio
async def test_preference_rejects_client_side_total_mismatch():
    request = preference()
    invalid = PreferenceRequest(**{**request.__dict__, "amount": 1})
    provider = MercadoPagoProvider(access_token="APP_USR-secret", client=httpx.AsyncClient())
    try:
        with pytest.raises(PaymentProviderError, match="preference_amount_mismatch"):
            await provider.create_preference(invalid)
    finally:
        await provider.client.aclose()
