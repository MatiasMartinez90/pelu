"""app_settings (jsonb key/value)."""

import json
from typing import Any

import asyncpg

DEFAULTS: dict[str, Any] = {
    "agenda_open": True,
    "booking_channels": {"web": True, "whatsapp": True},
    "slot_granularity_min": 30,
    "min_lead_minutes": 60,
    "max_days_ahead": 30,
}


async def get_all(pool: asyncpg.Pool) -> dict[str, Any]:
    rows = await pool.fetch("SELECT key, value FROM app_settings")
    out = dict(DEFAULTS)
    for r in rows:
        out[r["key"]] = json.loads(r["value"])
    return out


async def set_value(pool: asyncpg.Pool, key: str, value: Any) -> None:
    await pool.execute(
        """
        INSERT INTO app_settings (key, value) VALUES ($1, $2::jsonb)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        """,
        key,
        json.dumps(value),
    )
