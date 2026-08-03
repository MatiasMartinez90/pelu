"""Consent-aware campaign dispatcher with idempotency and bounded retries.

Campaigns are approved by an administrator and become ``scheduled``.  This
job claims one campaign at a time, materializes a deterministic delivery row
per destination, and retries transient provider failures without ever
creating duplicate rows or bypassing consent/suppression checks.
"""

import asyncio
import hashlib
import html
import logging
from typing import Any

from ..config import get_settings
from ..db.pool import close_pool, get_pool, init_pool
from ..integrations.chatwoot import send_whatsapp_template
from ..integrations.email import EmailMessage, get_email_provider

logger = logging.getLogger("campaigns")
MAX_ATTEMPTS = 3


def _digest(value: str) -> bytes:
    return hashlib.sha256(value.strip().lower().encode()).digest()


def _channel(content: dict[str, Any]) -> str:
    return str(content.get("channel") or "email").strip().lower()


def _message(content: dict[str, Any]) -> str:
    return str(content.get("message") or "").strip()


def _subject(content: dict[str, Any]) -> str:
    return str(content.get("subject") or "Novedades").strip()[:160]


async def _claim_campaign(pool) -> dict[str, Any] | None:
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                SELECT id, name, kind, content, audience
                  FROM campaigns
                 WHERE status = 'scheduled'
                   AND (scheduled_at IS NULL OR scheduled_at <= now())
                 ORDER BY COALESCE(scheduled_at, created_at), created_at
                 FOR UPDATE SKIP LOCKED
                 LIMIT 1
                """
            )
            if not row:
                return None
            await conn.execute(
                "UPDATE campaigns SET status='running', updated_at=now() WHERE id=$1",
                row["id"],
            )
            return dict(row)


def _segment_clause(segment: str) -> str:
    if segment == "frequent":
        return """EXISTS (
            SELECT 1 FROM appointments a
             WHERE a.customer_id = c.id
               AND a.status IN ('active', 'completed')
             GROUP BY a.customer_id HAVING count(*) >= 3
        )"""
    if segment == "high_spend":
        return """COALESCE((SELECT sum(a.price_at_booking) FROM appointments a
             WHERE a.customer_id = c.id AND a.status = 'completed'), 0) >= 100000"""
    if segment == "recent":
        return """EXISTS (SELECT 1 FROM appointments a
             WHERE a.customer_id = c.id AND a.starts_at >= now() - interval '90 days'
               AND a.status IN ('active', 'completed'))"""
    return "TRUE"


async def _materialize(pool, campaign: dict[str, Any]) -> int:
    content = campaign["content"] or {}
    audience = campaign["audience"] or {}
    channel = _channel(content)
    purpose = "marketing" if campaign["kind"] == "marketing" else "service"
    segment = str(audience.get("segment") or "all_consented")
    segment_sql = _segment_clause(segment)

    if channel == "email":
        destination = "c.email"
    elif channel in {"whatsapp", "telegram", "instagram"}:
        destination = "c.phone"
    else:
        logger.warning("campaign %s paused: unsupported channel %s", campaign["id"], channel)
        await pool.execute("UPDATE campaigns SET status='paused', updated_at=now() WHERE id=$1", campaign["id"])
        return -1

    # A campaign delivery is materialized only when the customer has an
    # active consent for the campaign purpose and is not suppressed.  The
    # unique constraint makes retries and overlapping workers idempotent.
    query = f"""
        INSERT INTO campaign_deliveries
            (campaign_id, customer_id, channel, destination_hash)
        SELECT $1, c.id, $2, digest(lower(trim({destination})), 'sha256')
          FROM customers c
         WHERE {destination} IS NOT NULL AND trim({destination}) <> ''
           AND {segment_sql}
           AND EXISTS (
               SELECT 1 FROM customer_consents cc
                WHERE cc.customer_id = c.id AND cc.channel = $2
                  AND cc.purpose = $3 AND cc.granted_at IS NOT NULL
                  AND cc.revoked_at IS NULL
           )
           AND NOT EXISTS (
               SELECT 1 FROM marketing_suppressions ms
                WHERE ms.channel = $2
                  AND ms.destination_hash = digest(lower(trim({destination})), 'sha256')
           )
        ON CONFLICT (campaign_id, channel, destination_hash) DO NOTHING
    """
    return int(await pool.execute(query, campaign["id"], channel, purpose).split()[-1])


async def _delivery_rows(pool, campaign_id) -> list[dict[str, Any]]:
    rows = await pool.fetch(
        """
        SELECT d.id, d.channel, d.status, d.attempts,
               CASE WHEN d.channel='email' THEN c.email ELSE c.phone END AS destination
          FROM campaign_deliveries d
          LEFT JOIN customers c ON c.id = d.customer_id
         WHERE d.campaign_id=$1
           AND d.status IN ('queued', 'failed')
           AND d.attempts < $2
           AND d.next_attempt_at <= now()
         ORDER BY d.queued_at
         LIMIT 100
        """,
        campaign_id,
        MAX_ATTEMPTS,
    )
    return [dict(row) for row in rows]


async def _mark(pool, delivery: dict[str, Any], *, status: str, provider_id: str | None = None, error: str | None = None) -> None:
    if status == "sent":
        await pool.execute(
            """UPDATE campaign_deliveries
                  SET status='sent', provider_id=$2, sent_at=now(), updated_at=now(), last_attempt_at=now()
                WHERE id=$1""",
            delivery["id"], provider_id,
        )
        return
    attempt = int(delivery["attempts"] or 0) + 1
    final = "failed" if attempt >= MAX_ATTEMPTS else "queued"
    delay = min(3600, 60 * (2 ** (attempt - 1)))
    await pool.execute(
        """UPDATE campaign_deliveries
              SET status=$2, attempts=$3, error_code=$4,
                  last_attempt_at=now(), next_attempt_at=now()+($5::int * interval '1 second'), updated_at=now()
            WHERE id=$1""",
        delivery["id"], final, attempt, (error or "delivery_failed")[:160], delay,
    )


async def _send(delivery: dict[str, Any], content: dict[str, Any]) -> str:
    message = _message(content)
    if not message:
        raise RuntimeError("empty_campaign_message")
    if delivery["channel"] == "email":
        return await get_email_provider().send(EmailMessage(
            to=delivery["destination"], subject=_subject(content),
            text=message,
            html=f"<p>{html.escape(message).replace(chr(10), '<br>')}</p>",
        ))
    if delivery["channel"] == "whatsapp":
        template = str(content.get("template") or get_settings().whatsapp_followup_template)
        if not template:
            raise RuntimeError("whatsapp_template_not_configured")
        ok = await send_whatsapp_template(delivery["destination"], template, get_settings().whatsapp_followup_lang, [message])
        if not ok:
            raise RuntimeError("whatsapp_delivery_failed")
        return template
    # Telegram/Instagram require a channel-specific Chatwoot source id. The
    # current customer table only stores phone/email, so fail explicitly and
    # safely instead of pretending the campaign was delivered.
    raise RuntimeError(f"{delivery['channel']}_provider_not_configured")


async def run() -> None:
    await init_pool()
    pool = await get_pool()
    try:
        campaign = await _claim_campaign(pool)
        if not campaign:
            logger.info("campaigns: no due campaign")
            return
        materialized = await _materialize(pool, campaign)
        if materialized < 0:
            return
        rows = await _delivery_rows(pool, campaign["id"])
        sent = failed = 0
        for delivery in rows:
            try:
                provider_id = await _send(delivery, campaign["content"] or {})
                await _mark(pool, delivery, status="sent", provider_id=provider_id)
                sent += 1
            except Exception as exc:  # noqa: BLE001 — persist retry and continue
                await _mark(pool, delivery, status="failed", error=str(exc))
                failed += 1
        pending = await pool.fetchval(
            "SELECT count(*) FROM campaign_deliveries WHERE campaign_id=$1 AND status IN ('queued','failed') AND attempts < $2",
            campaign["id"], MAX_ATTEMPTS,
        )
        if not pending:
            await pool.execute("UPDATE campaigns SET status='completed', updated_at=now() WHERE id=$1", campaign["id"])
        logger.info("campaign %s: sent=%d failed=%d pending=%s", campaign["id"], sent, failed, pending)
    finally:
        await close_pool()


if __name__ == "__main__":
    asyncio.run(run())
