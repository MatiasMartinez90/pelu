"""Registro de eventos del agente en agent_events (alimenta la sección Agente IA)."""

import hashlib
import logging

from ..db.pool import get_pool

logger = logging.getLogger(__name__)


async def log_event(
    event_type: str,
    *,
    conversation_id: int | None = None,
    phone: str | None = None,
    tokens_in: int = 0,
    tokens_out: int = 0,
    cost_usd: float = 0.0,
    latency_ms: int = 0,
) -> None:
    try:
        from ..config import get_settings

        if phone and not get_settings().store_event_phone_plaintext:
            phone = "sha256:" + hashlib.sha256(phone.encode()).hexdigest()[:24]
        pool = await get_pool()
        await pool.execute(
            """
            INSERT INTO agent_events
                (conversation_id, phone, event_type, tokens_in, tokens_out, cost_usd, latency_ms)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            conversation_id,
            phone,
            event_type,
            tokens_in,
            tokens_out,
            cost_usd,
            latency_ms,
        )
    except Exception:  # noqa: BLE001 — telemetría nunca rompe el flujo
        logger.exception("no se pudo registrar agent_event %s", event_type)
