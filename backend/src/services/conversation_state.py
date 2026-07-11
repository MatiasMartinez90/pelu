"""Overlay local de estado de conversaciones (archivado/abandonado/descartado).

Chatwoot no modela estos estados; los guardamos en conversation_states y los
mezclamos con el estado derivado de Chatwoot al listar.
"""

from typing import Any

import asyncpg

LOCAL_STATES = ("archivado", "abandonado", "descartado")


async def get_states_map(pool: asyncpg.Pool, conversation_ids: list[int]) -> dict[int, dict[str, Any]]:
    if not conversation_ids:
        return {}
    rows = await pool.fetch(
        "SELECT conversation_id, state, followups_sent FROM conversation_states WHERE conversation_id = ANY($1)",
        conversation_ids,
    )
    return {r["conversation_id"]: dict(r) for r in rows}


async def set_state(pool: asyncpg.Pool, conversation_id: int, state: str | None, phone: str | None = None) -> None:
    await pool.execute(
        """
        INSERT INTO conversation_states (conversation_id, phone, state, updated_at)
        VALUES ($1, $2, $3, now())
        ON CONFLICT (conversation_id) DO UPDATE
          SET state = EXCLUDED.state,
              phone = COALESCE(EXCLUDED.phone, conversation_states.phone),
              updated_at = now()
        """,
        conversation_id,
        phone,
        state,
    )


async def touch_client(pool: asyncpg.Pool, conversation_id: int, phone: str | None = None) -> None:
    """El cliente escribió: registra last_client_msg_at y saca estados de inactividad."""
    await pool.execute(
        """
        INSERT INTO conversation_states (conversation_id, phone, last_client_msg_at, followups_sent, updated_at)
        VALUES ($1, $2, now(), 0, now())
        ON CONFLICT (conversation_id) DO UPDATE
          SET last_client_msg_at = now(),
              phone = COALESCE(EXCLUDED.phone, conversation_states.phone),
              followups_sent = 0,
              state = CASE WHEN conversation_states.state IN ('abandonado', 'descartado')
                           THEN NULL ELSE conversation_states.state END,
              updated_at = now()
        """,
        conversation_id,
        phone,
    )
