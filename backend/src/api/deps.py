"""Dependencias FastAPI: validación de JWT admin contra Keycloak (JWKS)."""

import logging

import jwt
from fastapi import Depends, HTTPException, Request
from jwt import PyJWKClient

from ..config import get_settings
from ..db.pool import get_pool

logger = logging.getLogger(__name__)

_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        issuer = get_settings().keycloak_issuer.rstrip("/")
        _jwk_client = PyJWKClient(
            f"{issuer}/protocol/openid-connect/certs", cache_keys=True, lifespan=3600
        )
    return _jwk_client


async def require_admin(request: Request) -> dict:
    """Valida Bearer JWT de Keycloak y que el email sea admin.

    Auth de dos niveles: firma/issuer/expiración del token, y pertenencia del
    email a admin_users (o al fallback ADMIN_EMAILS por env).
    """
    settings = get_settings()
    if settings.auth_disabled:
        logger.warning("AUTH_DISABLED activo — solo válido en dev local")
        return {"email": "dev@localhost", "name": "Dev"}
    if not settings.keycloak_issuer:
        raise HTTPException(503, "auth no configurada")

    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "falta bearer token")
    token = auth.removeprefix("Bearer ").strip()

    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.keycloak_issuer.rstrip("/"),
            # Keycloak no siempre emite aud=client; validamos azp abajo.
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as e:
        logger.warning("JWT inválido: %s", e)
        raise HTTPException(401, "token inválido") from None

    if settings.keycloak_client_id:
        azp = claims.get("azp") or ""
        aud = claims.get("aud") or []
        aud_list = [aud] if isinstance(aud, str) else list(aud)
        if settings.keycloak_client_id not in {azp, *aud_list}:
            raise HTTPException(401, "token de otro cliente")

    email = (claims.get("email") or "").lower()
    if not email:
        raise HTTPException(403, "token sin email")

    pool = await get_pool()
    is_admin = await pool.fetchval(
        "SELECT 1 FROM admin_users WHERE lower(email) = $1 AND active", email
    )
    if not is_admin:
        fallback = {e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()}
        if email not in fallback:
            raise HTTPException(403, "no autorizado")

    return {"email": email, "name": claims.get("name", "")}


AdminUser = Depends(require_admin)
