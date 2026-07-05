"""Cliente Chatwoot + typing indicator de WhatsApp Cloud API.

Adaptado del agente inmobiliaria; se agregan los métodos de listado que
necesita el proxy de conversaciones del admin.
"""

import logging

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)


async def send_whatsapp_typing(phone: str, message_id: str = "") -> None:
    """Mark-as-read + typing directo a WhatsApp Cloud API. Fire-and-forget."""
    s = get_settings()
    if not s.whatsapp_phone_number_id or not s.whatsapp_api_token or not message_id:
        return
    url = f"https://graph.facebook.com/v22.0/{s.whatsapp_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
        "typing_indicator": {"type": "text"},
    }
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                url,
                headers={"Authorization": f"Bearer {s.whatsapp_api_token}"},
                json=payload,
                timeout=5.0,
            )
    except Exception as e:  # noqa: BLE001 — nunca debe frenar el flujo de respuesta
        logger.warning("WhatsApp typing error: %s", e)


class ChatwootClient:
    def __init__(self) -> None:
        s = get_settings()
        self.base_url = s.chatwoot_url.rstrip("/")
        self.account_id = s.chatwoot_account_id
        self.headers = {"api_access_token": s.chatwoot_api_key}

    def _url(self, path: str) -> str:
        return f"{self.base_url}/api/v1/accounts/{self.account_id}/{path}"

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.request(method, self._url(path), headers=self.headers, **kwargs)
            resp.raise_for_status()
            return resp

    async def send_message(
        self, conversation_id: int, content: str, private: bool = False
    ) -> dict:
        resp = await self._request(
            "POST",
            f"conversations/{conversation_id}/messages",
            json={"content": content, "message_type": "outgoing", "private": private},
        )
        return resp.json()

    async def set_typing_status(self, conversation_id: int, typing: bool) -> None:
        try:
            await self._request(
                "POST",
                f"conversations/{conversation_id}/toggle_typing_status",
                json={"typing_status": "on" if typing else "off"},
            )
        except httpx.HTTPError as e:
            logger.warning("typing status error: %s", e)

    async def get_conversation(self, conversation_id: int) -> dict:
        resp = await self._request("GET", f"conversations/{conversation_id}")
        return resp.json()

    async def toggle_status(self, conversation_id: int, status: str) -> dict:
        resp = await self._request(
            "POST", f"conversations/{conversation_id}/toggle_status", json={"status": status}
        )
        return resp.json()

    async def assign_conversation(
        self, conversation_id: int, assignee_id: int | None = None
    ) -> dict:
        payload: dict = {"assignee_id": assignee_id}
        resp = await self._request(
            "POST", f"conversations/{conversation_id}/assignments", json=payload
        )
        return resp.json()

    async def add_label(self, conversation_id: int, labels: list[str]) -> dict:
        conv = await self.get_conversation(conversation_id)
        all_labels = sorted(set(conv.get("labels", []) + labels))
        resp = await self._request(
            "POST", f"conversations/{conversation_id}/labels", json={"labels": all_labels}
        )
        return resp.json()

    async def list_conversations(self, status: str | None = None, page: int = 1) -> dict:
        params: dict = {"page": page}
        if status:
            params["status"] = status
        resp = await self._request("GET", "conversations", params=params)
        return resp.json()

    async def get_messages(self, conversation_id: int) -> list[dict]:
        resp = await self._request("GET", f"conversations/{conversation_id}/messages")
        return resp.json().get("payload", [])
