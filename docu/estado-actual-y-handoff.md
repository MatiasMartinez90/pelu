# Estado actual y handoff operativo

**Última actualización:** 2026-08-01  
**Ambiente autorizado:** `dev` únicamente. No promover a `main`/producción ni a `demo` sin autorización explícita.  
**Fuente de verdad funcional:** [`roadmap-commerce-omnichannel-growth.md`](./roadmap-commerce-omnichannel-growth.md)  
**Arquitectura de servicios:** [`arquitectura-ecommerce-mercadopago.md`](./arquitectura-ecommerce-mercadopago.md)

Este documento permite retomar el trabajo con Codex, Claude Code u otro agente sin reconstruir el contexto desde cero.

## Repositorios y ramas

| Repositorio | Uso | Rama de integración | Regla |
|---|---|---|---|
| `MatiasMartinez90/pelu` | Sitio, turnero, agente, admin y consumidor de servicios | `dev` | PR hacia `dev`; no tocar producción |
| `MatiasMartinez90/ecommerce` | Shop reutilizable: storefront, catálogo, carrito, checkout y data plane | `dev` | Imagen y despliegue propios |
| `MatiasMartinez90/mercadopago` | Servicio reutilizable de pagos, webhooks, callbacks y conciliación | `dev` | Sin branding NOX/Pelu |
| `MatiasMartinez90/agents-hetzner-k3s` | GitOps/Argo CD | `main` | `nox-dev` consume sólo manifests de desarrollo |

Producción y demo permanecen sin cambios de las fases posteriores a Fase 0.

## Lo que ya está implementado

- Ambiente persistente `nox-dev`, separado por namespace, realm Keycloak, vhost RabbitMQ, prefijo Redis, base/rol PostgreSQL y secretos sellados.
- Telegram configurado para dev mediante `@nox_dev_demo_bot`; WhatsApp no se consume en dev.
- Frontend/admin de dev y login Google/Keycloak operativo.
- Correcciones del agente: moderación de “quiero cortarme el pelo”, fechas relativas y flujo de reservas/idempotencia.
- Fases 1 y 2 listas en dev: responsive, performance/SEO/GEO y smoke/E2E documentados.
- Servicio `mercadopago` independiente con API, proveedor demo, HMAC, idempotencia, outbox, worker y reconciliación.
- Repo `ecommerce` independiente con storefront, catálogo inicial, carrito, checkout, retiro en local y opción de pago en local/MP.
- PR ecommerce #7 mergeado: API administrativa para productos, categorías, pedidos, estados y stock auditado.
- PR Pelu #64 mergeado: BFF `/api/ecommerce-admin/*` autenticado con Keycloak; Stock y Pedidos del admin consumen ecommerce sin exponer la API key.
- GitOps despliega imágenes por digest y secretos como `SealedSecret`; no hay secretos nuevos en texto plano en Git.
- E2E previo validó carrito → pedido → intención de pago → aprobación demo → callback firmado → proyección local.

## Estado inmediato del despliegue

El Deployment `ecommerce-api` ya declara el digest corregido:

```text
sha256:11ff4b42b8136f7c7f07a552d16bc18b3e89f5762c2ba7aa557e37712ea53567
```

El pod viejo no pudo ser reemplazado porque el namespace `nox-dev` alcanzó su cuota de `limits.cpu=4`. Durante un rollout `RollingUpdate`, Kubernetes intentó mantener la revisión vieja y crear la nueva simultáneamente.

Se creó y mergeó GitOps PR #25 y su ajuste #26 (`fix: evitar doble pod durante rollout de ecommerce en dev`) para usar estrategia `Recreate` en `ecommerce-api`. El rollout ya fue reconciliado: el pod corre con el digest nuevo y la migración terminó correctamente.

```bash
kubectl get application nox-dev -n argocd -o json \
  | jq '{sync:.status.sync.status,health:.status.health.status,revision:.status.sync.revision}'
kubectl get pods -n nox-dev -l app=ecommerce-api
kubectl logs -n nox-dev deploy/ecommerce-api -c migrate
```

Resultado observado: pod `ecommerce-api` `1/1 Running`, migración exitosa, API lista y aplicación `nox-dev` `Synced`. El frontend, API y ecommerce también quedaron listos con los nuevos digests; Home y endpoints de catálogo responden `200`.

La cuota también está siendo tensionada por Jobs históricos de reconciliación. No aumentar cuota ni eliminar recursos a ciegas: primero confirmar que el nuevo pod arranca y luego revisar retención de Jobs/CronJobs como tarea de operación.

## Próximas tareas en orden

1. **Cerrar rollout de `ecommerce-api` en dev.** Reconciliar Argo, validar migración, readiness, catálogo y checkout.
2. **Finalizar extracción de ecommerce.** Retirar adaptadores transitorios de Pelu sólo después de un rollback probado; el shop y el admin ya consumen el data plane independiente en dev.
3. **Completar operación del admin.** Agregar edición avanzada de categorías, estados de pago/devoluciones y E2E contra el servicio real autenticado.
4. **Completar pagos.** Probar expiración, duplicados, callbacks fuera de orden, rechazo, conciliación, devolución y operación admin. El proveedor real requiere credenciales externas; la POC usa proveedor demo.
5. **Cloudflare/R2.** Ejecutar cutover de medios por tenant, formatos responsive, caché, fallback y purga controlada. No publicar fotos de productos sin media kit autorizado.
6. **Instagram/Chatwoot.** Crear/configurar cuenta de Meta, inbox, webhook, consentimiento y canal visible en admin/agente.
7. **Identidad y campañas.** Gmail para web; teléfono + OTP a correo registrado; deduplicación; consentimientos, suppression list, segmentación y quiet hours antes de campañas.
8. **Carritos/conversaciones abandonadas.** Eventos durables, cadencias, reintentos, opt-out y envío por canal registrado (correo/WhatsApp/Telegram según ambiente y consentimiento).
9. **Catálogo Sir Fausto.** Cargar cinco productos con precios/stock ficticios editables, SKU y SEO; conseguir o generar medios autorizados.
10. **Videos IA, seguridad y operación.** Variantes responsive/reduced-motion, escaneo y presupuestos CI, backups/restore, rate limits, RBAC y observabilidad.

## Comandos de retoma

```bash
# Pelu
cd /root/Pelu
git switch dev
git pull --ff-only

# Ecommerce
cd /root/ecommerce
git switch dev
git pull --ff-only
npm ci && npm test && npm run lint && npm run build

# GitOps/dev
cd /root/agents-hetzner-k3s
git switch main
git pull --ff-only
kubectl annotate application nox-dev -n argocd \
  argocd.argoproj.io/refresh=hard --overwrite
```

## Reglas de seguridad y colaboración

- Nunca imprimir tokens, cookies, `SealedSecret` desencriptados, PII ni payloads financieros.
- Toda modificación funcional debe ir en branch y PR; mergear sólo a `dev` salvo autorización explícita.
- Usar digests inmutables en GitOps, no tags mutables en manifests.
- No copiar datos de producción a dev.
- Antes de cambiar arquitectura o alcance, actualizar este handoff y el roadmap maestro.
- Si otro agente retoma, comenzar leyendo este archivo, el roadmap y la arquitectura; después verificar el estado real de Argo/Kubernetes porque los estados operativos cambian.
