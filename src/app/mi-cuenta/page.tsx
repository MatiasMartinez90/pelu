"use client";

import { useState } from "react";

const SERIF = "'Bodoni Moda', Georgia, serif";
const SANS = "'Archivo', system-ui, sans-serif";
const ars = new Intl.NumberFormat("es-AR");
const money = (n: number) => `$${ars.format(n)}`;

function Dot({ green }: { green: boolean }) {
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: green ? "#25D366" : "rgba(255,255,255,0.6)", display: "inline-block" }} />;
}

type H = { date: string; service: string; barber: string; channel: string; status: string; price: number };

const HISTORY: H[] = [
  { date: "12/06/2026", service: "Corte y Barba", barber: "Bruno", channel: "WhatsApp", status: "Completado", price: 23000 },
  { date: "21/05/2026", service: "Corte Masculino", barber: "Lautaro", channel: "Web", status: "Completado", price: 15000 },
  { date: "30/04/2026", service: "Corte y Barba", barber: "Bruno", channel: "WhatsApp", status: "Completado", price: 23000 },
  { date: "12/04/2026", service: "Barba", barber: "Nahuel", channel: "Web", status: "Cancelado", price: 13000 },
  { date: "28/03/2026", service: "Corte y Barba", barber: "Bruno", channel: "Web", status: "Completado", price: 23000 },
  { date: "04/03/2026", service: "Corte Masculino", barber: "Ramiro", channel: "WhatsApp", status: "Completado", price: 15000 },
  { date: "10/02/2026", service: "Corte y Barba", barber: "Bruno", channel: "Web", status: "Completado", price: 18000 },
];

export default function MiCuentaPage() {
  const [cancelled, setCancelled] = useState(false);
  const [filter, setFilter] = useState("Todos");

  const filtered = HISTORY.filter((h) => filter === "Todos" || h.channel === filter);
  const completed = HISTORY.filter((h) => h.status === "Completado");
  const invertido = completed.reduce((s, h) => s + h.price, 0);

  const stats = [
    { label: "Turnos totales", value: String(completed.length), sub: "completados" },
    { label: "Profesional de cabecera", value: "Bruno", sub: "4 visitas" },
    { label: "Invertido", value: money(invertido), sub: "histórico" },
    { label: "Puntos NOX", value: "280", sub: "≈ 1 corte gratis" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      {/* Topbar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 40px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <a href="/" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 24, color: "#fff" }}>NOX</a>
          <span style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.5 }}>Mi Cuenta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/agendar" className="nox-btn">Agendar Turno</a>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 16, border: "1px solid rgba(255,255,255,0.2)" }}>JP</div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 40px 100px" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.55 }}>Cliente desde 2022</div>
        <h1 style={{ marginTop: 14, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(44px,6vw,76px)", lineHeight: 0.9 }}>Hola, Juan</h1>

        {/* Próximo turno */}
        <div style={{ marginTop: 44 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.55, marginBottom: 16 }}>Próximo turno</div>
          {!cancelled ? (
            <div style={{ border: "1px solid rgba(255,255,255,0.16)", background: "linear-gradient(120deg,#141414,#0e0e0e)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 28, alignItems: "center", padding: "26px 30px" }}>
              <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&q=80&auto=format&fit=crop" alt="" style={{ width: 84, height: 84, objectFit: "cover", filter: "grayscale(1)" }} />
              <div>
                <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>Corte y Barba con Bruno</div>
                <div style={{ marginTop: 8, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
                  <span>con <b style={{ color: "#fff" }}>Bruno</b></span>
                  <span>Jueves 02/07 · 18:30 hs</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Dot green /> WhatsApp</span>
                </div>
                <div style={{ marginTop: 12, display: "inline-block", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", background: "rgba(255,255,255,0.1)", padding: "5px 12px" }}>En 3 días</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="ghost" onClick={() => window.open("https://wa.me/5491155550123?text=" + encodeURIComponent("Hola NOX! Quiero reagendar mi turno del Jueves 02/07 18:30."), "_blank")}>Reagendar</button>
                <button className="ghost" onClick={() => { if (confirm("¿Cancelar tu turno del Jueves 02/07 a las 18:30?")) setCancelled(true); }} style={{ borderColor: "rgba(255,90,90,0.5)", color: "#ff7a7a" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ border: "1px dashed rgba(255,255,255,0.2)", padding: 40, textAlign: "center" }}>
              <p style={{ opacity: 0.7, fontSize: 15 }}>No tenés turnos próximos.</p>
              <a href="/agendar" className="nox-btn" style={{ display: "inline-block", marginTop: 18 }}>Agendar ahora</a>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ marginTop: 52, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, border: "1px solid rgba(255,255,255,0.14)" }}>
          {stats.map((st) => (
            <div key={st.label} style={{ padding: "26px 24px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.5 }}>{st.label}</div>
              <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{st.value}</div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.5 }}>{st.sub}</div>
            </div>
          ))}
        </div>

        {/* Historial */}
        <div style={{ marginTop: 60 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.14)", paddingBottom: 14 }}>
            <h2 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 600 }}>Historial</h2>
            <div style={{ display: "flex", gap: 24 }}>
              {["Todos", "Web", "WhatsApp"].map((label) => (
                <span key={label} className="tab" onClick={() => setFilter(label)} style={{ color: filter === label ? "#fff" : "rgba(255,255,255,0.5)", borderColor: filter === label ? "#fff" : "transparent" }}>{label}</span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1.1fr 2fr 1.4fr 1.2fr 1fr 0.9fr", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <span>Fecha</span><span>Servicio</span><span>Profesional</span><span>Canal</span><span>Estado</span><span style={{ textAlign: "right" }}>Importe</span>
          </div>
          {filtered.map((h, i) => {
            const ok = h.status === "Completado";
            return (
              <div key={i} className="hrow" style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr 1.4fr 1.2fr 1fr 0.9fr", alignItems: "center", fontSize: 14, padding: "18px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ opacity: 0.7 }}>{h.date}</span>
                <span style={{ fontFamily: SERIF, fontSize: 17 }}>{h.service}</span>
                <span style={{ opacity: 0.85 }}>{h.barber}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, letterSpacing: "0.06em" }}><Dot green={h.channel === "WhatsApp"} /> {h.channel}</span>
                <span><span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 9px", border: `1px solid ${ok ? "rgba(255,255,255,0.3)" : "rgba(255,90,90,0.5)"}`, color: ok ? "rgba(255,255,255,0.85)" : "#ff7a7a" }}>{h.status}</span></span>
                <span style={{ textAlign: "right", fontFamily: SERIF, fontSize: 17, opacity: ok ? 0.9 : 0.35 }}>{money(h.price)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
