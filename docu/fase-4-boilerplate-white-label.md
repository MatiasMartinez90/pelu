# Fase 4 — Boilerplate white-label integral

## Estado

En curso. Este documento registra el contrato base implementado en `refactor/white-label-installation-foundation`. La fase se cerrará cuando el bootstrap operativo, los overlays de infraestructura y una segunda instalación ficticia hayan sido probados de punta a punta en `dev`.

Las Fases 1–14 se integran únicamente en `dev`. No se promueve este trabajo a `main`, `demo` ni producción sin autorización futura y explícita.

## Objetivo

El código debe representar una plataforma reutilizable y la instalación NOX debe ser sólo configuración y datos. Una instalación aislada debe poder cambiar marca, dominio, idioma, moneda, ubicación, contenido, turnero, canales, pagos, agente y módulos sin editar componentes, prompts o queries.

## Contrato canónico

La configuración pública no secreta vive en:

- `config/installation.json`: valores de la instalación NOX;
- `config/installation.schema.json`: contrato estricto, versionado y sin propiedades desconocidas;
- `scripts/validate-installation.mjs`: validación de schema y reglas cruzadas;
- `src/lib/installation.ts`: acceso tipado desde el frontend;
- `src/lib/site.ts`: vista de compatibilidad consumida por las páginas actuales.

`npm run config:validate` corre también como `prebuild`. Un valor inválido impide generar o desplegar el artefacto.

El contrato cubre:

- identificador de instalación y tipo de negocio;
- idioma, locale, timezone, país y moneda;
- marca, paleta, descripción, SEO y keywords;
- dominios del sitio y shop;
- contacto, ubicación, mapa, indicaciones y horarios estructurados;
- métodos de pago y políticas de cancelación/llegada;
- reglas base del turnero;
- WhatsApp, Instagram, Telegram y email con flags individuales;
- shop, agente, perfiles demo y módulos opcionales;
- textos del Home, servicios, equipo, galería y página institucional.

No se guardan tokens, contraseñas, IDs privados ni credenciales en este archivo. Ésos pertenecen al gestor de secretos del ambiente.

## Fuentes de verdad

| Tipo de dato | Fuente de verdad | Motivo |
|---|---|---|
| Marca, theme, dominios, SEO y módulos | contrato de instalación versionado | condicionan build, rutas, metadata y despliegue |
| Profesionales, servicios, relaciones y horarios operativos | PostgreSQL | son editables desde admin y cambian sin rebuild |
| Perfil institucional usado por el agente | PostgreSQL `site_profile` | unifica el contexto de todos los canales |
| Credenciales e IDs de proveedores | secretos/variables del ambiente | nunca deben entrar al bundle ni al repositorio |
| Imágenes publicadas | manifiesto de medios + R2 por instalación | versionado, aislamiento y caché |

El paquete operativo vive en `config/installation.seed.json`, validado por `config/installation.seed.schema.json`. Define profesionales, servicios, relaciones, horarios, settings iniciales e inventario sin mezclarlos con migraciones genéricas. Después del alta, el admin conserva el control operativo.

`backend/scripts/bootstrap_installation.py` aplica ambos contratos dentro de una transacción y toma un advisory lock. La migración `011_installation_bootstrap.sql` registra el SHA-256 canónico del paquete:

- primera ejecución: crea/sincroniza los defaults de la instalación;
- mismo hash: devuelve `unchanged` y no escribe;
- hash diferente: falla cerrado;
- `--dry-run`: informa si crearía o actualizaría;
- `--apply-update`: única forma de aceptar explícitamente un cambio posterior.

## Cambios de la base

- La página `/equipo` dejó de contener nombres o fotos en código y usa el mismo catálogo PostgreSQL que el turnero.
- Los enlaces de equipo preseleccionan realmente al profesional en el wizard.
- Los componentes legacy no referenciados que duplicaban profesionales, servicios y precios fueron eliminados.
- Dirección, horarios, mapa, pagos, políticas, moneda, locale y textos visibles salen del contrato.
- Navegación, sitemap y CTAs respetan los flags de turnero, shop y portales.
- WhatsApp e Instagram desaparecen del frontend cuando su canal está deshabilitado.
- PWA manifest e iconos se generan desde marca/theme; ya no contienen una imagen NOX fija.
- URLs internas del backend usan un único `BACKEND_URL`, con fallback genérico para desarrollo local.
- Nombre, tono, URL del turnero y prefijo de vinculación del agente son settings de runtime.
- Colas, DLX, prefijo Redis, nombre de servicio e identificador de instalación son configurables.
- Los mensajes de error del agente ya no derivan a un dominio NOX hardcodeado.

## Variables de runtime por instalación

Como mínimo, cada overlay debe declarar explícitamente:

```dotenv
INSTALLATION_ID=nox
BACKEND_URL=http://nox-api.nox.svc.cluster.local
SITE_URL=https://dev-nox.cloud-it.com.ar
PUBLIC_SITE_URL=https://dev-nox.cloud-it.com.ar
PUBLIC_BOOKING_PATH=/agendar
AGENT_NAME=NOX
AGENT_TONE=argentino informal y cálido
TIMEZONE=America/Argentina/Buenos_Aires
CORS_ORIGINS=https://dev-nox.cloud-it.com.ar
REDIS_PREFIX=nox-dev:
QUEUE_NAME=nox_dev_messages
QUEUE_RETRY_NAME=nox_dev_messages_retry
QUEUE_DLQ_NAME=nox_dev_messages_dlq
QUEUE_DLX_NAME=nox-dev.dlx
```

También se declaran por ambiente los emisores/audiencias demo, hosts de auth, DB, RabbitMQ, Chatwoot, proveedores de canales, medios y observabilidad. Las credenciales se referencian desde Secrets y nunca desde este ejemplo.

## Alta reproducible de un cliente

1. Crear una branch desde `dev` y copiar el template de configuración.
2. Asignar un `tenant` DNS-safe único y completar todos los campos públicos.
3. Ejecutar `npm ci`, `npm run config:validate`, tests y build.
4. Crear namespace, DB/rol, prefijo Redis, vhost/colas RabbitMQ y bucket/prefix de medios aislados.
5. Crear hosts, certificados, cliente Keycloak e inboxes del cliente.
6. Cargar secretos por ambiente mediante el gestor de secretos.
7. Ejecutar migraciones genéricas y el bootstrap idempotente de datos iniciales.
8. Desplegar por digest inmutable en el overlay del cliente.
9. Verificar aislamiento negativo contra DB, Redis, RabbitMQ, bucket, auth y canales de otra instalación.
10. Ejecutar smoke, reserva completa, login por rol, agente, accesibilidad, performance y rollback.

Ejemplo desde la raíz del repositorio, apuntando siempre a la base aislada del cliente:

```bash
export PYTHONPATH=backend
export DATABASE_URL='postgresql://...'
backend/.venv/bin/python backend/scripts/bootstrap_installation.py --dry-run
backend/.venv/bin/python backend/scripts/bootstrap_installation.py
```

Ante un cambio de configuración posterior se revisa primero el diff y recién entonces se usa `--apply-update`. El bootstrap no forma parte del arranque rutinario de los pods.

## Validación de este incremento

- `npm run config:validate`;
- `npm run test:installation` (schema válido, rechazo de campos desconocidos y canales coherentes);
- `npm run test:media`;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm run build`;
- backend Ruff;
- backend `62 passed, 5 skipped` sin servicios externos;
- PostgreSQL 16 descartable: 11 migraciones, fixture Aurora, segunda ejecución `unchanged`, conflicto cerrado y actualización explícita, `2/2` pruebas.

El fixture `tests/fixtures/installation.aurora*.json` representa un salón llamado “Estudio Aurora”, con otra marca, paleta, dominio, canales, políticas, profesionales, servicios, horarios e inventario. Valida con los mismos schemas y demuestra que el bootstrap no depende de nombres o slugs NOX.

## Pendiente para cerrar Fase 4

- overlay/template GitOps por instalación y variables explícitas para `nox-dev`;
- E2E/visual completo en dev y evidencia post-deploy;
- cerrar el cutover de R2 de Fase 3 cuando estén disponibles los permisos Cloudflare.

## Rollback

Este incremento no agrega migraciones ni elimina datos. El rollback consiste en volver al digest anterior del frontend/backend. Los datos PostgreSQL existentes permanecen intactos. El bootstrap futuro incluirá preflight, transacción y modo `--dry-run` antes de modificar datos.
