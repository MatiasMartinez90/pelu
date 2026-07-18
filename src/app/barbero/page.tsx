"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const SERIF = "var(--font-serif)";
const SANS = "var(--font-sans)";
const ars = new Intl.NumberFormat("es-AR");
const money = (n: number) => `$${ars.format(Math.round(n))}`;
const CARD = { border: "1px solid rgba(255,255,255,0.14)" } as const;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const curMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const monthLabel = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MONTHS[mm - 1]} ${y}`; };
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

async function api<T>(path: string): Promise<T | { __err: number }> {
  const res = await fetch(`/api/barber${path}`, { headers: { "content-type": "application/json" }, cache: "no-store" });
  if (res.status === 401) { window.location.href = "/login?callbackUrl=" + encodeURIComponent("/barbero"); return { __err: 401 }; }
  if (res.status === 403) return { __err: 403 };
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

type Appt = { id: string; starts_at: string; ends_at: string; status: string; price_at_booking: number; channel: string; customer: string; service: string };
type Stats = { month: string; barber: string; kpis: { revenue: number; appointments: number; completed: number; cancelled: number; customers: number }; top_services: { name: string; count: number }[] };

const statusLabel = (s: string) => (s === "completed" ? "Completado" : s === "cancelled" ? "Cancelado" : "Activo");

export default function BarberoPage() {
  const [forbidden, setForbidden] = useState(false);
  const [name, setName] = useState("");

  const [selDate, setSelDate] = useState(dateKey(new Date()));
  const [appts, setAppts] = useState<Appt[] | null>(null);
  const [selMonth, setSelMonth] = useState(curMonth());
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  const loadAgenda = useCallback(async () => {
    setAppts(null);
    const r = await api<Appt[]>(`/agenda?date=${selDate}`);
    if ("__err" in r) { if (r.__err === 403) setForbidden(true); return; }
    setAppts(r);
  }, [selDate]);

  const loadStats = useCallback(async () => {
    setStats(null);
    const r = await api<Stats>(`/stats?month=${selMonth}`);
    if ("__err" in r) { if (r.__err === 403) setForbidden(true); return; }
    setStats(r);
    setName(r.barber);
  }, [selMonth]);

  useEffect(() => {
    // Sincroniza la agenda con el backend al cambiar de fecha.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAgenda().catch((e) => setError((e as Error).message));
  }, [loadAgenda]);
  useEffect(() => {
    // Sincroniza las métricas con el backend al cambiar de mes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats().catch((e) => setError((e as Error).message));
  }, [loadStats]);

  const sel = parseKey(selDate);
  const shiftDay = (d: number) => { const dt = parseKey(selDate); dt.setDate(dt.getDate() + d); setSelDate(dateKey(dt)); };
  const shiftMonth = (delta: number) => {
    const [y, m] = selMonth.split("-").map(Number);
    const dt = new Date(y, m - 1 + delta, 1);
    const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    if (next <= curMonth()) setSelMonth(next);
  };
  const atCurrent = selMonth >= curMonth();

  const active = (appts ?? []).filter((a) => a.status === "active");
  const dayTotal = active.reduce((s, a) => s + Number(a.price_at_booking), 0);
  const maxSvc = useMemo(() => Math.max(1, ...(stats?.top_services ?? []).map((s) => Number(s.count))), [stats]);

  if (forbidden) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, textAlign: "center" }}>
        <span style={{ fontFamily: SERIF, fontSize: 48 }}>NOX</span>
        <p style={{ opacity: 0.7, maxWidth: 420 }}>Esta sección es para barberos del equipo. Si sos parte del equipo y ves esto, pedile al admin que vincule tu email.</p>
        <Link href="/" className="nox-btn">Volver al sitio</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <header className="acct-top">
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <Link href="/" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 24, color: "#fff" }}>NOX</Link>
          <span style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.5 }}>Barbero</span>
        </div>
        {name && <div style={{ fontSize: 14, opacity: 0.8 }}>{name}</div>}
      </header>

      <div className="acct-wrap">
        {error && <div style={{ marginTop: 20, border: "1px solid rgba(255,120,120,0.5)", background: "rgba(255,90,90,0.08)", color: "#ffb3b3", padding: "14px 18px", fontSize: 14 }}>{error}</div>}

        {/* Agenda */}
        <h1 style={{ marginTop: 20, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(34px,5vw,54px)", lineHeight: 0.95 }}>Mi agenda</h1>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", ...CARD, padding: "12px 16px" }}>
          <button className="qbtn" aria-label="Día anterior" onClick={() => shiftDay(-1)} style={{ fontSize: 17 }}>‹</button>
          <div style={{ fontFamily: SERIF, fontSize: 22, textTransform: "capitalize", minWidth: 210 }}>{`${DOW[sel.getDay()]} ${sel.getDate()} ${MONTHS[sel.getMonth()]}`}</div>
          <button className="qbtn" aria-label="Día siguiente" onClick={() => shiftDay(1)} style={{ fontSize: 17 }}>›</button>
          <button className="miniact" onClick={() => setSelDate(dateKey(new Date()))}>Hoy</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 20, fontSize: 13, opacity: 0.75 }}>
            <span>{active.length} turno{active.length !== 1 ? "s" : ""}</span>
            <span>{money(dayTotal)}</span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          {!appts && <div style={{ opacity: 0.5, padding: 10 }}>Cargando…</div>}
          {appts && appts.length === 0 && <div style={{ opacity: 0.4, padding: 20, ...CARD }}>Sin turnos este día.</div>}
          {(appts ?? []).map((a) => {
            const cancel = a.status === "cancelled";
            return (
              <div key={a.id} className="barber-appt-row" style={{ opacity: cancel ? 0.45 : 1 }}>
                <span style={{ fontFamily: SERIF, fontSize: 18 }}>{fmtTime(a.starts_at)}</span>
                <div>
                  <div style={{ fontSize: 15 }}>{a.customer}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{a.service}</div>
                </div>
                <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 9px", border: `1px solid ${cancel ? "rgba(255,90,90,0.5)" : "rgba(255,255,255,0.25)"}`, color: cancel ? "#ff7a7a" : "rgba(255,255,255,0.8)" }}>{statusLabel(a.status)}</span>
                <span style={{ fontFamily: SERIF, fontSize: 16, minWidth: 80, textAlign: "right" }}>{money(Number(a.price_at_booking))}</span>
              </div>
            );
          })}
        </div>

        {/* Estadísticas */}
        <h2 style={{ marginTop: 48, fontFamily: SERIF, fontWeight: 600, fontSize: 32 }}>Mis estadísticas</h2>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", ...CARD, padding: "12px 16px" }}>
          <button className="qbtn" aria-label="Mes anterior" onClick={() => shiftMonth(-1)} style={{ fontSize: 17 }}>‹</button>
          <div style={{ fontFamily: SERIF, fontSize: 22, textTransform: "capitalize", minWidth: 170 }}>{monthLabel(selMonth)}</div>
          <button className="qbtn" aria-label="Mes siguiente" onClick={() => shiftMonth(1)} disabled={atCurrent} style={{ fontSize: 17, opacity: atCurrent ? 0.3 : 1, cursor: atCurrent ? "default" : "pointer" }}>›</button>
          {!atCurrent && <button className="miniact" onClick={() => setSelMonth(curMonth())}>Mes actual</button>}
        </div>

        {!stats && <div style={{ opacity: 0.5, padding: 10, marginTop: 10 }}>Cargando…</div>}
        {stats && (
          <>
            <div className="adm-kpis" style={{ marginTop: 14, gap: 14 }}>
              {[
                { label: "Ingresos", value: money(Number(stats.kpis.revenue)) },
                { label: "Completados", value: String(stats.kpis.completed) },
                { label: "Cancelados", value: String(stats.kpis.cancelled) },
                { label: "Clientes", value: String(stats.kpis.customers) },
              ].map((x) => (
                <div key={x.label} style={{ ...CARD, padding: "20px 22px" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{x.label}</div>
                  <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{x.value}</div>
                </div>
              ))}
            </div>
            <div style={{ ...CARD, padding: 22, marginTop: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 18 }}>Servicios más pedidos</div>
              {stats.top_services.map((s) => (
                <div key={s.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span>{s.name}</span><span style={{ opacity: 0.6 }}>{s.count}</span></div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.1)" }}><div style={{ height: "100%", width: `${Math.round((Number(s.count) / maxSvc) * 100)}%`, background: "#fff" }} /></div>
                </div>
              ))}
              {stats.top_services.length === 0 && <div style={{ opacity: 0.4, fontSize: 14 }}>Sin datos este mes.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
