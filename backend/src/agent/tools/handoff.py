"""Handoff a humano: asigna en Chatwoot y APAGA el bot para esa conversación.

La flag nox:bot_off:{conv} es el guard que el worker chequea antes de procesar
(defecto del agente inmobiliaria: el bot seguía respondiendo tras el handoff).
"""

import logging
from typing import Annotated

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from ...config import get_settings
from ...db.pool import get_pool
from ...integrations.chatwoot import ChatwootClient
from ...integrations.redis_client import get_redis, key
from .. import events

logger = logging.getLogger(__name__)

BOT_OFF_TTL = 7 * 24 * 3600  # failsafe: si nadie lo reactiva, el bot vuelve a la semana


async def perform_handoff(reason: str, state: dict) -> str:
    """Perform the durable handoff independently from the LLM tool wrapper."""
    conv_id = state["conversation_id"]
    phone = state.get("phone") or ""
    pool = await get_pool()
    await pool.execute(
        """
        INSERT INTO agent_handoffs (conversation_id, phone, reason)
        VALUES ($1, $2, $3)
        ON CONFLICT (conversation_id) DO UPDATE SET
            phone = EXCLUDED.phone, reason = EXCLUDED.reason, status = 'pending',
            attempts = 0, last_error = NULL, created_at = now(), completed_at = NULL
        """,
        conv_id,
        phone,
        reason,
    )

    r = await get_redis()
    await r.set(key(f"bot_off:{conv_id}"), reason, ex=BOT_OFF_TTL)
    await deliver_pending_handoff(conv_id)

    await events.log_event("handoff", conversation_id=conv_id, phone=phone)
    return (
        "Transferido. Avisale al cliente que en breve lo atiende una persona del equipo "
        "y despedite."
    )


async def deliver_pending_handoff(conversation_id: int) -> None:
    """Retry the external Chatwoot side of a durable handoff job."""
    pool = await get_pool()
    job = await pool.fetchrow(
        """
        SELECT conversation_id, phone, reason, created_at
        FROM agent_handoffs
        WHERE conversation_id = $1 AND status = 'pending'
        """,
        conversation_id,
    )
    if job is None:
        return

    settings = get_settings()
    note = f"🤖→👤 Handoff: {job['reason']}\nCliente: {job['phone']}"
    chatwoot = ChatwootClient()

    try:
        existing_note = await chatwoot.find_recent_private_note(
            conversation_id, note, job["created_at"]
        )
        if existing_note is None:
            await chatwoot.send_message(
                conversation_id, note, private=True
            )
        await chatwoot.add_label(conversation_id, ["handoff"])
        if settings.chatwoot_handoff_assignee_id:
            await chatwoot.assign_conversation(
                conversation_id, settings.chatwoot_handoff_assignee_id
            )
        await chatwoot.toggle_status(conversation_id, "open")
    except Exception as exc:
        logger.exception("error notificando handoff en Chatwoot")
        await pool.execute(
            """
            UPDATE agent_handoffs
            SET attempts = attempts + 1, last_error = left($2, 1000)
            WHERE conversation_id = $1
            """,
            conversation_id,
            str(exc),
        )
        raise
    finally:
        await chatwoot.close()

    await pool.execute(
        """
        UPDATE agent_handoffs
        SET status = 'completed', completed_at = now(), last_error = NULL
        WHERE conversation_id = $1
        """,
        conversation_id,
    )


@tool
async def handoff_to_human(reason: str, state: Annotated[dict, InjectedState]) -> str:
    """Transfiere la conversación a una persona del equipo. Usar ante quejas,
    pedidos fuera de alcance o cuando el cliente pide hablar con un humano."""
    return await perform_handoff(reason, state)
