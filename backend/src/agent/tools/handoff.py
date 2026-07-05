"""Handoff a humano: asigna en Chatwoot y APAGA el bot para esa conversación.

La flag nox:bot_off:{conv} es el guard que el worker chequea antes de procesar
(defecto del agente inmobiliaria: el bot seguía respondiendo tras el handoff).
"""

import logging
from typing import Annotated

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from ...config import get_settings
from ...integrations.chatwoot import ChatwootClient
from ...integrations.redis_client import get_redis, key
from .. import events

logger = logging.getLogger(__name__)

BOT_OFF_TTL = 7 * 24 * 3600  # failsafe: si nadie lo reactiva, el bot vuelve a la semana


@tool
async def handoff_to_human(reason: str, state: Annotated[dict, InjectedState]) -> str:
    """Transfiere la conversación a una persona del equipo. Usar ante quejas,
    pedidos fuera de alcance o cuando el cliente pide hablar con un humano."""
    conv_id = state["conversation_id"]
    settings = get_settings()

    r = await get_redis()
    await r.set(key(f"bot_off:{conv_id}"), reason, ex=BOT_OFF_TTL)

    try:
        chatwoot = ChatwootClient()
        await chatwoot.send_message(
            conv_id, f"🤖→👤 Handoff: {reason}\nCliente: {state.get('phone')}", private=True
        )
        await chatwoot.add_label(conv_id, ["handoff"])
        if settings.chatwoot_handoff_assignee_id:
            await chatwoot.assign_conversation(conv_id, settings.chatwoot_handoff_assignee_id)
        await chatwoot.toggle_status(conv_id, "open")
    except Exception:  # noqa: BLE001 — el bot igual queda apagado por la flag
        logger.exception("error notificando handoff en Chatwoot")

    await events.log_event("handoff", conversation_id=conv_id, phone=state.get("phone"))
    return (
        "Transferido. Avisale al cliente que en breve lo atiende una persona del equipo "
        "y despedite."
    )
