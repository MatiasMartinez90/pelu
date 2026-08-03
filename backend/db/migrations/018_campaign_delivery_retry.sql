-- migrate:up

ALTER TABLE campaign_deliveries
    ADD COLUMN attempts integer NOT NULL DEFAULT 0,
    ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN last_attempt_at timestamptz,
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX campaign_deliveries_queue_idx
    ON campaign_deliveries (status, next_attempt_at, queued_at)
    WHERE status IN ('queued', 'failed');

-- migrate:down

DROP INDEX IF EXISTS campaign_deliveries_queue_idx;
ALTER TABLE campaign_deliveries
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS last_attempt_at,
    DROP COLUMN IF EXISTS next_attempt_at,
    DROP COLUMN IF EXISTS attempts;
