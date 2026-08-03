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
import hashlib
import logging
import time

from ..config import get_settings
from ..db.pool import close_pool, get_pool, init_pool
from ..integrations.chatwoot import ChatwootClient, send_whatsapp_template
from ..services import conversation_state as cstate

logging.basicConfig(level=get_settings().log_level)
logger = logging.getLogger("followups")
MAX_FOLLOWUP_ATTEMPTS = 3


async def _eligible_whatsapp_followup(pool, phone: str) -> bool:
    """Require an explicit service consent and honor the suppression list."""
    if not phone:
        return False
    destination_hash = hashlib.sha256(phone.strip().lower().encode()).digest()
    return bool(await pool.fetchval(
        """
        SELECT EXISTS (
          SELECT 1
            FROM customers c
            JOIN customer_consents cc ON cc.customer_id = c.id
           WHERE c.phone = $1
             AND cc.channel = 'whatsapp'
             AND cc.purpose = 'service'
             AND cc.granted_at IS NOT NULL
             AND cc.revoked_at IS NULL
             AND NOT EXISTS (
               SELECT 1 FROM marketing_suppressions ms
                WHERE ms.channel = 'whatsapp' AND ms.destination_hash = $2
             )
        )
        """,
        phone,
        destination_hash,
    ))


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
        attempts = local.get("followup_attempts") or 0
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

        next_attempt = local.get("followup_next_attempt_at")
        if state == "abandonado" and sent == 0 and attempts < MAX_FOLLOWUP_ATTEMPTS:
            if next_attempt is not None and next_attempt.timestamp() > now:
                continue
            if not await _eligible_whatsapp_followup(pool, phone):
                logger.info("follow-up omitido por falta de consentimiento/suppression para conv %s", cid)
                continue
            attempt = attempts + 1
            try:
                ok = await send_whatsapp_template(
                    phone, s.whatsapp_followup_template, s.whatsapp_followup_lang
                )
            except Exception as exc:  # noqa: BLE001 — persist bounded retry
                ok = False
                error = str(exc)
            else:
                error = None if ok else "provider_rejected"
            if ok:
                await pool.execute(
                    """UPDATE conversation_states
                           SET followups_sent = followups_sent + 1,
                               followup_attempts = $2, followup_last_attempt_at = now(),
                               followup_last_error = NULL, updated_at = now()
                         WHERE conversation_id = $1""", cid, attempt,
                )
                n_follow += 1
            else:
                delay = min(3600, 900 * (2 ** (attempt - 1)))
                await pool.execute(
                    """UPDATE conversation_states
                           SET followup_attempts = $2,
                               followup_last_attempt_at = now(),
                               followup_next_attempt_at = now() + ($3::int * interval '1 second'),
                               followup_last_error = $4, updated_at = now()
                         WHERE conversation_id = $1""", cid, attempt, delay, (error or "delivery_failed")[:160],
                )
                logger.warning("follow-up attempt %d failed for conv %s", attempt, cid)
        elif state == "abandonado" and sent >= 1 and age_h >= s.discard_after_hours:
            await cstate.set_state(pool, cid, "descartado", phone)
            n_discard += 1

    logger.info("followups: abandonados=%d follow-ups=%d descartados=%d", n_aband, n_follow, n_discard)
    await close_pool()


if __name__ == "__main__":
    asyncio.run(run())
