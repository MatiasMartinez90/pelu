"""Cliente Redis único (prefijo nox: en todas las keys — instancia compartida)."""

import logging

import redis.asyncio as redis

from ..config import get_settings

logger = logging.getLogger(__name__)

_client: redis.Redis | None = None


def key(suffix: str) -> str:
    return f"{get_settings().redis_prefix}{suffix}"


async def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        s = get_settings()
        _client = redis.Redis(
            host=s.redis_host,
            port=s.redis_port,
            password=s.redis_password or None,
            decode_responses=True,
        )
        logger.info("Redis client created: %s:%s", s.redis_host, s.redis_port)
    return _client


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def rate_limit_exceeded(identifier: str) -> bool:
    """INCR con ventana deslizante simple por identificador (ip o phone)."""
    s = get_settings()
    r = await get_redis()
    k = key(f"rl:{identifier}")
    count = await r.incr(k)
    if count == 1:
        await r.expire(k, s.rate_limit_window)
    return count > s.rate_limit_max
