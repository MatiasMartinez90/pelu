-- migrate:up

-- Las fotos institucionales se sirven versionadas desde el dominio propio.
-- El prefijo /media puede migrarse a un CDN/object storage sin cambiar el wizard.
UPDATE barbers SET photo_url = CASE slug
  WHEN 'thiago' THEN '/media/team/thiago.v1.webp'
  WHEN 'lautaro' THEN '/media/team/lautaro.v1.webp'
  WHEN 'bruno' THEN '/media/team/bruno.v1.webp'
  WHEN 'nahuel' THEN '/media/team/nahuel.v1.webp'
  WHEN 'ramiro' THEN '/media/team/ramiro.v1.webp'
  WHEN 'camila' THEN '/media/team/camila.v1.webp'
  ELSE photo_url
END
WHERE slug IN ('thiago', 'lautaro', 'bruno', 'nahuel', 'ramiro', 'camila');

-- migrate:down

UPDATE barbers SET photo_url = CASE slug
  WHEN 'thiago' THEN 'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=600&q=80&auto=format&fit=crop'
  WHEN 'lautaro' THEN 'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&q=80&auto=format&fit=crop'
  WHEN 'bruno' THEN 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&q=80&auto=format&fit=crop'
  WHEN 'nahuel' THEN 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80&auto=format&fit=crop'
  WHEN 'ramiro' THEN 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80&auto=format&fit=crop'
  WHEN 'camila' THEN 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80&auto=format&fit=crop'
  ELSE photo_url
END
WHERE slug IN ('thiago', 'lautaro', 'bruno', 'nahuel', 'ramiro', 'camila');
