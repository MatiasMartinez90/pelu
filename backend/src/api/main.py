"""FastAPI app de NOX. Solo API + webhook: el consumer corre en el deployment worker."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..config import get_settings
from ..db.pool import close_pool, get_pool, init_pool
from ..integrations.redis_client import close_redis, get_redis, wait_for_redis
from ..queue.producer import get_producer
from .routers import (
    admin_agenda,
    admin_conversations,
    admin_dashboard,
    admin_settings,
    admin_stock,
    barber,
    me,
    public,
    webhook,
)

logging.basicConfig(level=get_settings().log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    await wait_for_redis()
    try:
        await get_producer().connect()
    except Exception:  # noqa: BLE001 — la API puede servir el sitio sin Rabbit
        logger.exception("RabbitMQ no disponible al arrancar; el webhook reintentará")
    logger.info("nox-api up")
    yield
    await get_producer().close()
    await close_redis()
    await close_pool()


app = FastAPI(title="NOX Backend", version="0.1.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(public.router)
app.include_router(me.router)
app.include_router(barber.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_agenda.router)
app.include_router(admin_stock.router)
app.include_router(admin_settings.router)
app.include_router(admin_conversations.router)
app.include_router(webhook.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    pool = await get_pool()
    await pool.fetchval("SELECT 1")
    r = await get_redis()
    await r.ping()
    return {"status": "ready"}
