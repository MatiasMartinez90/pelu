# Fase 2 — SEO, GEO y accesibilidad

**Estado:** en validación sobre `feat/seo-geo-foundations`  
**Destino:** exclusivamente `dev`; no promover a `main` ni `demo` sin autorización explícita.  
**Fecha:** 2026-07-18

## Resultado implementado

- URL oficial centralizada y canonical absoluto por ruta; el build de `dev` usa `https://dev-nox.cloud-it.com.ar` y queda `noindex`.
- Metadata única por página pública, Open Graph y Twitter Card con imagen local; rutas privadas siempre `noindex,nofollow`.
- `robots.txt` dependiente del ambiente, `sitemap.xml` con páginas públicas y servicios activos, y exclusión de login, portales y APIs.
- schema.org `HairSalon` con domicilio, coordenadas, horarios y contacto; `FAQPage` derivado del mismo contenido visible.
- Páginas `/servicios/[slug]` alimentadas desde PostgreSQL a través del catálogo bootstrap, con `Service`, `Offer` y `BreadcrumbList`.
- `/llms.txt` con información empresarial, enlaces canónicos y advertencia de que la disponibilidad debe consultarse en tiempo real.
- Catálogo visible de Servicios eliminado del código: nombre, descripción, precio, duración, badge y variación de precio vienen de la base.
- RUM de FCP, LCP, CLS, INP y TTFB reenviado al backend sin identificadores personales; métricas Prometheus con labels acotados por ruta y dispositivo.
- Contraste WCAG corregido en banner demo, stepper, Servicios y Nosotros después de hallazgos automáticos reales.

## Controles y privacidad

- El ambiente `dev` se compila con `SITE_INDEXABLE=false`; no se confía sólo en un header o configuración manual posterior.
- Las rutas RUM dinámicas se normalizan (`/servicios/:slug`) y cualquier ruta desconocida colapsa a `/other`, evitando PII y cardinalidad no acotada.
- El collector valida nombre, valor, rating, dispositivo y longitud de ruta; tiene rate limit y la telemetría es best-effort para no degradar navegación.
- JSON-LD se serializa escapando `<` para evitar inyección de markup.
- No se publican ratings ni reseñas en datos estructurados sin una fuente verificable.

## Pruebas incorporadas

- Contrato SEO E2E: title, description, canonical, robots, sitemap, `llms.txt`, rutas privadas y schemas.
- Servicio E2E: página generada desde catálogo, canonical, `Service`, oferta ARS y breadcrumbs.
- Axe WCAG 2.2 A/AA en nueve rutas, mobile y desktop; bloquea violaciones `serious` y `critical`.
- Fixture HTTP determinista para catálogo y telemetría, sin depender de datos externos en CI.
- Unit tests del backend para normalización segura de labels RUM.

Evidencia local hasta el momento:

- ESLint: verde.
- Next.js production build: verde; 19 rutas generadas y `/servicios/[slug]` dinámica.
- Ruff: verde.
- Backend: 60 tests verdes, 4 integraciones omitidas según el diseño del suite.
- Playwright completo: 108 tests verdes (78 responsive, 18 WCAG y 12 SEO/GEO); 96 combinaciones redundantes omitidas de forma explícita.
- Accesibilidad: las seis violaciones iniciales de contraste fueron corregidas y la matriz mobile/desktop quedó verde.
- Seguridad de dependencias: `npm audit --omit=dev` y `pip-audit` sin vulnerabilidades conocidas.
- GitOps RUM: PR de infraestructura [#12](https://github.com/MatiasMartinez90/agents-hetzner-k3s/pull/12), squash `6cf2745`; Argo `nox-dev` Synced/Healthy, ServiceMonitor y dashboard presentes.

## Observabilidad pendiente de cierre

Para marcar la fase `lista en dev` todavía deben completarse:

1. PR de aplicación hacia `dev`, checks verdes, merge y despliegue.
2. Smoke real de canonical/noindex, schemas, catálogo, RUM/Prometheus y estado de Argo CD.

## Criterio de cierre

La fase se marcará lista únicamente cuando las verificaciones anteriores tengan enlaces, commit, digest y evidencia del ambiente `dev`. Producción y demo permanecen sin cambios.
