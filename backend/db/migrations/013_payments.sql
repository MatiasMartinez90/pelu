-- migrate:up

CREATE TABLE payment_intents (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id        text NOT NULL,
    purpose                text NOT NULL CHECK (purpose IN ('shop_order', 'appointment')),
    shop_order_id          uuid REFERENCES shop_orders(id) ON DELETE RESTRICT,
    appointment_id         uuid REFERENCES appointments(id) ON DELETE RESTRICT,
    provider               text NOT NULL CHECK (provider IN ('demo', 'mercado_pago')),
    provider_preference_id text,
    provider_payment_id    text,
    external_reference     text NOT NULL UNIQUE,
    idempotency_hash       bytea NOT NULL CHECK (octet_length(idempotency_hash) = 32),
    request_hash           bytea NOT NULL CHECK (octet_length(request_hash) = 32),
    amount                 int NOT NULL CHECK (amount > 0),
    currency               char(3) NOT NULL,
    status                 text NOT NULL DEFAULT 'created'
                           CHECK (status IN ('created', 'pending', 'approved', 'rejected',
                                             'cancelled', 'refunded', 'expired')),
    payer_email            text,
    checkout_url           text,
    sandbox                boolean NOT NULL DEFAULT true,
    expires_at             timestamptz NOT NULL,
    approved_at            timestamptz,
    rejected_at            timestamptz,
    refunded_at            timestamptz,
    last_provider_sync_at  timestamptz,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (purpose = 'shop_order' AND shop_order_id IS NOT NULL AND appointment_id IS NULL)
        OR
        (purpose = 'appointment' AND appointment_id IS NOT NULL AND shop_order_id IS NULL)
    )
);

CREATE UNIQUE INDEX payment_intents_provider_preference_unique
    ON payment_intents (provider, provider_preference_id)
    WHERE provider_preference_id IS NOT NULL;
CREATE UNIQUE INDEX payment_intents_provider_payment_unique
    ON payment_intents (provider, provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;
CREATE UNIQUE INDEX payment_intents_installation_idempotency_unique
    ON payment_intents (installation_id, idempotency_hash);
CREATE INDEX payment_intents_target_order_idx ON payment_intents (shop_order_id, created_at DESC);
CREATE INDEX payment_intents_target_appointment_idx ON payment_intents (appointment_id, created_at DESC);
CREATE INDEX payment_intents_reconciliation_idx
    ON payment_intents (status, updated_at)
    WHERE status IN ('created', 'pending');

CREATE TABLE payment_status_history (
    id                  bigserial PRIMARY KEY,
    payment_intent_id   uuid NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
    from_status         text,
    to_status           text NOT NULL,
    provider_payment_id text,
    provider_event_id   text,
    actor               text NOT NULL DEFAULT 'system',
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_status_history_intent_idx
    ON payment_status_history (payment_intent_id, created_at);

CREATE TABLE payment_events (
    id                  bigserial PRIMARY KEY,
    payment_intent_id   uuid REFERENCES payment_intents(id) ON DELETE SET NULL,
    provider            text NOT NULL CHECK (provider IN ('demo', 'mercado_pago')),
    provider_event_id   text NOT NULL,
    event_type          text NOT NULL,
    action              text NOT NULL DEFAULT '',
    signature_valid     boolean NOT NULL,
    payload_hash        bytea NOT NULL CHECK (octet_length(payload_hash) = 32),
    payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
    processing_status   text NOT NULL DEFAULT 'received'
                        CHECK (processing_status IN ('received', 'processed', 'ignored', 'failed')),
    error_code          text NOT NULL DEFAULT '',
    received_at         timestamptz NOT NULL DEFAULT now(),
    processed_at        timestamptz
);

CREATE UNIQUE INDEX payment_events_provider_event_unique
    ON payment_events (provider, provider_event_id);
CREATE INDEX payment_events_received_idx ON payment_events (received_at DESC);

ALTER TABLE appointments
    ADD COLUMN payment_method text NOT NULL DEFAULT 'pay_at_store'
               CHECK (payment_method IN ('pay_at_store', 'mercado_pago')),
    ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid'
               CHECK (payment_status IN ('unpaid', 'pending', 'approved', 'rejected', 'refunded'));

-- migrate:down

ALTER TABLE appointments
    DROP COLUMN IF EXISTS payment_status,
    DROP COLUMN IF EXISTS payment_method;

DROP TABLE IF EXISTS payment_events;
DROP TABLE IF EXISTS payment_status_history;
DROP TABLE IF EXISTS payment_intents;
