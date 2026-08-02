-- migrate:up

CREATE TABLE customer_consents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel       text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'instagram', 'telegram')),
    purpose       text NOT NULL CHECK (purpose IN ('marketing', 'service')),
    granted_at    timestamptz,
    revoked_at    timestamptz,
    source        text NOT NULL DEFAULT 'admin' CHECK (length(source) BETWEEN 1 AND 80),
    created_at    timestamptz NOT NULL DEFAULT now(),
    CHECK ((granted_at IS NOT NULL) OR (revoked_at IS NOT NULL))
);

CREATE UNIQUE INDEX customer_consents_active_idx
    ON customer_consents (customer_id, channel, purpose)
    WHERE revoked_at IS NULL;
CREATE INDEX customer_consents_lookup_idx
    ON customer_consents (channel, purpose, customer_id)
    WHERE revoked_at IS NULL;

CREATE TABLE marketing_suppressions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
    channel         text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'instagram', 'telegram')),
    destination_hash bytea NOT NULL CHECK (octet_length(destination_hash) = 32),
    reason          text NOT NULL DEFAULT 'unsubscribe' CHECK (length(reason) BETWEEN 1 AND 120),
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (channel, destination_hash)
);

CREATE TABLE campaigns (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 160),
    kind          text NOT NULL CHECK (kind IN ('marketing', 'operational')),
    status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
    content       jsonb NOT NULL DEFAULT '{}'::jsonb,
    audience      jsonb NOT NULL DEFAULT '{}'::jsonb,
    scheduled_at  timestamptz,
    created_by    text NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 200),
    approved_by   text,
    approved_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (kind <> 'marketing' OR (approved_by IS NOT NULL OR status = 'draft'))
);

CREATE INDEX campaigns_queue_idx ON campaigns (status, scheduled_at);

CREATE TABLE campaign_deliveries (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
    channel         text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'instagram', 'telegram')),
    destination_hash bytea NOT NULL CHECK (octet_length(destination_hash) = 32),
    status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'sent', 'failed', 'suppressed', 'skipped')),
    provider_id     text,
    error_code      text,
    queued_at       timestamptz NOT NULL DEFAULT now(),
    sent_at         timestamptz,
    UNIQUE (campaign_id, channel, destination_hash)
);

-- migrate:down

DROP TABLE IF EXISTS campaign_deliveries;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS marketing_suppressions;
DROP TABLE IF EXISTS customer_consents;
