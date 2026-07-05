-- migrate:up

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE barbers (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       text NOT NULL UNIQUE,
    name       text NOT NULL,
    role       text NOT NULL CHECK (role IN ('BARBERO', 'ESTILISTA')),
    photo_url  text,
    active     boolean NOT NULL DEFAULT true,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE services (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           text NOT NULL UNIQUE,
    name           text NOT NULL,
    description    text NOT NULL DEFAULT '',
    price          int NOT NULL CHECK (price >= 0),
    duration_min   int NOT NULL CHECK (duration_min > 0),
    badge          text,
    variable_price boolean NOT NULL DEFAULT false,
    active         boolean NOT NULL DEFAULT true,
    sort_order     int NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE barber_services (
    barber_id  uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (barber_id, service_id)
);

CREATE TABLE service_price_history (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    old_price  int NOT NULL,
    new_price  int NOT NULL,
    changed_by text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone         text NOT NULL UNIQUE,
    name          text,
    email         text,
    first_channel text NOT NULL DEFAULT 'web' CHECK (first_channel IN ('web', 'whatsapp', 'admin')),
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE appointments (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id      uuid NOT NULL REFERENCES customers(id),
    barber_id        uuid NOT NULL REFERENCES barbers(id),
    service_id       uuid NOT NULL REFERENCES services(id),
    starts_at        timestamptz NOT NULL,
    ends_at          timestamptz NOT NULL,
    status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'cancelled', 'completed', 'no_show')),
    price_at_booking int NOT NULL,
    channel          text NOT NULL CHECK (channel IN ('web', 'whatsapp', 'admin')),
    notes            text,
    cancelled_at     timestamptz,
    cancel_reason    text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at),
    -- Anti doble-booking a nivel DB: dos turnos activos del mismo barbero no pueden solaparse.
    CONSTRAINT no_overlap EXCLUDE USING gist (
        barber_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    ) WHERE (status = 'active')
);

CREATE INDEX idx_appointments_day ON appointments (starts_at);
CREATE INDEX idx_appointments_customer ON appointments (customer_id, starts_at DESC);

-- barber_id NULL = horario del local
CREATE TABLE schedule_rules (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE,
    dow       smallint NOT NULL CHECK (dow BETWEEN 0 AND 6),
    opens_at  time NOT NULL,
    closes_at time NOT NULL,
    CHECK (closes_at > opens_at)
);

-- barber_id NULL = bloqueo de todo el local
CREATE TABLE availability_blocks (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id  uuid REFERENCES barbers(id) ON DELETE CASCADE,
    starts_at  timestamptz NOT NULL,
    ends_at    timestamptz NOT NULL,
    reason     text NOT NULL DEFAULT '',
    created_by text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);

CREATE TABLE app_settings (
    key   text PRIMARY KEY,
    value jsonb NOT NULL
);

CREATE TABLE products (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    sku        text NOT NULL UNIQUE,
    qty        int NOT NULL DEFAULT 0 CHECK (qty >= 0),
    min_qty    int NOT NULL DEFAULT 0,
    price      int NOT NULL CHECK (price >= 0),
    active     boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_movements (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    delta      int NOT NULL,
    reason     text NOT NULL DEFAULT '',
    created_by text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
    id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email  text NOT NULL UNIQUE,
    name   text NOT NULL DEFAULT '',
    role   text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
    active boolean NOT NULL DEFAULT true
);

CREATE TABLE agent_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id bigint,
    phone           text,
    event_type      text NOT NULL CHECK (event_type IN (
                        'message_in', 'message_out', 'handoff', 'booking_created',
                        'booking_cancelled', 'booking_rescheduled', 'error', 'rate_limited')),
    tokens_in       int NOT NULL DEFAULT 0,
    tokens_out      int NOT NULL DEFAULT 0,
    cost_usd        numeric(10, 6) NOT NULL DEFAULT 0,
    latency_ms      int NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_events_time ON agent_events (created_at DESC);

CREATE TABLE agent_metrics (
    name       text PRIMARY KEY,
    value      double precision NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- migrate:down

DROP TABLE IF EXISTS agent_metrics;
DROP TABLE IF EXISTS agent_events;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS availability_blocks;
DROP TABLE IF EXISTS schedule_rules;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS service_price_history;
DROP TABLE IF EXISTS barber_services;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS barbers;
