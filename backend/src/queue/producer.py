"""Producer RabbitMQ: el webhook publica acá un trigger liviano por mensaje.

El contenido real viaja por el buffer Redis (nox:buf:{conv}); el mensaje de
la cola solo dispara el procesamiento, lo que permite el debounce en el worker.
"""

import json
import logging

import aio_pika
from aio_pika import DeliveryMode, Message

from ..config import get_settings
from .topology import declare_topology

logger = logging.getLogger(__name__)


class RabbitMQProducer:
    def __init__(self) -> None:
        self.url = get_settings().rabbitmq_url
        self._connection: aio_pika.abc.AbstractRobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None

    async def connect(self) -> None:
        if self._connection is None or self._connection.is_closed:
            self._connection = await aio_pika.connect_robust(self.url)
            self._channel = await self._connection.channel()
            await declare_topology(self._channel)
            logger.info("RabbitMQ producer connected")

    async def close(self) -> None:
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
        self._connection = None
        self._channel = None

    async def publish_trigger(self, conversation_id: int, phone: str) -> None:
        await self.connect()
        assert self._channel is not None
        msg = Message(
            body=json.dumps({"conversation_id": conversation_id, "phone": phone}).encode(),
            delivery_mode=DeliveryMode.PERSISTENT,
            content_type="application/json",
        )
        await self._channel.default_exchange.publish(
            msg, routing_key=get_settings().queue_name
        )


_producer: RabbitMQProducer | None = None


def get_producer() -> RabbitMQProducer:
    global _producer
    if _producer is None:
        _producer = RabbitMQProducer()
    return _producer
