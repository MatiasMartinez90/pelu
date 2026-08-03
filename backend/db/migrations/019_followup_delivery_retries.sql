-- migrate:up

ALTER TABLE conversation_states
    ADD COLUMN followup_attempts integer NOT NULL DEFAULT 0,
    ADD COLUMN followup_next_attempt_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN followup_last_attempt_at timestamptz,
    ADD COLUMN followup_last_error text;

-- migrate:down

ALTER TABLE conversation_states
    DROP COLUMN IF EXISTS followup_last_error,
    DROP COLUMN IF EXISTS followup_last_attempt_at,
    DROP COLUMN IF EXISTS followup_next_attempt_at,
    DROP COLUMN IF EXISTS followup_attempts;
