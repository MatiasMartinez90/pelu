"""Conciliación periódica de pagos pendientes y liberación de reservas vencidas."""

import asyncio
import logging

from ..config import get_settings
from ..db.pool import close_pool, init_pool
from ..services.payment_service import reconcile_pending

logging.basicConfig(level=get_settings().log_level)
logger = logging.getLogger("payment-reconciliation")


async def run() -> None:
    await init_pool()
    try:
        result = await reconcile_pending()
        logger.info("payment reconciliation: %s", result)
    finally:
        await close_pool()


if __name__ == "__main__":
    asyncio.run(run())
