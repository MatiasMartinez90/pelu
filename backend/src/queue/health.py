"""Servidor HTTP mínimo de liveness/readiness para nox-worker.

nox-worker no tiene Service (no recibe tráfico HTTP real, solo consume
RabbitMQ), así que esto solo lo usan los probes de k8s:
- /health (liveness): si el event loop está trabado (deadlock, llamada
  bloqueante), este endpoint tampoco responde y el probe falla → k8s
  reinicia el pod. Esa es la señal que nos falta hoy: sin esto, un worker
  colgado queda "Running" para siempre sin procesar nada.
- /ready (readiness): recién se marca ready una vez que el consumer está
  efectivamente conectado y consumiendo. Solo afecta cuánto tarda un
  rollout en contar el pod como disponible (no hay Service que gatee).
"""

import logging

import uvicorn
from fastapi import FastAPI, Response

logger = logging.getLogger(__name__)

app = FastAPI()

state = {"ready": False}


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/ready")
async def ready(response: Response) -> dict:
    if not state["ready"]:
        response.status_code = 503
        return {"status": "not ready"}
    return {"status": "ready"}


async def serve(port: int = 8001) -> None:
    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="warning")
    server = uvicorn.Server(config)
    await server.serve()
