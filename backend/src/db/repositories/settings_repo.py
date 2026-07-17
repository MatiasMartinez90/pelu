"""app_settings (jsonb key/value).

get_all() está en el camino caliente de cada cálculo de disponibilidad y
cada intento de reserva (availability_service/booking_service la llaman por
request). La tabla tiene un puñado de filas y cambia rarísima vez (solo
desde /admin/settings), así que se cachea en memoria con TTL corto en vez
de pegarle a la DB en cada request.
"""

import json
import time
from typing import Any

import asyncpg

DEFAULTS: dict[str, Any] = {
    "agenda_open": True,
    "booking_channels": {"web": True, "whatsapp": True, "telegram": True},
    "slot_granularity_min": 30,
    "min_lead_minutes": 60,
    "max_days_ahead": 30,
}

_CACHE_TTL = 10  # segundos
_cache: dict[str, Any] | None = None
_cache_at: float = 0.0


async def get_all(pool: asyncpg.Pool) -> dict[str, Any]:
    global _cache, _cache_at
    if _cache is not None and (time.monotonic() - _cache_at) < _CACHE_TTL:
        return _cache
    rows = await pool.fetch("SELECT key, value FROM app_settings")
    out = dict(DEFAULTS)
    for r in rows:
        out[r["key"]] = json.loads(r["value"])
    _cache, _cache_at = out, time.monotonic()
    return out


async def set_value(pool: asyncpg.Pool, key: str, value: Any) -> None:
    global _cache
    await pool.execute(
        """
        INSERT INTO app_settings (key, value) VALUES ($1, $2::jsonb)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        """,
        key,
        json.dumps(value),
    )
    _cache = None  # el próximo get_all relee de la DB
