-- migrate:up

-- Un turno puede tener varios intentos históricos, pero nunca más de uno
-- cobrable a la vez. Esto también cierra carreras entre web y agente.
CREATE UNIQUE INDEX payment_intents_one_active_appointment
    ON payment_intents (appointment_id)
    WHERE appointment_id IS NOT NULL AND status IN ('created', 'pending');

-- migrate:down

DROP INDEX IF EXISTS payment_intents_one_active_appointment;
