"""Retry con backoff exponencial para conexiones a dependencias externas al arrancar.

Uso: Postgres/Redis/RabbitMQ pueden no estar listos todavía cuando el proceso
arranca (rolling restart coordinado, reinicio del nodo, etc.). asyncpg/aio-pika/
redis-py ya manejan reconexión una vez que la conexión inicial se estableció;
esto solo cubre ese primer intento, para no depender exclusivamente del
CrashLoopBackOff de k8s (que además puede generar un thundering herd si todas
las réplicas reintentan al mismo tiempo sin jitter).
"""

import asyncio
import logging
import random
from collections.abc import Awaitable, Callable
from typing import TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


async def retry_with_backoff(
    fn: Callable[[], Awaitable[T]],
    *,
    name: str,
    attempts: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
) -> T:
    """Reintenta fn() con backoff exponencial + jitter. Último intento propaga la excepción."""
    for attempt in range(1, attempts + 1):
        try:
            return await fn()
        except Exception:
            if attempt == attempts:
                logger.exception("%s: fallaron los %d intentos de conexión", name, attempts)
                raise
            delay = min(base_delay * 2 ** (attempt - 1), max_delay) * (0.8 + 0.4 * random.random())
            logger.warning(
                "%s: intento %d/%d falló, reintento en %.1fs", name, attempt, attempts, delay
            )
            await asyncio.sleep(delay)
    raise AssertionError("unreachable")
