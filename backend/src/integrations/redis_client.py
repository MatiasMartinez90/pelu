"""Cliente Redis único (prefijo nox: en todas las keys — instancia compartida)."""

import logging

import redis.asyncio as redis

from ..config import get_settings
from ..utils.retry import retry_with_backoff

logger = logging.getLogger(__name__)

_client: redis.Redis | None = None


def key(suffix: str) -> str:
    return f"{get_settings().redis_prefix}{suffix}"


async def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        s = get_settings()
        # redis.Redis() es lazy (no conecta acá); la conexión real ocurre en
        # el primer comando. Después de esto, redis-py reconecta solo por
        # comando si la conexión se cae — no hace falta lógica propia.
        _client = redis.Redis(
            host=s.redis_host,
            port=s.redis_port,
            password=s.redis_password or None,
            decode_responses=True,
        )
        logger.info("Redis client created: %s:%s", s.redis_host, s.redis_port)
    return _client


async def wait_for_redis() -> None:
    """Confirma con reintento que Redis responde. Usar una vez al arrancar."""

    async def _ping() -> None:
        r = await get_redis()
        await r.ping()

    await retry_with_backoff(_ping, name="redis")


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def rate_limit_exceeded(identifier: str) -> bool:
    """Contador atómico con TTL por identificador."""
    s = get_settings()
    r = await get_redis()
    k = key(f"rl:{identifier}")
    count = await r.eval(
        "local n=redis.call('INCR',KEYS[1]); "
        "if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
        1,
        k,
        s.rate_limit_window,
    )
    return count > s.rate_limit_max
