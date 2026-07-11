-- migrate:up

-- Audita cada rebind de barbers.email (autoriza el login /barbero de ese
-- correo): mismo patrón que service_price_history para cambios sensibles.
CREATE TABLE barber_email_history (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id  uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    old_email  text,
    new_email  text,
    changed_by text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);

-- migrate:down

DROP TABLE IF EXISTS barber_email_history;
