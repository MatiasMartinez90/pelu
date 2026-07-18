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

WEB_VITAL_VALUE = Histogram(
    "nox_web_vital_value",
    "Browser Web Vital value (milliseconds except CLS)",
    ("name", "path", "device"),
    buckets=(0.01, 0.05, 0.1, 0.25, 1, 2.5, 5, 10, 50, 100, 250, 500, 1000, 2500, 4000, 8000, 16000),
)
WEB_VITAL_REPORTS = Counter(
    "nox_web_vital_reports_total",
    "Accepted browser Web Vital reports",
    ("name", "path", "device", "rating"),
)

_PUBLIC_RUM_PATHS = {
    "/", "/agendar", "/servicios", "/equipo", "/galeria", "/nosotros",
    "/faq", "/contacto", "/login", "/admin", "/barbero", "/mi-cuenta",
}


def normalize_rum_path(path: str) -> str:
    """Keep Prometheus labels bounded while preserving useful route groups."""
    clean = "/" + path.strip().split("?", 1)[0].strip("/")
    if clean.startswith("/servicios/"):
        return "/servicios/:slug"
    return clean if clean in _PUBLIC_RUM_PATHS else "/other"


def record_web_vital(name: str, path: str, device: str, rating: str, value: float) -> None:
    normalized_path = normalize_rum_path(path)
    WEB_VITAL_VALUE.labels(name=name, path=normalized_path, device=device).observe(value)
    WEB_VITAL_REPORTS.labels(
        name=name, path=normalized_path, device=device, rating=rating
    ).inc()
