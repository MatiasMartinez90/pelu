from unittest.mock import AsyncMock

import httpx
import pytest

from src.config import Settings
from src.integrations.email import (
    EmailConfigurationError,
    EmailDeliveryError,
    EmailMessage,
    ResendEmailProvider,
)


def settings(**overrides) -> Settings:
    values = {
        "email_provider": "resend",
        "resend_api_key": "re_test_key",
        "email_from": "notificaciones-dev@cloud-it.com.ar",
    }
    values.update(overrides)
    return Settings(**values)


@pytest.mark.asyncio
async def test_resend_provider_sends_payload_and_returns_id():
    request_seen = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        request_seen["authorization"] = request.headers["authorization"]
        request_seen["json"] = __import__("json").loads(request.content)
        return httpx.Response(200, json={"id": "email_123"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = ResendEmailProvider(settings(), client=client)
    try:
        result = await provider.send(
            EmailMessage(
                to="cliente@example.com",
                subject="Tu turno",
                html="<p>Confirmado</p>",
                text="Confirmado",
            )
        )
    finally:
        await client.aclose()

    assert result == "email_123"
    assert request_seen["authorization"] == "Bearer re_test_key"
    assert request_seen["json"] == {
        "from": "notificaciones-dev@cloud-it.com.ar",
        "to": ["cliente@example.com"],
        "subject": "Tu turno",
        "html": "<p>Confirmado</p>",
        "text": "Confirmado",
    }


@pytest.mark.asyncio
async def test_resend_provider_fails_closed_when_disabled():
    provider = ResendEmailProvider(settings(email_provider="disabled"), client=AsyncMock())
    with pytest.raises(EmailConfigurationError, match="EMAIL_PROVIDER"):
        await provider.send(EmailMessage(to="cliente@example.com", subject="x", html="<p>x</p>"))


@pytest.mark.asyncio
async def test_resend_provider_surfaces_provider_error_without_leaking_key():
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text="invalid api key")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = ResendEmailProvider(settings(), client=client)
    try:
        with pytest.raises(EmailDeliveryError, match="401") as error:
            await provider.send(EmailMessage(to="cliente@example.com", subject="x", html="<p>x</p>"))
    finally:
        await client.aclose()

    assert "re_test_key" not in str(error.value)


@pytest.mark.asyncio
async def test_resend_provider_rejects_invalid_recipient_before_http_call():
    client = AsyncMock()
    provider = ResendEmailProvider(settings(), client=client)
    with pytest.raises(ValueError, match="destinatario"):
        await provider.send(EmailMessage(to="not-an-email", subject="x", html="<p>x</p>"))
    client.post.assert_not_called()
