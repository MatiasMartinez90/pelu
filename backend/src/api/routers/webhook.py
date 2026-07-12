"""Webhook de Chatwoot. Valida token, bufferea en Redis y dispara el worker.

Chatwoot no firma los webhooks con HMAC: la autenticación es un token secreto
en la query string de la URL configurada en el inbox (401 si no matchea).
El endpoint nunca procesa el mensaje inline: LPUSH al buffer + trigger a Rabbit.
"""

import hashlib
import hmac
import json
import logging
import time

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import ValidationError
from pydantic import BaseModel, Field

from ...agent import events
from ...config import get_settings
from ...integrations.redis_client import get_redis, key, rate_limit_exceeded
from ...queue.producer import get_producer
from ...services import link_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["webhook"])


class WebhookMessage(BaseModel):
    id: int | None = None
    content: str | None = None
    message_type: str | int | None = None
    source_id: str | None = None
    sender: dict | None = None


class WebhookConversation(BaseModel):
    id: int | None = None
    meta: dict = Field(default_factory=dict)


class ChatwootWebhook(BaseModel):
    event: str = ""
    message: WebhookMessage | None = None
    conversation: WebhookConversation | None = None
    # Chatwoot a veces manda los campos del mensaje en el nivel raíz
    id: int | None = None
    content: str | None = None
    message_type: str | int | None = None
    source_id: str | None = None


async def _authenticate_webhook(request: Request, body: bytes, legacy_token: str) -> None:
    settings = get_settings()
    timestamp = request.headers.get("x-nox-timestamp", "")
    supplied = request.headers.get("x-nox-signature", "")
    if settings.webhook_signing_secret and timestamp and supplied:
        try:
            ts = int(timestamp)
        except ValueError:
            raise HTTPException(401, "firma inválida") from None
        if abs(int(time.time()) - ts) > settings.webhook_max_skew_seconds:
            raise HTTPException(401, "firma vencida")

        expected = hmac.new(
            settings.webhook_signing_secret.encode(),
            timestamp.encode() + b"." + body,
            hashlib.sha256,
        ).hexdigest()
        candidate = supplied.removeprefix("sha256=")
        if not hmac.compare_digest(candidate, expected):
            raise HTTPException(401, "firma inválida")

        # Una firma válida puede aceptarse una sola vez durante la ventana.
        replay_id = hashlib.sha256(timestamp.encode() + b":" + candidate.encode()).hexdigest()
        accepted = await (await get_redis()).set(
            key(f"webhook:seen:{replay_id}"), "1", ex=settings.webhook_max_skew_seconds, nx=True
        )
        if not accepted:
            raise HTTPException(409, "webhook repetido")
        return

    if settings.webhook_allow_legacy_token and settings.webhook_token:
        if hmac.compare_digest(legacy_token, settings.webhook_token):
            logger.warning("webhook autenticado con token legado; migrar a HMAC")
            return
    if not settings.webhook_signing_secret:
        raise HTTPException(503, "webhook firmado no configurado")
    raise HTTPException(401, "firma requerida")


@router.post("/webhook/chatwoot")
async def chatwoot_webhook(request: Request, token: str = Query(default="")):
    settings = get_settings()
    raw = await request.body()
    if len(raw) > settings.webhook_max_body_bytes:
        raise HTTPException(413, "payload demasiado grande")
    await _authenticate_webhook(request, raw, token)
    try:
        body = ChatwootWebhook.model_validate_json(raw)
    except ValidationError:
        raise HTTPException(422, "payload inválido") from None

    if body.event != "message_created":
        return {"status": "ignored"}

    msg_type = body.message.message_type if body.message else body.message_type
    if msg_type not in ("incoming", 0):
        return {"status": "ignored"}

    content = (body.message.content if body.message else body.content) or ""
    source_id = (body.message.source_id if body.message else body.source_id) or ""
    conversation_id = body.conversation.id if body.conversation else None
    if conversation_id is None or not content.strip():
        return {"status": "ignored"}

    phone = ""
    if body.conversation:
        sender = body.conversation.meta.get("sender") or {}
        phone = sender.get("phone_number") or ""
    if not phone and body.message and body.message.sender:
        phone = body.message.sender.get("phone_number") or ""

    # Rate limit por teléfono ANTES de procesar el claim: evita que alguien
    # spamee intentos de adivinar un token de vinculación (NOX-LINK-xxxxxxxx)
    # sin límite. Comparte presupuesto con el resto de los mensajes del agente.
    if phone and await rate_limit_exceeded(f"wa:{phone}"):
        await events.log_event("rate_limited", conversation_id=conversation_id, phone=phone)
        return {"status": "rate_limited"}

    # Vinculación de cuenta: si es un claim de /mi-cuenta, se procesa acá y no va al agente.
    if await link_service.try_claim_whatsapp(content, phone, conversation_id):
        return {"status": "linked"}

    # El cliente respondió: sale de abandonado/descartado y resetea el contador de follow-ups.
    try:
        from ...db.pool import get_pool
        from ...services import conversation_state as cstate

        await cstate.touch_client(await get_pool(), conversation_id, phone)
    except Exception as e:  # noqa: BLE001 — no romper el webhook
        logger.warning("touch_client error: %s", e)

    r = await get_redis()
    async with r.pipeline(transaction=False) as pipe:
        pipe.rpush(
            key(f"buf:{conversation_id}"),
            json.dumps({"content": content, "source_id": source_id}),
        )
        pipe.expire(key(f"buf:{conversation_id}"), 3600)
        pipe.set(key(f"last:{conversation_id}"), time.time(), ex=3600)
        await pipe.execute()

    await events.log_event("message_in", conversation_id=conversation_id, phone=phone)
    await get_producer().publish_trigger(conversation_id, phone)
    return {"status": "queued"}
