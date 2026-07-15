---
name: test-publico
description: Testing exhaustivo del sitio público de NOX (nox.cloud-it.com.ar) desde la mirada del usuario — links, páginas y flujo de reserva end-to-end usando la extensión de Chrome. Usar cuando se pida "probar el sitio", "testing público", "QA del sitio", o verificar que el front de usuario funciona.
---

# Testing del sitio público NOX

Prueba end-to-end del sitio público con la extensión Claude-in-Chrome. Base: `https://nox.cloud-it.com.ar`.

## Setup
1. `list_connected_browsers` → `AskUserQuestion` para que el usuario elija el browser → `select_browser`.
2. `tabs_context_mcp {createIfEmpty:true}` y trabajar en un tab nuevo.
3. Preferir `browser_batch` (navigate + screenshot + read_page) para ir rápido.

## Checklist de páginas (navigate + screenshot + read_page interactive)
Verificar en cada una: carga (200), render correcto, `<title>` propio, y que los links del nav apunten bien.
- `/` (home): hero con video/poster (fade-in, sin salto), botón **Ingresar** visible, marquee. Links: /servicios /equipo /galeria /agendar #tienda /login /nosotros /faq /contacto + Instagram.
- `/servicios`: carta con precios, FAB WhatsApp, links /agendar por servicio.
- `/equipo`: 6 profesionales con foto+bio (las fotos son lazy-load: scrollear para confirmar, la caja vacía inicial NO es bug).
- `/galeria`: grilla (imágenes lazy).
- `/nosotros`, `/faq` (acordeón abre/cierra), `/contacto`.
- `/login`: fondo dark, "NOX / Barbería Premium", botón **Ingresar con Google** con ícono, "Volver al sitio".

## Flujo de reserva `/agendar` (crítico — end-to-end)
1. Paso 1 Barbero: esperar a que carguen; elegir uno (ej. Bruno).
2. Paso 2 Servicio: click **AGENDAR** en un servicio (los slugs son por-barbero, ej. `corte-masculino-bruno`; precios variables para master barber).
3. Paso 3 Fecha & Hora: días pasados y domingos deshabilitados. Elegir un día futuro → cargan horarios → elegir slot → **CONTINUAR**.
4. Paso 4 Confirmación: resumen correcto + form (nombre, teléfono, email opcional). Completar y **Confirmar turno**.
5. Éxito: pantalla "¡Te esperamos!" con detalle. Si el slot estaba tomado → mensaje "Ese horario ya no está disponible" y vuelve a elegir (manejo correcto).

Para capturar el payload real del POST, instrumentar `fetch` antes de confirmar:
```js
const of=window.fetch; window.fetch=async(...a)=>{const r=await of(...a); if((''+a[0]).includes('/bookings')&&(a[1]||{}).method==='POST'){const c=r.clone(); console.log('[QA] '+a[1].body+' -> '+c.status+' '+(await c.text()).slice(0,160));} return r;};
```
Verificar: payload `{barber, service (slug -barbero), date (YYYY-MM-DD local), time, customer}`, status **201**, y `starts_at` con tz correcto (ART = UTC-3, ej. 10:00 → 13:00Z).

**OJO**: confirmar un turno crea data real (aparece en la agenda admin). Usar datos de prueba obvios (nombre "QA…") y CANCELARLOS después vía admin. Anotar los IDs.

## Gates de auth (sin sesión)
- `/mi-cuenta`, `/admin`, `/barbero` → deben redirigir 307 a `/login?callbackUrl=<ruta>`.

## Findings conocidos (verificar si siguen)
- `/contacto`: mapa → **FIXEADO** (2026-07-11): cambiado a OpenStreetMap embed + CSP `frame-src https://www.openstreetmap.org`. Verificar que el iframe carga correctamente.
- `/faq`: título genérico → **FIXEADO** (2026-07-11): `layout.tsx` server component con metadata propia "Preguntas Frecuentes | NOX Barber". Verificar `<title>` en DevTools.

## Reporte
Listar por página: OK / warning / bug, con screenshot y, para bugs, la causa (status HTTP, request fallida, elemento roto).
