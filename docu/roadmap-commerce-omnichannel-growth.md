# Roadmap integral: mobile, SEO/GEO, shop, pagos, omnicanalidad y campañas

**Estado:** roadmap maestro activo; Fases 0–2 listas en dev
**Última actualización:** 2026-07-18
**Alcance de este documento:** fuente de verdad de planificación, estado, criterios de aceptación y evidencias del roadmap integral.
**Repositorio analizado:** `Pelu`  
**Branch de ejecución actual:** `docs/close-phase-2`, creada desde `dev`

### Decisiones confirmadas el 2026-07-17

- El producto es una **POC comercial demostrable con calidad productiva**: debe poder publicarse y mostrarse a potenciales clientes, aunque inicialmente opere con catálogo, cuentas y volumen acotados.
- La POC no habilita atajos en seguridad, pagos, datos personales, consentimiento o políticas de proveedores. Se reducen alcance y volumen, no calidad técnica.
- El shop incluirá **sólo retiro en el local** en la POC. Los envíos quedan como evolución posterior para reducir alcance operativo.
- Para turnos, Mercado Pago cobrará **el total** y será una facilidad opcional. El turno sigue confirmado si el cliente no paga online porque puede pagar en el local.
- El acceso iniciado con teléfono enviará el código a un **correo previamente registrado**.
- Instagram todavía no está configurado. Para la POC se preparará desde cero una cuenta controlada por el responsable de la demo y se completarán los prerequisitos de Meta/Chatwoot.
- Se incorporará consentimiento comercial explícito y granular. Hasta implementarlo y obtenerlo, se tratará como inexistente y no se habilitarán campañas promocionales.
- Cloudflare ya administra el dominio. Puede existir R2, pero no hay un pipeline de R2 ni Cloudflare Images en uso.
- En este proyecto, **GEO significa optimización para buscadores y asistentes con IA**. El SEO local continúa dentro del alcance SEO, pero no se lo denominará GEO.
- Todavía no hay un media kit autorizado para los productos Sir Fausto.
- Todavía no existe una aplicación/cuenta de integración de Mercado Pago preparada; la fase deberá comenzar creando la aplicación y sus credenciales de prueba.
- La POC se inicializará con datos ficticios. Podrá ser probada end-to-end por amigos o potenciales clientes reales, pero sus datos quedarán identificados como testers y no recibirán campañas sin consentimiento.
- Los precios y el stock inicial de los cinco productos serán datos sintéticos administrables.
- El shop se desplegará en un **subdominio independiente**, no bajo `/shop`, y se diseñará como boilerplate reutilizable para futuros comercios.
- **Todo el sistema** —sitio público, turnero, shop, administración, agente, canales, pagos e infraestructura— deberá funcionar como boilerplate/white-label replicable.
- El hostname de la demo del shop queda confirmado como `shop-nox.cloud-it.com.ar`.
- La rama persistente `dev` y su ambiente serán el destino de integración de todos estos cambios; `main` y lo actualmente desplegado representan producción.
- Dev usará **Telegram** como canal conversacional en lugar de consumir una línea/número de WhatsApp.
- Dev reutilizará los mismos servidores de PostgreSQL, RabbitMQ, Redis, Chatwoot y Keycloak cuando sea seguro, pero con aislamiento lógico, usuarios, datos y credenciales propios.
- Los PR funcionales #11, #12, #13 y #14 están mergeados en `main`. La rama persistente `dev` fue creada desde el baseline actualizado `6e19ff1` que contiene esos cambios.
- Los PR abiertos #1–#10 son actualizaciones automáticas de Dependabot y no bloquean la creación del ambiente dev; deben revisarse por compatibilidad en PRs separados.

### Decisión de promoción confirmada el 2026-07-18

- La Fase 0 normalizará `dev`, `main` y `demo`: llevará los fixes #16, #17 y #18 a producción/demo e incorporará en `dev` todo lo agregado recientemente a `main`.
- Desde la Fase 1 en adelante, los cambios se integrarán por PR únicamente a `dev` y se validarán en el ambiente dev.
- No se abrirán ni mergearán promociones de las Fases 1–14 hacia `main` o `demo` sin una autorización futura y explícita del responsable del producto.
- Esta pausa de promoción no reduce la Definition of Done de desarrollo: código, migraciones, tests, checks, documentación, GitOps y pruebas funcionales en dev siguen siendo obligatorios.
- Producción y demo deben permanecer sobre el mismo código y los mismos digests. Sus únicas diferencias admitidas son configuración, secretos, dominios y datos.

## 0. Control maestro de ejecución

Los estados permitidos son `pendiente`, `en curso`, `validando`, `listo en dev`, `promoción autorizada` y `completo`. Ninguna fase se marca completa sólo por tener código; la evidencia debe cubrir PR, checks, despliegue y pruebas funcionales según el alcance autorizado.

| Fase | Entrega | Dependencias | Criterio de aceptación resumido | Estado | Evidencia |
|---|---|---|---|---|---|
| 0 | Normalización de ramas | Ninguna | `dev`, `main` y `demo` sin divergencias funcionales; #16–#18 presentes; Telegram, persistencia, fechas y moderación reprobados | Completo | PRs #16–#18, #21–#23, #25 y #27; CI, GitOps, E2E y promoción detallados en 0.3 y 0.4 |
| 1 | Mobile y responsive | Fase 0 | Home, turnero, shop, admin, barbero y cliente cubiertos por matriz responsive y pruebas visuales | Listo en dev | PR #32, squash `b683af5`, 78/78 pruebas, deploy dev saludable; detalle en `docu/fase-1-responsive.md`; shop se suma en Fase 5 |
| 2 | SEO y GEO | Fases 0–1 | sitemap/robots/canonical/metadata/schema/servicios/`llms.txt` válidos y consistentes | Listo en dev | PR #33, squash `b0be56c`; GitOps #12/`6a4465e`; 108 E2E y smoke completo en `docu/fase-2-seo-geo.md` |
| 3 | Cloudflare y medios | Fase 4 parcial para tenancy; puede prototiparse antes | Medios publicados por tenant, formatos responsive, caché y fallback probados | En progreso | Contrato, manifiesto y pipeline listos en `feat/cloudflare-media-pipeline`; cutover R2 dev pendiente. Ver `docu/fase-3-cloudflare-medios.md` |
| 4 | Boilerplate integral | Fase 0 | Marca, negocio, dominios, módulos, pagos, canales y agente configurables sin hardcodes de NOX | En curso | Base mergeada en PR #37; bootstrap idempotente y fixture Aurora en `feat/installation-bootstrap-fixture`; GitOps y validación dev pendientes. Ver `docu/fase-4-boilerplate-white-label.md` |
| 5 | Shop independiente | Fases 3–4 | Subdominio propio, catálogo, detalle, búsqueda, carrito, checkout, retiro, stock y pedidos administrables | Pendiente | — |
| 6 | Mercado Pago | Fase 5; modelo de pagos reutilizable | Turnos opcionales y shop total; webhooks auténticos/idempotentes; conciliación y auditoría | Pendiente | — |
| 7 | Instagram y multicanal | Fases 4 y 10 parcial | Instagram→Chatwoot→agente operativo, handoff y canal visible en toda la administración | Pendiente | — |
| 8 | Identidad de clientes | Fase 4 | Gmail, teléfono+email OTP, vinculación segura, deduplicación y cambio de cuenta verificados | Pendiente | — |
| 9 | Abandonos y automatizaciones | Fases 5, 7, 8 y consentimiento | Detección durable, cadencias, quiet hours, opt-out, límites y métricas por canal | Pendiente | — |
| 10 | Admin unificado | Fases 7–8 | “Agente y conversaciones”, bandeja multicanal, filtros, estados, handoff, cliente y métricas | Pendiente | — |
| 11 | Campañas | Fases 7–10 | Editor/programación/segmentos/consentimiento/cancelación/auditoría/resultados | Pendiente | — |
| 12 | Productos Sir Fausto | Fases 4–5 | Cinco productos demo con datos editables, stock, precio, SKU, SEO y medios autorizados | Pendiente | — |
| 13 | Videos con IA | Fases 3 y 12 | Variantes mobile/desktop, CDN, reduced-motion y claims seguros | Pendiente | — |
| 14 | Seguridad y operación | Transversal; cierre después de 1–13 | Threat model, RBAC, webhooks, rate limits, aislamiento, restore probado, CI y privacidad | Pendiente | — |

### 0.1 Auditoría inicial verificable — 2026-07-18

- `origin/dev`: `a4f2426`, incluye los merges #16, #17 y #18 y despliega artefactos propios en `nox-dev`.
- `origin/main`: `dac69f1`, incluye cambios posteriores de autenticación demo, QA y dependencias que todavía no estaban en `dev`.
- `origin/demo`: `d672e67`, merge de sincronización #20; su contenido corresponde a `main` al momento de esa promoción.
- Merge-base inicial `dev`/`main`: `6e19ff1`. La divergencia era real y afectaba workflow de despliegue, agente, seguridad, autenticación, QA, dependencias y este documento.
- PRs funcionales #11–#20: cerrados/mergeados. Permanecían abiertos únicamente Dependabot #7 y #9; no forman parte de la normalización funcional y requieren evaluación separada.
- Argo CD: `nox`, `nox-backend`, `nox-dev` y `nox-demo` estaban `Synced/Healthy` sobre la revisión GitOps `91f98ce`.
- Producción y demo exponían los mismos digests de frontend (`sha256:3b913f…`) y backend (`sha256:47a7fa…`). Dev exponía digests independientes, como corresponde.
- El repositorio GitOps es `agents-hetzner-k3s`; las aplicaciones apuntan a `main` y separan manifests en producción, `nox-dev/` y `nox-demo/`.
- Se observó drift ajeno al alcance en las aplicaciones Argo `postgres` y `rabbitmq-cluster` (`OutOfSync/Healthy`). No se modificará dentro de NOX sin diagnosticar su propietario y causa.

### 0.2 Registro de evidencias

Cada fase agregará aquí o en su subsección: branch, PR, commits, migraciones, comandos de prueba y resultados, checks de CI, digest desplegado, estado Argo, URLs/escenarios E2E y defectos/correcciones. Los secretos, tokens y PII nunca se copiarán como evidencia.

### 0.3 Evidencias de validación de Fase 0 en dev — 2026-07-18

- PR [#21](https://github.com/MatiasMartinez90/pelu/pull/21), squash `437d5b2`: integración de los cambios recientes de `main` sobre `dev`, preservando #16–#18 y resolviendo el pipeline para que `dev` modifique sólo sus manifests.
- Checks de #21: `dependencies`, `code-and-config` y `budgets` verdes. El gate de performance incluyó build, presupuestos y Lighthouse mobile/desktop.
- PR [#22](https://github.com/MatiasMartinez90/pelu/pull/22), squash `b2e13b6`: arnés E2E capaz de ejercitar el webhook Telegram nativo sin guardar ni imprimir credenciales; agrega cobertura de fechas relativas y falso positivo de moderación de peluquería.
- Checks de #22: `dependencies` y `code-and-config` verdes.
- Verificación local de la integración: ESLint; build Next.js; presupuestos de performance; `npm audit --omit=dev`; Ruff; 58 tests backend verdes y 4 integraciones omitidas localmente; `pip-audit` sin vulnerabilidades conocidas; workflows YAML válidos. CI ejecutó las integraciones omitidas contra PostgreSQL y RabbitMQ descartables.
- Pipeline dev [run 29621812546](https://github.com/MatiasMartinez90/pelu/actions/runs/29621812546) y pipeline final [run 29622900497](https://github.com/MatiasMartinez90/pelu/actions/runs/29622900497): builds y actualización GitOps exitosos.
- Argo CD `nox-dev`: `Synced/Healthy` en revisión GitOps `45cbd97`; frontend `sha256:87f114e…` y backend `sha256:a76b410…`.
- Smoke HTTP: Home dev `200`, `/admin` redirige al login esperado, API `/health` devuelve `200`, y catálogo PostgreSQL expone profesionales y servicios configurados.
- E2E real: update Telegram nativo → Chatwoot → webhook firmado → RabbitMQ → worker LangGraph → OpenAI → respuesta Chatwoot/Telegram.
- Reserva E2E con Bruno para `2026-07-20 15:30`: el slot permaneció libre antes de confirmar y dejó de estar disponible después de “Sí, confirmo”, demostrando persistencia real.
- Idempotencia: un segundo “Confirmo” no creó otro turno.
- Reprogramación E2E `15:30 → 10:00`: el slot anterior se liberó y el nuevo quedó ocupado sin duplicación.
- Cancelación E2E: `10:00` volvió a quedar disponible; no quedó un turno QA activo.
- Fechas relativas: test determinista cubre `mañana` desde `2026-07-17 → 2026-07-18` y el E2E mantuvo “mañana” sin sugerir un día contradictorio.
- Moderación: “Quiero cortarme el pelo” continuó normalmente en el agente y pidió profesional/horario; no produjo el handoff falso observado antes del fix #16.
- Producción y demo permanecieron sin cambios durante toda la validación dev y conservaron entre sí los mismos digests.

### 0.4 Evidencias de promoción y cierre de Fase 0 — 2026-07-18

- PR de promoción [#25](https://github.com/MatiasMartinez90/pelu/pull/25) hacia `main`: checks `dependencies` y `code-and-config` verdes; el pipeline de seguridad posterior al merge también terminó verde.
- PR de sincronización [#27](https://github.com/MatiasMartinez90/pelu/pull/27) hacia `demo`: checks `dependencies` y `code-and-config` verdes.
- Árbol Git idéntico en las tres ramas: `main`, `dev` y `demo` resolvían al tree `235a072d…` después de #27; los SHAs de commit difieren sólo por el flujo de PR/squash y la reconciliación de historia.
- Pipeline productivo [run 29623301843](https://github.com/MatiasMartinez90/pelu/actions/runs/29623301843) verde; pipeline de seguridad [run 29623301863](https://github.com/MatiasMartinez90/pelu/actions/runs/29623301863) verde.
- Revisión GitOps final de la promoción: `87bf127`; aplicaciones `nox`, `nox-backend` y `nox-demo` en `Synced/Healthy`.
- Producción y demo declaran y ejecutan los mismos artefactos activos: frontend `sha256:3b913f…` y backend `sha256:8be42d…`. Los digests adicionales que Argo resume corresponden únicamente a Jobs históricos ya completados; Deployments y CronJobs activos coinciden exactamente.
- Migración `010_telegram_booking_channel.sql` aplicada correctamente por el initContainer `migrate` tanto en producción como en demo.
- Smokes posteriores al rollout: Home producción/demo `200`; Admin redirige al login propio esperado; APIs `/health` `200`; ambos catálogos devuelven 6 profesionales y 9 servicios.
- Logs recientes de API/worker sin `ERROR`, `Traceback`, `Exception` ni `CRITICAL` durante el rollout verificado.
- Las Fases 1–14 no fueron promovidas. Permanecen pendientes y deberán integrarse exclusivamente en `dev` hasta una nueva autorización explícita.

## 1. Objetivo

Evolucionar NOX desde una web de reservas con atención principalmente por WhatsApp a una plataforma rápida, segura y omnicanal que incluya:

- experiencia mobile y responsive de primer nivel;
- SEO local y optimización para buscadores y respuestas generativas (GEO);
- tienda propia con catálogo, carrito, pedidos e inventario;
- imágenes y videos entregados desde infraestructura propia acelerada por Cloudflare;
- pagos con Mercado Pago para compras y turnos;
- conversaciones de WhatsApp e Instagram atendidas por Chatwoot y el agente de IA;
- identidad unificada de clientes provenientes de web, Gmail, teléfono, WhatsApp e Instagram;
- recuperación responsable de conversaciones y carritos abandonados;
- campañas segmentadas por canal, frecuencia y valor del cliente;
- ambientes de desarrollo/prueba separados de producción;
- controles de seguridad, privacidad, consentimiento, observabilidad y auditoría.

El trabajo se dividirá en entregas pequeñas. Cada fase deberá tener su propia branch, PR, migraciones reversibles, pruebas y criterios de aceptación. No se recomienda implementar todo en un único PR.

### 1.1 Objetivo de producto reutilizable

La POC de NOX será simultáneamente la primera instalación de una plataforma white-label. El objetivo no es construir un SaaS multi-tenant compartido en esta etapa, sino poder levantar una **instalación aislada por cliente** usando el mismo código y un paquete de configuración.

Una nueva instalación deberá poder personalizar sin modificar código:

- nombre comercial, slug y dominios;
- logo, favicon, paleta, tipografías, imágenes y videos;
- textos del Home, SEO, GEO, dirección, contacto, moneda, locale y timezone;
- profesionales/recursos, servicios, duraciones, precios, horarios y reglas del turnero;
- catálogo, stock, retiro y módulos habilitados;
- cuenta y credenciales de Mercado Pago;
- inboxes de Chatwoot, WhatsApp, Instagram y proveedor de correo;
- contenido, políticas y límites del agente de IA;
- templates, campañas, consentimientos y textos legales;
- Cloudflare/R2, analytics, observabilidad y alertas;
- roles, administradores y feature flags.

NOX será configuración y datos de una instalación, no comportamiento hardcodeado dentro del producto.

## 2. Qué existe hoy y qué falta

### 2.1 Estado actual observado

- El frontend utiliza Next.js y ya posee trabajo en curso de performance y accesibilidad.
- La autenticación de administradores y áreas privadas pasa por NextAuth y Keycloak. El botón actual presenta el acceso como Google, pero la aplicación realmente inicia contra el proveedor Keycloak.
- `customers` almacena teléfono, nombre, correo y un `first_channel` limitado a `web`, `whatsapp` o `admin`.
- `appointments` registra un canal también limitado a `web`, `whatsapp` o `admin`.
- Existe una tabla básica de productos orientada a inventario, pero no un dominio de ecommerce completo.
- La sección visual de tienda contiene productos hardcodeados y enlaces a una tienda externa; no hay catálogo administrable, carrito, checkout, pedidos ni pagos propios.
- Chatwoot es la bandeja conversacional y el webhook actual procesa mensajes entrantes para el agente.
- El flujo actual asume fuertemente que el contacto tiene teléfono. Esto no alcanza para identificar correctamente contactos de Instagram.
- La pantalla administrativa de conversaciones presenta referencias e iconografía centradas en WhatsApp y no expone de manera consistente el inbox/canal de origen.
- Existe un job diario de seguimiento que busca conversaciones abiertas en Chatwoot, espera aproximadamente 20 horas y envía un único template de WhatsApp. No constituye un motor general de recuperación.
- No se detectó recuperación de carritos, campañas por correo, segmentación, preferencias de contacto, supresiones ni un outbox multicanal.
- El despliegue actual se ejecuta desde `main` y actualiza un único destino de GitOps. No hay un ambiente de desarrollo/preview aislado y reproducible.
- Ya existen documentos y controles previos para robustez del agente, seguridad, performance y accesibilidad. Esta iniciativa debe extenderlos, no reemplazarlos.

### 2.2 Brechas principales

1. Falta un modelo de identidad que admita varios identificadores por cliente.
2. Falta un modelo transaccional de carrito, pedido, pago y eventos de pago.
3. Falta distinguir canal, inbox y cuenta externa en toda la cadena Chatwoot → backend → admin.
4. Falta consentimiento demostrable y control de frecuencia para mensajes promocionales.
5. Falta una cola durable multicanal con reintentos, idempotencia y supresión.
6. Falta un ambiente no productivo con credenciales y datos aislados.
7. El catálogo y sus medios no tienen una fuente de verdad administrable.
8. El comportamiento de cierre de sesión debe definirse entre “salir de NOX” y “cambiar de cuenta Google”.

## 3. Principios de implementación

### 3.1 Fuente de verdad

- PostgreSQL será la fuente de verdad de clientes, identidades, consentimientos, catálogo, carritos, pedidos, pagos, campañas y automatizaciones.
- Chatwoot será la fuente de verdad de mensajes y estado operativo de conversaciones, pero se persistirán referencias locales para búsqueda, segmentación, auditoría y resiliencia.
- Mercado Pago será la fuente autoritativa del resultado financiero. Nunca se marcará un pago como aprobado sólo por la URL de retorno del navegador.
- Cloudflare/R2 o Cloudflare Images será la fuente de entrega de medios publicados. Los originales se conservarán de forma controlada.

### 3.2 Eventos, idempotencia y consistencia

- Todo webhook debe validar autenticidad, persistir primero el evento recibido y responder rápido.
- Un mismo evento de Chatwoot, Meta o Mercado Pago puede llegar más de una vez; las operaciones deberán ser idempotentes.
- Los trabajos externos saldrán mediante un patrón outbox, no directamente dentro de una transacción de negocio.
- Estados de pedido, pago, entrega y conversación serán independientes. No se inferirá uno a partir de otro.
- Todos los cambios sensibles deberán producir auditoría: actor, acción, entidad, antes/después, fecha y correlation ID.

### 3.3 Privacidad y mínimo privilegio

- Separar mensajes operativos de mensajes comerciales.
- No enviar promociones sin consentimiento válido para el canal correspondiente.
- Permitir baja inmediata y mantener una suppression list.
- Minimizar PII en logs, prompts, métricas y herramientas del agente.
- Credenciales de Mercado Pago, Meta, Chatwoot, correo y Keycloak sólo del lado servidor y administradas como secretos.

### 3.4 Entregas seguras

- Una branch y un PR por fase o subfase coherente.
- Feature flags para shop, pagos, Instagram, automatizaciones y campañas.
- Migraciones forward y rollback documentado.
- Pruebas contractuales con sandboxes antes de producción.
- Activación gradual por administradores internos y luego porcentaje de clientes.

## 4. Arquitectura objetivo

```text
Web pública / Admin                   Shop independiente
nox.cloud-it.com.ar              shop.<dominio-del-cliente>
        |                                  |
        +----------------+-----------------+
                         v
                 BFF / APIs autenticadas
        |
        +-----------------------+
        |                       |
        v                       v
PostgreSQL                  Backend agente
clientes/identidades        LangGraph + políticas
catálogo/carritos               |
pedidos/pagos                   v
campañas/auditoría          RabbitMQ / workers
        |                       |
        +-----------+-----------+
                    |
          outbox + webhooks durables
                    |
       +------------+-------------+-------------+
       |                          |             |
       v                          v             v
 Mercado Pago                 Chatwoot      Proveedor email
                                  |
                         WhatsApp / Instagram

Medios originales -> R2/Cloudflare Images -> media.dominio -> Sitio/Shop/Admin
```

### 4.1 Estrategia white-label de toda la plataforma

La unidad de aislamiento inicial será una **instalación**. Cada cliente tendrá su propio despliegue/configuración, secretos y base o schema aislado. No se agregará simplemente un `tenant_id` a consultas improvisadas: convertirlo en SaaS multi-tenant compartido quedará para una evolución que incluya threat model y pruebas específicas de aislamiento.

Componentes reutilizables:

```text
platform template
├── public site
├── booking application
├── standalone shop
├── customer account
├── admin/backoffice
├── AI agent and automations
├── workers and integrations
├── database migrations and seeds
├── deployment manifests
└── installation configuration
```

La configuración se dividirá en:

- **configuración pública:** marca, contenido, theme, dominios, locale, timezone y features;
- **configuración operativa:** servicios, profesionales, horarios, catálogo, políticas y templates;
- **secretos:** credenciales de pagos, canales, correo, auth, DB y observabilidad;
- **datos iniciales:** seeds idempotentes de demo o importación del cliente;
- **infraestructura:** namespace, recursos, hosts, certificados, buckets, colas y bases.

Reglas:

- no introducir nombres, barberos, servicios, direcciones, teléfonos, links, precios ni IDs de NOX en lógica, prompts o queries;
- el agente obtiene contexto del negocio desde PostgreSQL/configuración versionada y no desde un prompt fijo;
- todas las integraciones pasan por interfaces/adapters y se habilitan por feature flag;
- cada instalación usa credenciales propias y callbacks construidos desde su dominio;
- los manifests usan valores/overlays por cliente, sin copiar y editar YAML manualmente como proceso normal;
- migraciones genéricas y seeds separados por instalación;
- contenido legal y consentimientos versionados por cliente;
- métricas incluyen `installation_id` no sensible para separar dashboards, sin mezclar PII;
- backups, restauración y borrado operan por instalación;
- una actualización del template debe poder promoverse a cada cliente de forma controlada, con versión y changelog.

### 4.2 Separación del shop

El shop será una aplicación desplegable de manera independiente en un hostname propio. Para la demo se confirma `shop-nox.cloud-it.com.ar` y para futuros clientes se podrá publicar como `shop.<dominio-del-cliente>` o el dominio que controlen.

La primera versión será **single-tenant configurable**, coherente con el resto de la plataforma. El mismo código podrá desplegarse varias veces con configuración y datos aislados por cliente. Esto ofrece reutilización sin introducir desde la POC el riesgo de mezclar datos, pagos o campañas entre comercios.

Separaciones obligatorias:

- build/deployment independiente del sitio institucional;
- variables y secretos por instalación;
- branding por configuración: nombre, logo, colores, tipografías, textos legales y datos de contacto;
- catálogo, stock, Mercado Pago, correo, Cloudflare y analytics sin valores NOX hardcodeados;
- URLs públicas, canonical, sitemap y metadata generados desde el dominio de cada shop;
- callbacks de Mercado Pago y autenticación definidos por ambiente/tenant;
- CORS con allowlist exacta, nunca wildcard con credenciales;
- cookies host-only o flujo OIDC propio; no depender de compartir cookies indiscriminadamente entre subdominios;
- base/schema aislado por despliegue inicialmente. Una arquitectura multi-tenant compartida requerirá un proyecto de seguridad posterior;
- seeds de demo separados de migraciones y de datos productivos;
- feature flags y módulos opcionales para retiro, envíos futuros, campañas y agente.

Estructura objetivo conceptual:

```text
shop application
├── storefront
├── cart and checkout
├── customer account
├── shop admin
├── provider adapters
│   ├── payments
│   ├── email
│   ├── media
│   └── analytics
├── tenant/brand configuration
└── shared contracts with the backend
```

Se podrán extraer paquetes compartidos de UI, contratos y cliente API, pero el shop no deberá quedar acoplado al routing, sesión administrativa o release del sitio principal.

### 4.3 Dominios funcionales

- **Identidad y clientes:** une correo, teléfono, WhatsApp, Instagram y cuenta Keycloak sin perder su origen.
- **Catálogo:** productos, variantes, precios, stock, imágenes y publicación.
- **Commerce:** carrito, checkout, pedido, items, retiro en local y estados. El modelo podrá extenderse a envíos en una fase posterior.
- **Pagos:** intención, preferencia de Mercado Pago, método elegido, eventos, conciliación, devolución.
- **Conversaciones:** canal, inbox, contacto externo, conversación y vínculo con cliente.
- **Automatización:** abandono, elegibilidad, cadencia, mensajes y conversiones.
- **Campañas:** audiencia, segmento, consentimiento, contenido, aprobación, envío y resultados.
- **Medios:** originales, variantes, metadata, propiedad intelectual y publicación CDN.

## 5. Modelo de datos propuesto

Los nombres definitivos se validarán contra las convenciones del repositorio. Este modelo muestra responsabilidades y restricciones mínimas.

### 5.1 Clientes e identidades

#### `customers`

- Mantener un identificador interno estable.
- Hacer que teléfono y correo dejen de ser la única identidad implícita.
- Agregar, si aporta valor, `preferred_name`, `locale`, `timezone`, `merged_into_customer_id` y timestamps consistentes.
- Conservar campos denormalizados de contacto principal sólo para lectura rápida; la verdad de verificación estará en identidades.

#### `customer_identities`

- `id`
- `customer_id`
- `identity_type`: `email`, `phone`, `google`, `whatsapp`, `instagram`, `telegram`, `keycloak`
- `normalized_value`: correo lowercase, teléfono E.164 o identificador externo estable
- `external_account_id` e `external_contact_id` cuando corresponda
- `verified_at`
- `verification_method`
- `is_primary`
- `metadata` JSONB sin secretos
- `created_at`, `updated_at`, `last_seen_at`

Restricciones:

- unicidad por tipo + valor normalizado cuando sea seguro hacerlo;
- sólo una identidad primaria por tipo y cliente;
- no fusionar automáticamente dos clientes sólo porque Meta o Chatwoot muestre el mismo nombre;
- una fusión requiere prueba de posesión o revisión administrativa y debe ser auditable/reversible.

#### `customer_consents`

- `customer_id`
- `channel`: `email`, `whatsapp`, `instagram`
- `purpose`: `transactional`, `marketing`, `abandoned_cart`, `service_updates`
- `status`: `granted`, `revoked`, `unknown`
- `source`, `policy_version`, `evidence`, `granted_at`, `revoked_at`

#### `verification_challenges`

- propósito, identidad destino, hash del código, expiración, cantidad de intentos, estado y timestamps;
- códigos de un solo uso, cortos en duración y nunca guardados en texto plano;
- rate limit por IP, identidad, cliente y dispositivo;
- invalidación al usar, expirar o solicitar uno nuevo.

### 5.2 Catálogo e inventario

#### `products`

- nombre, slug, descripción corta/larga;
- marca, SKU, GTIN/EAN si existe;
- estado `draft`, `active`, `archived`;
- precio en centavos y moneda `ARS` o tabla separada de precios;
- stock vendible, stock reservado, umbral bajo;
- peso/dimensiones opcionales reservados para una futura fase de envíos;
- campos SEO: title, description y canonical override;
- timestamps y auditoría.

#### `product_media`

- `product_id`, tipo `image`/`video`, orden, alt text;
- clave del original, asset ID de Cloudflare, checksum, ancho, alto, duración;
- estado de moderación/publicación y derechos/licencia;
- poster del video y variantes.

#### `inventory_movements`

- producto, cantidad con signo, razón, referencia a pedido/ajuste, actor y timestamp;
- el stock no debe cambiar sin un movimiento trazable;
- reserva de stock durante checkout con expiración explícita.

### 5.3 Carritos y pedidos

#### `carts`

- cliente opcional y `anonymous_session_id` para invitados;
- estado `active`, `converted`, `abandoned`, `expired`, `merged`;
- canal de origen y UTM/referrer;
- `last_activity_at`, `abandoned_at`, `recovered_at`;
- moneda y totales recalculables.

#### `cart_items`

- snapshot mínimo de producto/variante, cantidad y precio observado;
- el precio final se valida nuevamente al iniciar checkout;
- unicidad de producto/variante por carrito.

#### `orders`

- número público no secuencial/predecible;
- cliente, canal, estado de fulfilment y estado de pago separados;
- subtotal, descuento, total, moneda;
- modalidad inicial recomendada: retiro en local;
- snapshot de datos del comprador;
- timestamps de creación, confirmación, preparación, entrega y cancelación.

#### `order_items`

- snapshot inmutable de SKU, nombre, cantidad, precio unitario, descuento e impuestos;
- no depender del nombre o precio actual del producto para mostrar pedidos históricos.

### 5.4 Pagos de tienda y turnos

#### `payments`

- referencia a un `order_id` o `appointment_id`, con restricción XOR;
- `provider`: inicialmente `mercado_pago` o `local`;
- `method_choice`: `mercado_pago_now`, `pay_at_store`;
- `status`: `created`, `pending`, `approved`, `rejected`, `cancelled`, `refunded`, `charged_back`, `expired`;
- monto, moneda, external payment/order/preference ID;
- idempotency key, timestamps y metadata permitida;
- `paid_at`, `refunded_at` y `failure_reason` sanitizado.

#### `payment_events`

- evento crudo cifrado o minimizado, external event ID, firma validada, fecha de recepción/proceso y resultado;
- restricción única para evitar reproceso;
- conservar historial, no sobrescribir el único estado anterior.

#### Campos visibles de negocio

En turnos y pedidos el administrador debe ver, como mínimo:

- cómo eligió abonar: Mercado Pago ahora o en el local;
- estado financiero actual;
- monto esperado y monto aprobado;
- fecha del último cambio;
- referencia conciliable;
- si necesita acción manual.

### 5.5 Conversaciones y canales

#### `channel_accounts`

- representa un inbox/cuenta concreta: WhatsApp principal, Instagram del negocio, correo, etc.;
- `channel`, `provider`, `chatwoot_inbox_id`, nombre visible, estado, configuración no secreta.

#### `conversation_bindings`

- `chatwoot_conversation_id`, `chatwoot_contact_id`, `chatwoot_inbox_id`;
- `channel`, identificador externo, `customer_id` opcional;
- última actividad, último mensaje entrante/saliente y estado de automatización;
- unique constraints por cuenta y conversación.

Esto permite mostrar Instagram incluso cuando el contacto no tiene teléfono y evita atribuir una conversación al cliente equivocado.

### 5.6 Campañas y automatizaciones

#### `segments`

- definición versionada y validada, no SQL libre ingresado por un administrador;
- filtros soportados: canal disponible, consentimiento, frecuencia de visitas, gasto, recencia, cantidad de turnos/pedidos y etiquetas;
- preview de conteo antes de enviar.

#### `campaigns`

- nombre interno, propósito, contenido por canal, segmento, estado;
- `draft`, `scheduled`, `approved`, `sending`, `paused`, `completed`, `cancelled`;
- creador, aprobador, fecha programada, timezone;
- tipo operativo o comercial claramente separado.

#### `campaign_recipients`

- snapshot de audiencia al aprobar;
- cliente, canal, destino normalizado/cifrado, elegibilidad y razón de exclusión;
- estado de entrega, provider message ID, timestamps y error categorizado.

#### `automation_enrollments`

- tipo `conversation_abandonment` o `cart_abandonment`;
- entidad origen, cliente, etapa/cadencia, próxima ejecución y estado;
- cancelación automática si el cliente responde, compra, reserva, se da de baja o deja de ser elegible.

#### `outbox_messages`

- canal, template/content reference, destinatario, correlation ID, idempotency key;
- estado, intentos, `next_attempt_at`, error y dead-letter state;
- workers con backoff, jitter, límites por proveedor y aislamiento por canal.

### 5.7 Configuración de instalación

#### `business_profile` / `site_settings`

- una fila activa por instalación con nombre, descripción, dirección, contacto, locale, timezone y moneda;
- identidad visual y referencias a medios, sin blobs dentro de la configuración;
- dominios públicos esperados y URLs de reserva/shop;
- horarios especiales y textos legales versionados;
- datos consumidos por sitio, shop, admin y agente desde la misma fuente de verdad.

#### `installation_features`

- flags tipados: booking, shop, payments, WhatsApp, Instagram, campaigns, abandonment y módulos futuros;
- defaults seguros y validación de dependencias;
- un módulo deshabilitado no publica rutas, jobs ni acciones del agente asociadas.

#### `provider_connections`

- provider, ambiente, estado, capacidades y referencia al secreto externo;
- nunca access tokens o secretos en texto plano dentro de seeds/config pública;
- health/readiness por integración y auditoría de activación/desactivación.

#### Contrato del turnero reutilizable

- profesionales/recursos, servicios, relaciones entre ambos, duración, precio, buffers y capacidad provienen de DB;
- horarios, bloqueos, feriados, timezone y reglas de anticipación son configurables;
- ningún nombre de profesional, slug, servicio, dirección u horario aparece hardcodeado en queries, prompts o componentes;
- URLs y mensajes generados usan el dominio/configuración de la instalación;
- el agente consume exactamente el mismo contexto canónico que el frontend y el admin.

#### Contrato de Mercado Pago reutilizable

- credenciales y application ID propios por instalación y ambiente;
- statement descriptor, URLs de retorno, webhook y metadata construidos desde configuración validada;
- external references con namespace de instalación;
- adapter de pagos para no contaminar pedidos/turnos con detalles particulares del SDK;
- deshabilitar checkout online de forma segura si la integración no está configurada, manteniendo pago local si corresponde.

## 6. Línea de trabajo A: mobile y responsive

### 6.1 Auditoría inicial

Probar todas las rutas públicas y administrativas en una matriz mínima:

- 320, 360, 375, 390, 412, 768, 1024, 1280 y 1440 px;
- iOS Safari y Chrome Android reales, además de emulación;
- portrait/landscape;
- zoom de texto 200 %, teclado abierto, safe areas y reduced motion;
- conexiones lentas y dispositivos de CPU media/baja.

Rutas prioritarias:

- Home;
- reserva y cada paso del wizard;
- login, callback y errores;
- subdominio del shop, ficha de producto, carrito y checkout;
- resultado de pago;
- admin, agenda, clientes, Agente y conversaciones, campañas y pedidos.

### 6.2 Cambios previstos

- Definir contenedores fluidos y breakpoints por contenido, no por modelos de teléfono.
- Evitar scroll horizontal, targets menores a 44×44 px y controles tapados por barras del navegador.
- Mantener CTA principal accesible sin cubrir contenido.
- Usar inputs correctos (`email`, `tel`, `numeric`) y autocompletado seguro.
- Conservar foco y estado al navegar hacia Mercado Pago y volver.
- Tablas administrativas: pasar a cards o columnas esenciales en pantallas angostas.
- Formularios largos: validación inline, resumen de errores y persistencia de borrador.
- Imágenes responsive con `srcset/sizes`, dimensiones reservadas y prioridad sólo para LCP real.
- Videos con poster, sin autoplay costoso en conexión reducida y controles accesibles.
- Pruebas visuales automáticas y tests de interacción en viewports representativos.

### 6.3 Métricas de aceptación

- cero overflow horizontal involuntario;
- todas las acciones críticas realizables con una mano y teclado;
- checkout y reserva completables a 320 px;
- WCAG 2.2 AA en flujos críticos;
- budgets de Core Web Vitals definidos en el plan existente, medidos por ruta/dispositivo.

## 7. Línea de trabajo B: SEO y GEO

En este plan se distinguen dos objetivos:

1. **SEO local:** aparecer para búsquedas relacionadas con barbería, servicios y ubicación.
2. **GEO (Generative Engine Optimization):** ofrecer contenido claro, verificable y estructurado para asistentes y respuestas generativas.

### 7.1 SEO técnico

- inventario de URLs indexables y privadas;
- metadata única por ruta, canonical, robots, sitemap y Open Graph;
- `noindex` para login, admin, carrito, checkout, resultados de pago y previews;
- páginas renderizadas en servidor para contenido indexable;
- evitar contenido principal dependiente sólo de JavaScript;
- enlaces internos descriptivos y breadcrumbs;
- auditoría de 404, redirects, duplicados, query params y paginación;
- Search Console, Bing Webmaster Tools y alertas de cobertura;
- preservar performance y accesibilidad como parte de SEO.

### 7.2 SEO local

- una entidad canónica del local: nombre, dirección, teléfono, horarios y coordenadas consistentes;
- schema JSON-LD `LocalBusiness` con el subtipo más preciso disponible;
- horarios especiales y cierres extraordinarios administrables;
- `sameAs` para perfiles oficiales;
- contenido real de servicios, barberos, precios orientativos y preguntas frecuentes;
- perfil de Google Business coherente con la web;
- páginas locales sólo si existe contenido y propósito real; no generar páginas doorway.

### 7.3 Ecommerce SEO

- URL estable y legible por producto;
- `Product`/merchant listing con precio, moneda, disponibilidad, SKU/GTIN, imágenes y política comercial reales;
- feeds para Merchant Center sólo después de validar precios, stock, envíos/retiro, devoluciones y datos legales;
- sitemap de productos e imágenes;
- canonical correcto para variantes;
- no reutilizar texto del marketplace de terceros como descripción propia.

### 7.4 GEO generativo

- contenidos con respuestas directas, datos verificables y fecha de actualización;
- páginas de entidad para local, servicios, profesionales y productos;
- datos estructurados consistentes con el contenido visible;
- autoría/origen de información cuando corresponda;
- FAQs basadas en preguntas reales, sin fabricar reseñas ni afirmaciones;
- feed o endpoint público controlado para datos estables si se demuestra útil;
- monitoreo de menciones y respuestas en buscadores, sin prometer ranking.

### 7.5 Validación

- Rich Results Test, Schema Markup Validator y URL Inspection;
- Lighthouse SEO/accessibility y crawler en CI;
- monitoreo de impresiones, CTR, consultas locales y conversiones, no sólo posición.

## 8. Línea de trabajo C: medios y Cloudflare

### 8.1 Recomendación

Usar un subdominio propio, por ejemplo `media.<dominio>`, proxied por Cloudflare. Para este volumen inicial hay dos alternativas válidas:

- **R2 + Image Transformations:** control sobre originales y transformación por URL;
- **Cloudflare Images:** almacenamiento y entrega administrados mediante asset ID y variantes.

**Decisión recomendada para la POC:** comenzar con **R2 como almacenamiento de originales + dominio propio + Cloudflare Image Transformations** para las variantes. Esto conserva control de los archivos, aprovecha que el DNS ya está en Cloudflare y evita incorporar dos fuentes de almacenamiento. Antes de implementarlo se verificará si R2 está realmente habilitado, el plan aplicable y los límites/costos de transformaciones. Si la cuenta no permite esta combinación de forma conveniente, Cloudflare Images será el fallback administrado.

### 8.2 Pipeline de imágenes

1. Administrador sube original autorizado.
2. Backend valida MIME real, tamaño, dimensiones y elimina metadata sensible.
3. Se calcula checksum para deduplicar.
4. Se guarda el original con key no predecible.
5. Se generan/solicitan variantes AVIF/WebP/JPEG por ancho y uso.
6. Se publica metadata en `product_media`.
7. Next.js entrega URL del dominio propio con `sizes` preciso.

Variantes iniciales:

- thumbnail admin: 96/192 px;
- card: 320/640 px;
- ficha: 640/960/1280 px;
- OG/social: composición dedicada 1200×630;
- poster de video: 640/1280 px.

### 8.3 Caché

- nombres/versiones inmutables para cache largo;
- `Cache-Control: public, max-age=31536000, immutable` para assets versionados;
- ETag/checksum del original;
- invalidar mediante nueva versión, no purgas globales;
- evitar transformaciones ilimitadas controladas por input del usuario;
- allowlist de tamaños/calidades para controlar costos y abuso.

### 8.4 Seguridad y derechos

- no hotlinkear imágenes de MercadoLibre;
- no copiar fotos, videos o descripciones sin autorización del fabricante/distribuidor;
- usar material original, pack oficial licenciado o producción propia;
- escaneo y límites de subida;
- assets públicos sin firma; originales privados si no deben exponerse.

## 9. Línea de trabajo D: shop

El shop vive en una aplicación/subdominio independiente. Toda referencia a rutas de catálogo, carrito o checkout en esta sección pertenece a ese origen y no a una ruta `/shop` del sitio institucional.

### 9.1 MVP recomendado

- catálogo administrable;
- listado y detalle de producto;
- carrito invitado y autenticado;
- combinación de carrito al iniciar sesión;
- stock y reserva temporal;
- checkout con retiro en local;
- Mercado Pago o pago en local;
- confirmación y consulta de pedido;
- vista admin de pedidos, pagos y stock;
- correos/mensajes transaccionales;
- cancelación manual con reglas explícitas.

La POC será exclusivamente con retiro en el local. Dirección de entrega, zonas, tarifas, logística y tracking quedan explícitamente fuera de este primer alcance. Cupones complejos, variantes y facturación fiscal también se tratarán como evoluciones posteriores.

#### Preparación para envíos futuros

- el pedido mantendrá una modalidad `pickup` extensible sin crear tablas de logística que la POC no utiliza;
- retiro en local no se representará como una dirección ficticia;
- la futura fase de envíos deberá agregar direcciones como snapshots, zonas, cotización, `shipments`, tracking y devoluciones mediante una migración independiente;
- la UI no mostrará opciones de envío deshabilitadas o engañosas durante la demo.

### 9.2 Los cinco productos iniciales

Las URLs provistas se usarán únicamente como referencia de identificación. Antes de cargar el catálogo se necesitan SKUs, costos, precios de venta, stock, EAN/GTIN, descripciones y medios autorizados. Que sea una POC pública/productiva no elimina los derechos sobre fotos, textos, marca o claims: si todavía no hay autorización, la demo usará contenido propio o placeholders claramente identificados hasta obtener un media kit válido.

1. Sir Fausto Men's Shampoo tratamiento para caída, 250 ml.
2. Sir Fausto pomada restauradora para barba, 90 ml.
3. Sir Fausto Shampoo Pure Detox detoxificante, 500 ml.
4. Sir Fausto Men's Shampoo engrosador sin sulfato, 250 ml.
5. Sir Fausto Men's Culture pomada opaca para cabello, 100 ml.

Valores sintéticos iniciales para la demo, editables desde el administrador y sin pretensión de reflejar precios reales de mercado:

| Producto | Precio demo ARS | Stock demo |
|---|---:|---:|
| Shampoo tratamiento para caída 250 ml | $24.900 | 12 |
| Pomada restauradora para barba 90 ml | $22.500 | 10 |
| Shampoo Pure Detox 500 ml | $31.900 | 8 |
| Shampoo engrosador sin sulfato 250 ml | $26.900 | 12 |
| Pomada opaca para cabello 100 ml | $23.900 | 10 |

La UI y los seeds deberán permitir reemplazar estos valores sin cambios de código. En una demo con pago real, el responsable deberá revisar monto y stock antes de habilitar Mercado Pago.

Para cada producto se preparará una ficha de contenido:

- nombre comercial confirmado;
- SKU y código de barras;
- precio y stock;
- beneficios verificables sin claims médicos no autorizados;
- modo de uso, contenido neto e ingredientes provistos por la marca;
- fotografías licenciadas, alt texts y poster/video;
- estado de publicación y fecha de revisión.

### 9.3 Reglas de negocio

- el servidor recalcula precios y stock; nunca confía en totales del cliente;
- precios en enteros de centavos;
- stock reservado con TTL al iniciar el pago;
- idempotency key al crear pedido y pago;
- un carrito se abandona por inactividad configurable, no al cerrar una pestaña;
- una compra aprobada cancela automatizaciones de abandono;
- políticas de retiro, cambios y devoluciones visibles antes de pagar.

## 10. Línea de trabajo E: Mercado Pago

### 10.1 Integración recomendada por etapas

**Primera etapa: Checkout Pro.** El backend crea una preferencia por pedido o turno y obtiene una URL segura. Sirve tanto para redirigir desde el shop como para enviar un link por WhatsApp. Reduce el alcance de datos de tarjeta dentro de NOX.

**Etapa futura opcional: Checkout API/Orders API.** Evaluarla sólo si se necesita un checkout embebido y existe una razón de conversión suficiente para asumir mayor complejidad operativa.

### 10.2 Flujo de tienda

1. Cliente confirma carrito.
2. Servidor valida productos, precio, stock, identidad y consentimiento transaccional.
3. Se crea pedido `pending_payment` y reserva de stock.
4. Se crea `payment` con idempotencia.
5. Backend crea preferencia de Mercado Pago con items, external reference, metadata controlada, URLs de retorno y webhook.
6. Cliente es redirigido a Mercado Pago.
7. La URL de retorno sólo informa estado visual “procesando”.
8. El webhook validado consulta/confirma el recurso con Mercado Pago.
9. Se actualiza `payment`; luego, mediante una transición idempotente, se confirma o libera el pedido/stock.
10. Se envía confirmación transaccional por el canal elegible.

### 10.3 Flujo de turnos y agente de WhatsApp

Después de confirmar servicio, profesional, fecha y hora, el agente pregunta:

> ¿Querés abonar ahora con Mercado Pago o pagar en el local?

Si elige Mercado Pago:

- crear una intención de pago ligada al turno;
- generar preferencia/link en backend;
- enviar link y plazo de validez de la preferencia;
- mantener el turno confirmado independientemente de que complete el pago online;
- confirmar el pago exclusivamente por webhook;
- informar aprobación, pendiente o vencimiento sin revelar información financiera sensible.

Si elige pago local:

- registrar `method_choice=pay_at_store` y estado no pagado;
- confirmar el turno según la política de reservas;
- mostrarlo claramente en agenda/admin;
- permitir marcar cobro local con actor, hora y auditoría.

### 10.4 Regla confirmada para turnos

El pago online es opcional y por el total:

- el turno queda confirmado antes de pagar;
- si el cliente elige Mercado Pago, se registra `mercado_pago_now` y se genera el link;
- si no completa o vence el link, el turno **no se libera ni cancela**;
- el estado pasa o vuelve a “pendiente / paga en el local” según la UX acordada;
- si paga online, el webhook cambia el pago a aprobado;
- en el local se muestra claramente si ya abonó para impedir doble cobro;
- un cobro local requiere acción explícita y auditada del administrador;
- si el cliente intenta pagar después de que ya fue marcado como cobrado localmente, el backend debe bloquear una nueva preferencia o iniciar conciliación, nunca cobrar silenciosamente dos veces.

### 10.5 Webhooks, conciliación y soporte

- HTTPS y validación de firma/origen según documentación vigente;
- persistir external event ID antes de procesar;
- obtener el estado autoritativo desde la API;
- idempotencia por evento y pago;
- reintentos con backoff y dead-letter queue;
- job periódico de conciliación de pagos pendientes;
- panel de discrepancias;
- refunds/cancelaciones mediante permisos administrativos fuertes;
- nunca almacenar datos completos de tarjeta.

### 10.6 Sandbox y producción

- aplicación y credenciales separadas por ambiente;
- compradores/vendedores de prueba;
- webhooks de desarrollo públicamente accesibles pero aislados;
- pruebas de aprobado, pendiente, rechazado, duplicado, timeout, webhook fuera de orden, refund y chargeback;
- rotación documentada de credenciales.

## 11. Línea de trabajo F: Instagram, Chatwoot y agente

### 11.1 Conexión de Instagram

Prerequisitos operativos:

- cuenta Instagram Business;
- relación/configuración Meta requerida por la versión instalada de Chatwoot;
- app/permisos y URLs públicas correctas para self-hosted Chatwoot;
- inbox de Instagram separado y agentes asignados;
- webhook de NOX recibiendo eventos de esa cuenta/inbox.

Para la POC se deberá crear o convertir una cuenta a Instagram Professional/Business, preparar la presencia Meta asociada que requiera la versión de Chatwoot instalada, aceptar permisos y documentar la propiedad/recuperación de la cuenta. No se usarán credenciales personales compartidas dentro del repositorio.

### 11.2 Normalización de canal

El backend no debe inferir WhatsApp porque exista una conversación. En cada mensaje/conversación capturará:

- inbox ID y nombre;
- tipo de canal;
- source/contact ID externo;
- account/page ID;
- capacidades del canal: texto, media, reply window y plantillas;
- identidad local vinculada, si existe.

El agente recibirá un contexto de canal explícito y usará un adaptador de salida. Una herramienta de envío decide cómo responder por Chatwoot/Instagram/WhatsApp; el graph no construye llamadas específicas a Meta.

### 11.3 Admin “Agente y conversaciones”

Unificar las pestañas actuales bajo el nombre **Agente y conversaciones**, sin mezclar conceptualmente configuración con operación.

Subvistas sugeridas:

- **Bandeja:** conversaciones y filtros.
- **Automatizaciones:** abandono, estado y métricas.
- **Configuración del agente:** prompts versionados, herramientas, límites y handoff.
- **Actividad:** ejecuciones, errores y auditoría.

Indicadores visuales:

- icono y etiqueta accesible para Instagram, WhatsApp, correo y web;
- color como señal secundaria, nunca única;
- filtro por canal e inbox;
- origen en lista, cabecera, detalle, resumen, perfil del cliente, búsqueda y exportaciones;
- badges con texto para lectores de pantalla.

### 11.4 Identidad entre canales

- Un DM de Instagram crea o vincula una identidad Instagram, no inventa un teléfono.
- Si el usuario proporciona teléfono/correo, iniciar un flujo de vinculación verificable.
- Un mismo cliente puede conservar conversaciones separadas por canal.
- El agente puede usar historial cruzado sólo cuando la vinculación sea confiable y la política de privacidad lo permita.

### 11.5 Handoff y seguridad del agente

- derivar a humano ante reclamos de pago, devolución, identidad dudosa, acoso, datos sensibles o baja;
- el agente nunca marca pagos como aprobados ni altera stock sin herramienta server-side autorizada;
- confirmar operación y monto antes de crear el link;
- proteger herramientas con scopes, validación estructurada y límites;
- registrar tool calls y decisiones sin guardar secretos ni PII innecesaria;
- incorporar pruebas de prompt injection provenientes de mensajes, fichas de productos y contenido externo.

## 12. Línea de trabajo G: login, logout e identidad de clientes

### 12.1 Problema “vuelve a entrar con la última cuenta”

Cerrar la sesión de NOX/Keycloak no necesariamente cierra la sesión global de Google. Si el usuario vuelve inmediatamente, Google puede reutilizar la sesión activa. Si se espera un tiempo o cambia el estado de sesión, puede reaparecer el selector.

La solución de producto recomendada es ofrecer dos acciones explícitas:

- **Cerrar sesión:** salida rápida de NOX, sin forzar interacción con Google.
- **Cambiar de cuenta:** inicia el próximo login solicitando selector de cuenta (`prompt=select_account`) a través de Keycloak/Google.

No se recomienda cerrar globalmente Google como comportamiento por defecto porque afecta otros servicios del usuario. Se deberá revisar la configuración real del broker Google en Keycloak y probar propagación de parámetros antes de modificarla.

### 12.2 Acceso de clientes

Objetivo:

- clientes web: acceso con Google/Gmail;
- clientes provenientes de WhatsApp: acceso ingresando teléfono y validando un código enviado al correo previamente registrado;
- ambos métodos terminan en el mismo `customer_id` cuando se comprueba que pertenecen a la misma persona.

Flujos posibles:

#### Google

1. Iniciar en Keycloak con Google.
2. Validar issuer, audience, nonce y estado en el flujo OIDC.
3. Crear/vincular identidad `google` y `email` verificada según claims y política de Keycloak.
4. Resolver colisiones mediante flujo de vinculación, no por nombre.

#### Teléfono

1. Ingresar teléfono E.164.
2. Buscar de forma no enumerable el cliente y su correo previamente registrado/verificado.
3. Mostrar sólo una pista enmascarada del destino, por ejemplo `m***@dominio.com`.
4. Enviar challenge al correo registrado.
5. Verificar código con expiración e intentos limitados.
6. Crear sesión mediante Keycloak o un flow compatible, evitando una segunda autoridad de identidad improvisada.
7. Vincular la sesión al customer correcto y auditar el acceso.

### 12.3 Límite de seguridad del flujo confirmado

El flujo confirmado demuestra acceso al **correo registrado asociado al teléfono**, pero no demuestra por sí mismo posesión actual del número telefónico. Por eso se describirá correctamente en UI y documentación como “acceso con teléfono y verificación por correo”, no como “teléfono verificado”.

Si un cliente de WhatsApp todavía no tiene correo verificado:

- no podrá usar este método inmediatamente;
- deberá registrar/verificar el correo durante una interacción autenticada de WhatsApp o mediante un flujo de vinculación separado;
- un administrador no debe poder asignar un correo sin dejar auditoría y, para habilitar acceso, confirmación del titular;
- recuperación ante pérdida de correo necesita un proceso distinto y reforzado.

### 12.4 Controles obligatorios

- OTP hasheado, 5–10 minutos, un uso, máximo de intentos;
- límites por IP/teléfono/correo/dispositivo y CAPTCHA adaptativo;
- respuestas que no permitan enumerar clientes;
- alertas y bloqueo temporal ante abuso;
- recuperación y cambio de número con revisión reforzada;
- sesiones, cookies y CSRF según recomendaciones OIDC;
- eventos de acceso y vinculación auditables.

## 13. Línea de trabajo H: conversaciones y carritos abandonados

### 13.1 Qué debe considerarse abandono

#### Conversación

- el último mensaje fue entrante y requiere respuesta, o el agente hizo una pregunta y no hubo respuesta;
- no está resuelta, bloqueada, asignada a humano o marcada no contactar;
- superó una ventana configurable por tipo de conversación;
- existe canal elegible y consentimiento/política aplicable.

#### Carrito

- contiene items válidos;
- no fue convertido;
- `last_activity_at` superó el umbral;
- existe identidad contactable y consentimiento;
- stock/precio siguen siendo válidos o el mensaje evita promesas incorrectas.

### 13.2 Cadencia sugerida, sujeta a aprobación

- carrito: primer recordatorio a las 2–4 h, segundo a las 24 h; máximo definido por política;
- conversación de reserva: recordatorio operativo dentro de ventana permitida;
- promociones posteriores: campaña comercial separada, nunca continuación ilimitada del abandono;
- quiet hours según timezone local;
- cooldown global para que campañas, turnos y abandonos no saturen al mismo cliente.

### 13.3 Selección del canal

Orden configurable, no fijo:

1. responder en el canal donde comenzó la interacción si está permitido;
2. usar canal preferido y consentido;
3. fallback a correo/WhatsApp sólo si existe identidad verificada y permiso;
4. no enviar si no hay canal elegible.

Instagram y WhatsApp tienen reglas y ventanas de mensajería propias. Fuera de la ventana permitida sólo se usarán mecanismos/templates autorizados por el proveedor; no se intentará evadirlos.

### 13.4 Motor de automatización

- scheduler detecta candidatos en lotes con cursores;
- evaluator aplica consentimientos, ventanas, frecuencia, compra/respuesta reciente y exclusiones;
- enrollment persiste la etapa;
- outbox encola el mensaje;
- worker por canal entrega y registra provider ID;
- webhook de entrega actualiza estado;
- respuesta/compra/baja cancela pasos futuros;
- dead-letter y re-drive manual para fallos recuperables.

### 13.5 Métricas

- candidatos, elegibles y excluidos con razón;
- enviados, entregados, leídos, respondidos y fallidos;
- carritos recuperados y revenue atribuible con ventana definida;
- reservas retomadas;
- bajas, bloqueos y quejas;
- frecuencia efectiva por cliente y canal.

## 14. Línea de trabajo I: campañas segmentadas

### 14.1 Experiencia administrativa

Nueva pestaña **Campañas** dentro de **Agente y conversaciones** o como submódulo claramente vinculado.

Wizard:

1. objetivo y nombre interno;
2. tipo: operativo o marketing;
3. canales;
4. segmento;
5. contenido/plantilla por canal;
6. preview de audiencia, exclusiones y costo estimado;
7. mensaje de prueba;
8. aprobación por segundo administrador para envíos grandes;
9. programación y quiet hours;
10. monitor en tiempo real, pausa y reporte.

### 14.2 Segmentos iniciales

- sólo Instagram;
- sólo WhatsApp;
- sólo correo;
- disponibles en más de un canal;
- más frecuentes / menos frecuentes;
- mayor gasto / menor gasto;
- recencia de última visita/compra;
- clientes inactivos;
- clientes con carrito abandonado;
- combinación de filtros con tamaño mínimo para evitar microsegmentación sensible.

Definiciones obligatorias:

- “frecuente”: cantidad de turnos completados/pedidos entregados en una ventana, no turnos cancelados;
- “gasto”: pagos aprobados menos devoluciones, con período y moneda definidos;
- percentiles o umbrales configurables y visibles;
- “menos” no debe incluir automáticamente clientes sin consentimiento.

### 14.3 Contenido y canales

- editor de texto seguro, sin HTML arbitrario;
- variables permitidas con fallback y preview;
- WhatsApp: templates aprobados cuando corresponda;
- Instagram: sólo envíos compatibles con políticas/capacidades vigentes;
- correo: subject, preheader, cuerpo, versión texto y enlace de baja;
- mensaje operativo urgente (“mañana no abrimos”) dirigido a clientes afectados, separado de marketing masivo.

### 14.4 Guardrails

- RBAC: crear, aprobar, lanzar, pausar y ver datos como permisos distintos;
- doble confirmación para “todos los clientes”;
- máximo de destinatarios y velocidad por lote;
- deduplicación entre identidades/canales;
- suppression list antes de cada envío, no sólo al crear la campaña;
- exclusión de menores o categorías sensibles si aplica;
- auditoría inmutable de audiencia, contenido y aprobador;
- kill switch global.

## 15. Línea de trabajo J: videos con IA para productos

### 15.1 Proceso creativo

1. Obtener packshots y brand guidelines autorizados de Sir Fausto.
2. Definir objetivo, claims permitidos y CTA de cada producto.
3. Crear guion y storyboard de 6–15 segundos, mobile-first.
4. Generar fondos/escenas o animaciones con IA sin alterar engañosamente envase, volumen o resultados.
5. Incorporar producto real y textos aprobados.
6. Revisión humana de marca, claims, ortografía, derechos y fidelidad.
7. Exportar master y derivados WebM/MP4, poster y subtítulos.
8. Subir a medios propios/Cloudflare y registrar versión/licencia.
9. A/B testear impacto sin perjudicar LCP, INP ni consumo móvil.

### 15.2 Integración en Home

- no cargar cinco videos completos al inicio;
- poster estático y lazy load al acercarse al viewport;
- autoplay sólo muted, inline y cuando dispositivo/conexión lo permitan;
- respetar `prefers-reduced-motion` y `save-data`;
- pausar fuera de viewport;
- fallback de imagen y CTA accesible;
- medir play rate, interacción, click a producto, conversión y costo en bytes.

### 15.3 Entregables por producto

- guion aprobado;
- storyboard;
- video vertical 9:16 y variante horizontal/cuadrada sólo si se usa;
- poster optimizado;
- subtítulos/copy accesible;
- registro de fuentes, licencia, prompts/versión y aprobación.

## 16. Línea de trabajo K: seguridad “again”

### 16.1 Threat modeling por flujo

Realizar modelo de amenazas para:

- login y vinculación de identidades;
- checkout, cambio de precios y reserva de stock;
- webhooks de Mercado Pago, Chatwoot y Meta;
- uploads de imágenes/video;
- campañas masivas;
- herramientas del agente;
- panel administrativo;
- ambientes y supply chain.

### 16.2 Controles de aplicación

- validación server-side con schemas y límites de payload;
- autorización por recurso, no sólo “usuario autenticado”;
- CSRF donde aplique, cookies seguras, CSP y headers;
- escaping/sanitización de contenido de campañas y productos;
- protección SSRF en imports/URLs de medios;
- uploads con MIME sniffing, límites y almacenamiento fuera del runtime;
- rate limiting distribuido y cuotas por operación;
- claves de idempotencia y anti-replay para operaciones financieras;
- cifrado de PII sensible y redacción en logs;
- exportación/borrado/retención de datos definidos.

### 16.3 Webhooks

- endpoint dedicado por proveedor y ambiente;
- verificación criptográfica con raw body cuando el proveedor lo requiera;
- timestamp tolerance y anti-replay;
- persist-before-process;
- acknowledgment rápido;
- allowlist de tipos de evento;
- métricas de firma inválida, duplicado, lag y DLQ.

### 16.4 Infraestructura y supply chain

- secretos en Kubernetes/secret manager, no en Git ni variables públicas;
- service accounts por componente y mínimo privilegio;
- NetworkPolicies y separación de namespaces/DBs;
- imágenes fijadas por digest, SBOM, escaneo de dependencias e imágenes;
- SAST, secret scanning, dependency review y DAST controlado;
- backups cifrados y restauración probada;
- rotación y revocación documentadas;
- protección de branch, reviews y firmas/attestations donde sea viable.

### 16.5 Seguridad de campañas y agente

- el agente no puede seleccionar audiencia ni enviar masivamente por decisión autónoma;
- una campaña requiere acción administrativa explícita;
- tools del agente con permisos estrechos y confirmación para pagos/cancelaciones;
- límites de gasto y volumen;
- prompt injection tests y contenido externo tratado como no confiable;
- handoff humano y kill switch probados.

## 17. Línea de trabajo L: branches y ambiente de desarrollo

### 17.1 Estrategia Git

- `main`: rama protegida de producción. Lo actualmente desplegado se considera baseline productivo y no debe recibir cambios de esta iniciativa directamente;
- `dev`: rama protegida, persistente y desplegada automáticamente al ambiente de desarrollo;
- `feat/*`, `fix/*`, `refactor/*`, `infra/*`: nacen de `dev` y vuelven a `dev` únicamente mediante PR;
- cada PR debe ser pequeño e incluir migración, tests, screenshots, observabilidad y rollback cuando corresponda;
- `dev` exige checks y review; no se habilitan pushes directos ordinarios;
- una release sólo podrá promoverse mediante PR explícito `dev → main`, con changelog, verificación del ambiente dev y aprobación manual;
- por decisión del 2026-07-18, las Fases 1–14 quedan retenidas en `dev`: no se abrirá ese PR de release hasta recibir autorización explícita;
- producción despliega sólo después de mergear un PR de promoción autorizado en `main`; un push a `dev` nunca modifica manifests productivos ni de demo;
- un hotfix productivo nace desde `main`, vuelve por PR a `main` y luego se integra inmediatamente en `dev` para evitar divergencia;
- imágenes se etiquetan por SHA/digest. La promoción debe reutilizar el artefacto validado siempre que el pipeline lo permita, no recompilar código distinto;
- feature flags permiten integrar código incompleto sin exponerlo, pero una flag no reemplaza pruebas ni aislamiento.

#### Protección mínima de branches

- PR obligatorio;
- al menos una aprobación para `dev` y la política más fuerte disponible para `main`;
- conversación resuelta antes de merge;
- checks requeridos y branch actualizada;
- sin force-push ni borrado de `main`/`dev`;
- deploy productivo con GitHub Environment protegido y aprobación;
- CODEOWNERS/review específico para migraciones, pagos, auth, campañas e infraestructura.

### 17.2 Ambientes

#### Local

- Docker Compose/servicios emulados;
- datos seed sintéticos;
- proveedores sandbox/mocks;
- Mailpit o equivalente para correo local.

#### Preview por PR

- sitio, shop y backend etiquetados por SHA según el componente modificado;
- namespace o deployment efímero;
- URL propia;
- base/Schema aislado;
- secretos de prueba;
- teardown automático;
- sin acceso a contactos reales ni envío productivo.

#### Dev/Staging persistente

- despliegue automático desde la branch `dev`;
- datos sintéticos y testers explícitos, nunca una copia directa de producción;
- observabilidad y alertas equivalentes a producción, con dashboards/labels separados;
- integraciones externas en sandbox, bots de prueba o recipient allowlists;
- migraciones se ejecutan primero aquí y deben completar smoke/E2E antes de una release.

##### Matriz de aislamiento reutilizando servidores

| Componente | Se puede compartir | Aislamiento obligatorio de dev |
|---|---|---|
| Kubernetes | Sí, mismo clúster | namespace `nox-dev`, service accounts, quotas, secrets y NetworkPolicies propias |
| PostgreSQL | Sí, mismo clúster | base `nox_dev` y rol `nox_dev`; sin acceso del rol dev a `nox` productivo |
| RabbitMQ | Sí, mismo broker | vhost `/nox-dev`, usuario, exchanges, queues y DLQ propios |
| Redis | Sí, mismo servidor si capacidad/ACL lo permiten | usuario ACL y prefijo/DB lógica exclusivos; nunca compartir keys, locks ni rate limits |
| Chatwoot | Sí, misma instalación | cuenta/workspace `NOX Dev` preferentemente; como mínimo inbox, webhook, bot, labels y agentes separados |
| Keycloak | Sí, misma instalación | realm dev o, como mínimo, clients/roles/callbacks/secretos totalmente separados; se recomienda realm `nox-dev` |
| Cloudflare | Sí, misma cuenta | hostnames, bucket/prefix y reglas de caché dev separados |
| R2 | Sí, misma cuenta | bucket `nox-dev-media` recomendado; no mezclar originales productivos |
| Langfuse/observabilidad | Sí, misma instalación | proyecto/entorno, API keys, dashboards y retención diferenciados |
| GitOps | Sí, mismo repositorio | overlay/directorio y Argo Application dev independientes de producción |

Compartir servidor no significa compartir base, usuario, vhost, inbox, realm, bucket o secreto. El objetivo es ahorrar infraestructura sin permitir que una credencial o un error de dev pueda leer, modificar o enviar datos productivos.

##### Canal conversacional de dev: Telegram

- crear un bot exclusivo mediante BotFather;
- conectarlo a un inbox Telegram dentro de la cuenta/workspace de Chatwoot Dev;
- asignar únicamente agentes/testers de desarrollo;
- configurar webhook de Chatwoot hacia la API dev;
- allowlist del `chatwoot_account_id`, `inbox_id` y tipo de canal en el backend dev;
- impedir que el worker dev consuma colas o templates de WhatsApp productivos;
- mostrar icono/etiqueta Telegram en el admin para validar la UI omnicanal;
- ejecutar el mismo graph y tools que producción mediante el adapter de canal;
- no asumir que las reglas comerciales de WhatsApp son idénticas a Telegram: para producción se mantienen tests contractuales/mocks de WhatsApp;
- documentar y rotar el token del bot como secreto.

Chatwoot soporta inboxes Telegram mediante un bot dedicado. Esto permite probar mensajes entrantes, respuestas, handoff y el agente sin contratar otra línea de WhatsApp.

##### Dominios propuestos de dev

- sitio: `dev-nox.cloud-it.com.ar`;
- API: `api-dev-nox.cloud-it.com.ar`;
- shop: `shop-dev-nox.cloud-it.com.ar`;
- medios: `media-dev-nox.cloud-it.com.ar`;
- autenticación: mismo host de Keycloak con realm/client dev, salvo que el diseño de seguridad exija host separado.

Los nombres se validarán contra DNS/certificados actuales antes de crear registros.

##### Proveedores en dev

- Mercado Pago: credenciales y usuarios de prueba cuando se cree la aplicación;
- email: dominio/sender de prueba y recipient allowlist;
- Telegram: bot de desarrollo;
- Instagram: cuenta de POC conectada sólo cuando esté preparada y nunca confundida con producción;
- campañas y automatizaciones: modo dry-run por defecto y lista explícita de destinatarios permitidos.

#### Producción

- despliegue exclusivo desde `main`;
- manifests, namespace, DB, credenciales, dominios y proveedores actuales se declaran productivos;
- ninguna pipeline de `dev` puede modificar manifests o secrets de producción;
- promoción de la misma imagen validada por digest;
- migraciones con preflight;
- canary/rolling rollout;
- flags desactivables;
- runbook y rollback.

### 17.3 Quality gates

- lint, typecheck y unit tests;
- integración DB/migraciones up/down;
- contratos de webhooks con fixtures;
- E2E mobile/desktop de reserva, login, carrito y pago sandbox;
- accessibility y performance budgets;
- seguridad/SBOM/secret scan;
- smoke test post-deploy.

### 17.4 Orden de creación del ambiente dev

1. Tomar inventario y backup verificable del ambiente actual; etiquetarlo como producción.
2. Confirmar el merge commit de #14 (`96d056b…`) como baseline, actualizar el checkout local y crear/proteger `dev` desde ese commit. Los PR Dependabot #1–#10 se evalúan después y no se incorporan en bloque sin pruebas.
3. PR de GitOps: namespace, DB/roles, Rabbit vhost, Redis isolation, secrets placeholders, hosts y Argo Application dev.
4. PR de aplicación/CI: workflow para `dev`, imágenes por SHA y actualización exclusiva del overlay dev.
5. Crear realm/client Keycloak dev y callbacks de los nuevos dominios.
6. Crear cuenta/workspace e inbox Telegram en Chatwoot Dev; guardar token del bot como secreto.
7. Desplegar sitio/API actuales sin cambios funcionales en dev.
8. Ejecutar migraciones, seeds sintéticos, smoke tests y pruebas de aislamiento negativo.
9. Verificar que una credencial dev no acceda a DB, colas, inboxes, bucket ni manifests prod.
10. Recién entonces iniciar `refactor/white-label-installation-foundation` y el resto de funcionalidades.

## 18. Observabilidad y operación

### 18.1 Correlación

Un `correlation_id` debe enlazar:

- sesión/carrito;
- pedido/turno;
- pago/preferencia/webhook;
- conversación/mensaje;
- ejecución del agente/tool call;
- outbox/delivery/campaña.

### 18.2 Métricas y alertas

- tasa y latencia de checkout;
- conversión carrito → pedido → pago;
- pagos pendientes/rechazados y webhook lag;
- stock reservado vencido;
- mensajes en cola, retries, DLQ y rate limits;
- conversaciones por canal, handoff y tiempo de respuesta;
- campañas, bajas y quejas;
- OTP enviados/verificados/bloqueados;
- errores por ambiente y release;
- Core Web Vitals por ruta/dispositivo.

### 18.3 Runbooks

- Mercado Pago no envía webhooks;
- pago aprobado que no confirma pedido/turno;
- duplicación o desorden de eventos;
- Chatwoot/Meta caído;
- campaña incorrecta: pausa/kill switch;
- cola/DLQ creciente;
- credencial filtrada;
- rollback de app y migración;
- restauración de DB/medios.

## 19. Secuencia recomendada de ejecución

### Fase 0 — Aislar producción y crear el ambiente dev

Entregables:

- declarar `main` y despliegue actual como producción;
- crear/proteger `dev` desde el baseline aprobado;
- dos PRs coordinados: infraestructura GitOps dev y pipeline de aplicación dev;
- namespace y dominios dev;
- base/rol PostgreSQL, vhost/usuario RabbitMQ, aislamiento Redis, realm/client Keycloak y workspace/inbox Chatwoot dev;
- bot Telegram dev conectado a Chatwoot y al agente;
- despliegue de la versión actual con seeds sintéticos;
- pruebas negativas que demuestren que dev no puede acceder a recursos productivos;
- resolver preguntas abiertas del apartado 23;
- mapa de journeys y eventos;
- baseline mobile/SEO/performance/seguridad;
- política de consentimiento, contacto y retención;
- inventario de cuentas/proveedores y dueños.
- distinguir qué integraciones son sandbox/demo y cuáles podrán promoverse a producción real.
- contrato versionado de configuración de instalación y definición de qué vive en DB, variables, secretos y manifests.

### Fase 1 — Fundaciones: ambientes, seguridad e identidad de datos

- preview/dev aislados;
- secretos y CI gates;
- eliminación de hardcodes de NOX y carga del perfil de instalación;
- bootstrap idempotente de una instalación nueva;
- `customer_identities`, consentimientos, auditoría y outbox;
- adaptación backward compatible de canales;
- feature flags.

No cambia aún la experiencia pública.

### Fase 2 — Mobile + SEO/GEO base

- auditoría y correcciones responsive de rutas existentes;
- metadata, sitemap, robots, LocalBusiness y datos consistentes;
- RUM y dashboards por dispositivo;
- tests visuales/accesibilidad.

### Fase 3 — Medios Cloudflare y catálogo

- scaffold desplegable del shop independiente y configuración de marca/tenant;
- infraestructura de medios;
- backoffice de producto;
- carga autorizada de cinco productos;
- listado/ficha detrás de flag;
- Product structured data.

### Fase 4 — Carrito, pedidos y pago local

- carrito invitado/autenticado;
- órdenes, items, stock/reservas;
- retiro en local y `pay_at_store`;
- admin de pedidos.

### Fase 5 — Mercado Pago en shop

- Checkout Pro sandbox;
- webhooks, conciliación, observabilidad;
- resultados y mensajes transaccionales;
- rollout gradual.

### Fase 6 — Pago de turnos desde web y agente

- elección pagar ahora/local;
- tools del agente;
- expiración según política;
- agenda/admin y conciliación.

### Fase 7 — Instagram y administración unificada

- inbox Instagram en Chatwoot;
- identidad/canal end-to-end;
- adaptador del agente;
- “Agente y conversaciones” con iconos, filtros y resúmenes.

### Fase 8 — Login de clientes y cambio de cuenta

- UX de cerrar sesión/cambiar cuenta;
- login Google para clientes;
- login teléfono según decisión de challenge;
- vinculación/merge seguro.

### Fase 9 — Recuperación de abandono

- motor durable;
- conversaciones primero en dry run;
- carritos después;
- consentimiento, frequency caps y atribución;
- activación por cohortes.

### Fase 10 — Campañas

- segmentos y preview;
- editor, templates y aprobaciones;
- email/WhatsApp y capacidades permitidas de Instagram;
- métricas, pausa, supresión y auditoría.

### Fase 11 — Videos IA y experimentación Home

- assets/claims aprobados;
- producción por producto;
- entrega Cloudflare y comportamiento adaptativo;
- pruebas A/B y control de performance.

### Fase 12 — Hardening y lanzamiento completo

- pentest focalizado;
- pruebas de carga y fallos de proveedores;
- restauración/rollback;
- revisión legal/comercial;
- SLOs, alertas y handover operativo.

## 20. División sugerida de PRs

Los nombres son ilustrativos y se ajustarán al flujo real del repositorio.

1. `docs/commerce-omnichannel-roadmap`
2. `infra/dev-environment-gitops` (repositorio de infraestructura)
3. `ci/dev-branch-deployment` (este repositorio)
4. `refactor/white-label-installation-foundation`
5. `feat/customer-identities-consents`
6. `feat/omnichannel-data-model`
7. `feat/mobile-responsive-audit`
8. `feat/seo-geo-foundation`
9. `feat/cloudflare-media-pipeline`
10. `feat/shop-standalone-catalog-admin`
11. `feat/shop-cart-orders`
12. `feat/mercadopago-checkout`
13. `feat/appointment-payment-choice`
14. `feat/chatwoot-instagram-channel`
15. `feat/admin-agent-conversations`
16. `feat/customer-google-phone-login`
17. `feat/abandonment-automation`
18. `feat/segmented-campaigns`
19. `feat/product-ai-videos`
20. `security/commerce-omnichannel-hardening`

Cada PR deberá indicar dependencias, flag, migración, riesgos, pruebas, screenshots, métricas y rollback.

## 21. Definition of Done global

Una fase no está terminada hasta que:

- tiene criterios de aceptación cumplidos y revisión de producto;
- contiene tests proporcionales al riesgo;
- no introduce secretos ni PII en logs;
- tiene métricas y errores accionables;
- respeta responsive, accesibilidad y performance;
- documenta configuración y operación;
- tiene migración y rollback ensayados;
- funciona en ambiente no productivo con integraciones sandbox;
- contempla duplicados, timeouts, retries y eventos fuera de orden;
- pasó revisión de seguridad cuando toca dinero, identidad o mensajería masiva.
- una segunda instalación de fixture puede arrancar sin cambios de código y sin mostrar datos, branding, dominios o credenciales de NOX.
- sitio, turnero, shop, admin y agente pasan tests contractuales contra al menos dos configuraciones de negocio distintas.

## 22. Riesgos principales y mitigación

| Riesgo | Impacto | Mitigación |
|---|---:|---|
| Fusionar clientes incorrectos entre IG/WhatsApp/email | Alto | Identidades separadas, prueba de posesión, merge auditable |
| Marcar pago por redirect y no por webhook | Crítico | Estado autoritativo desde Mercado Pago, idempotencia y conciliación |
| Doble cobro o doble pedido | Crítico | Idempotency keys, unique constraints y state machine |
| Sobreventa | Alto | reserva de stock con TTL y movimientos auditables |
| Spam o incumplimiento de políticas | Alto | consentimiento por propósito/canal, templates, caps y suppression |
| Campaña enviada a audiencia equivocada | Alto | preview, snapshot, doble aprobación, pausa y kill switch |
| Instagram sin teléfono rompe el agente | Alto | identidad por source ID e inbox, no dependencia de teléfono |
| Videos/imágenes degradan Home | Medio/Alto | poster, lazy load, conexión/dispositivo, budgets |
| Copiar assets/textos de marketplace | Legal/Marca | materiales autorizados y registro de derechos |
| Dev env envía a clientes reales | Crítico | proveedores sandbox, allowlists y datos aislados |
| Sesión Google persiste tras logout | Medio | UX explícita “cerrar” vs “cambiar cuenta” |
| Agente ejecuta acción financiera errónea | Crítico | tools limitadas, confirmación, políticas y handoff |
| Proveedor externo caído | Alto | outbox, retries, circuit breaker, DLQ y runbook |
| El “boilerplate” conserva hardcodes de NOX | Alto | fixture de segundo negocio, scans/tests y configuración canónica |
| Datos o secretos cruzados entre clientes | Crítico | instalación aislada, secretos/DB separados y pruebas de provisioning |
| Configuraciones de clientes divergen del template | Alto | schema versionado, overlays declarativos, changelog y upgrades ensayados |

## 23. Preguntas y decisiones pendientes

### Decisiones ya respondidas

- Shop sólo con retiro en el local para la POC; envíos fuera del primer alcance.
- Turnos: Mercado Pago por el total, siempre opcional, sin cancelar el turno si no se paga online.
- Acceso por teléfono con OTP al correo previamente registrado.
- Instagram/Meta se configurarán desde cero para la POC.
- Consentimiento comercial explícito aprobado: será granular por canal/propósito y las campañas permanecerán desactivadas hasta implementarlo.
- Cloudflare ya administra el DNS; se verificará R2 y se priorizará R2 + transformaciones.
- GEO significa optimización para buscadores/asistentes con IA.
- No existe todavía media kit autorizado de Sir Fausto.
- No existe todavía una aplicación de Mercado Pago; primero se creará y trabajará con credenciales de prueba.
- Datos base ficticios, con posibilidad de testers reales y aislamiento/supresión de campañas por defecto.
- Precios y stock de demo sintéticos definidos en el apartado 9.2.
- Toda la plataforma será white-label y replicable: sitio, turnero, shop, admin, agente, pagos, canales e infraestructura bajo un modelo single-tenant aislado por instalación.
- Shop de la demo confirmado en `shop-nox.cloud-it.com.ar`.
- Branch `dev` protegida y ambiente persistente dev antes de implementar funcionalidades; `main` y despliegue actual quedan como producción.
- Telegram será el canal de conversación de dev para no consumir otra línea de WhatsApp.
- Se compartirán servidores cuando sea razonable, con DB/roles, vhost/usuario, workspace/inbox, realm/client, bucket y secretos separados.
- El resultado debe tener excelencia y comportamiento productivo aunque su propósito inicial sea una POC comercial.

### Decisiones todavía abiertas

#### Negocio y shop

1. ¿Productos y turnos se pagan en checkouts separados? Se recomienda mantenerlos separados inicialmente.
2. ¿Cuál será la política visible de cambios/devoluciones, cancelaciones/no-show y qué datos fiscales deben mostrarse?
3. ¿Se conseguirá material autorizado de Sir Fausto o se aprueba usar assets propios/placeholders de demo sin copiar MercadoLibre?

#### Mercado Pago

4. ¿El link de pago del turno puede regenerarse libremente mientras siga impago? Se recomienda permitir uno activo a la vez.

#### Identidad y correo

5. ¿Cómo registra por primera vez el correo un cliente que sólo habló por WhatsApp? Recomendación: el agente pide el correo, envía OTP y recién después lo vincula.
6. Se aprobó elegir un proveedor de correo, pero falta confirmar el dominio remitente. Se evaluará Resend como opción simple para la POC y un adapter evitará acoplar el negocio al proveedor.
7. ¿El login de clientes usará un client/flow de Keycloak separado del administrativo? Se recomienda separar privilegios y flujos.

#### Canales, campañas y privacidad

8. ¿Se permite contactar por un canal distinto del canal de origen cuando el cliente consintió ese canal?
9. ¿Quién podrá crear, aprobar y detener campañas durante la demo?
10. ¿Qué significa “más/menos frecuentes” y “gastan más/menos”: período, umbral o percentil?
11. ¿Los avisos operativos se envían sólo a clientes afectados o también habrá una opción verdaderamente global con doble confirmación?

#### Producto, infraestructura y demo

12. ¿Qué proveedor/herramienta se autoriza para crear los videos IA y quién aprueba fidelidad de producto y marca?
13. ¿Hay un presupuesto mensual máximo para Cloudflare, correo, mensajería y generación de video?

## 24. Referencias oficiales consultadas

### Cloudflare

- Cloudflare Images: <https://developers.cloudflare.com/images/>
- Transformations: <https://developers.cloudflare.com/images/optimization/transformations/overview/>
- Custom domains: <https://developers.cloudflare.com/images/optimization/hosted-images/serve-from-custom-domains/>
- Features and caching: <https://developers.cloudflare.com/images/optimization/features/>
- Pricing: <https://developers.cloudflare.com/images/pricing/>

### Mercado Pago Argentina

- Crear preferencia de Checkout Pro: <https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/create-payment-preference>
- API de preferencias: <https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/preferences/create-preference/post>
- Notificaciones: <https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/payment-notifications>
- URLs de retorno: <https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/configure-back-urls>
- Orders API: <https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/overview>

### Chatwoot

- Channels and inboxes: <https://www.chatwoot.com/hc/user-guide/articles/1677492191-adding-inboxes>
- Other channels / Instagram: <https://www.chatwoot.com/hc/user-guide/en/categories/other-channels>
- Telegram inbox: <https://www.chatwoot.com/hc/user-guide/articles/1677838569-how-to-setup-a-telegram-channel>

### Keycloak

- Server Administration Guide, identity brokering and suggested IdP: <https://www.keycloak.org/docs/latest/server_admin/index.html>

### Google Search

- SEO Starter Guide: <https://developers.google.com/search/docs/fundamentals/seo-starter-guide>
- LocalBusiness structured data: <https://developers.google.com/search/docs/appearance/structured-data/local-business>
- Product structured data: <https://developers.google.com/search/docs/appearance/structured-data/product>
- Structured data introduction: <https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data>

## 25. Próximo paso inmediato

Completar la normalización de la Fase 0 mediante la branch `chore/normalize-dev-main-demo`: resolver la integración `main → dev`, ejecutar la suite completa, abrir/mergear el PR a `dev`, probar el ambiente dev y recién entonces promover únicamente esta normalización a `main` y sincronizar `demo`. Después, comenzar Fase 1 desde el `dev` normalizado y mantener todas las fases siguientes fuera de producción/demo hasta autorización explícita.
