"""Redis client and safe per-conversation lease primitives."""

import asyncio
import logging
import secrets

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
            socket_connect_timeout=s.redis_connect_timeout_seconds,
            socket_timeout=s.redis_socket_timeout_seconds,
            health_check_interval=30,
            retry_on_timeout=True,
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


_EXTEND_LEASE = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('EXPIRE', KEYS[1], ARGV[2])
end
return 0
"""

_RELEASE_LEASE = """
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return -1 end
local wake = redis.call('GET', KEYS[2])
redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
if wake then return 1 end
return 0
"""


class ConversationLease:
    """A renewable Redis lease that can never delete another owner's lock."""

    def __init__(self, conversation_id: int, ttl_seconds: int) -> None:
        self.redis = None
        self.lock_key = key(f"lock:{conversation_id}")
        self.wake_key = key(f"wake:{conversation_id}")
        self.token = secrets.token_urlsafe(32)
        self.ttl_seconds = ttl_seconds
        self._heartbeat: asyncio.Task | None = None
        self.lost = False

    async def acquire(self) -> bool:
        self.redis = await get_redis()
        acquired = await self.redis.set(
            self.lock_key, self.token, nx=True, ex=self.ttl_seconds
        )
        if acquired:
            self._heartbeat = asyncio.create_task(self._renew_loop())
        else:
            await self.redis.set(self.wake_key, "1", ex=self.ttl_seconds * 2)
        return bool(acquired)

    async def _renew_loop(self) -> None:
        assert self.redis is not None
        try:
            while True:
                await asyncio.sleep(max(1, self.ttl_seconds // 3))
                renewed = await self.redis.eval(
                    _EXTEND_LEASE, 1, self.lock_key, self.token, self.ttl_seconds
                )
                if not renewed:
                    self.lost = True
                    logger.error("conversation lease lost: %s", self.lock_key)
                    return
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            self.lost = True
            logger.exception("conversation lease renewal failed: %s", self.lock_key)

    async def release(self) -> bool:
        """Release only our lease and atomically consume the wake flag."""
        if self._heartbeat:
            self._heartbeat.cancel()
            try:
                await self._heartbeat
            except asyncio.CancelledError:
                pass
        if self.redis is None:
            return False
        result = await self.redis.eval(
            _RELEASE_LEASE, 2, self.lock_key, self.wake_key, self.token
        )
        if result == -1:
            self.lost = True
            return False
        return result == 1
