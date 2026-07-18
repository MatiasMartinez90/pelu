"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { money, site } from "@/lib/site";

const SERIF = "var(--font-serif)";
const SANS = "var(--font-sans)";
const CARD = { border: "1px solid rgba(255,255,255,0.14)" } as const;

// En prod va por el BFF (inyecta el token Keycloak server-side).
// En dev se puede apuntar directo a la API local con AUTH_DISABLED=1.
const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API ?? "/api/backoffice";

// Guard anti-loop: si ya disparamos el re-login, no lo repetimos por cada fetch en vuelo.
let reauthing = false;

// Cache en memoria de respuestas GET por path: al volver a una sección los datos
// aparecen al instante (stale-while-revalidate) en vez de flashear un skeleton.
const GET_CACHE = new Map<string, unknown>();
function getCached<T>(path: string): T | null {
  return (GET_CACHE.get(path) as T | undefined) ?? null;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    // Sesión sin accessToken (refresh Keycloak vencido). Re-autenticar en vez de mostrar "Error 401".
    if (!reauthing) {
      reauthing = true;
      signIn("keycloak", { callbackUrl: "/admin" });
    }
    // Promesa que no resuelve: el redirect de signIn desmonta la página.
    return new Promise<T>(() => {});
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(
      (typeof detail === "object" ? detail?.message : detail) || `Error ${res.status}`
    );
  }
  const val = res.status === 204 ? (undefined as T) : await res.json();
  if (method === "GET") GET_CACHE.set(path, val);
  else GET_CACHE.clear();
  return val;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(site.locale, { hour: "2-digit", minute: "2-digit" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(site.locale);

function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block" }} />;
}
const chColor = (ch: string) => (ch === "whatsapp" || ch === "WhatsApp" ? "#25D366" : "rgba(255,255,255,0.6)");

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div role="alert" style={{ marginTop: 22, border: "1px solid rgba(255,120,120,0.5)", background: "rgba(255,90,90,0.08)", color: "#ffb3b3", padding: "14px 18px", fontSize: 14 }}>
      {msg}
    </div>
  );
}
// ── Skeletons ──────────────────────────────────────────────────────────
// Placeholders con shimmer que respetan el layout de cada sección → sin flash de vacío.
function Sk({ w = "100%", h = 16, r = 4, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <div className="adm-sk" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}
function SkKpis({ n = 6 }: { n?: number }) {
  return (
    <div className="adm-kpis" style={{ marginTop: 18, gap: 16 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ ...CARD, padding: "22px 24px" }}>
          <Sk w={90} h={9} />
          <Sk w={110} h={30} style={{ marginTop: 14 }} />
        </div>
      ))}
    </div>
  );
}
function SkTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ marginTop: 20, ...CARD }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {Array.from({ length: cols }).map((__, j) => <Sk key={j} w={j === 0 ? "60%" : "80%"} h={13} />)}
        </div>
      ))}
    </div>
  );
}
function SkChart() {
  return (
    <div style={{ ...CARD, padding: 24, marginTop: 18 }}>
      <Sk w={180} h={11} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, marginTop: 26 }}>
        {Array.from({ length: 14 }).map((_, i) => <Sk key={i} w="100%" h={30 + ((i * 37) % 110)} r={2} style={{ alignSelf: "flex-end" }} />)}
      </div>
    </div>
  );
}
function SkResumen() {
  return <><SkKpis /><SkChart /></>;
}

const NAV = [
  { key: "resumen", label: "Resumen" }, { key: "agenda", label: "Agenda" },
  { key: "clientes", label: "Clientes" }, { key: "stock", label: "Stock" },
  { key: "ia", label: "Agente IA" }, { key: "conversaciones", label: "Conversaciones" },
  { key: "ajustes", label: "Administración" }, { key: "disponibilidad", label: "Disponibilidad" },
];
const TITLES: Record<string, string> = { resumen: "Resumen", agenda: "Agenda", clientes: "Clientes", stock: "Gestión de stock", ia: "Agente IA · WhatsApp", conversaciones: "Conversaciones · WhatsApp", ajustes: "Administración del sitio", disponibilidad: "Disponibilidad de la agenda" };

function prefetchSection(section: string) {
  const today = dateKey(new Date());
  const month = today.slice(0, 7);
  const paths: Record<string, string[]> = {
    resumen: [`/dashboard/summary?month=${month}`],
    agenda: [`/agenda?date=${today}`],
    clientes: ["/customers?search=&limit=50"],
    stock: ["/stock"],
    ia: ["/agent/metrics?days=30", "/agent/events?limit=20"],
    ajustes: ["/barbers", "/services", "/settings", "/admins", "/site-profile", "/schedule-rules"],
  };
  for (const path of paths[section] ?? []) {
    if (!GET_CACHE.has(path)) void api(path).catch(() => {});
  }
}

export default function AdminPage() {
  const [section, setSection] = useState("resumen");
  const today = new Date();
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  return (
    <div className="adm-shell" style={{ background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <aside className="adm-side">
        <div className="adm-brand">
          <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 26 }}>{site.shortName}</span>
          <span style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.5 }}>Admin</span>
        </div>
        <nav className="adm-nav">
          {NAV.map((n) => {
            const on = section === n.key;
            return (
              <button type="button" key={n.key} className="navit" aria-current={on ? "page" : undefined} onPointerEnter={() => prefetchSection(n.key)} onFocus={() => prefetchSection(n.key)} onClick={() => setSection(n.key)} style={{ width: "100%", background: on ? "rgba(255,255,255,0.06)" : "transparent", color: on ? "#fff" : "rgba(255,255,255,0.72)", borderColor: on ? "#fff" : "transparent", fontFamily: SANS, textAlign: "left" }}>
                <Dot color={on ? "#fff" : "rgba(255,255,255,0.25)"} />{n.label}
              </button>
            );
          })}
        </nav>
        <div className="adm-user" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
          <Link href="/" style={{ color: "#fff", opacity: 0.8 }}>Volver al sitio →</Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontFamily: SANS, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <div className="adm-head">
          <div>
            <h1 className="adm-title">{TITLES[section]}</h1>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.5, textTransform: "capitalize" }}>
              {dias[today.getDay()]} {today.getDate()} de {MONTHS[today.getMonth()]}, {today.getFullYear()}
            </div>
          </div>
          <Link href="/agendar" style={{ background: "#fff", color: "#0a0a0a", padding: "11px 20px", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>+ Nuevo turno</Link>
        </div>

        {section === "resumen" && <Resumen />}
        {section === "agenda" && <Agenda />}
        {section === "clientes" && <Clientes />}
        {section === "stock" && <Stock />}
        {section === "ia" && <IA />}
        {section === "conversaciones" && <Conversaciones />}
        {section === "ajustes" && <Ajustes />}
        {section === "disponibilidad" && <Disponibilidad />}
      </main>
    </div>
  );
}

// ── Resumen ────────────────────────────────────────────────────────────

type Summary = {
  kpis: { month_revenue: number; month_appointments: number; month_customers: number; month_cancelled: number; month_whatsapp: number; month_web: number };
  revenue_daily: { day: string; revenue: number }[];
  top_services: { name: string; count: number }[];
  barber_performance: { name: string; revenue: number; count: number }[];
};

const curMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const monthLabel = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MONTHS[mm - 1]} ${y}`; };

function Resumen() {
  const [selMonth, setSelMonth] = useState(curMonth());
  const [data, setData] = useState<Summary | null>(() => getCached<Summary>(`/dashboard/summary?month=${curMonth()}`));
  const [error, setError] = useState("");

  useEffect(() => {
    const path = `/dashboard/summary?month=${selMonth}`;
    api<Summary>(path).then((value) => { setData(value); setError(""); }).catch((e) => setError(e.message));
  }, [selMonth]);

  const shiftMonth = (delta: number) => {
    const [y, m] = selMonth.split("-").map(Number);
    const dt = new Date(y, m - 1 + delta, 1);
    const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    if (next <= curMonth()) setSelMonth(next);
  };
  const atCurrent = selMonth >= curMonth();

  const header = (
    <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", ...CARD, padding: "14px 18px" }}>
      <button className="qbtn" aria-label="Mes anterior" onClick={() => shiftMonth(-1)} style={{ fontSize: 17 }}>‹</button>
      <div style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1, textTransform: "capitalize", minWidth: 180 }}>{monthLabel(selMonth)}</div>
      <button className="qbtn" aria-label="Mes siguiente" onClick={() => shiftMonth(1)} disabled={atCurrent} style={{ fontSize: 17, opacity: atCurrent ? 0.45 : 1, cursor: atCurrent ? "default" : "pointer" }}>›</button>
      {!atCurrent && <button className="miniact" onClick={() => setSelMonth(curMonth())} style={{ marginLeft: 6 }}>Mes actual</button>}
    </div>
  );

  if (error) return <>{header}<ErrorBox msg={error} /></>;
  if (!data) return <>{header}<SkResumen /></>;

  const k = data.kpis;
  const total = Number(k.month_whatsapp) + Number(k.month_web) || 1;
  const waPct = Math.round((Number(k.month_whatsapp) / total) * 100);
  const ticket = Number(k.month_appointments) ? Number(k.month_revenue) / Number(k.month_appointments) : 0;
  const kpis = [
    { label: "Ingresos del mes", value: money(Number(k.month_revenue)) },
    { label: "Turnos del mes", value: String(k.month_appointments) },
    { label: "Clientes del mes", value: String(k.month_customers) },
    { label: "Ticket promedio", value: money(ticket) },
    { label: "Vía WhatsApp", value: `${waPct}%` },
    { label: "Cancelaciones", value: String(k.month_cancelled) },
  ];
  const maxDay = Math.max(1, ...data.revenue_daily.map((d) => Number(d.revenue)));
  const weekTotal = data.revenue_daily.reduce((s, d) => s + Number(d.revenue), 0);
  const maxSvc = Math.max(1, ...data.top_services.map((s) => Number(s.count)));
  const maxBarber = Math.max(1, ...data.barber_performance.map((b) => Number(b.revenue)));

  return (
    <>
      {header}
      <div className="adm-kpis" style={{ marginTop: 18, gap: 16 }}>
        {kpis.map((x) => (
          <div key={x.label} style={{ ...CARD, padding: "22px 24px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{x.label}</div>
            <div style={{ marginTop: 12, fontFamily: SERIF, fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{x.value}</div>
          </div>
        ))}
      </div>
      <div className="adm-grid" style={{ marginTop: 18, "--cols": "1.6fr 1fr" } as React.CSSProperties}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Ingresos · {monthLabel(selMonth)}</div>
            <div style={{ fontFamily: SERIF, fontSize: 22 }}>{money(weekTotal)}</div>
          </div>
          <div className="adm-chart" style={{ marginTop: 26 }}>
            {data.revenue_daily.map((d) => (
              <div key={d.day} title={`${new Date(d.day + "T12:00:00").getDate()} · ${money(Number(d.revenue))}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end", minWidth: 0 }}>
                <div style={{ width: "100%", background: "linear-gradient(180deg,#fff,#cfcfcf)", height: `${Math.max(2, Math.round((Number(d.revenue) / maxDay) * 100))}%` }} />
                <div style={{ fontSize: 9, opacity: 0.45 }}>{new Date(d.day + "T12:00:00").getDate()}</div>
              </div>
            ))}
            {data.revenue_daily.length === 0 && <div style={{ opacity: 0.4, fontSize: 14 }}>Sin datos todavía.</div>}
          </div>
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Reservas por canal</div>
          <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ width: 128, height: 128, borderRadius: "50%", background: `conic-gradient(#ffffff 0 ${100 - waPct}%, #25D366 ${100 - waPct}% 100%)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 78, height: 78, borderRadius: "50%", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: SERIF, fontSize: 24 }}>{k.month_appointments}</span>
                <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5 }}>turnos</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 10, height: 10, background: "#fff", display: "inline-block" }} />
                <span style={{ fontSize: 13, minWidth: 90 }}>Web</span>
                <span style={{ fontFamily: SERIF, fontSize: 16 }}>{100 - waPct}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 10, height: 10, background: "#25D366", display: "inline-block" }} />
                <span style={{ fontSize: 13, minWidth: 90 }}>WhatsApp</span>
                <span style={{ fontFamily: SERIF, fontSize: 16 }}>{waPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="adm-grid" style={{ marginTop: 16 }}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 20 }}>Servicios más pedidos</div>
          {data.top_services.map((s) => (
            <div key={s.name} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7 }}><span>{s.name}</span><span style={{ opacity: 0.6 }}>{s.count}</span></div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.1)" }}><div style={{ height: "100%", width: `${Math.round((Number(s.count) / maxSvc) * 100)}%`, background: "#fff" }} /></div>
            </div>
          ))}
          {data.top_services.length === 0 && <div style={{ opacity: 0.4, fontSize: 14 }}>Sin datos todavía.</div>}
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 20 }}>Rendimiento por profesional</div>
          {data.barber_performance.map((b) => (
            <div key={b.name} style={{ display: "grid", gridTemplateColumns: "90px 1fr auto", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <span style={{ fontSize: 13 }}>{b.name}</span>
              <div style={{ height: 6, background: "rgba(255,255,255,0.1)" }}><div style={{ height: "100%", width: `${Math.round((Number(b.revenue) / maxBarber) * 100)}%`, background: "linear-gradient(90deg,#888,#fff)" }} /></div>
              <span style={{ fontFamily: SERIF, fontSize: 15, minWidth: 84, textAlign: "right" }}>{money(Number(b.revenue))}</span>
            </div>
          ))}
          {data.barber_performance.length === 0 && <div style={{ opacity: 0.4, fontSize: 14 }}>Sin datos todavía.</div>}
        </div>
      </div>
    </>
  );
}

// ── Agenda ─────────────────────────────────────────────────────────────

type Appt = { id: string; starts_at: string; ends_at: string; status: string; price_at_booking: number; channel: string; customer: string; phone: string; barber: string; service: string };

function Agenda() {
  const [selDate, setSelDate] = useState(dateKey(new Date()));
  const [appts, setAppts] = useState<Appt[] | null>(() => getCached<Appt[]>(`/agenda?date=${dateKey(new Date())}`));
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Appt[]>(`/agenda?date=${selDate}`).then((value) => { setAppts(value); setError(""); }).catch((e) => setError(e.message));
  }, [selDate]);
  useEffect(load, [load]);

  const sel = parseKey(selDate);
  const shiftDay = (d: number) => { const dt = parseKey(selDate); dt.setDate(dt.getDate() + d); setSelDate(dateKey(dt)); };
  const active = (appts ?? []).filter((a) => a.status === "active");

  async function cancel(a: Appt) {
    if (!confirm(`¿Cancelar el turno de ${a.customer} (${fmtTime(a.starts_at)})?`)) return;
    try {
      await api(`/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
      load();
    } catch (e) { setError((e as Error).message); }
  }
  async function reschedule(a: Appt) {
    const date = prompt("Nueva fecha (YYYY-MM-DD):", selDate);
    if (!date) return;
    const time = prompt("Nueva hora (HH:MM):", fmtTime(a.starts_at));
    if (!time) return;
    try {
      await api(`/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ date, time }) });
      load();
    } catch (e) { alert((e as Error).message); }
  }
  async function setStatus(a: Appt, status: string) {
    try {
      await api(`/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
    } catch (e) { setError((e as Error).message); }
  }

  const kpis = [
    { label: "Turnos del día", value: String(active.length) },
    { label: "Vía WhatsApp", value: String(active.filter((a) => a.channel === "whatsapp").length) },
    { label: "Facturación estimada", value: money(active.reduce((s, a) => s + Number(a.price_at_booking), 0)) },
  ];

  return (
    <>
      <div style={{ marginTop: 26, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, ...CARD, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button className="qbtn" aria-label="Día anterior" onClick={() => shiftDay(-1)} style={{ fontSize: 17 }}>‹</button>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1, textTransform: "capitalize" }}>{`${DOW[sel.getDay()]} ${sel.getDate()} ${MONTHS[sel.getMonth()]}`}</div>
          </div>
          <button className="qbtn" aria-label="Día siguiente" onClick={() => shiftDay(1)} style={{ fontSize: 17 }}>›</button>
          <button className="miniact" onClick={() => setSelDate(dateKey(new Date()))} style={{ marginLeft: 6 }}>Hoy</button>
        </div>
        <input type="date" aria-label="Fecha de la agenda" value={selDate} onChange={(e) => e.target.value && setSelDate(e.target.value)} style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px 10px", fontFamily: SANS, colorScheme: "dark" }} />
      </div>

      {error && <ErrorBox msg={error} />}

      <div className="adm-kpis" style={{ marginTop: 22 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...CARD, padding: "18px 22px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{k.label}</div>
            <div style={{ marginTop: 8, fontFamily: SERIF, fontSize: 28 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {appts === null ? (
        <SkTable rows={6} cols={4} />
      ) : appts.length === 0 ? (
        <div style={{ marginTop: 22, border: "1px dashed rgba(255,255,255,0.2)", padding: 48, textAlign: "center", opacity: 0.6, fontSize: 15 }}>Sin turnos para este día.</div>
      ) : (
        <div className="tbl-wrap" style={{ marginTop: 22, ...CARD }}>
          <div className="tbl-row" style={{ display: "grid", gridTemplateColumns: "0.7fr 1.4fr 1.6fr 1.2fr 1.1fr 1.6fr", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <span>Hora</span><span>Cliente</span><span>Servicio</span><span>Profesional</span><span>Canal</span><span style={{ textAlign: "right" }}>Acciones</span>
          </div>
          {appts.map((a) => (
            <div key={a.id} className="arow tbl-row" style={{ display: "grid", gridTemplateColumns: "0.7fr 1.4fr 1.6fr 1.2fr 1.1fr 1.6fr", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: a.status === "cancelled" ? 0.4 : 1 }}>
              <span style={{ fontFamily: SERIF, fontSize: 18 }}>{fmtTime(a.starts_at)}</span>
              <span style={{ fontSize: 14 }}>{a.customer || a.phone}</span>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{a.service}</span>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{a.barber}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12 }}><Dot color={chColor(a.channel)} /> {a.channel}</span>
              <span style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                {a.status === "active" ? (
                  <>
                    <button className="miniact" onClick={() => setStatus(a, "completed")}>Completar</button>
                    <button className="miniact" onClick={() => reschedule(a)}>Reagendar</button>
                    <button className="miniact dng" onClick={() => cancel(a)}>Cancelar</button>
                  </>
                ) : (
                  <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: a.status === "cancelled" ? "#ff7a7a" : "rgba(255,255,255,0.6)" }}>{a.status === "cancelled" ? "Cancelado" : a.status === "completed" ? "Completado" : "No show"}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Clientes ───────────────────────────────────────────────────────────

type Customer = { id: string; phone: string; name: string | null; first_channel: string; visits: number; spent: number; last_visit: string | null };
type CustomerPage = { items: Customer[]; next_cursor: string | null };

function Clientes() {
  const initial = getCached<CustomerPage>("/customers?search=&limit=50");
  const [rows, setRows] = useState<Customer[] | null>(initial?.items ?? null);
  const [nextCursor, setNextCursor] = useState<string | null>(initial?.next_cursor ?? null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => {
      api<CustomerPage>(`/customers?search=${encodeURIComponent(search)}&limit=50`, { signal: controller.signal })
        .then((value) => { setRows(value.items); setNextCursor(value.next_cursor); setError(""); })
        .catch((e) => { if (e.name !== "AbortError") setError(e.message); });
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [search]);

  async function loadMore() {
    if (!nextCursor) return;
    const page = await api<CustomerPage>(`/customers?search=${encodeURIComponent(search)}&limit=50&cursor=${encodeURIComponent(nextCursor)}`);
    setRows((current) => [...(current ?? []), ...page.items]);
    setNextCursor(page.next_cursor);
  }

  if (error) return <ErrorBox msg={error} />;

  return (
    <>
      <div style={{ marginTop: 26 }}>
        <input type="search" aria-label="Buscar clientes por nombre o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono…" style={{ width: "100%", maxWidth: 420, background: "#161616", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "12px 14px", fontFamily: SANS, fontSize: 14, outline: "none" }} />
      </div>
      {rows === null ? (
        <SkTable rows={7} cols={5} />
      ) : (
        <div className="tbl-wrap" style={{ marginTop: 18, ...CARD }}>
          <div className="tbl-row" style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 0.8fr 1.1fr 1fr 1.1fr", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <span>Cliente</span><span>Teléfono</span><span>Visitas</span><span>Último turno</span><span>Gastado</span><span>Canal de alta</span>
          </div>
          {rows.map((c) => (
            <div key={c.id} className="arow tbl-row" style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 0.8fr 1.1fr 1fr 1.1fr", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 13, flexShrink: 0 }}>{initials(c.name || c.phone)}</span>{c.name || "—"}
              </span>
              <span style={{ opacity: 0.7, fontSize: 13 }}>{c.phone}</span>
              <span style={{ opacity: 0.8 }}>{c.visits}</span>
              <span style={{ opacity: 0.7, fontSize: 14 }}>{c.last_visit ? fmtDate(c.last_visit) : "—"}</span>
              <span style={{ fontFamily: SERIF, fontSize: 16 }}>{money(Number(c.spent))}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13 }}><Dot color={chColor(c.first_channel)} /> {c.first_channel}</span>
            </div>
          ))}
          {rows.length === 0 && <div style={{ padding: 32, opacity: 0.5, fontSize: 14 }}>Sin clientes todavía.</div>}
        </div>
      )}
      {nextCursor && <button type="button" className="miniact" onClick={loadMore} style={{ marginTop: 16 }}>Cargar más clientes</button>}
    </>
  );
}

// ── Stock ──────────────────────────────────────────────────────────────

type Product = { id: string; name: string; sku: string; qty: number; min_qty: number; price: number };

function Stock() {
  const [products, setProducts] = useState<Product[] | null>(() => getCached<Product[]>("/products"));
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Product[]>("/products").then(setProducts).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function adjust(p: Product, delta: number) {
    try {
      await api(`/products/${p.id}/adjust`, { method: "POST", body: JSON.stringify({ delta, reason: "ajuste manual" }) });
      load();
    } catch (e) { setError((e as Error).message); }
  }

  async function editPrice(p: Product) {
    const raw = prompt(`Nuevo precio para ${p.name} (actual ${money(p.price)}):`, String(p.price));
    if (raw === null) return;
    const price = Math.round(Number(raw.replace(/[^\d]/g, "")));
    if (!price || price <= 0) { alert("Precio inválido"); return; }
    try {
      await api(`/products/${p.id}`, { method: "PATCH", body: JSON.stringify({ price }) });
      load();
    } catch (e) { setError((e as Error).message); }
  }

  if (error) return <ErrorBox msg={error} />;
  if (!products) return <SkTable rows={6} cols={5} />;

  const invValue = products.reduce((s, p) => s + p.price * p.qty, 0);
  const lowCount = products.filter((p) => p.qty > 0 && p.qty <= p.min_qty).length;
  const outCount = products.filter((p) => p.qty === 0).length;
  const kpis = [
    { label: "Valor de inventario", value: money(invValue), color: "#fff" },
    { label: "Stock bajo", value: String(lowCount), color: lowCount ? "#ffcf66" : "#fff" },
    { label: "Agotados", value: String(outCount), color: outCount ? "#ff7a7a" : "#fff" },
  ];

  return (
    <>
      <div className="adm-kpis" style={{ marginTop: 28 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...CARD, padding: "18px 22px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{k.label}</div>
            <div style={{ marginTop: 8, fontFamily: SERIF, fontSize: 28, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div className="tbl-wrap" style={{ marginTop: 22, ...CARD }}>
        <div className="tbl-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.9fr 1.3fr 1fr 1.1fr", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <span>Producto</span><span>Precio</span><span>Stock</span><span>Ajustar</span><span>Valor</span><span style={{ textAlign: "right" }}>Estado</span>
        </div>
        {products.map((p) => {
          const status = p.qty === 0 ? "Agotado" : p.qty <= p.min_qty ? "Stock bajo" : "En stock";
          const col = p.qty === 0 ? "#ff7a7a" : p.qty <= p.min_qty ? "#ffcf66" : "rgba(255,255,255,0.85)";
          const border = p.qty === 0 ? "rgba(255,90,90,0.5)" : p.qty <= p.min_qty ? "rgba(255,200,80,0.5)" : "rgba(255,255,255,0.3)";
          return (
            <div key={p.sku} className="arow tbl-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.9fr 1.3fr 1fr 1.1fr", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span><span style={{ fontFamily: SERIF, fontSize: 17 }}>{p.name}</span><br /><span style={{ fontSize: 11, opacity: 0.4, letterSpacing: "0.08em" }}>{p.sku}</span></span>
              <button type="button" onClick={() => editPrice(p)} aria-label={`Editar precio de ${p.name}`} title="Editar precio" style={{ width: "fit-content", padding: 0, background: "none", color: "inherit", border: 0, borderBottom: "1px dotted rgba(255,255,255,0.3)", fontFamily: SERIF, fontSize: 16, cursor: "pointer" }}>{money(p.price)}</button>
              <span style={{ fontSize: 16, color: col }}>{p.qty}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}><button className="qbtn" onClick={() => adjust(p, -1)}>−</button><button className="qbtn" onClick={() => adjust(p, 1)}>+</button></span>
              <span style={{ opacity: 0.85 }}>{money(p.price * p.qty)}</span>
              <span style={{ textAlign: "right" }}><span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 9px", border: `1px solid ${border}`, color: col }}>{status}</span></span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Agente IA ──────────────────────────────────────────────────────────

type AgentMetrics = { messages_in: number; messages_out: number; bookings: number; cancellations: number; handoffs: number; errors: number; cost_usd: number; avg_latency_ms: number };
type AgentEvent = { event_type: string; conversation_id: number | null; phone: string | null; created_at: string };

const EVENT_LABELS: Record<string, { label: string; dot: string }> = {
  booking_created: { label: "Reserva", dot: "#25D366" },
  booking_cancelled: { label: "Cancelación", dot: "#ff7a7a" },
  booking_rescheduled: { label: "Reagenda", dot: "#7cc6ff" },
  handoff: { label: "Handoff", dot: "#ffcf66" },
  rate_limited: { label: "Rate limit", dot: "rgba(255,255,255,0.5)" },
  error: { label: "Error", dot: "#ff7a7a" },
};

function IA() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(() => getCached<AgentMetrics>("/agent/metrics"));
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<AgentMetrics>("/agent/metrics").then(setMetrics).catch((e) => setError(e.message));
    api<AgentEvent[]>("/agent/events").then(setEvents).catch(() => {});
  }, []);

  if (error) return <ErrorBox msg={error} />;
  if (!metrics) return <SkKpis n={6} />;

  const automated = Number(metrics.messages_out);
  const handled = automated + Number(metrics.handoffs);
  const autoPct = handled ? Math.round((automated / handled) * 100) : 100;
  const kpis = [
    { label: "Mensajes respondidos", value: String(metrics.messages_out) },
    { label: "Reservas por IA", value: String(metrics.bookings) },
    { label: "Cancelaciones por IA", value: String(metrics.cancellations) },
    { label: "Costo LLM (30d)", value: `US$ ${Number(metrics.cost_usd).toFixed(2)}` },
  ];

  return (
    <>
      <div className="adm-kpis" style={{ marginTop: 28 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...CARD, padding: "20px 22px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{k.label}</div>
            <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 30 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div className="adm-grid" style={{ marginTop: 18, "--cols": "1fr 1.3fr" } as React.CSSProperties}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Automatización</div>
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", background: `conic-gradient(#25D366 0 ${autoPct}%, rgba(255,255,255,0.12) ${autoPct}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: SERIF, fontSize: 24, color: "#25D366" }}>{autoPct}%</span><span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.5 }}>por IA</span>
              </div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.75, minWidth: 180, flex: 1 }}>
              El agente responde por WhatsApp leyendo la agenda en tiempo real. Latencia promedio: {Math.round(Number(metrics.avg_latency_ms) / 1000)}s · Handoffs: {metrics.handoffs} · Errores: {metrics.errors}.
            </div>
          </div>
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 18 }}>Actividad reciente del agente</div>
          {events.map((f, i) => {
            const meta = EVENT_LABELS[f.event_type] ?? { label: f.event_type, dot: "#888" };
            return (
              <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.dot, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14 }}>{meta.label}{f.phone ? ` · ${f.phone}` : ""}{f.conversation_id ? ` · conv ${f.conversation_id}` : ""}</div>
                  <div style={{ fontSize: 11, opacity: 0.45, marginTop: 3 }}>{new Date(f.created_at).toLocaleString(site.locale)}</div>
                </div>
              </div>
            );
          })}
          {events.length === 0 && <div style={{ opacity: 0.4, fontSize: 14 }}>Sin actividad todavía.</div>}
        </div>
      </div>
    </>
  );
}

// ── Conversaciones ─────────────────────────────────────────────────────

type Convo = { id: number; status: string; name: string; phone: string; unread: number; last_activity_at: number | null; assignee: string | null; labels: string[] };
type Msg = { id: number; content: string | null; from: string; private: boolean; created_at: number };
type ConvoCustomer = { phone: string | null; name: string | null; visits: number; spent: number; upcoming: { starts_at: string; service: string; barber: string }[] };

const STATUS_META: Record<string, { label: string; color: string }> = {
  bot: { label: "Bot atendiendo", color: "#7cc6ff" },
  pendiente: { label: "Pendiente", color: "#ffcf66" },
  humano: { label: "Atendido por humano", color: "#7ee0a8" },
  resuelta: { label: "Resuelta", color: "rgba(255,255,255,0.5)" },
  abandonado: { label: "Abandonado", color: "#e0a86a" },
  descartado: { label: "Descartado", color: "rgba(255,120,120,0.7)" },
  archivado: { label: "Archivado", color: "rgba(255,255,255,0.4)" },
};

function Conversaciones() {
  const [convos, setConvos] = useState<Convo[] | null>(() => getCached<Convo[]>("/conversations"));
  const [filter, setFilter] = useState("Todas");
  const [selId, setSelId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [customer, setCustomer] = useState<ConvoCustomer | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const FILTERS: Record<string, string | null> = { Todas: null, Pendientes: "pendiente", Bot: "bot", Humano: "humano", Resueltas: "resuelta", Abandonadas: "abandonado", Descartadas: "descartado", Archivadas: "archivado" };
  const backendStatus = FILTERS[filter];
  const loadList = useCallback(() => {
    const q = backendStatus ? `?status=${backendStatus}` : "";
    api<Convo[]>(`/conversations${q}`).then(setConvos).catch((e) => setError(e.message));
  }, [backendStatus]);
  useEffect(loadList, [loadList]);

  const loadThread = useCallback((id: number) => {
    api<Msg[]>(`/conversations/${id}/messages`).then(setMsgs).catch(() => setMsgs([]));
    api<ConvoCustomer>(`/conversations/${id}/customer`).then(setCustomer).catch(() => setCustomer(null));
  }, []);

  function select(id: number) {
    setSelId(id);
    loadThread(id);
  }

  async function action(path: string) {
    if (selId == null) return;
    try {
      await api(`/conversations/${selId}/${path}`, { method: "POST" });
      loadList();
      loadThread(selId);
    } catch (e) { setError((e as Error).message); }
  }
  async function send() {
    if (selId == null || !draft.trim()) return;
    try {
      await api(`/conversations/${selId}/messages`, { method: "POST", body: JSON.stringify({ content: draft.trim() }) });
      setDraft("");
      loadList();
      loadThread(selId);
    } catch (e) { setError((e as Error).message); }
  }

  const list = (convos ?? []).filter((c) => !backendStatus || c.status === backendStatus);
  const active = (convos ?? []).find((c) => c.id === selId) || null;

  if (error) return <ErrorBox msg={error} />;
  if (convos === null) return <SkTable rows={7} cols={4} />;

  return (
    <div style={{ marginTop: 24, overflowX: "auto", ...CARD }}>
      <div style={{ minWidth: 940, display: "grid", gridTemplateColumns: "320px 1fr 260px", height: 620, overflow: "hidden" }}>
        {/* lista */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", gap: 6, padding: 14, borderBottom: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap" }}>
            {Object.keys(FILTERS).map((f) => (
              <button type="button" key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} style={{ fontSize: 11, letterSpacing: "0.06em", padding: "5px 11px", cursor: "pointer", background: filter === f ? "#fff" : "transparent", color: filter === f ? "#0a0a0a" : "rgba(255,255,255,0.78)", border: "1px solid rgba(255,255,255,0.28)", fontFamily: SANS }}>{f}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {list.map((c) => {
              const m = STATUS_META[c.status] ?? STATUS_META.bot;
              const sel = c.id === selId;
              return (
                <button type="button" key={c.id} aria-pressed={sel} onClick={() => select(c.id)} style={{ width: "100%", display: "flex", gap: 12, padding: "14px 16px", border: 0, borderBottom: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", background: sel ? "rgba(255,255,255,0.08)" : "transparent", color: "#fff", borderLeft: `2px solid ${sel ? "#fff" : "transparent"}`, fontFamily: SANS, textAlign: "left" }}>
                  <span style={{ width: 42, height: 42, borderRadius: "50%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 15, flexShrink: 0 }}>{initials(c.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                      {c.unread > 0 && <span style={{ background: "#25D366", color: "#0a0a0a", fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{c.unread}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}>
                      <Dot color={m.color} size={6} />{m.label}{c.assignee ? ` · ${c.assignee}` : ""}
                    </div>
                  </div>
                </button>
              );
            })}
            {list.length === 0 && <div style={{ padding: 24, opacity: 0.5, fontSize: 13 }}>Sin conversaciones.</div>}
          </div>
        </div>

        {/* thread */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
          {active ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{active.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>{active.phone}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: (STATUS_META[active.status] ?? STATUS_META.bot).color }}>
                    <Dot color={(STATUS_META[active.status] ?? STATUS_META.bot).color} />{(STATUS_META[active.status] ?? STATUS_META.bot).label}
                  </span>
                  {active.status === "archivado" ? (
                    <button className="miniact" onClick={() => action("unarchive")}>Desarchivar</button>
                  ) : (
                    <button className="miniact" onClick={() => action("archive")}>Archivar</button>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14, minHeight: 0, background: "#0c0c0c" }}>
                {msgs.map((msg) => {
                  const isClient = msg.from === "client";
                  const isAgent = msg.from === "agent";
                  return (
                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isClient ? "flex-start" : "flex-end", maxWidth: "74%", alignSelf: isClient ? "flex-start" : "flex-end" }}>
                      <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: isClient ? "rgba(255,255,255,0.5)" : isAgent ? "#7ee0a8" : "#7cc6ff", marginBottom: 4 }}>{isClient ? active.name : isAgent ? "Equipo" : `Bot ${site.shortName}`}</div>
                      <div style={{ background: isClient ? "#161616" : isAgent ? "#25422f" : "#1d2c3a", border: `1px solid ${isClient ? "rgba(255,255,255,0.1)" : isAgent ? "rgba(126,224,168,0.3)" : "rgba(124,198,255,0.3)"}`, padding: "11px 14px", fontSize: 14, lineHeight: 1.45 }}>{msg.content}</div>
                      <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>{new Date(msg.created_at * 1000).toLocaleString(site.locale)}</div>
                    </div>
                  );
                })}
                {msgs.length === 0 && <div style={{ opacity: 0.4, fontSize: 13 }}>Sin mensajes.</div>}
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "14px 16px" }}>
                {active.status === "humano" ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input aria-label={`Mensaje para ${active.name}`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Escribí un mensaje…" style={{ flex: 1, minWidth: 180, background: "#161616", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontFamily: SANS, fontSize: 14, padding: "12px 14px", outline: "none" }} />
                    <button className="miniact" onClick={send} style={{ background: "#25D366", color: "#0a0a0a", borderColor: "#25D366" }}>Enviar</button>
                    <button className="miniact" onClick={() => action("resolve")}>Resolver</button>
                    <button className="miniact" onClick={() => action("return-to-bot")}>Volver al bot</button>
                  </div>
                ) : active.status === "resuelta" ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                    <span style={{ fontSize: 12.5, opacity: 0.6 }}>Conversación resuelta.</span>
                    <button className="miniact" onClick={() => action("takeover")}>Reabrir y responder</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                    <span style={{ fontSize: 12.5, opacity: 0.6 }}>El bot está atendiendo. Tomá la conversación para responder vos.</span>
                    <button className="miniact" onClick={() => action("takeover")} style={{ borderColor: "#7ee0a8", color: "#7ee0a8", whiteSpace: "nowrap" }}>Tomar conversación</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.4, fontSize: 14 }}>Elegí una conversación.</div>
          )}
        </div>

        {/* ficha */}
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.12)", padding: 20, overflowY: "auto", minHeight: 0 }}>
          {active && customer && (
            <>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>Ficha del cliente</div>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                {[["Nombre", customer.name || "—"], ["Visitas", String(customer.visits)], ["Gastado", money(Number(customer.spent))]].map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.45 }}>{l}</div><div style={{ fontSize: 15, marginTop: 3 }}>{v}</div></div>
                ))}
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.45, marginBottom: 8 }}>Próximos turnos</div>
                  {customer.upcoming.length === 0 && <div style={{ fontSize: 13, opacity: 0.5 }}>—</div>}
                  {customer.upcoming.map((u, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>{fmtDate(u.starts_at)} {fmtTime(u.starts_at)} · {u.service} con {u.barber}</div>
                  ))}
                </div>
                <div style={{ marginTop: 6, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <Link href="/agendar" className="miniact" style={{ display: "inline-block", textDecoration: "none" }}>Crear turno</Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Administración ─────────────────────────────────────────────────────

type Barber = { id: string; slug: string; name: string; role: string; active: boolean };
type Service = { id: string; slug: string; name: string; price: number; variable_price: boolean };
type Admin = { id: string; email: string; name: string; role: string; active: boolean };
type Settings = { agenda_open: boolean; booking_channels: { web: boolean; whatsapp: boolean }; slot_granularity_min: number; min_lead_minutes: number; max_days_ahead: number };

type SiteProfile = {
  name: string; short_name: string; tagline: string; city: string; description: string;
  phone_display: string; whatsapp: string; instagram: string; email: string; address: string;
  maps_query: string; directions: string; payment_methods: string[]; payment_notes: string;
  cancellation_notice_min: number; cancellation_notes: string; online_store_url: string | null;
};
type ScheduleRule = { dow: number; opens_at: string; closes_at: string; barber_slug: string | null };

const PROFILE_INPUT: React.CSSProperties = { width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "inherit", padding: "10px 12px", fontSize: 14, fontFamily: SANS };

const PROFILE_FIELDS: { key: keyof SiteProfile; label: string; long?: boolean }[] = [
  { key: "name", label: "Nombre" },
  { key: "short_name", label: "Nombre corto" },
  { key: "tagline", label: "Tagline" },
  { key: "city", label: "Ciudad" },
  { key: "description", label: "Descripción", long: true },
  { key: "phone_display", label: "Teléfono" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "email", label: "Email" },
  { key: "address", label: "Dirección" },
  { key: "maps_query", label: "Búsqueda en Maps" },
  { key: "directions", label: "Cómo llegar", long: true },
  { key: "payment_methods", label: "Medios de pago (separados por coma)" },
  { key: "payment_notes", label: "Notas de pago" },
  { key: "cancellation_notice_min", label: "Aviso de cancelación (min)" },
  { key: "cancellation_notes", label: "Notas de cancelación" },
  { key: "online_store_url", label: "URL tienda online" },
];

function profileToDraft(p: SiteProfile): Record<string, string> {
  const d: Record<string, string> = {};
  for (const f of PROFILE_FIELDS) {
    const v = p[f.key];
    d[f.key] = Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v);
  }
  return d;
}

function PerfilSitio() {
  const [profile, setProfile] = useState<SiteProfile | null>(() => getCached<SiteProfile>("/site-profile"));
  const [draft, setDraft] = useState<Record<string, string> | null>(profile ? profileToDraft(profile) : null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<SiteProfile>("/site-profile").then((p) => { setProfile(p); setDraft(profileToDraft(p)); }).catch((e) => setMsg(e.message));
  }, []);

  if (!profile || !draft) return <div style={{ ...CARD, padding: 24, gridColumn: "1 / -1" }}><Sk h={220} /></div>;

  const dirty = PROFILE_FIELDS.some((f) => draft[f.key] !== profileToDraft(profile)[f.key]);

  async function save() {
    if (!profile || !draft) return;
    const base = profileToDraft(profile);
    const values: Record<string, unknown> = {};
    for (const f of PROFILE_FIELDS) {
      if (draft[f.key] === base[f.key]) continue;
      const raw = draft[f.key].trim();
      if (f.key === "payment_methods") values[f.key] = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
      else if (f.key === "cancellation_notice_min") values[f.key] = Math.max(0, Math.round(Number(raw) || 0));
      else if (f.key === "online_store_url") values[f.key] = raw || null;
      else values[f.key] = raw;
    }
    setSaving(true); setMsg("");
    try {
      const updated = await api<SiteProfile>("/site-profile", { method: "PATCH", body: JSON.stringify({ values }) });
      setProfile(updated); setDraft(profileToDraft(updated)); setMsg("Guardado. El sitio público refleja el cambio.");
    } catch (e) { setMsg((e as Error).message); } finally { setSaving(false); }
  }

  return (
    <div style={{ ...CARD, padding: 24, gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Perfil del sitio</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {msg && <span style={{ fontSize: 12, opacity: 0.6 }}>{msg}</span>}
          <button className="miniact" disabled={!dirty || saving} style={{ opacity: dirty && !saving ? 1 : 0.4 }} onClick={save}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {PROFILE_FIELDS.map((f) => (
          <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: f.long ? "1 / -1" : undefined }}>
            <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5 }}>{f.label}</span>
            {f.long ? (
              <textarea rows={3} style={{ ...PROFILE_INPUT, resize: "vertical" }} value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
            ) : (
              <input style={PROFILE_INPUT} value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function HorarioSemanal() {
  // Edita solo el horario general del local (barber_slug null); las reglas
  // por profesional se preservan al hacer el PUT (el endpoint reemplaza todo).
  const [rules, setRules] = useState<ScheduleRule[] | null>(() => getCached<ScheduleRule[]>("/schedule-rules"));
  const [draft, setDraft] = useState<Record<number, { open: boolean; opens: string; closes: string }> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const toDraft = (rs: ScheduleRule[]) => {
    const d: Record<number, { open: boolean; opens: string; closes: string }> = {};
    for (let dow = 0; dow < 7; dow++) {
      const r = rs.find((x) => x.barber_slug === null && x.dow === dow);
      d[dow] = r ? { open: true, opens: r.opens_at.slice(0, 5), closes: r.closes_at.slice(0, 5) } : { open: false, opens: "10:00", closes: "20:00" };
    }
    return d;
  };

  useEffect(() => {
    api<ScheduleRule[]>("/schedule-rules").then((rs) => { setRules(rs); setDraft(toDraft(rs)); }).catch((e) => setMsg(e.message));
  }, []);

  if (!rules || !draft) return <div style={{ ...CARD, padding: 24 }}><Sk h={180} /></div>;

  async function save() {
    if (!rules || !draft) return;
    const local = Object.entries(draft)
      .filter(([, v]) => v.open)
      .map(([dow, v]) => ({ dow: Number(dow), opens_at: v.opens, closes_at: v.closes, barber: null as string | null }));
    const perBarber = rules
      .filter((r) => r.barber_slug !== null)
      .map((r) => ({ dow: r.dow, opens_at: r.opens_at.slice(0, 5), closes_at: r.closes_at.slice(0, 5), barber: r.barber_slug }));
    setSaving(true); setMsg("");
    try {
      const updated = await api<ScheduleRule[]>("/schedule-rules", { method: "PUT", body: JSON.stringify({ rules: [...local, ...perBarber] }) });
      setRules(updated); setDraft(toDraft(updated)); setMsg("Horario guardado.");
    } catch (e) { setMsg((e as Error).message); } finally { setSaving(false); }
  }

  const ORDER = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div style={{ ...CARD, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Horario semanal del local</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {msg && <span style={{ fontSize: 12, opacity: 0.6 }}>{msg}</span>}
          <button className="miniact" disabled={saving} onClick={save}>{saving ? "Guardando…" : "Guardar horario"}</button>
        </div>
      </div>
      {ORDER.map((dow) => {
        const d = draft[dow];
        return (
          <div key={dow} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, width: 120, fontSize: 13, textTransform: "capitalize", cursor: "pointer" }}>
              <input type="checkbox" checked={d.open} onChange={(e) => setDraft({ ...draft, [dow]: { ...d, open: e.target.checked } })} />
              {DOW[dow]}
            </label>
            {d.open ? (
              <>
                <input type="time" style={{ ...PROFILE_INPUT, width: 110, padding: "6px 8px" }} value={d.opens} onChange={(e) => setDraft({ ...draft, [dow]: { ...d, opens: e.target.value } })} />
                <span style={{ opacity: 0.4 }}>→</span>
                <input type="time" style={{ ...PROFILE_INPUT, width: 110, padding: "6px 8px" }} value={d.closes} onChange={(e) => setDraft({ ...draft, [dow]: { ...d, closes: e.target.value } })} />
              </>
            ) : (
              <span style={{ fontSize: 12, opacity: 0.4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Cerrado</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Ajustes() {
  const [staff, setStaff] = useState<Barber[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Barber[]>("/barbers").then(setStaff).catch((e) => setError(e.message));
    api<Service[]>("/services").then(setServices).catch(() => {});
    api<Admin[]>("/admins").then(setAdmins).catch(() => {});
    api<Settings>("/settings").then(setSettings).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function mut(fn: () => Promise<unknown>) {
    try { await fn(); load(); } catch (e) { alert((e as Error).message); }
  }

  if (error) return <ErrorBox msg={error} />;
  if (staff === null) return <SkTable rows={5} cols={3} />;

  return (
    <div className="adm-grid" style={{ marginTop: 28 }}>
      <div style={{ ...CARD, padding: 24, gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Personal · {staff.filter((p) => p.active).length} activos</div>
          <button className="miniact" onClick={() => {
            const name = prompt("Nombre del nuevo profesional:");
            if (!name) return;
            const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
            const role = prompt("Rol (BARBERO / ESTILISTA):", "BARBERO") || "BARBERO";
            mut(() => api("/barbers", { method: "POST", body: JSON.stringify({ slug, name, role: role.toUpperCase() }) }));
          }}>+ Agregar profesional</button>
        </div>
        <div className="adm-staff">
          {staff.map((p) => (
            <div key={p.id} style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 16, display: "flex", flexDirection: "column", gap: 12, opacity: p.active ? 1 : 0.55 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 15 }}>{initials(p.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1 }}>{p.name}</div><div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5, marginTop: 3 }}>{p.role}</div></div>
                <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: p.active ? "#7ee0a8" : "rgba(255,255,255,0.4)" }}>{p.active ? "Activo" : "Inactivo"}</span>
              </div>
              <button className="miniact" onClick={() => mut(() => api(`/barbers/${p.id}`, { method: "PATCH", body: JSON.stringify({ active: !p.active }) }))}>{p.active ? "Desactivar" : "Activar"}</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...CARD, padding: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 18 }}>Precios de servicios</div>
        {services.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", gap: 10 }}>
            <span style={{ fontSize: 14 }}>{s.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: SERIF, fontSize: 18, minWidth: 96, textAlign: "right" }}>{s.variable_price ? `desde ${money(s.price)}` : money(s.price)}</span>
              <button className="miniact" onClick={() => {
                const raw = prompt(`Nuevo precio para ${s.name} (actual ${money(s.price)}):`, String(s.price));
                if (raw === null) return;
                const np = Math.round(Number(raw.replace(/[^\d]/g, "")));
                if (!np || np <= 0) { alert("Precio inválido"); return; }
                api(`/services/${s.id}/price`, { method: "PATCH", body: JSON.stringify({ new_price: np }) }).then(load).catch((e) => alert(e.message));
              }}>Editar</button>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.4 }}>Podés fijar cualquier precio. Cada cambio queda auditado.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Usuarios admin</div>
            <button className="miniact" onClick={() => {
              const email = prompt("Email del nuevo admin:");
              if (!email) return;
              const name = prompt("Nombre:") || email.split("@")[0];
              mut(() => api("/admins", { method: "POST", body: JSON.stringify({ email, name }) }));
            }}>+ Invitar</button>
          </div>
          {admins.filter((a) => a.active).map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15 }}>{a.name || a.email}</div><div style={{ fontSize: 12, opacity: 0.5 }}>{a.email}</div></div>
              <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: a.role === "owner" ? "#ffcf66" : "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)", padding: "4px 9px" }}>{a.role}</span>
              {a.role !== "owner" && <button className="miniact dng" onClick={() => { if (confirm(`¿Quitar acceso admin a ${a.email}?`)) mut(() => api(`/admins/${a.id}`, { method: "DELETE" })); }}>Quitar</button>}
            </div>
          ))}
          {admins.filter((a) => a.active).length === 0 && <div style={{ fontSize: 13, opacity: 0.5 }}>Sin admins en la DB (rige el fallback ADMIN_EMAILS del backend).</div>}
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 16 }}>Canales de reserva</div>
          {settings && (["web", "whatsapp"] as const).map((ch) => {
            const on = settings.booking_channels[ch];
            return (
              <div key={ch} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div><div style={{ fontSize: 14 }}>Reservas por {ch === "web" ? "Web" : "WhatsApp"}</div><div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{on ? "Activado" : "Pausado"}</div></div>
                <button type="button" role="switch" aria-checked={on} aria-label={`Reservas por ${ch}`} onClick={() => mut(() => api("/settings", { method: "PATCH", body: JSON.stringify({ values: { booking_channels: { ...settings.booking_channels, [ch]: !on } } }) }))} style={{ width: 44, height: 24, border: 0, padding: 0, borderRadius: 12, background: on ? "#25D366" : "rgba(255,255,255,0.28)", position: "relative", cursor: "pointer", transition: "background .2s" }}>
                  <span style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                </button>
              </div>
            );
          })}
        </div>
        <HorarioSemanal />
      </div>
      <PerfilSitio />
    </div>
  );
}

// ── Disponibilidad ─────────────────────────────────────────────────────

type Block = { id: string; starts_at: string; ends_at: string; reason: string; barber: string | null };

function Disponibilidad() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [error, setError] = useState("");
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const load = useCallback(() => {
    api<Settings>("/settings").then(setSettings).catch((e) => setError(e.message));
    api<Block[]>("/blocks").then(setBlocks).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function mut(fn: () => Promise<unknown>) {
    try { await fn(); load(); } catch (e) { alert((e as Error).message); }
  }

  if (error) return <ErrorBox msg={error} />;
  if (!settings || blocks === null) return <SkTable rows={5} cols={2} />;

  const agendaOpen = settings.agenda_open;
  const { y, m } = view;
  const fd = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();

  // Días con bloqueo de local de día completo (para el toggle del calendario)
  const fullDayBlocks = new Map<string, Block>();
  for (const b of blocks) {
    if (b.barber) continue;
    const s = new Date(b.starts_at);
    const e = new Date(b.ends_at);
    if (e.getTime() - s.getTime() >= 23 * 3600 * 1000) fullDayBlocks.set(dateKey(s), b);
  }

  function toggleDay(key: string) {
    const existing = fullDayBlocks.get(key);
    if (existing) {
      mut(() => api(`/blocks/${existing.id}`, { method: "DELETE" }));
    } else {
      mut(() =>
        api("/blocks", {
          method: "POST",
          body: JSON.stringify({ starts_at: `${key}T00:00:00-03:00`, ends_at: `${key}T23:59:59-03:00`, reason: "Cerrado" }),
        })
      );
    }
  }

  return (
    <>
      <div style={{ marginTop: 28, ...CARD, padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1 }}>Estado general de la agenda</div>
          <div style={{ marginTop: 8, fontSize: 13, color: agendaOpen ? "#7ee0a8" : "#ff7a7a" }}>{agendaOpen ? "Agenda abierta" : "Agenda cerrada — no se aceptan reservas"}</div>
        </div>
        <button type="button" role="switch" aria-checked={agendaOpen} aria-label="Agenda abierta" onClick={() => mut(() => api("/settings", { method: "PATCH", body: JSON.stringify({ values: { agenda_open: !agendaOpen } }) }))} style={{ width: 58, height: 30, border: 0, padding: 0, borderRadius: 15, background: agendaOpen ? "#25D366" : "rgba(255,255,255,0.28)", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 3, left: agendaOpen ? 31 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
        </button>
      </div>
      <div style={{ marginTop: 16, ...CARD, padding: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 4 }}>Parámetros de reserva</div>
        <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 18 }}>Controlan cómo se generan los horarios disponibles en el sitio.</div>
        {([
          { key: "slot_granularity_min", label: "Granularidad de turnos", sub: "cada cuántos minutos hay un horario", unit: "min", min: 5, max: 120 },
          { key: "min_lead_minutes", label: "Anticipación mínima", sub: "tiempo mínimo antes del turno para reservar", unit: "min", min: 0, max: 1440 },
          { key: "max_days_ahead", label: "Ventana de reserva", sub: "hasta cuántos días hacia adelante se puede reservar", unit: "días", min: 1, max: 365 },
        ] as const).map((f) => (
          <div key={f.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>{f.label}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{f.sub}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: SERIF, fontSize: 18 }}>{settings[f.key]} {f.unit}</span>
              <button className="miniact" onClick={() => {
                const raw = prompt(`${f.label} (${f.unit}) — actual ${settings[f.key]}:`, String(settings[f.key]));
                if (raw === null) return;
                const val = Math.round(Number(raw));
                if (!Number.isFinite(val) || val < f.min || val > f.max) { alert(`Valor fuera de rango (${f.min}–${f.max})`); return; }
                mut(() => api("/settings", { method: "PATCH", body: JSON.stringify({ values: { [f.key]: val } }) }));
              }}>Editar</button>
            </div>
          </div>
        ))}
      </div>
      <div className="adm-grid" style={{ marginTop: 16, "--cols": "1.1fr 1fr" } as React.CSSProperties}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Días cerrados</div>
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>Tocá un día para cerrarlo (o reabrirlo). Los domingos ya están cerrados por horario.</div>
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button className="qbtn" aria-label="Mes anterior" onClick={() => setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: v.m === 0 ? 11 : v.m - 1 }))}>‹</button>
            <span style={{ fontFamily: SERIF, fontSize: 20, textTransform: "capitalize" }}>{`${MONTHS[m]} ${y}`}</span>
            <button className="qbtn" aria-label="Mes siguiente" onClick={() => setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: v.m === 11 ? 0 : v.m + 1 }))}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, textAlign: "center", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {Array.from({ length: fd }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: dim }).map((_, idx) => {
              const d = idx + 1;
              const key = dateKey(new Date(y, m, d));
              const blocked = fullDayBlocks.has(key);
              return (
                <button type="button" key={d} aria-pressed={blocked} aria-label={`${blocked ? "Reabrir" : "Cerrar"} ${d} de ${MONTHS[m]}`} onClick={() => toggleDay(key)} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: blocked ? "rgba(255,90,90,0.22)" : "transparent", color: blocked ? "#ff9a9a" : "#fff", cursor: "pointer", border: `1px solid ${blocked ? "rgba(255,90,90,0.75)" : "rgba(255,255,255,0.18)"}`, fontFamily: SANS }}>{d}</button>
              );
            })}
          </div>
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Bloqueos puntuales</div>
            <button className="miniact" onClick={() => {
              const reason = prompt("Motivo del bloqueo (ej: Feriado, Vacaciones):");
              if (!reason) return;
              const from = prompt("Desde (YYYY-MM-DD HH:MM):");
              if (!from) return;
              const to = prompt("Hasta (YYYY-MM-DD HH:MM):");
              if (!to) return;
              const barber = prompt("Slug del profesional (vacío = todo el local):", "") || null;
              mut(() => api("/blocks", { method: "POST", body: JSON.stringify({ barber, reason, starts_at: `${from.replace(" ", "T")}:00-03:00`, ends_at: `${to.replace(" ", "T")}:00-03:00` }) }));
            }}>+ Agregar bloqueo</button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.5, marginBottom: 16 }}>Cerrá franjas específicas: desde una hora puntual hasta varios meses (feriados, vacaciones, eventos). Por profesional o todo el local.</div>
          {blocks.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff7a7a", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15 }}>{b.reason || "Bloqueo"}{b.barber ? ` · ${b.barber}` : " · Todo el local"}</div>
                <div style={{ fontSize: 12, opacity: 0.55, marginTop: 3 }}>{fmtDate(b.starts_at)} {fmtTime(b.starts_at)} → {fmtDate(b.ends_at)} {fmtTime(b.ends_at)}</div>
              </div>
              <button className="miniact dng" onClick={() => mut(() => api(`/blocks/${b.id}`, { method: "DELETE" }))}>Quitar</button>
            </div>
          ))}
          {blocks.length === 0 && <div style={{ fontSize: 13, opacity: 0.5 }}>Sin bloqueos activos.</div>}
        </div>
      </div>
    </>
  );
}
