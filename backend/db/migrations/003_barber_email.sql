-- migrate:up

-- Vínculo entre un barbero y su identidad Keycloak (login por Google → email).
ALTER TABLE barbers ADD COLUMN email text;
CREATE UNIQUE INDEX barbers_email_key ON barbers (lower(email)) WHERE email IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS barbers_email_key;
ALTER TABLE barbers DROP COLUMN IF EXISTS email;
