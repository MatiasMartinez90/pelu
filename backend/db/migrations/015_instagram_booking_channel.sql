-- migrate:up

ALTER TABLE customers DROP CONSTRAINT customers_first_channel_check;
ALTER TABLE customers ADD CONSTRAINT customers_first_channel_check
    CHECK (first_channel IN ('web', 'whatsapp', 'telegram', 'instagram', 'admin'));

ALTER TABLE appointments DROP CONSTRAINT appointments_channel_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_channel_check
    CHECK (channel IN ('web', 'whatsapp', 'telegram', 'instagram', 'admin'));

UPDATE app_settings
SET value = value || '{"instagram": true}'::jsonb
WHERE key = 'booking_channels';
