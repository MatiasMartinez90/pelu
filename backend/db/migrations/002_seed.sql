-- migrate:up

-- Barberos (slugs = ids que ya usa el wizard del front)
INSERT INTO barbers (slug, name, role, photo_url, sort_order) VALUES
  ('thiago',  'Thiago',  'BARBERO',   'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=600&q=80&auto=format&fit=crop', 1),
  ('lautaro', 'Lautaro', 'BARBERO',   'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&q=80&auto=format&fit=crop', 2),
  ('bruno',   'Bruno',   'BARBERO',   'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&q=80&auto=format&fit=crop', 3),
  ('nahuel',  'Nahuel',  'BARBERO',   'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80&auto=format&fit=crop', 4),
  ('ramiro',  'Ramiro',  'BARBERO',   'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80&auto=format&fit=crop', 5),
  ('camila',  'Camila',  'ESTILISTA', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80&auto=format&fit=crop', 6);

INSERT INTO services (slug, name, description, price, duration_min, badge, variable_price, sort_order) VALUES
  ('corte-masculino',       'Corte Masculino',              'Corte personalizado con estilo.',                                  15000,  30, NULL,         false, 1),
  ('corte-barba',           'Corte y Barba',                'Corte de pelo + arreglo de barba. El pack completo.',              18000,  30, 'Más pedido', false, 2),
  ('barba',                 'Barba',                        'Recorte y perfilado de barba.',                                    13000,  30, NULL,         false, 3),
  ('corte-masculino-bruno', 'Corte Masculino con Bruno',    'Corte personalizado con nuestro master barber.',                   20000,  30, NULL,         false, 4),
  ('corte-barba-bruno',     'Corte y Barba con Bruno',      'Corte de pelo + arreglo de barba con Bruno.',                      23000,  30, 'Premium',    false, 5),
  ('barba-bruno',           'Barba con Bruno',              'Arreglo de barba con nuestro master barber.',                      15000,  30, NULL,         false, 6),
  ('corte-mujer',           'Corte Mujer',                  'Corte femenino personalizado. Estilo y técnica profesional.',      15000,  30, NULL,         false, 7),
  ('color',                 'Color',                        'El valor varía según el trabajo a realizar.',                      70000, 120, 'Exclusivo',  true,  8),
  ('alisado',               'Alisado Orgánico (sin formol)','Look liso y natural. Valor según largo y volumen.',               165000, 210, 'Exclusivo',  true,  9);

INSERT INTO barber_services (barber_id, service_id)
SELECT b.id, s.id FROM barbers b JOIN services s ON (
  (s.slug = 'corte-masculino'       AND b.slug IN ('thiago', 'lautaro', 'nahuel', 'ramiro', 'camila')) OR
  (s.slug = 'corte-barba'           AND b.slug IN ('lautaro', 'nahuel', 'ramiro', 'camila')) OR
  (s.slug = 'barba'                 AND b.slug IN ('thiago', 'lautaro', 'nahuel', 'ramiro', 'camila')) OR
  (s.slug = 'corte-masculino-bruno' AND b.slug = 'bruno') OR
  (s.slug = 'corte-barba-bruno'     AND b.slug = 'bruno') OR
  (s.slug = 'barba-bruno'           AND b.slug = 'bruno') OR
  (s.slug = 'corte-mujer'           AND b.slug = 'camila') OR
  (s.slug = 'color'                 AND b.slug = 'camila') OR
  (s.slug = 'alisado'               AND b.slug = 'camila')
);

-- Horario del local (barber_id NULL): L-V 10-21, Sáb 11-20, Dom cerrado (sin fila)
INSERT INTO schedule_rules (barber_id, dow, opens_at, closes_at) VALUES
  (NULL, 1, '10:00', '21:00'),
  (NULL, 2, '10:00', '21:00'),
  (NULL, 3, '10:00', '21:00'),
  (NULL, 4, '10:00', '21:00'),
  (NULL, 5, '10:00', '21:00'),
  (NULL, 6, '11:00', '20:00');

INSERT INTO app_settings (key, value) VALUES
  ('agenda_open',          'true'),
  ('booking_channels',     '{"web": true, "whatsapp": true}'),
  ('slot_granularity_min', '30'),
  ('min_lead_minutes',     '60'),
  ('max_days_ahead',       '30');

INSERT INTO products (name, sku, qty, min_qty, price) VALUES
  ('Texture Mash · Matte',     'NOX-TMM', 18, 6, 25000),
  ('Texture Dust · Original',  'NOX-TDO',  4, 6, 25000),
  ('Texture Mash · Brillante', 'NOX-TMB', 11, 6, 25000),
  ('Beard Oil · Cedro',        'NOX-BOC',  0, 4, 19000),
  ('Sea Salt Spray',           'NOX-SSS',  9, 5, 21000),
  ('Shampoo Sólido · Carbón',  'NOX-SHC',  2, 5, 16000);

-- migrate:down

DELETE FROM products;
DELETE FROM app_settings;
DELETE FROM schedule_rules;
DELETE FROM barber_services;
DELETE FROM services;
DELETE FROM barbers;
