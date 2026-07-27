"""API pública de links de pago; las capacidades firmadas evitan IDs adivinables."""

from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import ValidationError

from ...config import get_settings
from ...db.pool import get_pool
from ...db.repositories import payments
from ...integrations.redis_client import rate_limit_exceeded
from ...observability import PAYMENT_OPERATIONS
from ...payments.providers import PaymentProviderError
from ...payments.security import (
    InvalidSignature,
    sign_public_reference,
    validate_payment_service_signature,
    verify_appointment_capability,
)
from ...services import payment_service
from ..client_ip import get_client_ip
from ..payment_schemas import (
    AppointmentPaymentPreferenceIn,
    DemoPaymentActionIn,
    PaymentPreferenceOut,
    PaymentServiceCallbackIn,
    PaymentStatusOut,
    ShopPaymentPreferenceIn,
)

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


def _payment_error(error: Exception) -> HTTPException:
    if isinstance(error, (payments.PaymentNotFound, InvalidSignature)):
        return HTTPException(404, "link de pago inexistente")
    if isinstance(error, (payments.PaymentConflict, payments.PaymentMismatch)):
        return HTTPException(409, str(error))
    if isinstance(error, PaymentProviderError):
        status = 503 if error.retryable or error.code.endswith("_missing") else 422
        return HTTPException(status, error.code)
    return HTTPException(400, "no se pudo procesar el pago")


@router.post("/callbacks/service", status_code=204, include_in_schema=False)
async def payment_service_callback(
    request: Request,
    x_payment_timestamp: str = Header(..., alias="X-Payment-Timestamp"),
    x_payment_signature: str = Header(..., alias="X-Payment-Signature"),
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=16, max_length=150),
):
    settings = get_settings()
    if not settings.payment_service_url:
        raise HTTPException(404, "callback inexistente")
    if request.headers.get("content-type", "").split(";", 1)[0] != "application/json":
        raise HTTPException(415, "se requiere application/json")
    try:
        declared_length = int(request.headers.get("content-length") or 0)
    except ValueError:
        raise HTTPException(400, "content-length inválido") from None
    if declared_length > settings.payment_service_callback_max_body_bytes:
        raise HTTPException(413, "callback demasiado grande")
    raw_body = await request.body()
    if len(raw_body) > settings.payment_service_callback_max_body_bytes:
        raise HTTPException(413, "callback demasiado grande")
    try:
        validate_payment_service_signature(
            payload=raw_body,
            timestamp=x_payment_timestamp,
            signature=x_payment_signature,
            secret=settings.payment_service_callback_secret,
            max_skew_seconds=settings.payment_service_callback_max_skew_seconds,
        )
        payload = PaymentServiceCallbackIn.model_validate_json(raw_body)
    except InvalidSignature as error:
        raise HTTPException(401, str(error)) from None
    except ValidationError:
        raise HTTPException(422, "callback inválido") from None
    if payload.tenant_id != settings.installation_id:
        raise HTTPException(404, "pago inexistente")
    if payload.event != f"payment.{payload.status}":
        raise HTTPException(422, "evento y estado no coinciden")
    pool = await get_pool()
    try:
        intent = await payments.get_intent_by_reference(pool, payload.external_reference)
        if intent["installation_id"] != settings.installation_id:
            raise payments.PaymentNotFound("intención inexistente")
        event_id, created = await payments.register_event(
            pool,
            provider=intent["provider"],
            provider_event_id=idempotency_key,
            event_type=payload.event,
            action=payload.status,
            signature_valid=True,
            payload=payload.model_dump(mode="json"),
        )
        if not created and not await payments.retry_failed_event(pool, event_id):
            return Response(status_code=204)
        try:
            updated = await payments.apply_provider_payment(
                pool,
                external_reference=payload.external_reference,
                provider_payment_id=str(payload.payment_intent_id),
                status=payload.status,
                amount=payload.amount,
                currency=payload.currency,
                provider_event_id=idempotency_key,
                actor="payment_service_callback",
            )
        except payments.PaymentConflict:
            await payments.finish_event(
                pool,
                event_id,
                intent_id=UUID(str(intent["id"])),
                status="ignored",
                error_code="out_of_order",
            )
            return Response(status_code=204)
        except Exception:
            await payments.finish_event(
                pool,
                event_id,
                intent_id=UUID(str(intent["id"])),
                status="failed",
                error_code="callback_apply_failed",
            )
            raise
        await payments.finish_event(
            pool,
            event_id,
            intent_id=UUID(str(updated["id"])),
            status="processed",
        )
    except payments.PaymentError as error:
        raise _payment_error(error) from None
    return Response(status_code=204)


@router.post(
    "/shop-orders/{order_id}/preference",
    response_model=PaymentPreferenceOut,
    status_code=201,
)
async def create_shop_preference(
    order_id: UUID,
    body: ShopPaymentPreferenceIn,
    request: Request,
    response: Response,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=16, max_length=128),
):
    if await rate_limit_exceeded(f"payment-create:{get_client_ip(request)}"):
        raise HTTPException(429, "Demasiados intentos de pago")
    pool = await get_pool()
    if not await payments.shop_order_belongs_to_cart(pool, order_id, body.cart_token):
        raise HTTPException(404, "pedido inexistente")
    settings = get_settings()
    try:
        intent, created = await payment_service.create_preference(
            purpose="shop_order",
            target_id=order_id,
            idempotency_key=idempotency_key,
            settings=settings,
        )
        status_token = sign_public_reference(
            intent["external_reference"], settings.payment_link_secret
        )
    except (payments.PaymentError, PaymentProviderError, InvalidSignature, ValueError) as error:
        raise _payment_error(error) from None
    response.status_code = 201 if created else 200
    PAYMENT_OPERATIONS.labels(
        operation="preference", result="created" if created else "reused",
        provider=settings.payment_provider,
    ).inc()
    return {
        "checkout_url": intent["checkout_url"],
        "status_token": status_token,
        "status": intent["status"],
        "amount": intent["amount"],
        "currency": intent["currency"].strip(),
        "expires_at": intent["expires_at"],
        "sandbox": intent["sandbox"],
    }


@router.get("/status/{token}", response_model=PaymentStatusOut)
async def payment_status(token: str):
    try:
        return await payment_service.public_status(token)
    except (payments.PaymentError, InvalidSignature, ValueError) as error:
        raise _payment_error(error) from None


@router.post(
    "/appointments/{appointment_id}/preference",
    response_model=PaymentPreferenceOut,
    status_code=201,
)
async def create_appointment_preference(
    appointment_id: UUID,
    body: AppointmentPaymentPreferenceIn,
    request: Request,
    response: Response,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=16, max_length=128),
):
    if await rate_limit_exceeded(f"payment-create:{get_client_ip(request)}"):
        raise HTTPException(429, "Demasiados intentos de pago")
    settings = get_settings()
    try:
        verify_appointment_capability(
            body.capability_token, appointment_id, settings.payment_link_secret
        )
        intent, created = await payment_service.create_appointment_preference(
            appointment_id,
            idempotency_key=idempotency_key,
            settings=settings,
        )
        status_token = sign_public_reference(
            intent["external_reference"], settings.payment_link_secret
        )
    except (payments.PaymentError, PaymentProviderError, InvalidSignature, ValueError) as error:
        raise _payment_error(error) from None
    response.status_code = 201 if created else 200
    PAYMENT_OPERATIONS.labels(
        operation="preference", result="created" if created else "reused",
        provider=settings.payment_provider,
    ).inc()
    return {
        "checkout_url": intent["checkout_url"],
        "status_token": status_token,
        "status": intent["status"],
        "amount": intent["amount"],
        "currency": intent["currency"].strip(),
        "expires_at": intent["expires_at"],
        "sandbox": intent["sandbox"],
    }


@router.post("/shop-orders/{order_id}/pay-at-store", status_code=204)
async def pay_at_store(
    order_id: UUID,
    body: ShopPaymentPreferenceIn,
    request: Request,
):
    if await rate_limit_exceeded(f"payment-create:{get_client_ip(request)}"):
        raise HTTPException(429, "Demasiados intentos de pago")
    try:
        await payments.cancel_shop_payment_to_store(
            await get_pool(), order_id, body.cart_token
        )
    except payments.PaymentError as error:
        raise _payment_error(error) from None
    PAYMENT_OPERATIONS.labels(
        operation="payment_choice", result="pay_at_store", provider="internal"
    ).inc()
    return Response(status_code=204)


@router.post("/demo/{token}", response_model=PaymentStatusOut)
async def settle_demo(token: str, body: DemoPaymentActionIn, request: Request):
    if request.headers.get("content-type", "").split(";", 1)[0] != "application/json":
        raise HTTPException(415, "se requiere application/json")
    if await rate_limit_exceeded(f"payment-demo:{get_client_ip(request)}"):
        raise HTTPException(429, "Demasiados intentos de pago")
    try:
        result = await payment_service.settle_demo_payment(token, body.outcome)
        PAYMENT_OPERATIONS.labels(
            operation="demo_checkout", result=body.outcome, provider="demo"
        ).inc()
        return result
    except (payments.PaymentError, PaymentProviderError, InvalidSignature, ValueError) as error:
        raise _payment_error(error) from None
