"""Job diario de re-contacto: abandonado → follow-up (template) → descartado.

Corre como CronJob de k8s (python -m src.jobs.followups). No toca el consumer:
mira las conversaciones abiertas de Chatwoot y decide sobre el último mensaje.

Reglas:
- último mensaje del bot/agente y el cliente no respondió hace >= FOLLOWUP_AFTER_HOURS
  → estado 'abandonado'.
- si está 'abandonado' y aún no se mandó follow-up → envía 1 template y marca followups_sent=1.
- si sigue sin respuesta >= DISCARD_AFTER_HOURS con follow-up ya enviado → 'descartado'.
El estado sale de 'abandonado'/'descartado' solo cuando el cliente responde (webhook.touch_client).
"""

import asyncio
import logging
import time

from ..config import get_settings
from ..db.pool import close_pool, get_pool, init_pool
from ..integrations.chatwoot import ChatwootClient, send_whatsapp_template
from ..services import conversation_state as cstate

logging.basicConfig(level=get_settings().log_level)
logger = logging.getLogger("followups")


def _phone_of(conv: dict) -> str:
    sender = (conv.get("meta") or {}).get("sender") or {}
    return sender.get("phone_number") or ""


def _last_msg(msgs: list[dict]) -> dict | None:
    real = [m for m in msgs if not m.get("private") and m.get("message_type") in (0, 1)]
    return max(real, key=lambda m: m.get("created_at") or 0) if real else None


async def run() -> None:
    s = get_settings()
    await init_pool()
    pool = await get_pool()
    chatwoot = ChatwootClient()

    try:
        data = await chatwoot.list_conversations(status="open")
    except Exception:
        logger.exception("no pude listar conversaciones")
        await close_pool()
        return

    payload = (data.get("data") or {}).get("payload") or data.get("payload") or []
    states = await cstate.get_states_map(pool, [c["id"] for c in payload])
    now = time.time()
    n_aband = n_follow = n_discard = 0

    for conv in payload:
        cid = conv["id"]
        local = states.get(cid) or {}
        state = local.get("state")
        sent = local.get("followups_sent") or 0
        if state in ("archivado", "descartado"):
            continue
        phone = _phone_of(conv)

        try:
            msgs = await chatwoot.get_messages(cid)
        except Exception:  # noqa: BLE001
            continue
        last = _last_msg(msgs)
        if not last or last.get("message_type") == 0:
            continue  # sin mensajes o el cliente respondió último

        age_h = (now - float(last.get("created_at") or now)) / 3600
        if age_h < s.followup_after_hours:
            continue

        if state is None:
            await cstate.set_state(pool, cid, "abandonado", phone)
            state, n_aband = "abandonado", n_aband + 1

        if state == "abandonado" and sent == 0:
            # Marcamos el envío ANTES de mandarlo: si el proceso muere entre
            # el 200 de WhatsApp y este UPDATE, el peor caso es "no se marcó
            # y no se reintenta hasta mañana" en vez de "se manda duplicado" —
            # un follow-up perdido es mucho menos grave que uno repetido.
            await pool.execute(
                "UPDATE conversation_states SET followups_sent = followups_sent + 1, updated_at = now() WHERE conversation_id = $1",
                cid,
            )
            ok = await send_whatsapp_template(
                phone, s.whatsapp_followup_template, s.whatsapp_followup_lang
            )
            if ok:
                n_follow += 1
            else:
                logger.warning("followup marcado pero el envío falló para conv %s", cid)
        elif state == "abandonado" and sent >= 1 and age_h >= s.discard_after_hours:
            await cstate.set_state(pool, cid, "descartado", phone)
            n_discard += 1

    logger.info("followups: abandonados=%d follow-ups=%d descartados=%d", n_aband, n_follow, n_discard)
    await close_pool()


if __name__ == "__main__":
    asyncio.run(run())
