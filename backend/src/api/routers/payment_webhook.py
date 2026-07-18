"""Webhook de Mercado Pago: autentica, registra y consulta el pago autoritativo."""

import hashlib
import json
import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request

from ...config import get_settings
from ...db.pool import get_pool
from ...db.repositories import payments
from ...observability import PAYMENT_OPERATIONS
from ...payments.providers import MercadoPagoProvider, PaymentProviderError
from ...payments.security import InvalidSignature, validate_mercado_pago_signature
from ...services import payment_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["payment-webhook"])


@router.post("/webhook/mercado-pago")
async def mercado_pago_webhook(request: Request):
    settings = get_settings()
    if not settings.mercado_pago_access_token or not settings.mercado_pago_webhook_secret:
        raise HTTPException(503, "webhook de pagos no configurado")
    raw = await request.body()
    if len(raw) > settings.webhook_max_body_bytes:
        raise HTTPException(413, "payload demasiado grande")
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(422, "payload inválido") from None
    if not isinstance(payload, dict):
        raise HTTPException(422, "payload inválido")

    data_id = str(request.query_params.get("data.id") or "")
    if not data_id or len(data_id) > 100:
        raise HTTPException(422, "data.id inválido")
    try:
        validate_mercado_pago_signature(
            x_signature=request.headers.get("x-signature", ""),
            x_request_id=request.headers.get("x-request-id", ""),
            data_id=data_id,
            secret=settings.mercado_pago_webhook_secret,
            max_skew_seconds=settings.payment_webhook_max_skew_seconds,
        )
    except InvalidSignature as error:
        raise HTTPException(401, str(error)) from None

    event_type = str(payload.get("type") or request.query_params.get("type") or "")[:100]
    action = str(payload.get("action") or "")[:100]
    notification_id = str(payload.get("id") or "")
    stable_id = notification_id or hashlib.sha256(raw).hexdigest()
    provider_event_id = f"{event_type}:{action}:{stable_id}"
    if len(provider_event_id) > 255:
        raise HTTPException(422, "evento inválido")
    pool = await get_pool()
    event_id, created = await payments.register_event(
        pool,
        provider="mercado_pago",
        provider_event_id=provider_event_id,
        event_type=event_type,
        action=action,
        signature_valid=True,
        payload=payload,
    )
    if not created:
        if not await payments.retry_failed_event(pool, event_id):
            PAYMENT_OPERATIONS.labels(
                operation="webhook", result="duplicate", provider="mercado_pago"
            ).inc()
            return {"status": "duplicate"}
    if event_type != "payment":
        await payments.finish_event(pool, event_id, intent_id=None, status="ignored")
        PAYMENT_OPERATIONS.labels(
            operation="webhook", result="ignored", provider="mercado_pago"
        ).inc()
        return {"status": "ignored"}

    provider = MercadoPagoProvider(
        access_token=settings.mercado_pago_access_token,
        api_url=settings.mercado_pago_api_url,
        statement_descriptor=settings.mercado_pago_statement_descriptor,
    )
    try:
        intent = await payment_service.reconcile_provider_payment(
            data_id,
            provider_event_id=provider_event_id,
            provider=provider,
        )
    except payments.PaymentNotFound:
        await payments.finish_event(
            pool, event_id, intent_id=None, status="ignored", error_code="intent_not_found"
        )
        PAYMENT_OPERATIONS.labels(
            operation="webhook", result="ignored", provider="mercado_pago"
        ).inc()
        return {"status": "ignored"}
    except (payments.PaymentError, PaymentProviderError) as error:
        await payments.finish_event(
            pool, event_id, intent_id=None, status="failed",
            error_code=getattr(error, "code", type(error).__name__)[:100],
        )
        logger.warning("falló webhook Mercado Pago %s: %s", provider_event_id, error)
        PAYMENT_OPERATIONS.labels(
            operation="webhook", result="failed", provider="mercado_pago"
        ).inc()
        raise HTTPException(503, "evento no procesado") from None
    await payments.finish_event(
        pool, event_id, intent_id=UUID(str(intent["id"])), status="processed"
    )
    PAYMENT_OPERATIONS.labels(
        operation="webhook", result="processed", provider="mercado_pago"
    ).inc()
    return {"status": "processed"}
