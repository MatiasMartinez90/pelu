"""Proveedor de email transaccional desacoplado de OTP y campañas.

El servicio no envía nada si el proveedor está deshabilitado. Resend se
consume por HTTP usando httpx, ya incluido en las dependencias del backend;
esto evita acoplar el dominio a un SDK específico y permite reemplazarlo por
SMTP u otro proveedor en instalaciones futuras.
"""

from dataclasses import dataclass
from email.utils import parseaddr
from typing import Any

import httpx

from ..config import Settings, get_settings


class EmailConfigurationError(RuntimeError):
    """El proveedor no está configurado de forma utilizable."""


class EmailDeliveryError(RuntimeError):
    """El proveedor rechazó o no pudo aceptar el mensaje."""


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    html: str
    text: str | None = None
    reply_to: str | None = None


class ResendEmailProvider:
    endpoint = "https://api.resend.com/emails"

    def __init__(self, settings: Settings | None = None, client: httpx.AsyncClient | None = None):
        self.settings = settings or get_settings()
        self._client = client
        self._owns_client = client is None

    def _validate(self, message: EmailMessage) -> None:
        if self.settings.email_provider.lower() != "resend":
            raise EmailConfigurationError("EMAIL_PROVIDER no está configurado como resend")
        if not self.settings.resend_api_key:
            raise EmailConfigurationError("RESEND_API_KEY no está configurada")
        if not self.settings.email_from:
            raise EmailConfigurationError("EMAIL_FROM no está configurado")
        if not parseaddr(message.to)[1] or "@" not in parseaddr(message.to)[1]:
            raise ValueError("destinatario de email inválido")
        if not message.subject.strip() or not message.html.strip():
            raise ValueError("subject y html son obligatorios")

    async def send(self, message: EmailMessage) -> str:
        self._validate(message)
        payload: dict[str, Any] = {
            "from": self.settings.email_from,
            "to": [message.to],
            "subject": message.subject,
            "html": message.html,
        }
        if message.text:
            payload["text"] = message.text
        if message.reply_to:
            payload["reply_to"] = [message.reply_to]

        client = self._client or httpx.AsyncClient(timeout=self.settings.email_timeout_seconds)
        try:
            response = await client.post(
                self.endpoint,
                headers={"Authorization": f"Bearer {self.settings.resend_api_key}"},
                json=payload,
            )
        except httpx.HTTPError as exc:
            raise EmailDeliveryError("no se pudo conectar con Resend") from exc
        finally:
            if self._owns_client:
                await client.aclose()
        if response.is_error:
            detail = response.text[:500]
            raise EmailDeliveryError(f"Resend rechazó el email ({response.status_code}): {detail}")
        try:
            return str(response.json()["id"])
        except (ValueError, KeyError, TypeError) as exc:
            raise EmailDeliveryError("respuesta inválida de Resend") from exc


def get_email_provider(settings: Settings | None = None) -> ResendEmailProvider:
    """Factory única para que OTP/campañas compartan el mismo proveedor."""

    return ResendEmailProvider(settings=settings)
