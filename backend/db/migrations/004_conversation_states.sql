-- migrate:up

-- Overlay local de estado de conversaciones que Chatwoot no modela:
-- archivado / abandonado / descartado, + tracking para el re-contacto.
CREATE TABLE conversation_states (
    conversation_id   bigint PRIMARY KEY,
    phone             text,
    state             text CHECK (state IN ('archivado', 'abandonado', 'descartado')),
    last_bot_msg_at   timestamptz,
    last_client_msg_at timestamptz,
    followups_sent    int NOT NULL DEFAULT 0,
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX conversation_states_state_idx ON conversation_states (state);

-- migrate:down

DROP TABLE IF EXISTS conversation_states;
