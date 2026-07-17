-- migrate:up

ALTER TABLE customers DROP CONSTRAINT customers_first_channel_check;
ALTER TABLE customers ADD CONSTRAINT customers_first_channel_check
    CHECK (first_channel IN ('web', 'whatsapp', 'telegram', 'admin'));

ALTER TABLE appointments DROP CONSTRAINT appointments_channel_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_channel_check
    CHECK (channel IN ('web', 'whatsapp', 'telegram', 'admin'));

UPDATE app_settings
SET value = value || '{"telegram": true}'::jsonb
WHERE key = 'booking_channels';

-- migrate:down

UPDATE appointments SET channel = 'admin' WHERE channel = 'telegram';
UPDATE customers SET first_channel = 'admin' WHERE first_channel = 'telegram';

ALTER TABLE appointments DROP CONSTRAINT appointments_channel_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_channel_check
    CHECK (channel IN ('web', 'whatsapp', 'admin'));

ALTER TABLE customers DROP CONSTRAINT customers_first_channel_check;
ALTER TABLE customers ADD CONSTRAINT customers_first_channel_check
    CHECK (first_channel IN ('web', 'whatsapp', 'admin'));

UPDATE app_settings
SET value = value - 'telegram'
WHERE key = 'booking_channels';
