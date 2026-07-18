"""Orquestación entre persistencia propia y proveedores externos de pago."""

from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from uuid import UUID

import asyncpg

from ..config import Settings, get_settings
from ..db.pool import get_pool
from ..db.repositories import payments
from ..payments.providers import (
    PaymentItem,
    PaymentProvider,
    PaymentProviderError,
    PreferenceRequest,
    payment_provider,
)


async def _items(pool: asyncpg.Pool, intent: dict) -> tuple[PaymentItem, ...]:
    if intent["purpose"] == "shop_order":
        rows = await pool.fetch(
            """SELECT sku, product_name, quantity, unit_price
               FROM shop_order_items WHERE order_id = $1 ORDER BY id""",
            intent["shop_order_id"],
        )
        items = tuple(
            PaymentItem(
                id=row["sku"], title=row["product_name"],
                quantity=row["quantity"], unit_price=row["unit_price"],
            )
            for row in rows
        )
    else:
        row = await pool.fetchrow(
            """SELECT s.slug, s.name, a.price_at_booking
               FROM appointments a JOIN services s ON s.id = a.service_id
               WHERE a.id = $1""",
            intent["appointment_id"],
        )
        if row is None:
            raise payments.PaymentNotFound("turno inexistente")
        items = (
            PaymentItem(
                id=row["slug"], title=f"Turno · {row['name']}",
                quantity=1, unit_price=row["price_at_booking"],
            ),
        )
    if not items or sum(item.quantity * item.unit_price for item in items) != intent["amount"]:
        raise payments.PaymentMismatch("los items no coinciden con el importe")
    return items


def _validate_urls(settings: Settings) -> tuple[str, str]:
    public_url = settings.payment_public_url.rstrip("/")
    webhook_url = settings.payment_webhook_url
    if not public_url or not webhook_url:
        raise PaymentProviderError("payment_urls_missing")
    if settings.environment.lower() == "production" and (
        not public_url.startswith("https://") or not webhook_url.startswith("https://")
    ):
        raise PaymentProviderError("payment_https_required")
    return public_url, webhook_url


async def create_preference(
    *,
    purpose: str,
    target_id: UUID,
    idempotency_key: str,
    payer_email: str | None = None,
    settings: Settings | None = None,
    provider: PaymentProvider | None = None,
) -> tuple[dict, bool]:
    settings = settings or get_settings()
    provider = provider or payment_provider(settings)
    public_url, webhook_url = _validate_urls(settings)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.payment_preference_expiration_minutes
    )
    pool = await get_pool()
    intent, created = await payments.create_intent(
        pool,
        installation_id=settings.installation_id,
        purpose=purpose,
        target_id=target_id,
        provider=provider.name,
        payer_email=payer_email,
        idempotency_key=idempotency_key,
        expires_at=expires_at,
    )
    if intent.get("checkout_url"):
        return intent, created
    reference = quote(intent["external_reference"], safe="")
    result_url = f"{public_url}/pago/resultado?reference={reference}"
    request = PreferenceRequest(
        external_reference=intent["external_reference"],
        description=(
            "Compra con retiro en el local"
            if purpose == "shop_order"
            else "Pago de turno"
        ),
        amount=intent["amount"],
        currency=intent["currency"].strip(),
        payer_email=intent.get("payer_email"),
        items=await _items(pool, intent),
        success_url=f"{result_url}&result=success",
        pending_url=f"{result_url}&result=pending",
        failure_url=f"{result_url}&result=failure",
        notification_url=webhook_url,
        expires_at=expires_at,
        idempotency_key=str(intent["id"]),
    )
    preference = await provider.create_preference(request)
    intent = await payments.attach_preference(
        pool,
        UUID(str(intent["id"])),
        provider_preference_id=preference.provider_preference_id,
        checkout_url=preference.checkout_url,
        sandbox=preference.sandbox,
    )
    return intent, created


async def reconcile_provider_payment(
    provider_payment_id: str,
    *,
    provider_event_id: str,
    provider: PaymentProvider | None = None,
    actor: str = "webhook",
) -> dict:
    provider = provider or payment_provider(get_settings())
    snapshot = await provider.get_payment(provider_payment_id)
    return await payments.apply_provider_payment(
        await get_pool(),
        external_reference=snapshot.external_reference,
        provider_payment_id=snapshot.provider_payment_id,
        status=snapshot.status,
        amount=snapshot.amount,
        currency=snapshot.currency,
        provider_event_id=provider_event_id,
        actor=actor,
    )
