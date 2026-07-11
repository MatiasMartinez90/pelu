"""Pool asyncpg global.

statement_cache_size=0 es obligatorio: en prod la app conecta vía el pooler
pgbouncer de CNPG en transaction mode, que no soporta prepared statements.
"""

import logging

import asyncpg

from ..config import get_settings
from ..utils.retry import retry_with_backoff

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_pool() first.")
    return _pool


async def init_pool() -> asyncpg.Pool:
    global _pool
    if _pool is not None:
        return _pool

    settings = get_settings()

    async def _connect() -> asyncpg.Pool:
        return await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=10,
            command_timeout=30,
            statement_cache_size=0,
        )

    # Reintento solo para la conexión inicial: una vez creado, el pool de
    # asyncpg ya descarta y repone conexiones rotas solas en cada acquire().
    _pool = await retry_with_backoff(_connect, name="postgres")
    logger.info("PostgreSQL pool created")
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL pool closed")
