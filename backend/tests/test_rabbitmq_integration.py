import json
import os

import aio_pika
import pytest

from src.config import get_settings
from src.queue.producer import RabbitMQProducer
from src.queue.topology import declare_topology


pytestmark = pytest.mark.skipif(
    not os.getenv("TEST_RABBITMQ_URL"), reason="requires disposable RabbitMQ"
)


@pytest.mark.asyncio
async def test_confirmed_publisher_routes_persistent_trigger():
    url = os.environ["TEST_RABBITMQ_URL"]
    settings = get_settings()
    connection = await aio_pika.connect_robust(url)
    producer = RabbitMQProducer()
    producer.url = url
    try:
        channel = await connection.channel()
        queue = await declare_topology(channel)
        await queue.purge()
        await producer.publish_trigger(909, "+5491100000909")
        message = await queue.get(timeout=5, fail=False)
        assert message is not None
        assert message.delivery_mode == aio_pika.DeliveryMode.PERSISTENT
        assert json.loads(message.body) == {
            "conversation_id": 909,
            "phone": "+5491100000909",
        }
        await message.ack()
        assert queue.name == settings.queue_name
    finally:
        await producer.close()
        await connection.close()
