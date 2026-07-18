"""Persistencia transaccional e idempotente del dominio de pagos."""

import hashlib
import json
import re
from datetime import datetime, timezone
from uuid import UUID, uuid4

import asyncpg


class PaymentError(RuntimeError):
    pass


class PaymentNotFound(PaymentError):
    pass


class PaymentConflict(PaymentError):
    pass


class PaymentMismatch(PaymentError):
    pass


def _sha256(value: str | bytes) -> bytes:
    return hashlib.sha256(value.encode() if isinstance(value, str) else value).digest()


def _request_hash(value: dict) -> bytes:
    return _sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True))


def _render(row: asyncpg.Record) -> dict:
    value = dict(row)
    for key in (
        "expires_at", "approved_at", "rejected_at", "refunded_at",
        "last_provider_sync_at", "created_at", "updated_at",
    ):
        if value.get(key) is not None:
            value[key] = value[key].isoformat()
    return value


async def _load_target(
    connection: asyncpg.Connection, purpose: str, target_id: UUID
) -> dict:
    if purpose == "shop_order":
        row = await connection.fetchrow(
            """SELECT id, total AS amount, currency, customer_email AS payer_email,
                      status, payment_status
               FROM shop_orders WHERE id = $1 FOR UPDATE""",
            target_id,
        )
        if row is None:
            raise PaymentNotFound("pedido inexistente")
        if row["status"] in {"completed", "cancelled"}:
            raise PaymentConflict("el pedido ya está cerrado")
        return dict(row)
    if purpose == "appointment":
        row = await connection.fetchrow(
            """SELECT a.id, a.price_at_booking AS amount, 'ARS'::char(3) AS currency,
                      c.email AS payer_email, a.status, a.payment_status
               FROM appointments a JOIN customers c ON c.id = a.customer_id
               WHERE a.id = $1 FOR UPDATE""",
            target_id,
        )
        if row is None:
            raise PaymentNotFound("turno inexistente")
        if row["status"] != "active":
            raise PaymentConflict("el turno no está activo")
        return dict(row)
    raise PaymentConflict("propósito de pago inválido")


async def create_intent(
    pool: asyncpg.Pool,
    *,
    installation_id: str,
    purpose: str,
    target_id: UUID,
    provider: str,
    payer_email: str | None,
    idempotency_key: str,
    expires_at: datetime,
) -> tuple[dict, bool]:
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,62}", installation_id):
        raise PaymentConflict("installation_id inválido")
    if provider not in {"demo", "mercado_pago"}:
        raise PaymentConflict("proveedor inválido")
    if not 16 <= len(idempotency_key) <= 128:
        raise PaymentConflict("Idempotency-Key inválida")
    if payer_email and len(payer_email) > 320:
        raise PaymentConflict("email inválido")
    if expires_at.tzinfo is None or expires_at <= datetime.now(timezone.utc):
        raise PaymentConflict("vencimiento inválido")
    idempotency_hash = _sha256(idempotency_key)
    async with pool.acquire() as connection, connection.transaction():
        await connection.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", idempotency_key
        )
        target = await _load_target(connection, purpose, target_id)
        effective_email = (payer_email or target.get("payer_email") or "").strip().lower() or None
        request_hash = _request_hash(
            {
                "installation_id": installation_id,
                "purpose": purpose,
                "target_id": str(target_id),
                "provider": provider,
                "amount": target["amount"],
                "currency": target["currency"],
                "payer_email": effective_email,
            }
        )
        existing = await connection.fetchrow(
            """SELECT * FROM payment_intents
               WHERE installation_id = $1 AND idempotency_hash = $2""",
            installation_id, idempotency_hash,
        )
        if existing:
            if existing["request_hash"] != request_hash:
                raise PaymentConflict("Idempotency-Key ya fue usada con otros datos")
            return _render(existing), False
        intent_id = uuid4()
        external_reference = f"{installation_id}:{purpose}:{intent_id}"
        shop_order_id = target_id if purpose == "shop_order" else None
        appointment_id = target_id if purpose == "appointment" else None
        row = await connection.fetchrow(
            """INSERT INTO payment_intents (
                   id, installation_id, purpose, shop_order_id, appointment_id, provider,
                   external_reference, idempotency_hash, request_hash, amount, currency,
                   payer_email, sandbox, expires_at
               ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
               RETURNING *""",
            intent_id, installation_id, purpose, shop_order_id, appointment_id, provider,
            external_reference, idempotency_hash, request_hash, target["amount"],
            target["currency"], effective_email, provider == "demo", expires_at,
        )
        await connection.execute(
            """INSERT INTO payment_status_history (payment_intent_id, from_status, to_status, actor)
               VALUES ($1, NULL, 'created', 'api')""",
            intent_id,
        )
        if purpose == "shop_order":
            await connection.execute(
                """UPDATE shop_orders SET payment_method = 'mercado_pago',
                          payment_status = 'pending', status = 'pending', updated_at = now()
                   WHERE id = $1""",
                target_id,
            )
            if target["status"] != "pending":
                await connection.execute(
                    """INSERT INTO shop_order_status_history
                           (order_id, from_status, to_status, note, actor)
                       VALUES ($1,$2,'pending','Esperando pago online','payments')""",
                    target_id, target["status"],
                )
        else:
            await connection.execute(
                """UPDATE appointments SET payment_method = 'mercado_pago',
                          payment_status = 'pending', updated_at = now()
                   WHERE id = $1""",
                target_id,
            )
        return _render(row), True


async def attach_preference(
    pool: asyncpg.Pool,
    intent_id: UUID,
    *,
    provider_preference_id: str,
    checkout_url: str,
    sandbox: bool,
) -> dict:
    async with pool.acquire() as connection, connection.transaction():
        current = await connection.fetchrow(
            "SELECT * FROM payment_intents WHERE id = $1 FOR UPDATE", intent_id
        )
        if current is None:
            raise PaymentNotFound("intención inexistente")
        if current["provider_preference_id"]:
            if current["provider_preference_id"] != provider_preference_id:
                raise PaymentConflict("la intención ya tiene otra preferencia")
            return _render(current)
        row = await connection.fetchrow(
            """UPDATE payment_intents SET provider_preference_id = $2, checkout_url = $3,
                      sandbox = $4, status = 'pending', updated_at = now()
               WHERE id = $1 RETURNING *""",
            intent_id, provider_preference_id, checkout_url, sandbox,
        )
        await connection.execute(
            """INSERT INTO payment_status_history
                   (payment_intent_id, from_status, to_status, actor)
               VALUES ($1, $2, 'pending', 'provider')""",
            intent_id, current["status"],
        )
        return _render(row)


async def get_intent_by_reference(pool: asyncpg.Pool, external_reference: str) -> dict:
    row = await pool.fetchrow(
        "SELECT * FROM payment_intents WHERE external_reference = $1",
        external_reference,
    )
    if row is None:
        raise PaymentNotFound("intención inexistente")
    return _render(row)


async def shop_order_belongs_to_cart(
    pool: asyncpg.Pool, order_id: UUID, cart_token: str
) -> bool:
    """Usa el token-capability del carrito sin guardar ni comparar el valor plano."""
    if len(cart_token) < 32 or len(cart_token) > 128:
        return False
    return bool(await pool.fetchval(
        """SELECT 1 FROM shop_orders o
           JOIN shopping_carts c ON c.id = o.cart_id
           WHERE o.id = $1 AND c.token_hash = $2""",
        order_id, _sha256(cart_token),
    ))


async def cancel_shop_payment_to_store(
    pool: asyncpg.Pool, order_id: UUID, cart_token: str
) -> None:
    """Cancela la intención online sin liberar stock y vuelve al cobro local."""
    if len(cart_token) < 32 or len(cart_token) > 128:
        raise PaymentNotFound("pedido inexistente")
    async with pool.acquire() as connection, connection.transaction():
        order = await connection.fetchrow(
            """SELECT o.* FROM shop_orders o
               JOIN shopping_carts c ON c.id = o.cart_id
               WHERE o.id = $1 AND c.token_hash = $2
               FOR UPDATE OF o""",
            order_id, _sha256(cart_token),
        )
        if order is None:
            raise PaymentNotFound("pedido inexistente")
        if order["status"] in {"completed", "cancelled"}:
            raise PaymentConflict("el pedido ya está cerrado")
        intent = await connection.fetchrow(
            """SELECT * FROM payment_intents
               WHERE shop_order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE""",
            order_id,
        )
        if intent and intent["status"] in {"approved", "refunded"}:
            raise PaymentConflict("el pago ya fue acreditado")
        if intent and intent["status"] != "cancelled":
            await connection.execute(
                """UPDATE payment_intents SET status = 'cancelled', updated_at = now()
                   WHERE id = $1""",
                intent["id"],
            )
            await connection.execute(
                """INSERT INTO payment_status_history
                       (payment_intent_id, from_status, to_status, actor)
                   VALUES ($1,$2,'cancelled','public_capability')""",
                intent["id"], intent["status"],
            )
        new_status = "confirmed" if order["status"] == "pending" else order["status"]
        await connection.execute(
            """UPDATE shop_orders SET status = $2, payment_method = 'pay_at_store',
                      payment_status = 'unpaid', updated_at = now()
               WHERE id = $1""",
            order_id, new_status,
        )
        if new_status != order["status"]:
            await connection.execute(
                """INSERT INTO shop_order_status_history
                       (order_id, from_status, to_status, note, actor)
                   VALUES ($1,$2,$3,'Cliente eligió pagar en el local','payments')""",
                order_id, order["status"], new_status,
            )


def sanitized_provider_payload(payload: dict) -> dict:
    allowed = {
        "id", "status", "status_detail", "external_reference", "transaction_amount",
        "currency_id", "date_created", "date_approved", "date_last_updated",
        "payment_type_id", "payment_method_id", "operation_type",
    }
    return {key: payload[key] for key in allowed if key in payload}


async def register_event(
    pool: asyncpg.Pool,
    *,
    provider: str,
    provider_event_id: str,
    event_type: str,
    action: str,
    signature_valid: bool,
    payload: dict,
) -> tuple[int, bool]:
    clean_payload = sanitized_provider_payload(payload)
    payload_json = json.dumps(clean_payload, sort_keys=True, separators=(",", ":"))
    try:
        event_id = await pool.fetchval(
            """INSERT INTO payment_events
                   (provider, provider_event_id, event_type, action, signature_valid,
                    payload_hash, payload)
               VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id""",
            provider, provider_event_id, event_type, action, signature_valid,
            _sha256(payload_json), payload_json,
        )
        return int(event_id), True
    except asyncpg.UniqueViolationError:
        event_id = await pool.fetchval(
            "SELECT id FROM payment_events WHERE provider = $1 AND provider_event_id = $2",
            provider, provider_event_id,
        )
        return int(event_id), False


async def finish_event(
    pool: asyncpg.Pool,
    event_id: int,
    *,
    intent_id: UUID | None,
    status: str,
    error_code: str = "",
) -> None:
    if status not in {"processed", "ignored", "failed"}:
        raise ValueError("estado de evento inválido")
    await pool.execute(
        """UPDATE payment_events SET payment_intent_id = $2, processing_status = $3,
                  error_code = $4, processed_at = now() WHERE id = $1""",
        event_id, intent_id, status, error_code,
    )


async def retry_failed_event(pool: asyncpg.Pool, event_id: int) -> bool:
    """Permite que un reintento del proveedor recupere un fallo transitorio."""
    return bool(await pool.fetchval(
        """UPDATE payment_events SET processing_status = 'received', error_code = '',
                  processed_at = NULL
           WHERE id = $1 AND processing_status = 'failed'
           RETURNING 1""",
        event_id,
    ))


_TRANSITIONS = {
    "created": {"pending", "approved", "rejected", "cancelled", "expired"},
    "pending": {"approved", "rejected", "cancelled", "expired"},
    "rejected": {"pending", "approved", "cancelled", "expired"},
    "cancelled": {"approved"},
    "expired": {"approved"},
    "approved": {"refunded"},
    "refunded": set(),
}


async def apply_provider_payment(
    pool: asyncpg.Pool,
    *,
    external_reference: str,
    provider_payment_id: str,
    status: str,
    amount: int,
    currency: str,
    provider_event_id: str,
    actor: str = "webhook",
) -> dict:
    async with pool.acquire() as connection, connection.transaction():
        row = await connection.fetchrow(
            "SELECT * FROM payment_intents WHERE external_reference = $1 FOR UPDATE",
            external_reference,
        )
        if row is None:
            raise PaymentNotFound("intención inexistente")
        if row["amount"] != amount or row["currency"].strip() != currency:
            raise PaymentMismatch("importe o moneda no coinciden")
        current = row["status"]
        if status != current and status not in _TRANSITIONS[current]:
            raise PaymentConflict(f"transición de pago inválida: {current} → {status}")
        if row["provider_payment_id"] and row["provider_payment_id"] != provider_payment_id:
            if status != "approved":
                return _render(row)
            # Una preferencia puede tener intentos rechazados antes del aprobado.
        payment_status = "rejected" if status in {"cancelled", "expired"} else status
        updated = await connection.fetchrow(
            """UPDATE payment_intents SET status = $2, provider_payment_id = $3,
                      approved_at = CASE WHEN $2 = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
                      rejected_at = CASE WHEN $2 = 'rejected' THEN COALESCE(rejected_at, now()) ELSE rejected_at END,
                      refunded_at = CASE WHEN $2 = 'refunded' THEN COALESCE(refunded_at, now()) ELSE refunded_at END,
                      last_provider_sync_at = now(), updated_at = now()
               WHERE id = $1 RETURNING *""",
            row["id"], status, provider_payment_id,
        )
        if status != current:
            await connection.execute(
                """INSERT INTO payment_status_history
                       (payment_intent_id, from_status, to_status, provider_payment_id,
                        provider_event_id, actor)
                   VALUES ($1,$2,$3,$4,$5,$6)""",
                row["id"], current, status, provider_payment_id, provider_event_id, actor,
            )
        if row["purpose"] == "shop_order":
            old_order_status = await connection.fetchval(
                "SELECT status FROM shop_orders WHERE id = $1", row["shop_order_id"]
            )
            new_order_status = old_order_status
            if status == "approved" and old_order_status == "pending":
                new_order_status = "confirmed"
            elif status in {"cancelled", "expired"} and old_order_status == "pending":
                new_order_status = "cancelled"
            await connection.execute(
                """UPDATE shop_orders SET payment_status = $2, status = $3, updated_at = now()
                   WHERE id = $1""",
                row["shop_order_id"], payment_status, new_order_status,
            )
            if new_order_status != old_order_status:
                note = (
                    "Pago online acreditado"
                    if new_order_status == "confirmed"
                    else "Reserva de stock liberada por vencimiento del pago"
                )
                await connection.execute(
                    """INSERT INTO shop_order_status_history
                           (order_id, from_status, to_status, note, actor)
                       VALUES ($1,$2,$3,$4,'payments')""",
                    row["shop_order_id"], old_order_status, new_order_status, note,
                )
            if new_order_status == "cancelled" and old_order_status == "pending":
                items = await connection.fetch(
                    "SELECT product_id, quantity FROM shop_order_items WHERE order_id = $1",
                    row["shop_order_id"],
                )
                for item in items:
                    await connection.execute(
                        "UPDATE products SET qty = qty + $2, updated_at = now() WHERE id = $1",
                        item["product_id"], item["quantity"],
                    )
                    await connection.execute(
                        """INSERT INTO stock_movements
                               (product_id, delta, reason, created_by)
                           VALUES ($1,$2,'pago online vencido','payments')""",
                        item["product_id"], item["quantity"],
                    )
        else:
            if status in {"cancelled", "expired"}:
                await connection.execute(
                    """UPDATE appointments SET payment_method = 'pay_at_store',
                              payment_status = 'unpaid', updated_at = now()
                       WHERE id = $1""",
                    row["appointment_id"],
                )
            else:
                await connection.execute(
                    """UPDATE appointments SET payment_status = $2, updated_at = now()
                       WHERE id = $1""",
                    row["appointment_id"], payment_status,
                )
        return _render(updated)


async def pending_for_reconciliation(pool: asyncpg.Pool, limit: int = 100) -> list[dict]:
    rows = await pool.fetch(
        """SELECT * FROM payment_intents
           WHERE status IN ('created', 'pending') AND updated_at < now() - interval '2 minutes'
           ORDER BY updated_at LIMIT $1""",
        limit,
    )
    return [_render(row) for row in rows]
