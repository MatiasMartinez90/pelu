"""Durable inbox/outbox and reply storage for the WhatsApp agent."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

import asyncpg


async def enqueue_message(
    pool: asyncpg.Pool,
    *,
    message_id: str,
    conversation_id: int,
    phone: str,
    content: str,
    source_id: str,
) -> dict[str, Any] | None:
    """Insert an inbound message and its publish event atomically.

    A duplicate Chatwoot message ID is a successful no-op.
    """
    async with pool.acquire() as conn:
        async with conn.transaction():
            inbox = await conn.fetchrow(
                """
                INSERT INTO agent_inbox
                    (chatwoot_message_id, conversation_id, phone, content, source_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (chatwoot_message_id) DO NOTHING
                RETURNING id
                """,
                message_id,
                conversation_id,
                phone,
                content,
                source_id,
            )
            if inbox is None:
                return None
            payload = {"conversation_id": conversation_id, "phone": phone}
            outbox = await conn.fetchrow(
                """
                INSERT INTO agent_outbox (conversation_id, payload)
                VALUES ($1, $2::jsonb)
                RETURNING id, conversation_id, payload
                """,
                conversation_id,
                json.dumps(payload),
            )
    return dict(outbox)


async def pending_outbox(pool: asyncpg.Pool, limit: int = 100) -> list[dict[str, Any]]:
    """Lease unpublished events so multiple API replicas never race publication."""
    token = uuid4()
    async with pool.acquire() as conn:
        async with conn.transaction():
            rows = await conn.fetch(
                """
                SELECT id, conversation_id, payload
                FROM agent_outbox
                WHERE published_at IS NULL AND available_at <= now()
                  AND (locked_until IS NULL OR locked_until < now())
                ORDER BY created_at
                LIMIT $1
                FOR UPDATE SKIP LOCKED
                """,
                limit,
            )
            if rows:
                await conn.execute(
                    """
                    UPDATE agent_outbox
                    SET locked_until = now() + interval '30 seconds', lock_token = $2
                    WHERE id = ANY($1::uuid[])
                    """,
                    [row["id"] for row in rows],
                    token,
                )
    return [dict(row) for row in rows]


async def mark_outbox_published(pool: asyncpg.Pool, outbox_id: UUID | str) -> None:
    await pool.execute(
        """
        UPDATE agent_outbox SET published_at = now(), last_error = NULL,
                                locked_until = NULL, lock_token = NULL
        WHERE id = $1
        """,
        outbox_id,
    )


async def mark_outbox_failed(pool: asyncpg.Pool, outbox_id: UUID | str, error: str) -> None:
    await pool.execute(
        """
        UPDATE agent_outbox
        SET attempts = attempts + 1,
            last_error = left($2, 1000),
            locked_until = NULL,
            lock_token = NULL,
            available_at = now() + least(interval '5 minutes',
                interval '1 second' * power(2, least(attempts, 8)))
        WHERE id = $1
        """,
        outbox_id,
        error,
    )


async def latest_pending_received_at(
    pool: asyncpg.Pool, conversation_id: int
) -> datetime | None:
    return await pool.fetchval(
        """
        SELECT max(received_at) FROM agent_inbox
        WHERE conversation_id = $1 AND status <> 'processed'
        """,
        conversation_id,
    )


async def claim_batch(
    pool: asyncpg.Pool,
    conversation_id: int,
    *,
    lease_seconds: int,
    limit: int = 100,
) -> tuple[UUID, list[dict[str, Any]]] | None:
    """Claim pending or abandoned messages for one conversation."""
    batch_id = uuid4()
    async with pool.acquire() as conn:
        async with conn.transaction():
            rows = await conn.fetch(
                """
                SELECT id, chatwoot_message_id, phone, content, source_id, received_at
                FROM agent_inbox
                WHERE conversation_id = $1
                  AND (status = 'pending'
                       OR (status = 'processing' AND locked_until < now()))
                ORDER BY received_at
                LIMIT $2
                FOR UPDATE SKIP LOCKED
                """,
                conversation_id,
                limit,
            )
            if not rows:
                return None
            ids = [row["id"] for row in rows]
            await conn.execute(
                """
                UPDATE agent_inbox
                SET status = 'processing', batch_id = $2,
                    locked_until = now() + ($3 * interval '1 second')
                WHERE id = ANY($1::uuid[])
                """,
                ids,
                batch_id,
                lease_seconds,
            )
    return batch_id, [dict(row) for row in rows]


async def release_batch(pool: asyncpg.Pool, batch_id: UUID) -> None:
    await pool.execute(
        """
        UPDATE agent_inbox
        SET status = 'pending', batch_id = NULL, locked_until = NULL
        WHERE batch_id = $1 AND status = 'processing'
        """,
        batch_id,
    )


async def discard_pending(pool: asyncpg.Pool, conversation_id: int) -> None:
    await pool.execute(
        """
        UPDATE agent_inbox
        SET status = 'processed', processed_at = now(), locked_until = NULL
        WHERE conversation_id = $1 AND status <> 'processed'
        """,
        conversation_id,
    )


async def complete_batch_with_reply(
    pool: asyncpg.Pool,
    *,
    batch_id: UUID,
    conversation_id: int,
    content: str,
) -> dict[str, Any]:
    """Persist the reply and complete its inbox batch in one transaction."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            reply = await conn.fetchrow(
                """
                INSERT INTO agent_replies (batch_id, conversation_id, content)
                VALUES ($1, $2, $3)
                ON CONFLICT (batch_id) DO UPDATE SET content = agent_replies.content
                RETURNING id, batch_id, conversation_id, content, status
                """,
                batch_id,
                conversation_id,
                content,
            )
            await conn.execute(
                """
                UPDATE agent_inbox
                SET status = 'processed', processed_at = now(), locked_until = NULL
                WHERE batch_id = $1
                """,
                batch_id,
            )
    return dict(reply)


async def get_pending_reply(
    pool: asyncpg.Pool, conversation_id: int
) -> dict[str, Any] | None:
    row = await pool.fetchrow(
        """
        SELECT id, batch_id, conversation_id, content, attempts, created_at
        FROM agent_replies
        WHERE conversation_id = $1 AND status = 'pending'
        ORDER BY created_at
        LIMIT 1
        """,
        conversation_id,
    )
    return dict(row) if row else None


async def mark_reply_sent(
    pool: asyncpg.Pool, reply_id: UUID, chatwoot_message_id: str | None
) -> None:
    await pool.execute(
        """
        UPDATE agent_replies
        SET status = 'sent', sent_at = now(), chatwoot_message_id = $2, last_error = NULL
        WHERE id = $1
        """,
        reply_id,
        chatwoot_message_id,
    )


async def mark_reply_failed(pool: asyncpg.Pool, reply_id: UUID, error: str) -> None:
    await pool.execute(
        """
        UPDATE agent_replies SET attempts = attempts + 1, last_error = left($2, 1000)
        WHERE id = $1
        """,
        reply_id,
        error,
    )


async def prune_delivery_data(
    pool: asyncpg.Pool, retention_days: int, event_retention_days: int
) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    await pool.execute(
        "DELETE FROM agent_outbox WHERE published_at IS NOT NULL AND created_at < $1", cutoff
    )
    await pool.execute(
        "DELETE FROM agent_inbox WHERE status = 'processed' AND processed_at < $1", cutoff
    )
    await pool.execute(
        "DELETE FROM agent_replies WHERE status = 'sent' AND sent_at < $1", cutoff
    )
    await pool.execute(
        "DELETE FROM agent_handoffs WHERE status = 'completed' AND completed_at < $1", cutoff
    )
    await pool.execute(
        """
        DELETE FROM agent_pending_actions
        WHERE (status = 'completed' AND completed_at < $1)
           OR (status = 'pending' AND expires_at < now())
        """,
        cutoff,
    )
    event_cutoff = datetime.now(timezone.utc) - timedelta(days=event_retention_days)
    await pool.execute("DELETE FROM agent_events WHERE created_at < $1", event_cutoff)
