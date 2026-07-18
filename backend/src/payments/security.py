"""Firmas para links públicos y webhooks de Mercado Pago."""

import base64
import hashlib
import hmac
import time
from dataclasses import dataclass


class InvalidSignature(ValueError):
    pass


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def _unb64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def sign_public_reference(reference: str, secret: str) -> str:
    if len(secret) < 32:
        raise ValueError("PAYMENT_LINK_SECRET debe tener al menos 32 caracteres")
    encoded = _b64url(reference.encode())
    signature = _b64url(hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).digest())
    return f"{encoded}.{signature}"


def verify_public_reference(token: str, secret: str) -> str:
    if len(secret) < 32 or len(token) > 1000 or token.count(".") != 1:
        raise InvalidSignature("link de pago inválido")
    encoded, supplied = token.split(".", 1)
    expected = _b64url(hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).digest())
    if not hmac.compare_digest(supplied, expected):
        raise InvalidSignature("link de pago inválido")
    try:
        reference = _unb64url(encoded).decode()
    except (ValueError, UnicodeDecodeError) as error:
        raise InvalidSignature("link de pago inválido") from error
    if not reference or len(reference) > 300:
        raise InvalidSignature("link de pago inválido")
    return reference


@dataclass(frozen=True)
class MercadoPagoSignature:
    timestamp_ms: int
    manifest: str


def validate_mercado_pago_signature(
    *,
    x_signature: str,
    x_request_id: str,
    data_id: str,
    secret: str,
    now_ms: int | None = None,
    max_skew_seconds: int = 300,
) -> MercadoPagoSignature:
    """Valida el manifiesto oficial `id;request-id;ts` con HMAC-SHA256."""
    if len(secret) < 16:
        raise InvalidSignature("firma de webhook no configurada")
    parts: dict[str, list[str]] = {}
    for raw_part in x_signature.split(","):
        key, separator, value = raw_part.strip().partition("=")
        if separator and key and value:
            parts.setdefault(key, []).append(value)
    timestamp = (parts.get("ts") or [""])[0]
    signatures = parts.get("v1") or []
    try:
        timestamp_ms = int(timestamp)
    except ValueError as error:
        raise InvalidSignature("timestamp de webhook inválido") from error
    current_ms = now_ms if now_ms is not None else time.time_ns() // 1_000_000
    if abs(current_ms - timestamp_ms) > max_skew_seconds * 1000:
        raise InvalidSignature("webhook vencido")
    normalized_id = data_id.lower() if data_id.isalnum() else data_id
    manifest_parts = [f"id:{normalized_id};"]
    if x_request_id:
        manifest_parts.append(f"request-id:{x_request_id};")
    manifest_parts.append(f"ts:{timestamp};")
    manifest = "".join(manifest_parts)
    expected = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    if not signatures or not any(hmac.compare_digest(value, expected) for value in signatures):
        raise InvalidSignature("firma de webhook inválida")
    return MercadoPagoSignature(timestamp_ms=timestamp_ms, manifest=manifest)

