# Arquitectura independiente: `ecommerce` y `mercadopago`

**Estado:** decisión aprobada; extracción en curso  
**Fecha:** 2026-07-26  
**Alcance inicial:** ambiente `dev`; no autoriza cambios en producción ni demo.

## Resultado requerido

El hostname separado del shop no alcanza como aislamiento. El resultado final tendrá dos productos genéricos:

| Producto | Responsabilidad | Release |
|---|---|---|
| `ecommerce` | Storefront, catálogo, carrito, checkout, pedidos, inventario y operación de tienda | Repo, CI, imagen y Deployment/pod propios |
| `mercadopago` | Intenciones, preferencias, Checkout Pro/demo, webhooks, estados, conciliación y auditoría financiera | Repo, CI, imagen, API, worker y CronJob propios |

Los consumidores —turnero, agente, administración u otros proyectos— no importarán lógica interna ni accederán a las tablas de estos productos. Consumirán contratos versionados.

## Convenciones de nombres

- Repositorios GitHub: `ecommerce` y `mercadopago`.
- Imágenes: `ghcr.io/<owner>/ecommerce` y `ghcr.io/<owner>/mercadopago`.
- Recursos Kubernetes base: `ecommerce`, `mercadopago-api`, `mercadopago-worker` y `mercadopago-reconciliation`.
- Nombres de paquetes, variables genéricas y OpenAPI sin `nox`, `pelu` ni nombres de clientes.
- La marca visible, dominio, moneda, locale, retiro, catálogo y textos se inyectan por configuración de instalación.

## Límites de datos

### `ecommerce`

Es dueño de productos, categorías, medios asociados, carritos, pedidos, items, reservas de stock, movimientos y su outbox. Puede usar el mismo clúster PostgreSQL de dev, pero con base/usuario o schema/rol dedicado sin acceso a tablas del sitio.

### `mercadopago`

Es dueño de intenciones, intentos del proveedor, eventos de webhook, historial de estados, deduplicación, conciliación e inbox/outbox. No conoce tablas `shop_orders`, `appointments` ni `customers` de un consumidor.

Una solicitud de pago incluye:

- `tenant_id`/`installation_id`;
- `purpose` genérico y `resource_reference` opaca;
- importe y moneda calculados por el backend consumidor;
- items mínimos;
- URLs/callback registrados previamente, no arbitrarios por request;
- idempotency key;
- metadata allowlisted sin secretos ni PII innecesaria.

## Consistencia distribuida

La implementación transitoria actual actualiza pagos y recursos de negocio dentro de PostgreSQL. Al separar procesos se reemplaza por:

1. El consumidor confirma/reserva su recurso y escribe un evento outbox en su propia transacción.
2. `mercadopago` crea o reutiliza una intención idempotente.
3. El proveedor notifica a un webhook firmado.
4. `mercadopago` consulta al proveedor, valida referencia/importe/moneda y persiste la transición.
5. Publica un evento firmado/idempotente.
6. El consumidor registra el evento en su inbox antes de actualizar pedido o turno.
7. Reconciliación repara webhooks o callbacks perdidos.

Para turnos, expiración o rechazo no cancela la reserva y vuelve a pago local. Para pedidos con stock reservado se aplica la política configurada por `ecommerce`. El navegador nunca decide un estado financiero.

## Seguridad mínima

- mTLS o token service-to-service rotatable y con audiencia por consumidor;
- capabilities públicas HMAC de corta exposición, sin IDs utilizables por sí solos;
- secretos sólo en el servicio `mercadopago`;
- allowlist de callbacks por instalación;
- webhooks con firma, timestamp, deduplicación y payload minimizado;
- rate limits por instalación, recurso e IP;
- RBAC separado para lectura, operación, conciliación y devolución;
- logs sin access tokens, firmas, teléfonos, emails ni payloads financieros completos;
- network policies y credenciales PostgreSQL sin acceso cruzado;
- auditoría inmutable y métricas sin PII.

## Contratos

`mercadopago` publicará OpenAPI versionada con, como mínimo:

- `POST /v1/payment-intents`;
- `GET /v1/payment-intents/{public_token}`;
- `POST /v1/payment-intents/{public_token}/pay-at-store`;
- `POST /v1/webhooks/mercadopago`;
- endpoints internos de conciliación y operación protegidos.

`ecommerce` publicará contratos para catálogo, carrito, checkout, pedidos, stock y callbacks de pago. Se generará un cliente TypeScript y un cliente Python mínimos desde los contratos o con pruebas contractuales equivalentes.

## Migración incremental

1. Congelar los contratos actuales con tests.
2. Crear `ecommerce` desde la implementación validada del shop, eliminando dependencias de rutas/sesiones del sitio.
3. Desplegarlo en dev con su imagen/pod y conservar `shop-dev-nox.cloud-it.com.ar`.
4. Crear `mercadopago` desde el dominio/adaptadores validados, reemplazando FK/acceso directo por referencias opacas y eventos.
5. Desplegar API, worker y reconciliación en dev con base/rol aislados.
6. Adaptar `ecommerce`, turnero y agente como consumidores.
7. Ejecutar compatibilidad, migración de datos dev, E2E y fallos inducidos.
8. Eliminar del monolito las implementaciones transitorias sólo cuando el cutover esté probado y sea reversible.

## Criterios de aceptación

- Ambos repos existen, carecen de branding de cliente y tienen licencia/README/configuración reproducible.
- Cada uno genera su imagen y despliega un pod independiente en dev.
- Bases/roles, secretos, colas y NetworkPolicies demuestran aislamiento.
- Contratos, migraciones desde cero, unitarias, integración, seguridad y E2E están verdes.
- Compra y turno funcionan con proveedor demo de punta a punta.
- Reinicios, webhook duplicado/fuera de orden, timeout, expiración y reconciliación están probados.
- GitOps y Argo CD quedan `Synced/Healthy`.
- El repositorio consumidor ya no contiene secretos ni lógica interna de Mercado Pago, y el sitio ya no compila/aloja el storefront.
- Producción y demo permanecen sin cambios hasta autorización explícita.
