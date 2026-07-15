-- migrate:up

-- Fuente de verdad institucional compartida por el agente y el sitio.
-- La fila única evita que cada canal mantenga su propia copia de dirección,
-- contacto y políticas.
CREATE TABLE site_profile (
    singleton           boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    name                text NOT NULL,
    short_name          text NOT NULL,
    tagline             text NOT NULL DEFAULT '',
    city                text NOT NULL DEFAULT '',
    description         text NOT NULL DEFAULT '',
    phone_display       text NOT NULL DEFAULT '',
    whatsapp            text NOT NULL DEFAULT '',
    instagram           text NOT NULL DEFAULT '',
    email               text NOT NULL DEFAULT '',
    address             text NOT NULL DEFAULT '',
    maps_query          text NOT NULL DEFAULT '',
    directions          text NOT NULL DEFAULT '',
    payment_methods     text[] NOT NULL DEFAULT '{}',
    payment_notes       text NOT NULL DEFAULT '',
    cancellation_notice_min int NOT NULL DEFAULT 0 CHECK (cancellation_notice_min >= 0),
    cancellation_notes  text NOT NULL DEFAULT '',
    online_store_url    text,
    additional_info     jsonb NOT NULL DEFAULT '{}',
    updated_at          timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site_profile (
    name, short_name, tagline, city, description, phone_display, whatsapp,
    instagram, email, address, maps_query, directions, payment_methods,
    payment_notes, cancellation_notice_min, cancellation_notes, online_store_url,
    additional_info
) VALUES (
    'NOX Barber',
    'NOX',
    'Barbería Premium',
    'Buenos Aires',
    'Barbería premium en Buenos Aires. Cortes, fade, barba, diseño y color.',
    '+54 9 11 5555-0123',
    '5491155550123',
    'noxbarber',
    'hola@noxbarber.com.ar',
    'Av. Cabildo 2200, Belgrano, CABA',
    'Av. Cabildo 2200, CABA',
    'Subte D, estación Ministro Carranza. Colectivos 15, 29, 60 y 152.',
    ARRAY['efectivo', 'transferencia'],
    'El pago se realiza en el local. No se cobra seña.',
    120,
    'Las cancelaciones y reprogramaciones no tienen costo.',
    'https://tienda.noxbarber.com.ar',
    '{"arrival_recommendation":"Llegar 5 minutos antes del turno."}'
);

ALTER TABLE barbers
    ADD COLUMN bio text NOT NULL DEFAULT '',
    ADD COLUMN instagram text NOT NULL DEFAULT '';

-- migrate:down

ALTER TABLE barbers
    DROP COLUMN IF EXISTS instagram,
    DROP COLUMN IF EXISTS bio;
DROP TABLE IF EXISTS site_profile;
