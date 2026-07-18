# Fase 3 — Cloudflare y medios

**Estado:** implementación base lista para PR a `dev`; activación R2 dev pendiente de credenciales de alcance mínimo. Producción y demo permanecen intactos.

## Objetivo

Entregar imágenes y video del sitio desde infraestructura propia acelerada por Cloudflare, con aislamiento por cliente, formatos responsive, caché inmutable, fallback seguro y un procedimiento reproducible para nuevas instalaciones.

## Decisión

Se eligió **Cloudflare R2 para originales publicados + custom domain + Cloudflare Image Transformations**.

- R2 permite conservar imágenes y videos en una única fuente S3-compatible.
- El dominio propio aprovecha caché, WAF y TLS de Cloudflare; `r2.dev` queda deshabilitado.
- Las transformaciones se limitan a anchos `96, 192, 320, 640, 960, 1280, 1600` y calidades `70, 80, 85` para evitar abuso y variantes facturables ilimitadas.
- Cada key comienza por `{tenant}/`; dev usa bucket `nox-dev-media`, tenant `nox` y dominio `media-dev-nox.cloud-it.com.ar`.
- No se crea ni modifica ningún bucket, dominio o variable de producción en esta fase.

Referencias verificadas el 2026-07-18:

- [Cloudflare R2 con API S3](https://developers.cloudflare.com/r2/get-started/s3/)
- [CLI y credenciales R2](https://developers.cloudflare.com/r2/get-started/cli/)
- [API de custom domains R2](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/domains/subresources/custom/methods/create/)
- [Precios de Cloudflare Images y transformaciones](https://developers.cloudflare.com/images/pricing/)

## Contrato implementado

### Entrega

- `NEXT_PUBLIC_MEDIA_PUBLIC_URL`: origen público del bucket, sin path de tenant.
- `NEXT_PUBLIC_MEDIA_TRANSFORM_URL`: zona que atiende `/cdn-cgi/image`; por defecto es el origen público.
- `NEXT_PUBLIC_MEDIA_TENANT`: prefijo aislado; default seguro `nox`.
- Sin estas variables, la aplicación conserva los archivos locales y URLs remotas anteriores. Esto permite mergear y revertir sin romper el sitio.
- Con estas variables, fotos, poster, OG y videos resuelven al dominio propio. Los componentes `next/image` usan el loader Cloudflare y `srcset` allowlisted.
- CSP agrega únicamente los orígenes configurados a `img-src` y `media-src`.

### Inventario y derechos

`config/media-assets.json` es la fuente versionada de verdad. Registra ID lógico, key destino, MIME, fuente y licencia. Incluye:

- poster y video hero;
- seis fotos de equipo;
- imagen institucional;
- ocho imágenes de galería;
- cinco imágenes genéricas de productos demo.

Las imágenes remotas existentes se identifican como material Unsplash y conservan referencia de fuente/licencia. No se copiaron ni hotlinkearon imágenes de MercadoLibre. Los cinco productos Sir Fausto reales se incorporarán en su fase con material propio/autorizado.

### Publicación reproducible

- `npm run media:provision -- --apply`: crea/verifica sólo el bucket indicado, adjunta el custom domain, exige TLS 1.2 y deshabilita `r2.dev`.
- `npm run media:publish -- --apply`: valida manifiesto, host remoto, magic bytes/MIME y tamaño; calcula SHA-256; publica con cache inmutable; omite objetos idénticos y verifica cada upload mediante `HEAD`.
- Sin `--apply`, ambos comandos son read-only y sirven para validar el plan/manifiesto.
- `.github/workflows/media-dev.yml` sólo se ejecuta manualmente desde la branch `dev`, usa el environment `development` y no imprime secretos.

Secretos de GitHub requeridos:

- `CLOUDFLARE_R2_ADMIN_TOKEN`: token API con edición R2 para provisionar bucket/custom domain.
- `R2_DEV_ACCESS_KEY_ID` y `R2_DEV_SECRET_ACCESS_KEY`: credencial S3 Object Read & Write restringida al bucket dev.

Variables de GitHub requeridas:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`
- `MEDIA_PUBLIC_URL_DEV=https://media-dev-nox.cloud-it.com.ar`
- `MEDIA_TRANSFORM_URL_DEV=https://media-dev-nox.cloud-it.com.ar`
- `MEDIA_TENANT_DEV=nox`

No se deben reutilizar tokens DNS existentes ni conceder acceso a buckets productivos.

## Validación ejecutada

- `npm run media:provision` en dry-run: correcto.
- `npm run media:publish` en dry-run: manifiesto v1 válido, 23 assets y 9 locales con magic bytes/MIME correctos.
- Verificación HTTP de las 14 fuentes remotas: todas respondieron `200`, `image/webp` y firma `WEBP`.
- `npm run test:media`: 5 pruebas unitarias verdes, incluyendo fallback, tenant, allowlists, rutas ambiguas y URLs administradas.
- `npm run lint`: verde.
- `npm run build` sin CDN: verde.
- `npm run build` con configuración CDN dev: verde.
- Smoke local del artefacto configurado: CSP contiene sólo el origen dev y galería/equipo/nosotros generan variantes `/cdn-cgi/image` de anchos allowlisted.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades productivas.

## Cutover dev y criterios de cierre

1. Crear los cinco secretos/variables de alcance dev indicados.
2. Mergear el PR de contrato a `dev` con checks verdes.
3. Ejecutar `publish-dev-media` desde `dev`.
4. Esperar ownership y TLS `active` del custom domain.
5. Validar originales: HTTP 200, MIME correcto, ETag y cache inmutable.
6. Activar las tres variables `MEDIA_*_DEV` y desplegar un nuevo digest frontend.
7. Ejecutar E2E responsive/accessibility, smoke de todas las rutas y Lighthouse mobile/desktop.
8. Verificar `CF-Cache-Status` MISS→HIT y AVIF/WebP según `Accept`.
9. Registrar PR, workflow, digest, Argo CD y métricas en este documento y en el roadmap maestro.

La fase no se considera cerrada hasta completar el cutover y la verificación real en dev.

## Rollback

1. Vaciar `MEDIA_PUBLIC_URL_DEV`, `MEDIA_TRANSFORM_URL_DEV` y `MEDIA_TENANT_DEV`.
2. Rebuild/redeploy de la misma revisión: el fallback vuelve a archivos locales y URLs remotas previas.
3. No borrar el bucket durante el incidente; conservar objetos para diagnóstico.
4. Eliminar custom domain/bucket únicamente después de confirmar que no existen consumidores.
