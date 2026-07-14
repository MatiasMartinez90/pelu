# NOX Backend

Backend + agente WhatsApp de NOX Barber. FastAPI + LangGraph + Chatwoot + RabbitMQ + Redis + PostgreSQL.

## Dev local

```bash
docker compose up -d postgres redis rabbitmq
export DATABASE_URL=postgresql://nox:nox@localhost:5433/nox?sslmode=disable
dbmate --migrations-dir db/migrations up
pip install -e ".[dev]"
uvicorn src.api.main:app --reload          # API
python -m src.queue.consumer               # worker (otra terminal)
```

Dos procesos, una imagen: `nox-api` (uvicorn) y `nox-worker` (consumer RabbitMQ).

## Contexto del agente

El agente carga al comienzo de cada turno el perfil del local, horarios y
profesionales desde PostgreSQL. La fuente institucional es `site_profile`; los
horarios salen de `schedule_rules` y el catálogo de `barbers`, `services` y
`barber_services`. La API pública expone la misma vista en `GET /api/v1/site`.

El perfil se administra mediante `GET/PATCH /api/v1/admin/site-profile` y las
reglas semanales mediante `GET/PUT /api/v1/admin/schedule-rules`. Los bloqueos
puntuales continúan en `/api/v1/admin/blocks`.

## Webhook firmado

En producción el webhook exige `X-Nox-Timestamp` y `X-Nox-Signature`. La firma
es `hex(HMAC-SHA256(WEBHOOK_SIGNING_SECRET, timestamp + "." + raw_body))` y
puede enviarse como `sha256=<hex>`. El timestamp Unix tiene una tolerancia de
cinco minutos y cada firma se acepta una sola vez. El modo `?token=` existe
únicamente para migración local y requiere `WEBHOOK_ALLOW_LEGACY_TOKEN=true`.
