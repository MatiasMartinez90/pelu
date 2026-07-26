import hashlib
import hmac
from uuid import UUID

import pytest

from src.payments.security import (
    InvalidSignature,
    sign_appointment_capability,
    sign_public_reference,
    validate_mercado_pago_signature,
    verify_public_reference,
    verify_appointment_capability,
)


SECRET = "payment-link-secret-with-more-than-32-chars"


def test_public_payment_link_is_signed_and_tamper_evident():
    reference = "nox:shop_order:11111111-1111-4111-8111-111111111111"
    token = sign_public_reference(reference, SECRET)
    assert reference not in token
    assert verify_public_reference(token, SECRET) == reference
    with pytest.raises(InvalidSignature):
        verify_public_reference(f"{token[:-1]}x", SECRET)


def test_appointment_capability_is_bound_to_exact_booking():
    appointment_id = UUID("11111111-1111-4111-8111-111111111111")
    other_id = UUID("22222222-2222-4222-8222-222222222222")
    token = sign_appointment_capability(appointment_id, SECRET)
    verify_appointment_capability(token, appointment_id, SECRET)
    with pytest.raises(InvalidSignature, match="turno inexistente"):
        verify_appointment_capability(token, other_id, SECRET)


def test_mercado_pago_signature_validates_manifest_and_skew():
    timestamp = 1_784_361_600_000
    data_id = "PAYMENTABC123"
    request_id = "request-42"
    manifest = f"id:{data_id.lower()};request-id:{request_id};ts:{timestamp};"
    signature = hmac.new(SECRET.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    result = validate_mercado_pago_signature(
        x_signature=f"ts={timestamp},v1={signature}",
        x_request_id=request_id,
        data_id=data_id,
        secret=SECRET,
        now_ms=timestamp + 10_000,
    )
    assert result.manifest == manifest
    with pytest.raises(InvalidSignature, match="vencido"):
        validate_mercado_pago_signature(
            x_signature=f"ts={timestamp},v1={signature}",
            x_request_id=request_id,
            data_id=data_id,
            secret=SECRET,
            now_ms=timestamp + 301_000,
        )


def test_mercado_pago_signature_rejects_wrong_hash():
    with pytest.raises(InvalidSignature, match="inválida"):
        validate_mercado_pago_signature(
            x_signature="ts=1784361600000,v1=deadbeef",
            x_request_id="request-42",
            data_id="123",
            secret=SECRET,
            now_ms=1_784_361_600_000,
        )
