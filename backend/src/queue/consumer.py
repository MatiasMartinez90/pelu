"""Worker standalone: consume triggers de RabbitMQ y corre el agente.

Correcciones sobre el diseño del agente inmobiliaria:
- Proceso separado de la API (este módulo es el entrypoint del deployment worker).
- Guard de handoff: si la conversación pasó a un humano, el bot no responde.
- Debounce: mensajes consecutivos del cliente se juntan en un solo turno del LLM.
- Lock por conversación: dos workers nunca procesan la misma conversación a la vez.
- Reintentos acotados: la cola quorum tiene x-delivery-limit; los mensajes
  venenosos terminan en la DLQ en lugar de re-encolarse para siempre.
"""

import asyncio
import logging
import time

import aio_pika

from ..agent import events
from ..agent.graph import create_agent, run_agent
from ..agent.tools.handoff import deliver_pending_handoff
from ..config import get_settings
from ..db.pool import close_pool, get_pool, init_pool
from ..db.repositories import agent_delivery
from ..integrations.chatwoot import ChatwootClient, send_whatsapp_typing
from ..integrations.redis_client import (
    ConversationLease,
    close_redis,
    get_redis,
    key,
    wait_for_redis,
)
from ..observability import LOCK_CONTENTION, QUEUE_MESSAGES
from ..utils.retry import retry_with_backoff
from . import health
from .producer import get_producer
from .topology import declare_topology

logger = logging.getLogger(__name__)

async def _wait_debounce(conversation_id: int) -> None:
    """Espera hasta que el cliente deje de escribir (debounce_seconds sin actividad)."""
    settings = get_settings()
    while True:
        latest = await agent_delivery.latest_pending_received_at(await get_pool(), conversation_id)
        if latest is None:
            return
        elapsed = time.time() - latest.timestamp()
        if elapsed >= settings.debounce_seconds:
            return
        await asyncio.sleep(settings.debounce_seconds - elapsed + 0.1)


async def _bot_is_off(conversation_id: int, chatwoot: ChatwootClient) -> bool:
    r = await get_redis()
    if await r.exists(key(f"bot_off:{conversation_id}")):
        await deliver_pending_handoff(conversation_id)
        return True
    # Fallback: conversación asignada a humano o resuelta en Chatwoot.
    try:
        conv = await chatwoot.get_conversation(conversation_id)
        meta = conv.get("meta", {})
        if meta.get("assignee"):
            return True
        if conv.get("status") == "resolved":
            return True
    except Exception as exc:
        # Fail closed without discarding the durable inbox: when human/bot
        # ownership cannot be established, Rabbit retries later.
        raise RuntimeError(
            f"no se pudo verificar el ownership de la conversación {conversation_id}"
        ) from exc
    return False


class Worker:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.chatwoot = ChatwootClient()
        self.agent = None
        self._checkpointer_cm = None

    async def start(self) -> None:
        # Arranca primero y solo: si esto no responde, el event loop está
        # trabado y el liveness probe lo va a detectar aunque el resto del
        # startup (pool/redis/rabbit, con sus propios reintentos) todavía no
        # haya terminado.
        health_task = asyncio.create_task(health.serve())

        await init_pool()
        await wait_for_redis()

        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        checkpoint_url = self.settings.checkpoint_database_url or self.settings.database_url
        self._checkpointer_cm = AsyncPostgresSaver.from_conn_string(checkpoint_url)
        checkpointer = await self._checkpointer_cm.__aenter__()
        await checkpointer.setup()
        self.agent = create_agent(checkpointer)
        logger.info("nox-worker: agente listo")

        connection = await retry_with_backoff(
            lambda: aio_pika.connect_robust(self.settings.rabbitmq_url), name="rabbitmq (worker)"
        )
        async with connection:
            health.state["rabbit_connection"] = connection
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=4)
            queue = await declare_topology(channel)
            logger.info("nox-worker: consumiendo %s", self.settings.queue_name)
            await queue.consume(self.on_message)
            health.state["ready"] = True
            await asyncio.gather(health_task, asyncio.Future())  # correr para siempre

    async def on_message(self, message: aio_pika.abc.AbstractIncomingMessage) -> None:
        try:
            import json

            payload = json.loads(message.body)
            conversation_id = int(payload["conversation_id"])
            phone = payload.get("phone", "")
        except (json.JSONDecodeError, KeyError, ValueError):
            logger.error("payload inválido, va a DLQ: %r", message.body[:200])
            await message.reject(requeue=False)
            return

        try:
            retry_count = int((message.headers or {}).get("x-nox-retry-count") or 0)
            await self.process(
                conversation_id,
                phone,
                allow_agent_fallback=retry_count >= self.settings.queue_delivery_limit,
            )
            await message.ack()
            QUEUE_MESSAGES.labels("processed").inc()
        except Exception:  # noqa: BLE001
            logger.exception("error procesando conv %s", conversation_id)
            await events.log_event("error", conversation_id=conversation_id, phone=phone)
            retry_count = int((message.headers or {}).get("x-nox-retry-count") or 0)
            if retry_count < self.settings.queue_delivery_limit:
                delay = min(
                    self.settings.queue_retry_base_seconds * (2**retry_count), 300
                )
                await get_producer().publish_retry(payload, retry_count + 1, delay)
                await message.ack()
                QUEUE_MESSAGES.labels("retry_scheduled").inc()
            else:
                logger.error("conv %s agotó reintentos; va a DLQ", conversation_id)
                await message.reject(requeue=False)
                QUEUE_MESSAGES.labels("dlq").inc()

    async def process(
        self, conversation_id: int, phone: str, *, allow_agent_fallback: bool = False
    ) -> None:
        if await _bot_is_off(conversation_id, self.chatwoot):
            logger.info("bot apagado para conv %s, skip", conversation_id)
            await agent_delivery.discard_pending(await get_pool(), conversation_id)
            return

        lease = ConversationLease(
            conversation_id, self.settings.conversation_lock_ttl_seconds
        )
        if not await lease.acquire():
            LOCK_CONTENTION.inc()
            return

        try:
            while True:
                pending_reply = await agent_delivery.get_pending_reply(
                    await get_pool(), conversation_id
                )
                if pending_reply:
                    await self._send_reply(pending_reply)
                    continue

                await _wait_debounce(conversation_id)
                claimed = await agent_delivery.claim_batch(
                    await get_pool(),
                    conversation_id,
                    lease_seconds=self.settings.inbox_lease_seconds,
                )
                if claimed is None:
                    break
                batch_id, pending = claimed
                text = "\n".join(m["content"] for m in pending if m.get("content"))
                source_id = next(
                    (m["source_id"] for m in pending if m.get("source_id")), ""
                )
                effective_phone = phone or next(
                    (m["phone"] for m in pending if m.get("phone")), ""
                )
                typing_task = asyncio.create_task(
                    send_whatsapp_typing(effective_phone, source_id)
                )
                started = time.monotonic()
                try:
                    reply = await run_agent(
                        self.agent,
                        conversation_id,
                        effective_phone,
                        text,
                        turn_id=batch_id,
                        allow_fallback=allow_agent_fallback,
                    )
                    if lease.lost:
                        raise RuntimeError("conversation lease was lost")
                    stored = await agent_delivery.complete_batch_with_reply(
                        await get_pool(),
                        batch_id=batch_id,
                        conversation_id=conversation_id,
                        content=reply,
                    )
                except Exception:
                    await agent_delivery.release_batch(await get_pool(), batch_id)
                    typing_task.cancel()
                    raise

                elapsed = time.monotonic() - started
                if elapsed < self.settings.min_typing_seconds:
                    await asyncio.sleep(self.settings.min_typing_seconds - elapsed)
                await typing_task
                await self._send_reply(stored)
        finally:
            wake_requested = await lease.release()

        # Atomic release consumed a wake request. Re-enter after releasing so
        # a message arriving at the lock boundary can never remain stranded.
        if wake_requested:
            await self.process(
                conversation_id, phone, allow_agent_fallback=allow_agent_fallback
            )

    async def _send_reply(self, reply: dict) -> None:
        try:
            if int(reply.get("attempts") or 0) > 0:
                existing = await self.chatwoot.find_recent_outgoing(
                    int(reply["conversation_id"]),
                    str(reply["content"]),
                    reply["created_at"],
                )
                if existing:
                    await agent_delivery.mark_reply_sent(
                        await get_pool(), reply["id"], str(existing["id"])
                    )
                    return
            response = await self.chatwoot.send_message(
                int(reply["conversation_id"]),
                str(reply["content"]),
            )
            message_id = response.get("id")
            await agent_delivery.mark_reply_sent(
                await get_pool(), reply["id"], str(message_id) if message_id else None
            )
        except Exception as exc:
            await agent_delivery.mark_reply_failed(await get_pool(), reply["id"], str(exc))
            raise

    async def stop(self) -> None:
        health.state["ready"] = False
        health.state["rabbit_connection"] = None
        await self.chatwoot.close()
        if self._checkpointer_cm is not None:
            await self._checkpointer_cm.__aexit__(None, None, None)
        await close_redis()
        await close_pool()


async def run_worker() -> None:
    logging.basicConfig(level=get_settings().log_level)
    worker = Worker()
    try:
        await worker.start()
    finally:
        await worker.stop()


if __name__ == "__main__":
    asyncio.run(run_worker())
