"""Vinculación de un WhatsApp a una cuenta de cliente (portal /mi-cuenta).

El cliente logueado (identidad = email de Keycloak) genera un token de un solo
uso y lo envía DESDE su propio WhatsApp al número del negocio. El webhook
entrante recibe el phone real del remitente → prueba de posesión del número sin
necesidad de OTP saliente (que requeriría template aprobado). Recién ahí se
setea customers.email, habilitando el match de sus turnos hechos por WhatsApp.
"""

import logging
import re

from ..config import get_settings
from ..db.pool import get_pool
from ..integrations.chatwoot import ChatwootClient
from ..integrations.redis_client import get_redis, key

logger = logging.getLogger(__name__)

TOKEN_TTL = 900  # 15 min


def prefix() -> str:
    return get_settings().link_code_prefix.upper()


async def issue_token(email: str) -> str:
    """Genera un token de vinculación de un solo uso, atado al email del cliente."""
    import secrets

    token = secrets.token_hex(16)
    r = await get_redis()
    await r.set(key(f"link:{token}"), email, ex=TOKEN_TTL)
    return token


async def try_claim_whatsapp(content: str, phone: str, conversation_id: int | None) -> bool:
    """Si el mensaje entrante es un claim de vinculación, lo procesa y devuelve True.

    True = era un claim (no hay que pasarlo al agente). False = mensaje normal.
    """
    text = (content or "").strip()
    code_prefix = prefix()
    if not text.upper().startswith(code_prefix):
        return False

    token = (
        text[len(code_prefix) :].strip().split()[0].lower() if len(text) > len(code_prefix) else ""
    )
    r = await get_redis()
    # GETDEL evita que dos entregas concurrentes reclamen el mismo código.
    email = await r.getdel(key(f"link:{token}")) if token else None

    if not email:
        reply = "Ese código de vinculación venció o no es válido. Generá uno nuevo desde Mi Cuenta."
    else:
        digits = re.sub(r"\D", "", phone or "")
        if not digits:
            reply = "No pude leer tu número de WhatsApp. Probá de nuevo."
        else:
            pool = await get_pool()
            # Solo linkea si el customer no tiene email o ya es el mismo → evita hijack.
            updated = await pool.fetchval(
                r"""
                UPDATE customers SET email = $1
                WHERE regexp_replace(phone, '\D', '', 'g') = $2
                  AND (email IS NULL OR lower(email) = lower($1))
                RETURNING id
                """,
                email,
                digits,
            )
            reply = (
                f"✅ ¡Listo! Vinculé este WhatsApp a tu cuenta {get_settings().agent_name}. "
                "Ya podés ver tus turnos en Mi Cuenta."
                if updated
                else "Tu cuenta quedó lista. Si tenías turnos con otro número o email, escribinos y lo revisamos."
            )

    if conversation_id:
        try:
            await ChatwootClient().send_message(conversation_id, reply)
        except Exception as e:  # noqa: BLE001 — no romper el webhook por el reply
            logger.warning("link reply error: %s", e)
    logger.info("whatsapp link claim procesado (ok=%s)", bool(email))
    return True
