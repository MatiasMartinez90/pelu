"""Bounded checkpoint thread lifecycle and privacy retention."""

from __future__ import annotations

import asyncpg


async def get_thread_id(
    pool: asyncpg.Pool, conversation_id: int, reset_after_days: int
) -> str:
    """Return a thread and rotate/delete stale checkpoint history after inactivity."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            current = await conn.fetchrow(
                """
                SELECT thread_id,
                       last_activity < now() - ($2 * interval '1 day') AS stale
                FROM agent_threads WHERE conversation_id = $1
                FOR UPDATE
                """,
                conversation_id,
                reset_after_days,
            )
            old_thread_id = None
            if current is None:
                thread_id = await conn.fetchval(
                    """
                    INSERT INTO agent_threads (conversation_id, thread_id)
                    VALUES ($1::bigint,
                            'chatwoot_' || ($1::bigint)::text || '_' || gen_random_uuid()::text)
                    RETURNING thread_id
                    """,
                    conversation_id,
                )
            elif current["stale"]:
                old_thread_id = current["thread_id"]
                thread_id = await conn.fetchval(
                    """
                    UPDATE agent_threads
                    SET thread_id = 'chatwoot_' || ($1::bigint)::text || '_'
                                    || gen_random_uuid()::text,
                        last_activity = now()
                    WHERE conversation_id = $1
                    RETURNING thread_id
                    """,
                    conversation_id,
                )
            else:
                thread_id = current["thread_id"]
                await conn.execute(
                    "UPDATE agent_threads SET last_activity = now() WHERE conversation_id = $1",
                    conversation_id,
                )

            if old_thread_id:
                checkpoint_tables = await conn.fetchval(
                    """
                    SELECT to_regclass('checkpoint_writes') IS NOT NULL
                       AND to_regclass('checkpoint_blobs') IS NOT NULL
                       AND to_regclass('checkpoints') IS NOT NULL
                    """
                )
                if checkpoint_tables:
                    await conn.execute(
                        "DELETE FROM checkpoint_writes WHERE thread_id = $1", old_thread_id
                    )
                    await conn.execute(
                        "DELETE FROM checkpoint_blobs WHERE thread_id = $1", old_thread_id
                    )
                    await conn.execute(
                        "DELETE FROM checkpoints WHERE thread_id = $1", old_thread_id
                    )
    return thread_id
