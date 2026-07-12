"""Adaptador interno Chatwoot -> webhook NOX firmado.

Chatwoot autentica contra este servicio privado con el token legado. El
adaptador firma el body exacto y lo reenvía a la API, que nunca acepta ese
token desde Internet.
"""

import hashlib
import hmac
import time

import httpx
from fastapi import FastAPI, HTTPException, Query, Request, Response

from .config import get_settings

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


def signing_headers(body: bytes, secret: str, timestamp: int | None = None) -> dict[str, str]:
    value = str(timestamp if timestamp is not None else int(time.time()))
    digest = hmac.new(secret.encode(), value.encode() + b"." + body, hashlib.sha256).hexdigest()
    return {"x-nox-timestamp": value, "x-nox-signature": f"sha256={digest}"}


@app.post("/webhook/chatwoot")
async def forward_chatwoot(request: Request, token: str = Query(default="")):
    settings = get_settings()
    if not settings.webhook_token or not hmac.compare_digest(token, settings.webhook_token):
        raise HTTPException(401, "token inválido")
    if not settings.webhook_signing_secret:
        raise HTTPException(503, "firma no configurada")

    body = await request.body()
    if len(body) > settings.webhook_max_body_bytes:
        raise HTTPException(413, "payload demasiado grande")

    headers = signing_headers(body, settings.webhook_signing_secret)
    headers["content-type"] = request.headers.get("content-type", "application/json")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            upstream = await client.post(settings.webhook_signer_target_url, content=body, headers=headers)
    except httpx.HTTPError:
        raise HTTPException(502, "API NOX no disponible") from None
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type", "application/json"),
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
