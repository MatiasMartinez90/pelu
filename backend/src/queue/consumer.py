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
import json
import logging
import time

import aio_pika

from ..agent import events
from ..agent.graph import create_agent, run_agent
from ..config import get_settings
from ..db.pool import close_pool, init_pool
from ..integrations.chatwoot import ChatwootClient, send_whatsapp_typing
from ..integrations.redis_client import close_redis, get_redis, key
from .topology import declare_topology

logger = logging.getLogger(__name__)

LOCK_TTL = 120


async def _drain_buffer(conversation_id: int) -> list[dict]:
    """Vacía atómicamente el buffer de mensajes de la conversación."""
    r = await get_redis()
    buf_key = key(f"buf:{conversation_id}")
    async with r.pipeline(transaction=True) as pipe:
        pipe.lrange(buf_key, 0, -1)
        pipe.delete(buf_key)
        raw, _ = await pipe.execute()
    return [json.loads(item) for item in raw]


async def _wait_debounce(conversation_id: int) -> None:
    """Espera hasta que el cliente deje de escribir (debounce_seconds sin actividad)."""
    settings = get_settings()
    r = await get_redis()
    last_key = key(f"last:{conversation_id}")
    while True:
        last = await r.get(last_key)
        elapsed = time.time() - float(last) if last else settings.debounce_seconds
        if elapsed >= settings.debounce_seconds:
            return
        await asyncio.sleep(settings.debounce_seconds - elapsed + 0.1)


async def _bot_is_off(conversation_id: int, chatwoot: ChatwootClient) -> bool:
    r = await get_redis()
    if await r.exists(key(f"bot_off:{conversation_id}")):
        return True
    # Fallback: conversación asignada a humano o resuelta en Chatwoot.
    try:
        conv = await chatwoot.get_conversation(conversation_id)
        meta = conv.get("meta", {})
        if meta.get("assignee"):
            return True
        if conv.get("status") == "resolved":
            return True
    except Exception:  # noqa: BLE001 — si Chatwoot no responde, seguimos con la flag local
        logger.warning("no se pudo consultar la conversación %s", conversation_id)
    return False


class Worker:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.chatwoot = ChatwootClient()
        self.agent = None
        self._checkpointer_cm = None

    async def start(self) -> None:
        await init_pool()
        await get_redis()

        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        checkpoint_url = self.settings.checkpoint_database_url or self.settings.database_url
        self._checkpointer_cm = AsyncPostgresSaver.from_conn_string(checkpoint_url)
        checkpointer = await self._checkpointer_cm.__aenter__()
        await checkpointer.setup()
        self.agent = create_agent(checkpointer)
        logger.info("nox-worker: agente listo")

        connection = await aio_pika.connect_robust(self.settings.rabbitmq_url)
        async with connection:
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=4)
            queue = await declare_topology(channel)
            logger.info("nox-worker: consumiendo %s", self.settings.queue_name)
            await queue.consume(self.on_message)
            await asyncio.Future()  # correr para siempre

    async def on_message(self, message: aio_pika.abc.AbstractIncomingMessage) -> None:
        try:
            payload = json.loads(message.body)
            conversation_id = int(payload["conversation_id"])
            phone = payload.get("phone", "")
        except (json.JSONDecodeError, KeyError, ValueError):
            logger.error("payload inválido, va a DLQ: %r", message.body[:200])
            await message.reject(requeue=False)
            return

        try:
            await self.process(conversation_id, phone)
            await message.ack()
        except Exception:  # noqa: BLE001
            logger.exception("error procesando conv %s", conversation_id)
            await events.log_event("error", conversation_id=conversation_id, phone=phone)
            # nack sin requeue explícito: quorum queue re-entrega hasta
            # x-delivery-limit y después manda a la DLQ.
            await message.nack(requeue=True)

    async def process(self, conversation_id: int, phone: str) -> None:
        if await _bot_is_off(conversation_id, self.chatwoot):
            logger.info("bot apagado para conv %s, skip", conversation_id)
            await _drain_buffer(conversation_id)
            return

        r = await get_redis()
        lock_key = key(f"lock:{conversation_id}")
        got_lock = await r.set(lock_key, "1", nx=True, ex=LOCK_TTL)
        if not got_lock:
            # Otro worker está con esta conversación; sus mensajes están en el
            # buffer y el holder los drena. Nada que hacer.
            return

        try:
            await _wait_debounce(conversation_id)
            pending = await _drain_buffer(conversation_id)
            if not pending:
                return  # otro trigger ya procesó este lote

            text = "\n".join(m["content"] for m in pending if m.get("content"))
            source_id = next((m["source_id"] for m in pending if m.get("source_id")), "")

            typing_task = asyncio.create_task(send_whatsapp_typing(phone, source_id))
            started = time.monotonic()

            reply = await run_agent(self.agent, conversation_id, phone, text)

            # Mínimo de "escribiendo…" para que no responda instantáneo
            elapsed = time.monotonic() - started
            if elapsed < self.settings.min_typing_seconds:
                await asyncio.sleep(self.settings.min_typing_seconds - elapsed)
            await typing_task

            await self.chatwoot.send_message(conversation_id, reply)

            # Si entraron mensajes durante la corrida, quedará un trigger en la
            # cola que los procesa; el buffer los conserva.
        finally:
            await r.delete(lock_key)

    async def stop(self) -> None:
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
