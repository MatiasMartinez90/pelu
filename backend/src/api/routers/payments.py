"""API pública de links de pago; las capacidades firmadas evitan IDs adivinables."""

from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, Response

from ...config import get_settings
from ...db.pool import get_pool
from ...db.repositories import payments
from ...integrations.redis_client import rate_limit_exceeded
from ...observability import PAYMENT_OPERATIONS
from ...payments.providers import PaymentProviderError
from ...payments.security import (
    InvalidSignature,
    sign_public_reference,
    verify_appointment_capability,
)
from ...services import payment_service
from ..client_ip import get_client_ip
from ..payment_schemas import (
    AppointmentPaymentPreferenceIn,
    DemoPaymentActionIn,
    PaymentPreferenceOut,
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
