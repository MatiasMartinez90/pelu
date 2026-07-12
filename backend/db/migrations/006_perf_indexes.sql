-- migrate:up

-- Búsqueda de clientes del admin: name ILIKE '%x%' / phone LIKE '%x%' con
-- comodín inicial no puede usar un btree — GIN + trigramas sí.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
CREATE INDEX idx_customers_phone_trgm ON customers USING gin (phone gin_trgm_ops);

-- /mi-cuenta busca turnos por lower(c.email); sin esto es seq scan sobre
-- customers en cada carga del portal.
CREATE INDEX idx_customers_email_lower ON customers (lower(email)) WHERE email IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS idx_customers_email_lower;
DROP INDEX IF EXISTS idx_customers_phone_trgm;
DROP INDEX IF EXISTS idx_customers_name_trgm;
