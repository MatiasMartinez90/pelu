-- migrate:up

ALTER TABLE agent_events DROP CONSTRAINT agent_events_event_type_check;
ALTER TABLE agent_events ADD CONSTRAINT agent_events_event_type_check CHECK (event_type IN (
    'message_in', 'message_out', 'handoff', 'booking_created',
    'booking_cancelled', 'booking_rescheduled', 'error', 'agent_error',
    'moderation_blocked', 'prompt_injection', 'rate_limited'
));

ALTER TABLE appointments ADD COLUMN idempotency_key text UNIQUE;
ALTER TABLE appointments ADD COLUMN last_command_key text;

CREATE TABLE agent_inbox (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chatwoot_message_id text NOT NULL UNIQUE,
    conversation_id     bigint NOT NULL,
    phone               text NOT NULL DEFAULT '',
    content             text NOT NULL,
    source_id           text NOT NULL DEFAULT '',
    status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'processed')),
    batch_id            uuid,
    locked_until        timestamptz,
    received_at         timestamptz NOT NULL DEFAULT now(),
    processed_at        timestamptz
);
CREATE INDEX idx_agent_inbox_pending
    ON agent_inbox (conversation_id, received_at)
    WHERE status <> 'processed';

CREATE TABLE agent_outbox (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id bigint NOT NULL,
    payload         jsonb NOT NULL,
    attempts        int NOT NULL DEFAULT 0,
    available_at    timestamptz NOT NULL DEFAULT now(),
    locked_until    timestamptz,
    lock_token      uuid,
    published_at    timestamptz,
    last_error      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_outbox_pending
    ON agent_outbox (available_at, created_at) WHERE published_at IS NULL;

CREATE TABLE agent_replies (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id             uuid NOT NULL UNIQUE,
    conversation_id      bigint NOT NULL,
    content              text NOT NULL,
    status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'sent')),
    chatwoot_message_id  text,
    attempts             int NOT NULL DEFAULT 0,
    last_error           text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    sent_at              timestamptz
);
CREATE INDEX idx_agent_replies_pending
    ON agent_replies (conversation_id, created_at) WHERE status = 'pending';

CREATE TABLE agent_pending_actions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id bigint NOT NULL,
    phone           text NOT NULL,
    action_type     text NOT NULL CHECK (action_type IN ('create', 'reschedule', 'cancel')),
    payload         jsonb NOT NULL,
    prepared_turn_id uuid NOT NULL,
    confirmed_turn_id uuid,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'executing', 'completed', 'expired')),
    result_text     text,
    expires_at      timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
    created_at      timestamptz NOT NULL DEFAULT now(),
    completed_at    timestamptz
);
CREATE UNIQUE INDEX idx_agent_pending_action_one
    ON agent_pending_actions (conversation_id) WHERE status = 'pending';

CREATE TABLE agent_threads (
    conversation_id bigint PRIMARY KEY,
    thread_id       text NOT NULL UNIQUE,
    last_activity   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent_handoffs (
    conversation_id bigint PRIMARY KEY,
    phone           text NOT NULL DEFAULT '',
    reason          text NOT NULL,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed')),
    attempts        int NOT NULL DEFAULT 0,
    last_error      text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    completed_at    timestamptz
);

-- migrate:down

DROP TABLE IF EXISTS agent_handoffs;
DROP TABLE IF EXISTS agent_threads;
DROP TABLE IF EXISTS agent_pending_actions;
DROP TABLE IF EXISTS agent_replies;
DROP TABLE IF EXISTS agent_outbox;
DROP TABLE IF EXISTS agent_inbox;
ALTER TABLE appointments DROP COLUMN IF EXISTS last_command_key;
ALTER TABLE appointments DROP COLUMN IF EXISTS idempotency_key;
ALTER TABLE agent_events DROP CONSTRAINT agent_events_event_type_check;
ALTER TABLE agent_events ADD CONSTRAINT agent_events_event_type_check CHECK (event_type IN (
    'message_in', 'message_out', 'handoff', 'booking_created',
    'booking_cancelled', 'booking_rescheduled', 'error', 'rate_limited'
));
