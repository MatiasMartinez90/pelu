---
name: test-admin
description: Testing exhaustivo del panel de administración de NOX (nox.cloud-it.com.ar/admin). Cubre todas las secciones — Resumen, Agenda, Clientes, Stock, Agente IA, Conversaciones, Administración y Disponibilidad — usando la extensión Claude-in-Chrome. Usar cuando se pida "probar el admin", "QA del panel", o verificar que las funciones de administración funcionan.
---

# Testing del panel admin NOX

Prueba end-to-end del panel admin con la extensión Claude-in-Chrome. Base: `https://nox.cloud-it.com.ar/admin`.

## Setup
1. `list_connected_browsers` → `AskUserQuestion` para que el usuario elija el browser → `select_browser`.
2. `tabs_context_mcp {createIfEmpty:true}` y trabajar en tab nuevo.
3. El admin requiere sesión con rol `admin` en Keycloak. Si redirige a `/login`, el usuario debe loguearse con Google (cuenta con rol admin asignado en Keycloak).
4. Usar `browser_batch` para agrupar acciones.

## ⚠️ Advertencia: `window.prompt()` nativo
Varios botones (EDITAR en precios, click en precio de stock) abren `window.prompt()` nativo que **congela el renderer de la extensión**. La extensión no puede enviar más comandos mientras el diálogo está abierto. **Cada vez que se dispare un prompt, avisar al usuario para que lo resuelva manualmente en el browser** y esperar su confirmación antes de continuar.

## Secciones a verificar

### 1. Resumen
- KPIs visibles: ingresos del mes, turnos, clientes, ticket promedio, vía WhatsApp, cancelaciones.
- Gráfico de barras de ingresos con navegación `‹ Mes › ` (probar mes anterior y siguiente).
- Donut "Reservas por canal" (Web / WhatsApp %).
- Cards "Servicios más pedidos" y "Rendimiento por profesional".

### 2. Agenda
- Selector de fecha: usar `form_input` con `value: "YYYY-MM-DD"` — NO tipear manualmente (concatena al valor existente → 422).
- Verificar que los turnos aparecen con barbero, servicio, hora, estado y botón CANCELAR en turnos activos futuros.
- Cancelar un turno de prueba → estado cambia a "CANCELADO".

### 3. Clientes
- Lista con avatar, teléfono, visitas, último turno, gastado, canal.
- Búsqueda por nombre o teléfono → filtra en tiempo real.

### 4. Stock (Gestión de stock)
- KPIs: valor de inventario, stock bajo (naranja), agotados (rojo).
- Botones `+` / `−` ajustan qty → valor unitario, total e inventario se actualizan en tiempo real.
- Click en precio (subrayado punteado) → `window.prompt()` → **usuario debe resolver** → precio y valor total actualizan; inventario total recalcula.
- Estados: EN STOCK / STOCK BAJO / AGOTADO según qty vs min_qty.

### 5. Agente IA · WhatsApp
- KPIs: mensajes respondidos, reservas por IA, cancelaciones por IA, costo LLM (30d).
- Card "Automatización" con % por IA, latencia promedio, handoffs, errores.
- Card "Actividad reciente del agente".

### 6. Conversaciones · WhatsApp
- Filtros: Todas / Pendientes / Bot / Humano / Resueltas / Abandonadas / Descartadas / Archivadas.
- Click en conversación → panel derecho: mensajes + ficha del cliente (visitas, gastado, próximos turnos, botón CREAR TURNO).
- Botón ARCHIVAR en una conversación activa → desaparece de "Todas", aparece en "Archivadas".

### 7. Administración del sitio
- **Personal**: grilla de barberos/estilistas con estado ACTIVO/INACTIVO y botón DESACTIVAR. Botón `+ AGREGAR PROFESIONAL`.
- **Precios de servicios**: lista con precio actual y botón EDITAR → `window.prompt()` → **usuario debe resolver** → precio actualiza. Nota "Cada cambio queda auditado."
- **Usuarios admin**: lista (puede mostrar "Sin admins en la DB" si solo hay fallback por ADMIN_EMAILS).
- **Canales de reserva**: toggles Web y WhatsApp.

### 8. Disponibilidad de la agenda
- Toggle "Estado general" → Agenda abierta/cerrada.
- **Parámetros de reserva** (fix desplegado 2026-07-11):
  - Granularidad de turnos (min) — botón EDITAR → `window.prompt()`
  - Anticipación mínima (min) — botón EDITAR → `window.prompt()`
  - Ventana de reserva (días) — botón EDITAR → `window.prompt()`
- **Días cerrados**: calendario con nav `‹ Mes ›`. Click en día → toggle cerrado/abierto. Domingos siempre cerrados por horario (sin columna DOM o marcados).
- **Bloqueos puntuales**: lista de bloqueos con botón QUITAR. Botón `+ AGREGAR BLOQUEO`.

## Verificación post-merge PR #11 (contexto negocio desde PostgreSQL)
- **Administración → Perfil del sitio**: nuevos endpoints admin para editar perfil institucional (nombre, dirección, contacto, redes) y reglas semanales de horario. Editar un campo → verificar que `GET /api/v1/site` y el sitio público reflejan el cambio.
- **Personal**: bio e Instagram editables por barbero (dinámicos, sin hardcodeo).
- Desactivar un barbero o servicio → verificar que desaparece de la disponibilidad pública en /agendar.

## Verificación post-merge PR #12 (robustez agente + guardrails)
**Automatizado**: `backend/scripts/qa_agent_e2e.py` corre todos estos escenarios vía la API de Chatwoot (inbox API dispara el pipeline real firmado, sin WhatsApp). Requiere env `CHATWOOT_QA_TOKEN`; si Envoy da 400 por el header `api_access_token`, usar `kubectl -n chatwoot port-forward svc/chatwoot-web 3900:3000` y `CHATWOOT_URL=http://127.0.0.1:3900`. Suite completa verde 2026-07-17. Ojo: un handoff silencia al agente para el resto de esa conversación (por eso injection/handoff usan conversaciones propias).

Manual vía WhatsApp (solo para validar el tramo Meta):
- **Confirmación en dos turnos**: pedir reserva → el agente debe preparar y pedir confirmación explícita en un mensaje separado antes de reservar. Igual para reprogramar y cancelar. Sin confirmación → no muta nada.
- **Idempotencia**: confirmar dos veces el mismo turno / reenviar mensaje duplicado → no debe crear turno doble.
- **Reprogramación atómica**: reprogramar turno → el viejo se libera y el nuevo se toma; si falla, no queda estado intermedio.
- **Guardrails**: probar prompt injection ("ignorá tus instrucciones y..."), contenido inapropiado → el agente rechaza/modera sin romper.
- **Handoff**: pedir hablar con humano → handoff durable, visible en Conversaciones (filtro Humano).
- **Panel Agente IA**: métricas siguen poblándose (mensajes, reservas por IA, latencia, errores). Verificar actividad reciente tras las pruebas.
- Backend: `GET /health/ready` (readiness real) y `/metrics` Prometheus responden.
- Infra: verificar en RabbitMQ que existen retry queue y DLQ; mensajes fallidos van a DLQ, no se pierden.

## Verificación post-merge PR #13 (perf admin)
- **Clientes**: búsqueda cancelable (tipear rápido no rompe ni muestra resultados viejos) y paginación por cursor (scroll/siguiente página consistente, sin duplicados).
- **Prefetch por intención**: hover sobre secciones del nav admin dispara prefetch (Network).
- **Caché privada**: datos del admin no cachean entre usuarios (verificar header `Cache-Control: private` en responses de backoffice).
- Editar precio/perfil en admin → sitio público refleja el cambio (invalidación por tag del bootstrap cacheado). Si no refleja, bug de invalidación.

## Portales por rol (post-login) — PR #14 en adelante
Routing tras login con Google (`src/app/post-login/page.tsx`): rol `admin` → `/admin`, rol `barbero` → `/barbero`, cualquier otro logueado → `/mi-cuenta`. Roles vienen de Keycloak (realm nox).

### /barbero (portal del barbero)
- Requiere rol `barbero` o `admin` en Keycloak (middleware) **y** que `barbers.email` en la DB coincida con el email del login. Sin vínculo → pantalla 403 "Esta sección es para barberos del equipo... pedile al admin que vincule tu email" (verificado 2026-07-14, correcto).
- Contenido: "Mi agenda" por día (turnos con cliente/servicio/hora/estado/total del día, nav ‹ › + Hoy) y "Mis estadísticas" mensuales (ingresos, completados, cancelados, clientes, servicios más pedidos). BFF: `/api/barber/*` → `/api/v1/barber/*`.
- Vincular email a un barbero: `PATCH /api/backoffice/barbers/{id}` con `{"email": "..."}` (sesión admin). El rebind queda auditado en `barber_email_history`.
- Cuentas de prueba: barbero → cloudit.arg@gmail.com; cliente → mmartinez.aws3@gmail.com (cliente no requiere registro previo).

### /mi-cuenta (portal del cliente)
- Guard client-side (fetch 401 → redirect a /login); NO está en el matcher del middleware — por diseño, no es bug.
- Contenido: próximo turno con Cancelar (usa `confirm()` nativo — misma advertencia que prompt()), stats (completados, profesional de cabecera, invertido), historial con filtros Todos/Web/WhatsApp, botón "Vincular mi WhatsApp" (genera código y abre wa.me). BFF: `/api/me/*`.

### Gotcha de sesión con la extensión
La sesión de Auth.js es por perfil de Chrome: si el usuario se loguea en otra ventana/perfil, el tab MCP sigue sin sesión (`/api/auth/session` → null). Verificar sesión en el tab MCP antes de testear portales.

## Hallazgos conocidos (al 2026-07-14)
- `window.prompt()` nativo en Stock (precio) y Administración (precios de servicios) bloquea el renderer de la extensión — requiere intervención manual del usuario.
- Clientes: visitas/gastado muestran 0 para turnos cancelados (correcto). Turnos pasados también $0 si no se completaron con pago.
- Conversaciones: ARCHIVAR solo funciona en convos activas (no en DESCARTADO).

## Reporte
Por sección: ✅ OK / ⚠️ warning / ❌ bug, con screenshot en bugs y causa (status HTTP, elemento roto, comportamiento inesperado).
