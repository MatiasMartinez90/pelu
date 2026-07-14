"""Confirmed RabbitMQ publisher backed by a PostgreSQL transactional outbox."""

import asyncio
import json
import logging
import time
from uuid import UUID

import aio_pika
from aio_pika import DeliveryMode, Message

from ..config import get_settings
from ..db.pool import get_pool
from ..db.repositories import agent_delivery
from ..observability import OUTBOX_PUBLISH
from ..utils.retry import retry_with_backoff
from .topology import declare_topology

logger = logging.getLogger(__name__)


class RabbitMQProducer:
    def __init__(self) -> None:
        self.url = get_settings().rabbitmq_url
        self._connection: aio_pika.abc.AbstractRobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._connect_lock = asyncio.Lock()

    async def connect(self) -> None:
        async with self._connect_lock:
            if (
                self._connection is not None
                and not self._connection.is_closed
                and self._channel is not None
                and not self._channel.is_closed
            ):
                return
            if self._connection is not None and not self._connection.is_closed:
                await self._connection.close()
            # connect_robust ya reconecta solo ante cortes posteriores; el
            # retry acá es solo para el primer intento (ej. RabbitMQ todavía
            # no está listo cuando arranca la API).
            self._connection = await retry_with_backoff(
                lambda: aio_pika.connect_robust(self.url), name="rabbitmq (producer)", attempts=3
            )
            self._channel = await self._connection.channel(
                publisher_confirms=True, on_return_raises=True
            )
            await declare_topology(self._channel)
            logger.info("RabbitMQ producer connected")

    async def close(self) -> None:
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
        self._connection = None
        self._channel = None

    async def publish_trigger(
        self,
        conversation_id: int,
        phone: str,
        *,
        outbox_id: UUID | str | None = None,
    ) -> None:
        await self.connect()
        assert self._channel is not None
        payload = {"conversation_id": conversation_id, "phone": phone}
        if outbox_id is not None:
            payload["outbox_id"] = str(outbox_id)
        msg = Message(
            body=json.dumps(payload).encode(),
            delivery_mode=DeliveryMode.PERSISTENT,
            content_type="application/json",
            message_id=str(outbox_id) if outbox_id else None,
        )
        await self._channel.default_exchange.publish(
            msg, routing_key=get_settings().queue_name, mandatory=True
        )

    async def publish_outbox(self, item: dict) -> None:
        payload = item["payload"]
        if isinstance(payload, str):
            payload = json.loads(payload)
        await self.publish_trigger(
            int(item["conversation_id"]),
            str(payload.get("phone", "")),
            outbox_id=item["id"],
        )
        await agent_delivery.mark_outbox_published(await get_pool(), item["id"])
        OUTBOX_PUBLISH.labels("published").inc()

    async def publish_retry(self, payload: dict, retry_count: int, delay_seconds: int) -> None:
        await self.connect()
        assert self._channel is not None
        msg = Message(
            body=json.dumps(payload).encode(),
            delivery_mode=DeliveryMode.PERSISTENT,
            content_type="application/json",
            headers={"x-nox-retry-count": retry_count},
            expiration=delay_seconds * 1000,
        )
        await self._channel.default_exchange.publish(
            msg, routing_key=get_settings().queue_retry_name, mandatory=True
        )


_producer: RabbitMQProducer | None = None


def get_producer() -> RabbitMQProducer:
    global _producer
    if _producer is None:
        _producer = RabbitMQProducer()
    return _producer


async def dispatch_outbox(stop: asyncio.Event) -> None:
    """Continuously recover transactional outbox rows not published inline."""
    producer = get_producer()
    last_prune = 0.0
    while not stop.is_set():
        try:
            pool = await get_pool()
            if time.monotonic() - last_prune > 3600:
                await agent_delivery.prune_delivery_data(
                    pool,
                    get_settings().delivery_retention_days,
                    get_settings().event_retention_days,
                )
                last_prune = time.monotonic()
            items = await agent_delivery.pending_outbox(pool)
            for item in items:
                try:
                    await producer.publish_outbox(item)
                except Exception as exc:  # noqa: BLE001
                    logger.exception("outbox publish failed: %s", item["id"])
                    OUTBOX_PUBLISH.labels("failed").inc()
                    await agent_delivery.mark_outbox_failed(pool, item["id"], str(exc))
            if not items:
                try:
                    await asyncio.wait_for(stop.wait(), timeout=2)
                except asyncio.TimeoutError:
                    pass
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logger.exception("outbox dispatcher iteration failed")
            try:
                await asyncio.wait_for(stop.wait(), timeout=5)
            except asyncio.TimeoutError:
                pass
