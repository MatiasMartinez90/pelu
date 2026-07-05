"""Settings del backend NOX. Sin secrets en defaults: todo lo sensible viene por env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # PostgreSQL — app va por el pooler pgbouncer (transaction mode);
    # migraciones y checkpointer usan checkpoint_database_url (rw directo).
    database_url: str = "postgresql://nox:nox@localhost:5432/nox"
    checkpoint_database_url: str = ""  # si vacío, usa database_url (dev local)

    # Redis (compartido, prefijo nox:)
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_prefix: str = "nox:"

    # RabbitMQ
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    queue_name: str = "nox_messages"
    queue_dlq_name: str = "nox_messages_dlq"
    queue_delivery_limit: int = 3

    # Chatwoot
    chatwoot_url: str = ""
    chatwoot_api_key: str = ""
    chatwoot_account_id: int = 0
    chatwoot_handoff_assignee_id: int = 0
    webhook_token: str = ""  # token secreto del webhook (?token=)

    # WhatsApp Cloud API (typing indicator)
    whatsapp_phone_number_id: str = ""
    whatsapp_api_token: str = ""

    # Langfuse
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = ""

    # Keycloak (validación JWT admin)
    keycloak_issuer: str = ""  # ej: https://keycloak.../realms/cloudfleet
    keycloak_client_id: str = ""
    admin_emails: str = ""  # fallback coma-separado si admin_users está vacía

    # Comportamiento del agente
    agent_name: str = "NOX"
    timezone: str = "America/Argentina/Buenos_Aires"
    debounce_seconds: float = 4.0
    min_typing_seconds: float = 3.0
    rate_limit_max: int = 30
    rate_limit_window: int = 3600
    daily_budget_usd: float = 5.0

    # API
    cors_origins: str = "https://nox.cloud-it.com.ar,http://localhost:3000"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
