"""Admin: proxy de conversaciones a Chatwoot.

El front nunca habla con Chatwoot directo (la API key es account-level).
El estado que ve el admin se deriva de Chatwoot + la flag nox:bot_off:
- humano: assignee seteado (bot apagado por takeover/handoff)
- resuelta: status resolved
- pendiente: label handoff sin assignee
- bot: el resto (open sin assignee)
"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...db.pool import get_pool
from ...integrations.chatwoot import ChatwootClient
from ...integrations.redis_client import get_redis, key
from ..deps import AdminUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/conversations", tags=["admin"])

BOT_OFF_TTL = 7 * 24 * 3600


def _derive_status(conv: dict, bot_off: bool) -> str:
    meta = conv.get("meta") or {}
    if conv.get("status") == "resolved":
        return "resuelta"
    if meta.get("assignee") or bot_off:
        return "humano"
    if "handoff" in (conv.get("labels") or []):
        return "pendiente"
    return "bot"


def _phone_of(conv: dict) -> str:
    sender = (conv.get("meta") or {}).get("sender") or {}
    return sender.get("phone_number") or ""


@router.get("")
async def list_conversations(status: str | None = None, admin: dict = AdminUser):
    chatwoot = ChatwootClient()
    try:
        data = await chatwoot.list_conversations()
    except Exception as e:  # noqa: BLE001
        logger.exception("chatwoot list error")
        raise HTTPException(502, "Chatwoot no disponible") from e

    r = await get_redis()
    payload = (data.get("data") or {}).get("payload") or data.get("payload") or []
    out = []
    for conv in payload:
        bot_off = bool(await r.exists(key(f"bot_off:{conv['id']}")))
        st = _derive_status(conv, bot_off)
        if status and st != status:
            continue
        sender = (conv.get("meta") or {}).get("sender") or {}
        out.append(
            {
                "id": conv["id"],
                "status": st,
                "chatwoot_status": conv.get("status"),
                "name": sender.get("name") or _phone_of(conv) or f"Conv {conv['id']}",
                "phone": _phone_of(conv),
                "unread": conv.get("unread_count", 0),
                "last_activity_at": conv.get("last_activity_at"),
                "assignee": ((conv.get("meta") or {}).get("assignee") or {}).get("name"),
                "labels": conv.get("labels") or [],
            }
        )
    return out


@router.get("/{conversation_id}/messages")
async def get_messages(conversation_id: int, admin: dict = AdminUser):
    chatwoot = ChatwootClient()
    msgs = await chatwoot.get_messages(conversation_id)
    return [
        {
            "id": m.get("id"),
            "content": m.get("content"),
            "from": (
                "agent"
                if m.get("message_type") == 1 and (m.get("sender") or {}).get("type") == "user"
                else "bot"
                if m.get("message_type") == 1
                else "client"
            ),
            "private": m.get("private", False),
            "created_at": m.get("created_at"),
        }
        for m in msgs
        if m.get("message_type") in (0, 1)
    ]


class ReplyIn(BaseModel):
    content: str


@router.post("/{conversation_id}/messages", status_code=201)
async def send_reply(conversation_id: int, body: ReplyIn, admin: dict = AdminUser):
    # Responder como humano implica takeover implícito: el bot queda apagado.
    r = await get_redis()
    await r.set(key(f"bot_off:{conversation_id}"), f"reply de {admin['email']}", ex=BOT_OFF_TTL)
    chatwoot = ChatwootClient()
    return await chatwoot.send_message(conversation_id, body.content)


@router.post("/{conversation_id}/takeover")
async def takeover(conversation_id: int, admin: dict = AdminUser):
    r = await get_redis()
    await r.set(key(f"bot_off:{conversation_id}"), f"takeover de {admin['email']}", ex=BOT_OFF_TTL)
    chatwoot = ChatwootClient()
    from ...config import get_settings

    assignee = get_settings().chatwoot_handoff_assignee_id or None
    if assignee:
        await chatwoot.assign_conversation(conversation_id, assignee)
    await chatwoot.toggle_status(conversation_id, "open")
    return {"status": "humano"}


@router.post("/{conversation_id}/resolve")
async def resolve(conversation_id: int, admin: dict = AdminUser):
    chatwoot = ChatwootClient()
    await chatwoot.toggle_status(conversation_id, "resolved")
    return {"status": "resuelta"}


@router.post("/{conversation_id}/return-to-bot")
async def return_to_bot(conversation_id: int, admin: dict = AdminUser):
    r = await get_redis()
    await r.delete(key(f"bot_off:{conversation_id}"))
    chatwoot = ChatwootClient()
    await chatwoot.assign_conversation(conversation_id, None)
    await chatwoot.toggle_status(conversation_id, "open")
    return {"status": "bot"}


@router.get("/{conversation_id}/customer")
async def conversation_customer(conversation_id: int, admin: dict = AdminUser):
    chatwoot = ChatwootClient()
    conv = await chatwoot.get_conversation(conversation_id)
    phone = _phone_of(conv)
    if not phone:
        return {"phone": None, "visits": 0, "spent": 0, "appointments": []}
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        SELECT c.id, c.name, c.email,
               COUNT(a.id) FILTER (WHERE a.status = 'completed') AS visits,
               COALESCE(SUM(a.price_at_booking) FILTER (WHERE a.status = 'completed'), 0) AS spent
        FROM customers c LEFT JOIN appointments a ON a.customer_id = c.id
        WHERE c.phone = $1 GROUP BY c.id
        """,
        phone,
    )
    upcoming = await pool.fetch(
        """
        SELECT a.starts_at, s.name AS service, b.name AS barber
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        JOIN services s ON s.id = a.service_id
        JOIN barbers b ON b.id = a.barber_id
        WHERE c.phone = $1 AND a.status = 'active' AND a.starts_at > now()
        ORDER BY a.starts_at LIMIT 5
        """,
        phone,
    )
    return {
        "phone": phone,
        **(dict(row) if row else {"name": None, "visits": 0, "spent": 0}),
        "upcoming": [dict(u) for u in upcoming],
    }
