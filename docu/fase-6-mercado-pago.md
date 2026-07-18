# Fase 6 — Mercado Pago reutilizable

**Estado:** en progreso, sólo en `dev`  
**Alcance:** pagos del shop y de turnos, con Checkout Pro real cuando existan credenciales y proveedor demo funcional mientras tanto.

## Objetivo y reglas de negocio

- El shop cobra el total del pedido antes de confirmarlo.
- En turnos, pagar online es opcional: el turno permanece confirmado si el cliente elige pagar en el local o si vence el link.
- El navegador nunca acredita un pago. La fuente autoritativa es la consulta server-to-server al proveedor después de un webhook válido.
- Código, migraciones y contratos son comunes a todos los ambientes; proveedor, secretos, dominios y datos se configuran por instalación.
- Esta fase se integra y despliega únicamente en `dev`. No autoriza cambios en `demo`, `main` ni producción.

## Arquitectura

El dominio propio usa tres tablas:

- `payment_intents`: intención vinculada exactamente a un pedido o turno, importe calculado desde PostgreSQL, moneda, proveedor, vencimiento y estado.
- `payment_events`: recepción idempotente de eventos externos, firma, hash y payload reducido sin datos financieros ni PII innecesaria.
- `payment_status_history`: auditoría inmutable de cada transición con actor e identificadores externos.

Los pedidos y turnos exponen `payment_method` y `payment_status`. Una transacción bloquea el recurso objetivo, calcula el total desde datos propios y crea la intención con una `Idempotency-Key` hasheada y aislada por instalación. Las transiciones admitidas están explicitadas; importe y moneda deben coincidir antes de acreditar.

El adaptador `MercadoPagoProvider`:

- conserva el Access Token sólo en backend;
- crea preferencias con items autoritativos, `external_reference`, URLs de retorno, webhook, expiración e idempotencia;
- consulta `GET /v1/payments/{id}` y normaliza el estado;
- trata timeouts, rate limiting y errores 5xx como reintentables;
- no persiste respuestas completas ni datos de tarjeta.

El adaptador `DemoPaymentProvider` produce un link local firmado con HMAC. Permite que la POC sea comprobable sin credenciales ni dinero real, pero usa el mismo dominio, repositorios y máquina de estados que Mercado Pago.

## Seguridad del webhook

La validación implementa el manifiesto oficial de Mercado Pago con `data.id`, `x-request-id` y `ts`, HMAC-SHA256, comparación constante y una ventana temporal configurable. Después de validar:

1. se registra el evento por ID externo antes de procesarlo;
2. un duplicado devuelve el evento ya conocido;
3. el backend obtiene el pago desde Mercado Pago;
4. contrasta referencia, importe y moneda con PostgreSQL;
5. aplica una transición idempotente y registra auditoría.

La URL de retorno sólo mostrará `procesando`, `aprobado`, `pendiente` o `rechazado` según el estado propio consultado; sus parámetros no cambian datos.

## Configuración por ambiente

| Variable | Uso |
|---|---|
| `PAYMENT_PROVIDER` | `disabled`, `demo` o `mercado_pago` |
| `PAYMENT_PUBLIC_URL` | origen público que recibe al cliente |
| `PAYMENT_WEBHOOK_URL` | endpoint HTTPS público del webhook |
| `PAYMENT_LINK_SECRET` | firma de links demo, mínimo 32 caracteres |
| `PAYMENT_PREFERENCE_EXPIRATION_MINUTES` | vencimiento de preferencias |
| `MERCADO_PAGO_ACCESS_TOKEN` | credencial privada de la aplicación |
| `MERCADO_PAGO_WEBHOOK_SECRET` | secreto de firma configurado en Mercado Pago |
| `MERCADO_PAGO_API_URL` | API oficial; reemplazable sólo para pruebas controladas |
| `MERCADO_PAGO_STATEMENT_DESCRIPTOR` | descriptor parametrizable por marca |
| `PAYMENT_WEBHOOK_MAX_SKEW_SECONDS` | tolerancia máxima del timestamp firmado |

`dev` empezará con `PAYMENT_PROVIDER=demo`. La activación de Checkout Pro real queda bloqueada hasta crear una aplicación y cargar credenciales de prueba externas al repositorio.

## Entregas pequeñas de la fase

1. **Núcleo:** migración, dominio, adaptadores, firma, idempotencia y pruebas unitarias/integración.
2. **API:** creación/consulta de intención, webhook real, checkout demo y reconciliación periódica.
3. **Shop:** elección pagar ahora/local, redirección y página de resultado accesible.
4. **Turnos y agente:** elección opcional en web/Telegram/WhatsApp, link y estado visible en agenda.
5. **Operación:** filtros y auditoría admin, métricas, alertas, casos fuera de orden, expiración, rechazo y refund.

## Evidencia del núcleo

- Las 13 migraciones se aplican desde cero en PostgreSQL 16 descartable.
- Suite backend: `77 passed, 1 skipped`.
- Ruff y `git diff --check`: sin errores.
- Casos específicos: firma alterada/vencida, credenciales sólo server-side, total manipulado, intención y webhook duplicados, payload sanitizado, aprobación transaccional y mismatch de importe.

La evidencia de PR, checks, digest, Argo CD y smoke de `dev` se añadirá al integrar cada entrega.

## Referencias oficiales

- [Crear una preferencia de Checkout Pro](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/preferences/create-preference/post)
- [Validación de firma y Webhooks](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/additional-content/your-integrations/notifications/webhooks)
- [Consultar un pago por ID](https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/get-payment/get)
- [Descripción general de Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/overview)

