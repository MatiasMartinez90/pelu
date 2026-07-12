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

## Webhook firmado

En producción el webhook exige `X-Nox-Timestamp` y `X-Nox-Signature`. La firma
es `hex(HMAC-SHA256(WEBHOOK_SIGNING_SECRET, timestamp + "." + raw_body))` y
puede enviarse como `sha256=<hex>`. El timestamp Unix tiene una tolerancia de
cinco minutos y cada firma se acepta una sola vez. El modo `?token=` existe
únicamente para migración local y requiere `WEBHOOK_ALLOW_LEGACY_TOKEN=true`.
