"""Topología RabbitMQ compartida por producer y consumer.

Cola principal quorum con límite de entregas; los mensajes que fallan
`queue_delivery_limit` veces van al DLX y quedan en la DLQ (sin consumer,
se monitorea por profundidad).
"""

import aio_pika

from ..config import get_settings


async def declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractQueue:
    s = get_settings()
    dlx = await channel.declare_exchange(
        s.queue_dlx_name, aio_pika.ExchangeType.DIRECT, durable=True
    )
    dlq = await channel.declare_queue(s.queue_dlq_name, durable=True)
    await dlq.bind(dlx, routing_key=s.queue_name)

    await channel.declare_queue(
        s.queue_retry_name,
        durable=True,
        arguments={
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": s.queue_name,
        },
    )

    queue = await channel.declare_queue(
        s.queue_name,
        durable=True,
        arguments={
            "x-queue-type": "quorum",
            "x-delivery-limit": s.queue_delivery_limit,
            "x-dead-letter-exchange": s.queue_dlx_name,
        },
    )
    return queue
