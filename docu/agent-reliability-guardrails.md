# Robustez, escalabilidad y guardrails del agente

## Objetivo

Este documento registra el diagnóstico del agente LangGraph y el plan de implementación para que el flujo Chatwoot → API → RabbitMQ → worker → LangGraph → Chatwoot sea durable, idempotente, observable y seguro.

La implementación vive en `feat/agent-reliability-guardrails`, apilada sobre `feat/agent-pg-site-context` mientras el PR de contexto PostgreSQL siga abierto.

## Arquitectura observada

1. Chatwoot envía `message_created` al signer privado.
2. El signer valida el token de origen y firma el body con HMAC.
3. La API valida firma, ventana temporal, replay, tamaño y rate limit.
4. El mensaje se registra y se publica un evento durable en RabbitMQ.
5. El worker hace debounce y serializa el procesamiento por conversación.
6. LangGraph ejecuta un agente ReAct con memoria PostgreSQL y tools de catálogo, agenda, reservas y handoff.
7. La respuesta se persiste antes de enviarse a Chatwoot.

## Fortalezas existentes

- HMAC, replay protection, rate limit y límite de payload.
- Quorum queue, DLQ, mensajes persistentes, ACK manual y prefetch.
- Identidad del cliente inyectada; el modelo no elige teléfono ni conversación.
- Validaciones de profesional, servicio, disponibilidad y propiedad del turno.
- Constraint PostgreSQL contra reservas superpuestas.
- Checkpoints PostgreSQL, límite de recursión y tools serializadas.
- Contexto institucional dinámico desde PostgreSQL.
- Handoff a humano, budget cap, trazas Langfuse y probes Kubernetes.

## Riesgos encontrados

### Confiabilidad de mensajería

- El lock Redis original no tenía owner token, renovación ni compare-and-delete.
- Un trigger podía ser confirmado mientras otro worker tenía el lock y dejar el mensaje en el buffer sin otro despertador.
- La escritura Redis + publicación Rabbit no era atómica.
- Faltaban identidad durable del webhook, inbox/outbox e idempotencia extremo a extremo.
- La publicación no declaraba de forma explícita confirms ni `mandatory`.
- Un crash después de una tool o de enviar a Chatwoot podía repetir efectos o respuestas.
- Los sleeps de retry ocupaban slots de prefetch.

### Agente y transacciones

- El graph era un ReAct genérico: la confirmación antes de mutar dependía del prompt.
- Crear, cancelar y reprogramar estaban siempre disponibles para el modelo.
- Reprogramar cancelaba el turno anterior antes de crear el nuevo fuera de la transacción.
- Los errores del agente se convertían en éxito de cola y no llegaban al mecanismo de retry/DLQ.
- `agent_error` no estaba permitido por el constraint de `agent_events`.

### Coste, contexto y privacidad

- Precios de tokens hardcodeados para un modelo configurable.
- Budget check e incremento separados, sin reserva atómica ni timezone del negocio.
- Riesgo de volver a contar usage histórico del checkpoint.
- Historial sin ventana de contexto ni política de retención.
- Teléfonos y contenido podían llegar sin redacción a observabilidad.

### Escalabilidad y operación

- Cliente HTTP recreado en cada request, sin pooling.
- Readiness del worker no reflejaba necesariamente dependencias vivas.
- Redis almacenaba estado crítico que debía ser durable en PostgreSQL.
- KEDA aumenta throughput, pero un cluster de un nodo no constituye alta disponibilidad.
- Faltaban pruebas de carreras, redelivery, crashes, idempotencia y fallos externos.

## Diseño implementado

### 1. Inbox/outbox PostgreSQL

- Cada webhook de Chatwoot se deduplica por ID de mensaje.
- El inbox y el evento outbox se crean en la misma transacción.
- Un dispatcher recupera publicaciones pendientes.
- El worker reclama lotes con lease y puede recuperar trabajo abandonado.
- Las respuestas pendientes se guardan en PostgreSQL antes de enviarse.
- Ante un POST ambiguo a Chatwoot, el retry reconcilia primero el historial para evitar duplicados.

### 2. Lock Redis con lease

- Token aleatorio por propietario.
- Renovación periódica.
- Liberación compare-and-delete.
- Wake flag atómica para no perder mensajes llegados durante otra ejecución.

### 3. Mutaciones confirmadas e idempotentes

- Las tools públicas preparan una acción pendiente.
- La ejecución se realiza en un turno posterior con confirmación explícita.
- Una acción no puede prepararse y confirmarse en el mismo turno.
- Cada comando tiene una clave durable de idempotencia.
- Reprogramar es atómico: si el nuevo turno falla, el anterior continúa activo.

### 4. Guardrails

- Moderación opcional mediante el endpoint de moderación de OpenAI.
- Detección conservadora de intentos explícitos de alterar instrucciones internas.
- Validación y normalización de salida.
- Límite de contexto enviado al modelo.
- Rotación del thread tras 30 días de inactividad y borrado de checkpoints retirados.
- PII seudonimizada en metadatos de trazas.
- Handoff para categorías de seguridad configuradas.

### 5. Coste y observabilidad

- Precios configurables por modelo.
- Reserva atómica de presupuesto por turno y reconciliación con coste real.
- Cálculo en timezone del negocio.
- Conteo exclusivo del turno actual.
- Taxonomía de errores consistente.
- Métricas y estado de readiness ligados a dependencias.
- Métricas Prometheus de webhook, cola, outbox, locks, turnos y latencia.

## Estrategia de pruebas

- Unit tests de lease, renovación y liberación con owner token.
- Dedupe de webhook e inbox/outbox atómico.
- Recuperación de lotes expirados.
- Trigger durante lock ocupado.
- Respuesta pendiente tras crash.
- Publisher confirm y mensaje no enrutable.
- Confirmación en turno distinto y command idempotency.
- Reprogramación transaccional.
- Prompt injection, moderación, PII y output guard.
- Budget concurrente, timezone y usage del turno.
- Fallos transitorios y permanentes de OpenAI, Redis, Rabbit y Chatwoot.
- Dataset anonimizado de conversaciones con métricas de éxito, exactitud, handoff, alucinación, duplicados, latencia y coste.
- CI con PostgreSQL real, migraciones completas, Ruff, pytest y auditoría de dependencias.

## Despliegue recomendado

1. Aplicar migración y desplegar API con dispatcher compatible.
2. Desplegar workers nuevos.
3. Verificar inbox pendiente, outbox pendiente, DLQ, latencia y duplicados.
4. Habilitar moderación primero en modo observación y revisar falsos positivos.
5. Activar guardrails de bloqueo y el flujo de confirmación.
6. Definir retención de checkpoints y eventos según la política de privacidad.
7. Recién después aumentar KEDA y migrar a infraestructura multi-nodo.

## Configuración operativa nueva

Todos los valores tienen defaults seguros y pueden ajustarse por variables de entorno:

- `MODERATION_ENABLED=true` y `MODERATION_FAIL_CLOSED=false`.
- `CONVERSATION_LOCK_TTL_SECONDS=120` e `INBOX_LEASE_SECONDS=900`.
- `CONTEXT_MAX_MESSAGES=24` y `CONVERSATION_RESET_AFTER_DAYS=30`.
- `DELIVERY_RETENTION_DAYS=30`, `EVENT_RETENTION_DAYS=90` y `OUTPUT_MAX_CHARS=1200`.
- `BUDGET_RESERVE_PER_TURN_USD`, `MODEL_INPUT_PRICE_PER_MILLION` y
  `MODEL_OUTPUT_PRICE_PER_MILLION` deben acompañar cada cambio de modelo.
- `STORE_EVENT_PHONE_PLAINTEXT=false` mantiene seudonimizados los eventos nuevos.

La alta disponibilidad física requiere además un cambio en el repositorio GitOps: Redis y
RabbitMQ con persistencia/replicación y un cluster Kubernetes multi-nodo. El código de esta
branch elimina su uso como almacenamiento durable de mensajes, pero no puede convertir por sí
solo un nodo físico en alta disponibilidad.

## Criterios de aceptación

- Cero mutaciones sin confirmación explícita en un turno posterior.
- Cero reservas duplicadas ante redelivery.
- Cero mensajes perdidos en carreras por conversación.
- Recuperación automática de inbox/outbox y respuestas pendientes.
- Ningún worker libera el lock de otro.
- Reprogramar nunca cancela el turno anterior si falla el nuevo.
- Tests automatizados para los escenarios críticos.
- Trazabilidad de cada mensaje desde Chatwoot hasta respuesta o DLQ.
