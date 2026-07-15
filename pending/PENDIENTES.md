# Pendientes NOX — al 2026-07-14

## E1 — AWS (bloqueados hasta definir cuenta)

### E1-07 · Foto de barbero → S3
- **Qué**: UI para que cada barbero suba su foto de perfil desde `/barbero`. Guardar en S3, servir desde CDN.
- **Bloqueado por**: cuenta AWS sin definir.
- **Archivos a tocar**: `src/app/barbero/page.tsx`, nuevo endpoint `PATCH /api/v1/barber/photo`, backend con boto3/S3.

### E1-10 · Email de confirmación → SES
- **Qué**: enviar email al cliente cuando se confirma un turno (template con detalle: barbero, servicio, fecha/hora, dirección).
- **Bloqueado por**: cuenta AWS sin definir. Requiere dominio verificado en SES.
- **Archivos a tocar**: `backend/src/workers/` o hook post-booking, template HTML.

---

## E1-06 · Outbound WhatsApp (template nox_followup)
- **Qué**: template de re-contacto saliente para seguimiento post-turno.
- **Qué falta**:
  1. Usuario crea template `nox_followup` en Meta WhatsApp Manager (tipo Utilidad, es_AR, sin variables en body).
  2. Una vez aprobado por Meta, agregar env var `WHATSAPP_FOLLOWUP_TEMPLATE=nox_followup` en el deployment del worker.
- **No requiere código nuevo** — el CronJob de followups ya está implementado.

---

## E2 — Etapa 2 (post-lanzamiento)

### E2-01 · Pagos online
- Integración MP o Stripe para cobrar seña al reservar.

### E2-02 · Reviews / valoraciones
- Pedir valoración post-turno por WhatsApp, mostrar en home.

### E2-03 · Fidelización
- Sistema de puntos o descuentos para clientes recurrentes.

---

## Skills QA pendientes

### test-barbero
- **Qué**: skill para QA del portal `/barbero` (agenda diaria, stats, filtros).
- **Bloqueado por**: requiere vincular email en tabla `barbers`.
  - Endpoint: `PATCH /api/v1/admin/barbers/{id}` con `{"email":"cuenta@gmail.com"}`
  - Luego loguearse con esa cuenta Google → Keycloak redirige a `/barbero`.
- **Dónde crear**: `.claude/skills/test-barbero/SKILL.md`

---

## UX · fix menor

### Date picker en Agenda admin
- Tipear en `<input type="date">` concatena al valor existente → fecha inválida → 422.
- Workaround actual: usar `form_input` con `value: "YYYY-MM-DD"`.
- Fix real: limpiar el input antes de escribir (`el.value = ""` o `triple_click` para seleccionar todo).
- **Archivos a tocar**: `src/app/admin/page.tsx` (sección Agenda, el date input).

---

## Notas de infraestructura

- K-02: cluster `k3s-contabo-new` sin NetworkPolicies — segmentación entre namespaces pendiente.
- SSH tunnel para puerto 6443 + Cloudflare Tunnel para acceso remoto (confirmados, no implementados).
- SSO para ArgoCD / registry pendiente.
