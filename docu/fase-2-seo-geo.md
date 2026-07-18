# Fase 2 — SEO, GEO y accesibilidad

**Estado:** listo en `dev`
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

## Evidencia de integración y despliegue

- Aplicación: PR [#33](https://github.com/MatiasMartinez90/pelu/pull/33), squash `b0be56c2aa9c119d762bbe8954a090586cebbe71`, mergeado exclusivamente a `dev`.
- Checks finales del PR: `code-and-config`, `dependencies`, `budgets` y `responsive` verdes. El primer intento responsive reveló una carrera del iframe externo de OpenStreetMap; el shim CSP quedó acotado al origen local y la repetición completa pasó.
- Deploy: GitHub Actions [run 29627813319](https://github.com/MatiasMartinez90/pelu/actions/runs/29627813319), frontend y backend exitosos.
- Frontend dev: `ghcr.io/matiasmartinez90/nox-barber@sha256:d81968e29bf66d457b1348927304378947722de82e82d590554d6a8e04087acd`.
- Backend dev: `ghcr.io/matiasmartinez90/nox-backend@sha256:4fd50e2bae6d6b71bf5695a404af98d78b230880d73de54094bdfb9ef04d5a66`.
- GitOps: revisión `6a4465e`; Argo `nox-dev` `Synced/Healthy`; web, API, worker y signer Ready, cero reinicios.
- Infra RUM: PR GitOps [#12](https://github.com/MatiasMartinez90/agents-hetzner-k3s/pull/12); ServiceMonitor `nox-api` y ConfigMap `grafana-dashboard-nox-dev-rum` presentes.

Smoke real sobre `https://dev-nox.cloud-it.com.ar`:

- home HTTP 200 en 0,11 s, canonical de dev, `noindex,nofollow` y `HairSalon` presentes;
- `robots.txt` bloquea `/` y `sitemap.xml` no publica URLs mientras el ambiente sea no indexable;
- `llms.txt` usa hostname de dev y presenta datos/horarios coherentes;
- `/servicios` devuelve el catálogo real y `/servicios/corte-masculino` expone canonical y schema `Service`;
- API `/health` HTTP 200 en 0,06 s;
- POST RUM a `/api/vitals` HTTP 204, recepción backend HTTP 204 y serie `nox_web_vital_reports_total` visible en Prometheus con `namespace=nox-dev`, `device=mobile` y `path=/servicios/:slug`;
- target Prometheus `nox-api` con `up=1`.

Control de alcance después del despliegue:

- `dev`: `b0be56c`;
- `main`: `bab817a`, sin cambios;
- `demo`: `76811bf`, sin cambios;
- producción y demo conservan el mismo digest frontend `sha256:3b913f…`.

## Criterio de cierre

La fase cumple el criterio autorizado de `lista en dev`: código, pruebas, checks, GitOps, despliegue y smoke tienen evidencia. Producción y demo permanecen sin cambios y no se iniciará promoción sin autorización explícita.
