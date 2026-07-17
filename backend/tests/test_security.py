import hashlib
import hmac
import time
from types import SimpleNamespace

import pytest
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from starlette.requests import Request

from src.api.client_ip import get_client_ip
from src.api import deps
from src.api.routers import webhook
from src.agent.tools.booking import cancel_booking, create_booking, reschedule_booking
from src.agent.tools.actions import (
    confirm_pending_action,
    prepare_booking,
    prepare_cancel,
    prepare_reschedule,
)
from src.config import get_settings
from src.services.booking_service import cancel_booking_by_email, upsert_customer
from src.webhook_signer import signing_headers


class FakePool:
    def __init__(self):
        self.query = ""
        self.args = ()

    async def fetchrow(self, query, *args):
        self.query = query
        self.args = args
        return {
            "id": "customer-id",
            "phone": args[0],
            "name": "Victim",
            "email": "victim@example.com",
            "first_channel": "whatsapp",
        }


class FakeRedis:
    def __init__(self):
        self.keys = set()

    async def set(self, key, value, *, ex, nx):
        if nx and key in self.keys:
            return False
        self.keys.add(key)
        return True


def request(headers=None, peer="10.42.1.10"):
    raw_headers = [
        (key.lower().encode(), value.encode()) for key, value in (headers or {}).items()
    ]
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/webhook/chatwoot",
            "headers": raw_headers,
            "client": (peer, 12345),
        }
    )


@pytest.mark.asyncio
async def test_existing_customer_identity_is_never_overwritten():
    pool = FakePool()
    await upsert_customer(pool, "+5491112345678", "Attacker", "attacker@example.com", "web")

    update_clause = pool.query.split("ON CONFLICT", 1)[1]
    assert "email =" not in update_clause
    assert pool.args[2] == "attacker@example.com"


def test_forwarded_ip_is_ignored_from_untrusted_peer(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_CIDRS", "10.42.0.0/16")
    get_settings.cache_clear()
    req = request({"x-forwarded-for": "203.0.113.9"}, peer="198.51.100.5")
    assert get_client_ip(req) == "198.51.100.5"
    get_settings.cache_clear()


def test_forwarded_ip_is_used_from_trusted_proxy(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_CIDRS", "10.42.0.0/16")
    get_settings.cache_clear()
    req = request({"x-forwarded-for": "203.0.113.9, 10.42.1.10"})
    assert get_client_ip(req) == "203.0.113.9"
    get_settings.cache_clear()


def test_spoofed_leftmost_forwarded_ip_is_ignored(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_CIDRS", "10.42.0.0/16")
    get_settings.cache_clear()
    req = request({"x-forwarded-for": "1.2.3.4, 203.0.113.9, 10.42.1.11"})
    assert get_client_ip(req) == "203.0.113.9"
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_webhook_hmac_and_replay_protection(monkeypatch):
    secret = "test-signing-secret"
    body = b'{"event":"message_created"}'
    timestamp = str(int(time.time()))
    signature = hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256)
    req = request(
        {"x-nox-timestamp": timestamp, "x-nox-signature": f"sha256={signature.hexdigest()}"}
    )
    redis = FakeRedis()
    monkeypatch.setattr(
        webhook,
        "get_settings",
        lambda: SimpleNamespace(
            webhook_signing_secret=secret,
            webhook_max_skew_seconds=300,
            webhook_allow_legacy_token=False,
            webhook_token="",
        ),
    )
    monkeypatch.setattr(webhook, "get_redis", lambda: _async_value(redis))

    await webhook._authenticate_webhook(req, body, "")
    with pytest.raises(HTTPException) as replay:
        await webhook._authenticate_webhook(req, body, "")
    assert replay.value.status_code == 409


@pytest.mark.asyncio
async def test_webhook_rejects_expired_signature(monkeypatch):
    monkeypatch.setattr(
        webhook,
        "get_settings",
        lambda: SimpleNamespace(
            webhook_signing_secret="secret",
            webhook_max_skew_seconds=30,
            webhook_allow_legacy_token=False,
            webhook_token="",
        ),
    )
    req = request({"x-nox-timestamp": "1", "x-nox-signature": "sha256=bad"})
    with pytest.raises(HTTPException) as expired:
        await webhook._authenticate_webhook(req, b"{}", "")
    assert expired.value.status_code == 401


async def _async_value(value):
    return value


def test_internal_signer_produces_api_compatible_signature():
    body = b'{"event":"message_created"}'
    headers = signing_headers(body, "shared-secret", timestamp=123456)
    expected = hmac.new(
        b"shared-secret", b"123456." + body, hashlib.sha256
    ).hexdigest()
    assert headers == {
        "x-nox-timestamp": "123456",
        "x-nox-signature": f"sha256={expected}",
    }


def test_chatwoot_contact_ref_preserves_whatsapp_phone():
    body = webhook.ChatwootWebhook.model_validate(
        {
            "conversation": {
                "id": 1,
                "channel": "Channel::Whatsapp",
                "meta": {"sender": {"phone_number": "+5491112345678"}},
            }
        }
    )
    assert webhook._contact_ref(body) == "+5491112345678"


def test_chatwoot_contact_ref_uses_stable_telegram_identity():
    body = webhook.ChatwootWebhook.model_validate(
        {
            "conversation": {
                "id": 1,
                "channel": "Channel::Telegram",
                "contact_inbox": {"source_id": "889507955"},
                "meta": {
                    "sender": {
                        "id": 3,
                        "phone_number": None,
                        "additional_attributes": {
                            "social_telegram_user_id": "889507955"
                        },
                    }
                },
            }
        }
    )
    assert webhook._contact_ref(body) == "telegram:889507955"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("dependency", "claims"),
    [
        (deps.require_admin, {"email": "admin@example.com"}),
        (deps.require_customer, {"email": "customer@example.com"}),
        (deps.require_barber, {"email": "barber@example.com", "email_verified": False}),
    ],
)
async def test_protected_roles_require_explicitly_verified_email(monkeypatch, dependency, claims):
    monkeypatch.setattr(deps, "_decode_keycloak_token", lambda req: claims)
    monkeypatch.setattr(deps, "get_settings", lambda: SimpleNamespace(auth_disabled=False))
    with pytest.raises(HTTPException) as denied:
        await dependency(request())
    assert denied.value.status_code == 403


class CancelPool:
    def __init__(self):
        self.query = ""
        self.args = ()

    async def fetchrow(self, query, *args):
        self.query = query
        self.args = args
        return {"id": args[0], "starts_at": "future"}


@pytest.mark.asyncio
async def test_customer_cancellation_enforces_object_ownership_in_sql():
    pool = CancelPool()
    await cancel_booking_by_email(pool, "appointment-id", email="owner@example.com")
    assert "a.customer_id = c.id" in pool.query
    assert "lower(c.email) = lower($3)" in pool.query
    assert pool.args[2] == "owner@example.com"


def test_model_cannot_override_injected_identity_state():
    for tool in (
        create_booking,
        cancel_booking,
        reschedule_booking,
        prepare_booking,
        prepare_cancel,
        prepare_reschedule,
        confirm_pending_action,
    ):
        assert "state" not in tool.args
        assert "phone" not in tool.args
        assert "conversation_id" not in tool.args


@pytest.mark.parametrize("failure", ["expired", "issuer", "client"])
def test_jwt_rejects_expired_wrong_issuer_and_wrong_client(monkeypatch, failure):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = int(time.time())
    claims = {
        "sub": "user-id",
        "email": "user@example.com",
        "email_verified": True,
        "iss": "https://auth.example/realms/nox",
        "azp": "nox-admin",
        "iat": now,
        "exp": now + 300,
    }
    if failure == "expired":
        claims["exp"] = now - 1
    if failure == "issuer":
        claims["iss"] = "https://evil.example/realms/nox"
    if failure == "client":
        claims["azp"] = "other-client"

    token = jwt.encode(claims, private_key, algorithm="RS256")
    fake_jwks = SimpleNamespace(
        get_signing_key_from_jwt=lambda value: SimpleNamespace(key=private_key.public_key())
    )
    monkeypatch.setattr(deps, "_get_jwk_client", lambda: fake_jwks)
    monkeypatch.setattr(
        deps,
        "get_settings",
        lambda: SimpleNamespace(
            keycloak_issuer="https://auth.example/realms/nox",
            keycloak_client_id="nox-admin",
        ),
    )
    with pytest.raises(HTTPException) as denied:
        deps._decode_keycloak_token(request({"authorization": f"Bearer {token}"}))
    assert denied.value.status_code == 401


@pytest.mark.asyncio
async def test_webhook_rejects_bad_signature(monkeypatch):
    monkeypatch.setattr(
        webhook,
        "get_settings",
        lambda: SimpleNamespace(
            webhook_signing_secret="correct-secret",
            webhook_max_skew_seconds=300,
            webhook_allow_legacy_token=False,
            webhook_token="",
        ),
    )
    timestamp = str(int(time.time()))
    req = request({"x-nox-timestamp": timestamp, "x-nox-signature": "sha256=bad"})
    with pytest.raises(HTTPException) as denied:
        await webhook._authenticate_webhook(req, b"{}", "")
    assert denied.value.status_code == 401
