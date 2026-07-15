"""Low-cardinality Prometheus metrics shared by API and worker."""

from prometheus_client import Counter, Histogram

WEBHOOK_MESSAGES = Counter(
    "nox_webhook_messages_total", "Inbound Chatwoot messages", ("result",)
)
QUEUE_MESSAGES = Counter(
    "nox_queue_messages_total", "RabbitMQ consumer outcomes", ("result",)
)
AGENT_TURNS = Counter("nox_agent_turns_total", "Agent turn outcomes", ("result",))
AGENT_LATENCY = Histogram(
    "nox_agent_turn_seconds",
    "End-to-end model turn latency",
    buckets=(0.5, 1, 2, 5, 10, 20, 40, 80, 160),
)
LOCK_CONTENTION = Counter(
    "nox_conversation_lock_contention_total", "Conversation lease acquisition conflicts"
)
OUTBOX_PUBLISH = Counter(
    "nox_outbox_publish_total", "Transactional outbox publish outcomes", ("result",)
)
