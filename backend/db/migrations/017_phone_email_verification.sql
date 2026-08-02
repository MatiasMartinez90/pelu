-- migrate:up

CREATE TABLE verification_challenges (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    phone         text NOT NULL,
    email         text NOT NULL,
    code_hash     bytea NOT NULL CHECK (octet_length(code_hash) = 32),
    attempts      integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    expires_at    timestamptz NOT NULL,
    consumed_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX verification_challenges_lookup_idx
    ON verification_challenges (customer_id, created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS verification_challenges;
