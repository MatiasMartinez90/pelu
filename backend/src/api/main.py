"""API pública y privada; el consumer del agente corre en su propio deployment."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.middleware.gzip import GZipMiddleware

from ..config import get_settings
from ..db.pool import close_pool, get_pool, init_pool
from ..integrations.redis_client import close_redis, get_redis, wait_for_redis
from ..queue.producer import dispatch_outbox, get_producer
from .routers import (
    admin_agenda,
    admin_conversations,
    admin_dashboard,
    admin_orders,
    admin_settings,
    admin_stock,
    barber,
    me,
    public,
    shop,
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
    stop_dispatcher = asyncio.Event()
    dispatcher = asyncio.create_task(dispatch_outbox(stop_dispatcher))
    logger.info("api up (installation=%s)", get_settings().installation_id)
    yield
    stop_dispatcher.set()
    await dispatcher
    await get_producer().close()
    await close_redis()
    await close_pool()


settings = get_settings()
is_production = settings.environment.lower() == "production"
app = FastAPI(
    title=settings.service_name,
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_origin_regex=None if is_production else (settings.cors_origin_regex or None),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)

# asyncpg no tiene un timeout de acquire() global a nivel pool (solo por
# llamada, y pool.fetch/fetchrow/execute se usan directo en ~15 archivos sin
# pasarlo). En vez de tocar cada call site, un timeout de request acá cubre
# lo mismo — y cualquier otro cuelgue, no solo el del pool — con un único
# punto de cambio: si el pool está agotado bajo un pico, el cliente recibe
# un 503 rápido en vez de esperar indefinidamente.
REQUEST_TIMEOUT_S = 15


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["x-content-type-options"] = "nosniff"
    response.headers["x-frame-options"] = "DENY"
    response.headers["referrer-policy"] = "no-referrer"
    response.headers["permissions-policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["content-security-policy"] = "default-src 'none'; frame-ancestors 'none'"
    if is_production:
        response.headers["strict-transport-security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    try:
        return await asyncio.wait_for(call_next(request), timeout=REQUEST_TIMEOUT_S)
    except asyncio.TimeoutError:
        return JSONResponse(
            {"detail": "El servidor tardó demasiado en responder. Probá de nuevo."},
            status_code=503,
        )


app.include_router(public.router)
app.include_router(shop.router)
app.include_router(me.router)
app.include_router(barber.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_agenda.router)
app.include_router(admin_stock.router)
app.include_router(admin_orders.router)
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


@app.get("/metrics", include_in_schema=False)
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
