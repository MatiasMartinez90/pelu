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

## Hallazgos conocidos (al 2026-07-14)
- `window.prompt()` nativo en Stock (precio) y Administración (precios de servicios) bloquea el renderer de la extensión — requiere intervención manual del usuario.
- Clientes: visitas/gastado muestran 0 para turnos cancelados (correcto). Turnos pasados también $0 si no se completaron con pago.
- Conversaciones: ARCHIVAR solo funciona en convos activas (no en DESCARTADO).

## Reporte
Por sección: ✅ OK / ⚠️ warning / ❌ bug, con screenshot en bugs y causa (status HTTP, elemento roto, comportamiento inesperado).
