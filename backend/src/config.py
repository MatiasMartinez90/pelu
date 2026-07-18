"""Settings de una instalación aislada. Todo secreto y valor de ambiente viene por env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    installation_id: str = "local"
    service_name: str = "Appointments Platform"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # PostgreSQL — app va por el pooler pgbouncer (transaction mode);
    # migraciones y checkpointer usan checkpoint_database_url (rw directo).
    database_url: str = "postgresql://nox:nox@localhost:5432/nox"
    checkpoint_database_url: str = ""  # si vacío, usa database_url (dev local)

    # Redis compartido; cada instalación debe recibir un prefijo exclusivo.
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_prefix: str = "app:"
    redis_connect_timeout_seconds: float = 3.0
    redis_socket_timeout_seconds: float = 5.0

    # RabbitMQ
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    queue_name: str = "app_messages"
    queue_dlq_name: str = "app_messages_dlq"
    queue_retry_name: str = "app_messages_retry"
    queue_dlx_name: str = "app.dlx"
    queue_delivery_limit: int = 3
    queue_retry_base_seconds: int = 2

    # Chatwoot
    chatwoot_url: str = ""
    chatwoot_api_key: str = ""
    chatwoot_account_id: int = 0
    chatwoot_handoff_assignee_id: int = 0
    webhook_token: str = ""  # token secreto del webhook (?token=)
    webhook_signing_secret: str = ""
    webhook_allow_legacy_token: bool = False
    webhook_max_skew_seconds: int = 300
    webhook_max_body_bytes: int = 262_144
    webhook_signer_target_url: str = "http://api:8000/webhook/chatwoot"

    # WhatsApp Cloud API (typing indicator + re-contacto por template)
    whatsapp_phone_number_id: str = ""
    whatsapp_api_token: str = ""
    whatsapp_followup_template: str = ""  # nombre del template aprobado para re-contacto
    whatsapp_followup_lang: str = "es_AR"
    followup_after_hours: int = 20  # horas sin respuesta del cliente → abandonado
    discard_after_hours: int = 48  # horas tras el follow-up sin respuesta → descartado

    # Langfuse
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = ""

    # Keycloak (validación JWT admin)
    auth_disabled: bool = False  # SOLO dev local: desactiva el gate admin
    keycloak_issuer: str = ""  # ej: https://keycloak.../realms/cloudfleet
    keycloak_client_id: str = ""
    admin_emails: str = ""  # fallback coma-separado si admin_users está vacía

    # Accesos rápidos del ambiente demo. Requiere secreto >= 32 caracteres;
    # en producción DEMO_MODE queda false y los tokens HS256 se rechazan.
    demo_mode: bool = False
    demo_auth_secret: str = ""
    demo_auth_issuer: str = "demo"
    demo_auth_audience: str = "demo-api"

    # Comportamiento del agente
    agent_name: str = "Asistente"
    agent_tone: str = "argentino informal y cálido"
    public_site_url: str = ""
    public_booking_path: str = "/agendar"
    link_code_prefix: str = "LINK-"
    timezone: str = "America/Argentina/Buenos_Aires"
    debounce_seconds: float = 4.0
    min_typing_seconds: float = 3.0
    rate_limit_max: int = 30
    rate_limit_window: int = 3600
    daily_budget_usd: float = 5.0
    budget_reserve_per_turn_usd: float = 0.03
    model_input_price_per_million: float = 0.15
    model_output_price_per_million: float = 0.60
    conversation_lock_ttl_seconds: int = 120
    inbox_lease_seconds: int = 900
    delivery_retention_days: int = 30
    event_retention_days: int = 90
    context_max_messages: int = 24
    conversation_reset_after_days: int = 30
    output_max_chars: int = 1200
    moderation_enabled: bool = True
    moderation_fail_closed: bool = False
    store_event_phone_plaintext: bool = False

    # API
    cors_origins: str = "http://localhost:3000"
    cors_origin_regex: str = r"^http://localhost:\d+$"  # dev; vaciar para desactivar
    environment: str = "development"
    trusted_proxy_cidrs: str = "127.0.0.1/32,::1/128"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
