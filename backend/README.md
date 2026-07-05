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
