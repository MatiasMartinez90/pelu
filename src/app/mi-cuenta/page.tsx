"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { money, site } from "@/lib/site";

const SERIF = "var(--font-serif)";
const SANS = "var(--font-sans)";

function Dot({ green }: { green: boolean }) {
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: green ? "#25D366" : "rgba(255,255,255,0.6)", display: "inline-block" }} />;
}

type Booking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;      // active | completed | cancelled
  price_at_booking: number;
  channel: string;     // whatsapp | web
  barber: string;
  service: string;
};
type MeBookings = { email: string; name: string; upcoming: Booking[]; history: Booking[] };

const isWa = (ch: string) => ch?.toLowerCase() === "whatsapp";
const chLabel = (ch: string) => (isWa(ch) ? "WhatsApp" : "Web");
const statusLabel = (s: string) => (s === "completed" ? "Completado" : s === "cancelled" ? "Cancelado" : "Confirmado");
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(site.locale);
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString(site.locale, { weekday: "long", day: "2-digit", month: "2-digit" })} · ${d.toLocaleTimeString(site.locale, { hour: "2-digit", minute: "2-digit" })} hs`;
};
const daysUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
const firstName = (n: string, email: string) => (n?.trim()?.split(" ")[0] || email?.split("@")[0] || "");

export default function MiCuentaPage() {
  const [data, setData] = useState<MeBookings | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/bookings", { headers: { "content-type": "application/json" }, cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/mi-cuenta");
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // Sincroniza los turnos privados con el backend autenticado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Próximo turno = el activo futuro más cercano.
  const next = useMemo(() => {
    const up = (data?.upcoming ?? []).slice().sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
    return up[0] ?? null;
  }, [data]);

  const history = data?.history ?? [];
  const completed = history.filter((h) => h.status === "completed");
  const invertido = completed.reduce((s, h) => s + Number(h.price_at_booking), 0);
  const cabecera = (() => {
    const c: Record<string, number> = {};
    completed.forEach((h) => { c[h.barber] = (c[h.barber] ?? 0) + 1; });
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], visits: top[1] } : null;
  })();

  const filtered = history.filter((h) => filter === "Todos" || chLabel(h.channel) === filter);

  const stats = [
    { label: "Turnos completados", value: String(completed.length), sub: "histórico" },
    { label: "Profesional de cabecera", value: cabecera?.name ?? "—", sub: cabecera ? `${cabecera.visits} visita${cabecera.visits > 1 ? "s" : ""}` : "sin datos" },
    { label: "Invertido", value: money(invertido), sub: "histórico" },
    { label: "Próximos turnos", value: String(data?.upcoming?.length ?? 0), sub: "agendados" },
  ];

  async function cancelNext() {
    if (!next) return;
    if (!confirm(`¿Cancelar tu turno de ${next.service} — ${fmtDateTime(next.starts_at)}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/me/bookings/${next.id}/cancel`, { method: "POST", headers: { "content-type": "application/json" } });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error((typeof b?.detail === "object" ? b.detail?.message : b?.detail) || `Error ${res.status}`);
      }
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const greeting = data ? firstName(data.name, data.email) : "";

  async function linkWhatsapp() {
    try {
      const res = await fetch("/api/me/link/whatsapp/start", { method: "POST", headers: { "content-type": "application/json" } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const { code } = (await res.json()) as { code: string };
      window.open(`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(code)}`, "_blank");
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <header className="acct-top">
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <Link href="/" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 24, color: "#fff" }}>{site.shortName}</Link>
          <span style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.5 }}>Mi Cuenta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {site.bookingEnabled && <Link href={site.bookingPath} className="nox-btn">{site.copy.bookingCta}</Link>}
        </div>
      </header>

      <div className="acct-wrap">
        <h1 style={{ marginTop: 14, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(44px,6vw,76px)", lineHeight: 0.9 }}>
          {greeting ? `Hola, ${greeting}` : "Mi cuenta"}
        </h1>

        {error && (
          <div style={{ marginTop: 22, border: "1px solid rgba(255,120,120,0.5)", background: "rgba(255,90,90,0.08)", color: "#ffb3b3", padding: "14px 18px", fontSize: 14 }}>{error}</div>
        )}
        {!data && !error && <div style={{ marginTop: 30, opacity: 0.5 }}>Cargando…</div>}

        {data && (
          <>
            {/* Vincular WhatsApp: para ver turnos hechos por WhatsApp */}
            {site.channels.whatsapp.enabled && <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              <span>¿Reservaste por WhatsApp con otro número?</span>
              <button onClick={linkWhatsapp} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.5)", color: "#25D366", padding: "7px 14px", fontFamily: SANS, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
                <Dot green /> Vincular mi WhatsApp
              </button>
            </div>}

            {/* Próximo turno */}
            <div style={{ marginTop: 44 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.55, marginBottom: 16 }}>Próximo turno</div>
              {next ? (
                <div className="next-card" style={{ border: "1px solid rgba(255,255,255,0.16)", background: "linear-gradient(120deg,#141414,#0e0e0e)" }}>
                  <div>
                    <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>{next.service} con {next.barber}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em", textTransform: "capitalize" }}>
                      <span>{fmtDateTime(next.starts_at)}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, textTransform: "none" }}><Dot green={isWa(next.channel)} /> {chLabel(next.channel)}</span>
                    </div>
                    <div style={{ marginTop: 12, display: "inline-block", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", background: "rgba(255,255,255,0.1)", padding: "5px 12px" }}>
                      {daysUntil(next.starts_at) === 0 ? "Hoy" : `En ${daysUntil(next.starts_at)} día${daysUntil(next.starts_at) > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <div className="next-actions" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button className="ghost" disabled={busy} onClick={cancelNext} style={{ borderColor: "rgba(255,90,90,0.5)", color: "#ff7a7a", opacity: busy ? 0.6 : 1 }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ border: "1px dashed rgba(255,255,255,0.2)", padding: 40, textAlign: "center" }}>
                  <p style={{ opacity: 0.7, fontSize: 15 }}>No tenés turnos próximos.</p>
                  {site.bookingEnabled && <Link href={site.bookingPath} className="nox-btn" style={{ display: "inline-block", marginTop: 18 }}>Agendar ahora</Link>}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid-stats" style={{ marginTop: 52, border: "1px solid rgba(255,255,255,0.14)" }}>
              {stats.map((st) => (
                <div key={st.label} className="cell-line" style={{ padding: "26px 24px" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.5 }}>{st.label}</div>
                  <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{st.value}</div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.5 }}>{st.sub}</div>
                </div>
              ))}
            </div>

            {/* Historial */}
            <div style={{ marginTop: 60 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.14)", paddingBottom: 14 }}>
                <h2 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 600 }}>Historial</h2>
                <div style={{ display: "flex", gap: 24 }}>
                  {["Todos", "Web", "WhatsApp"].map((label) => (
                    <button type="button" key={label} className="tab" aria-pressed={filter === label} onClick={() => setFilter(label)} style={{ color: filter === label ? "#fff" : "rgba(255,255,255,0.72)", borderColor: filter === label ? "#fff" : "transparent", background: "transparent", fontFamily: SANS }}>{label}</button>
                  ))}
                </div>
              </div>

              <div className="hist-scroll">
                <div className="hist-row" style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1.1fr 2fr 1.4fr 1.2fr 1fr 0.9fr", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <span>Fecha</span><span>Servicio</span><span>Profesional</span><span>Canal</span><span>Estado</span><span style={{ textAlign: "right" }}>Importe</span>
                </div>
                {filtered.map((h) => {
                  const ok = h.status === "completed";
                  const cancel = h.status === "cancelled";
                  return (
                    <div key={h.id} className="hrow hist-row" style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr 1.4fr 1.2fr 1fr 0.9fr", alignItems: "center", fontSize: 14, padding: "18px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ opacity: 0.7 }}>{fmtDate(h.starts_at)}</span>
                      <span style={{ fontFamily: SERIF, fontSize: 17 }}>{h.service}</span>
                      <span style={{ opacity: 0.85 }}>{h.barber}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, letterSpacing: "0.06em" }}><Dot green={isWa(h.channel)} /> {chLabel(h.channel)}</span>
                      <span><span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 9px", border: `1px solid ${cancel ? "rgba(255,90,90,0.5)" : "rgba(255,255,255,0.3)"}`, color: cancel ? "#ff7a7a" : "rgba(255,255,255,0.85)" }}>{statusLabel(h.status)}</span></span>
                      <span style={{ textAlign: "right", fontFamily: SERIF, fontSize: 17, opacity: ok ? 0.9 : 0.35 }}>{money(Number(h.price_at_booking))}</span>
                    </div>
                  );
                })}
                {filtered.length === 0 && <div style={{ padding: 30, opacity: 0.4, fontSize: 14 }}>Sin turnos todavía.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
