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
from ..payments.security import sign_public_reference, verify_public_reference


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
    status_token = sign_public_reference(
        intent["external_reference"], settings.payment_link_secret
    )
    reference = quote(status_token, safe="")
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


async def public_status(token: str, *, settings: Settings | None = None) -> dict:
    settings = settings or get_settings()
    reference = verify_public_reference(token, settings.payment_link_secret)
    intent = await payments.get_intent_by_reference(await get_pool(), reference)
    return {
        "purpose": intent["purpose"],
        "status": intent["status"],
        "amount": intent["amount"],
        "currency": intent["currency"].strip(),
        "expires_at": intent["expires_at"],
        "sandbox": intent["sandbox"],
    }


async def settle_demo_payment(
    token: str,
    outcome: str,
    *,
    settings: Settings | None = None,
) -> dict:
    settings = settings or get_settings()
    if settings.payment_provider != "demo":
        raise PaymentProviderError("demo_payments_disabled")
    if outcome not in {"approved", "rejected"}:
        raise PaymentProviderError("demo_outcome_invalid")
    reference = verify_public_reference(token, settings.payment_link_secret)
    pool = await get_pool()
    intent = await payments.get_intent_by_reference(pool, reference)
    if intent["provider"] != "demo":
        raise payments.PaymentConflict("la intención no pertenece al proveedor demo")
    event_key = f"demo:{intent['id']}:{outcome}"
    event_id, created = await payments.register_event(
        pool,
        provider="demo",
        provider_event_id=event_key,
        event_type="payment",
        action=outcome,
        signature_valid=True,
        payload={
            "id": event_key,
            "status": outcome,
            "external_reference": reference,
            "transaction_amount": intent["amount"],
            "currency_id": intent["currency"].strip(),
        },
    )
    if not created:
        return await public_status(token, settings=settings)
    try:
        updated = await payments.apply_provider_payment(
            pool,
            external_reference=reference,
            provider_payment_id=f"demo-{intent['id']}",
            status=outcome,
            amount=intent["amount"],
            currency=intent["currency"].strip(),
            provider_event_id=event_key,
            actor="demo_checkout",
        )
    except Exception:
        await payments.finish_event(
            pool, event_id, intent_id=UUID(str(intent["id"])), status="failed",
            error_code="demo_settlement_failed",
        )
        raise
    await payments.finish_event(
        pool, event_id, intent_id=UUID(str(intent["id"])), status="processed"
    )
    return {
        "purpose": updated["purpose"],
        "status": updated["status"],
        "amount": updated["amount"],
        "currency": updated["currency"].strip(),
        "expires_at": updated["expires_at"],
        "sandbox": updated["sandbox"],
    }


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


async def reconcile_pending(
    *,
    settings: Settings | None = None,
    provider: PaymentProvider | None = None,
    limit: int = 100,
) -> dict[str, int]:
    settings = settings or get_settings()
    pool = await get_pool()
    intents = await payments.pending_for_reconciliation(pool, limit)
    counts = {"checked": 0, "updated": 0, "expired": 0, "failed": 0}
    configured_provider = provider
    for intent in intents:
        counts["checked"] += 1
        try:
            expires_at = datetime.fromisoformat(intent["expires_at"])
            if expires_at <= datetime.now(timezone.utc):
                await payments.apply_provider_payment(
                    pool,
                    external_reference=intent["external_reference"],
                    provider_payment_id=f"expired-{intent['id']}",
                    status="expired",
                    amount=intent["amount"],
                    currency=intent["currency"].strip(),
                    provider_event_id=f"expiry:{intent['id']}",
                    actor="reconciliation",
                )
                counts["expired"] += 1
                continue
            if intent["provider"] == "demo":
                continue
            current_provider = configured_provider or payment_provider(settings)
            if current_provider.name != intent["provider"]:
                raise PaymentProviderError("provider_configuration_mismatch")
            if intent.get("provider_payment_id"):
                snapshot = await current_provider.get_payment(intent["provider_payment_id"])
            else:
                snapshot = await current_provider.find_payment(intent["external_reference"])
            if snapshot is None:
                continue
            await payments.apply_provider_payment(
                pool,
                external_reference=snapshot.external_reference,
                provider_payment_id=snapshot.provider_payment_id,
                status=snapshot.status,
                amount=snapshot.amount,
                currency=snapshot.currency,
                provider_event_id=f"reconcile:{snapshot.provider_payment_id}",
                actor="reconciliation",
            )
            counts["updated"] += 1
        except (payments.PaymentError, PaymentProviderError, ValueError):
            counts["failed"] += 1
    return counts
