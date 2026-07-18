-- migrate:up

-- Una base representa una sola instalación aislada. El hash evita que un
-- bootstrap posterior pise cambios operativos sin una decisión explícita.
CREATE TABLE installation_bootstrap (
    singleton       boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    installation_id text NOT NULL UNIQUE,
    schema_version  int NOT NULL CHECK (schema_version > 0),
    config_hash     text NOT NULL CHECK (length(config_hash) = 64),
    applied_at      timestamptz NOT NULL DEFAULT now(),
    metadata        jsonb NOT NULL DEFAULT '{}'
);

-- migrate:down

DROP TABLE IF EXISTS installation_bootstrap;
