"use client";

import { useState } from "react";

const SERIF = "'Bodoni Moda', Georgia, serif";
const SANS = "'Archivo', system-ui, sans-serif";
const ars = new Intl.NumberFormat("es-AR");
const money = (n: number) => `$${ars.format(n)}`;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const TODAY = new Date(2026, 5, 29); // Lun 29 jun 2026

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block" }} />;
}
const chColor = (ch: string) => (ch === "WhatsApp" ? "#25D366" : ch === "Agente IA" ? "#7Cc6ff" : "rgba(255,255,255,0.6)");

type Appt = { id: number; date: string; time: string; client: string; service: string; barber: string; channel: string; state: string };

const INIT_AGENDA: Appt[] = [
  { id: 1, date: "2026-06-29", time: "10:00", client: "Martín Sosa", service: "Corte Masculino", barber: "Thiago", channel: "Web", state: "active" },
  { id: 2, date: "2026-06-29", time: "10:30", client: "Diego Funes", service: "Corte y Barba", barber: "Lautaro", channel: "Agente IA", state: "active" },
  { id: 3, date: "2026-06-29", time: "11:30", client: "Pablo Ortiz", service: "Corte y Barba con Bruno", barber: "Bruno", channel: "WhatsApp", state: "active" },
  { id: 4, date: "2026-06-29", time: "13:00", client: "Sofía Ledesma", service: "Color", barber: "Camila", channel: "Web", state: "active" },
  { id: 5, date: "2026-06-29", time: "16:00", client: "Nicolás Paz", service: "Barba", barber: "Nahuel", channel: "Agente IA", state: "active" },
  { id: 6, date: "2026-06-29", time: "17:30", client: "Joaquín Vera", service: "Corte y Barba", barber: "Ramiro", channel: "WhatsApp", state: "active" },
  { id: 7, date: "2026-06-29", time: "18:30", client: "Tomás Gil", service: "Corte y Barba con Bruno", barber: "Bruno", channel: "Agente IA", state: "active" },
  { id: 8, date: "2026-06-30", time: "11:00", client: "Ariel Costa", service: "Corte Masculino", barber: "Thiago", channel: "Web", state: "active" },
  { id: 9, date: "2026-06-30", time: "12:30", client: "Iván Méndez", service: "Barba", barber: "Nahuel", channel: "Agente IA", state: "active" },
  { id: 10, date: "2026-06-30", time: "17:00", client: "Lucas Bravo", service: "Corte y Barba", barber: "Lautaro", channel: "WhatsApp", state: "active" },
  { id: 11, date: "2026-07-01", time: "10:30", client: "Franco Ríos", service: "Corte y Barba con Bruno", barber: "Bruno", channel: "Web", state: "active" },
  { id: 12, date: "2026-07-01", time: "15:00", client: "Camila Ferro", service: "Color", barber: "Camila", channel: "WhatsApp", state: "active" },
  { id: 13, date: "2026-07-02", time: "16:00", client: "Bruno Díaz", service: "Corte Masculino", barber: "Ramiro", channel: "Agente IA", state: "active" },
  { id: 14, date: "2026-07-02", time: "18:30", client: "Juan Pérez", service: "Corte y Barba con Bruno", barber: "Bruno", channel: "Agente IA", state: "active" },
  { id: 15, date: "2026-07-03", time: "11:00", client: "Sergio Lasa", service: "Corte y Barba", barber: "Lautaro", channel: "Web", state: "active" },
  { id: 16, date: "2026-07-03", time: "12:00", client: "Marcos Vidal", service: "Barba", barber: "Nahuel", channel: "WhatsApp", state: "active" },
  { id: 17, date: "2026-07-03", time: "19:00", client: "Elena Ruiz", service: "Corte Mujer", barber: "Camila", channel: "Agente IA", state: "active" },
];

type Prod = { name: string; sku: string; price: number; qty: number; min: number };
const INIT_STOCK: Prod[] = [
  { name: "Texture Mash · Matte", sku: "NOX-TMM", price: 25000, qty: 18, min: 6 },
  { name: "Texture Dust · Original", sku: "NOX-TDO", price: 25000, qty: 4, min: 6 },
  { name: "Texture Mash · Brillante", sku: "NOX-TMB", price: 25000, qty: 11, min: 6 },
  { name: "Beard Oil · Cedro", sku: "NOX-BOC", price: 19000, qty: 0, min: 4 },
  { name: "Sea Salt Spray", sku: "NOX-SSS", price: 21000, qty: 9, min: 5 },
  { name: "Shampoo Sólido · Carbón", sku: "NOX-SHC", price: 16000, qty: 2, min: 5 },
];

const CARD = { border: "1px solid rgba(255,255,255,0.14)" } as const;

export default function AdminPage() {
  const [section, setSection] = useState("resumen");
  const [agenda, setAgenda] = useState(INIT_AGENDA);
  const [stock, setStock] = useState(INIT_STOCK);
  const [selDate, setSelDate] = useState(dateKey(TODAY));
  const [calOpen, setCalOpen] = useState(false);
  const [view, setView] = useState({ y: 2026, m: 5 });

  const nav = [
    { key: "resumen", label: "Resumen" },
    { key: "agenda", label: "Agenda" },
    { key: "clientes", label: "Clientes" },
    { key: "stock", label: "Stock" },
    { key: "ia", label: "Agente IA" },
  ];
  const titles: Record<string, string> = { resumen: "Resumen", agenda: "Agenda", clientes: "Clientes", stock: "Gestión de stock", ia: "Agente IA · WhatsApp" };

  function adjust(i: number, d: number) {
    setStock((s) => s.map((p, idx) => (idx === i ? { ...p, qty: Math.max(0, p.qty + d) } : p)));
  }
  function cancelAppt(id: number) {
    setAgenda((a) => a.map((x) => (x.id === id ? { ...x, state: "cancelled" } : x)));
  }
  function shiftDay(delta: number) {
    const d = parseKey(selDate); d.setDate(d.getDate() + delta);
    setSelDate(dateKey(d)); setView({ y: d.getFullYear(), m: d.getMonth() });
  }
  function shiftMonth(delta: number) {
    let m = view.m + delta, y = view.y;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setView({ y, m });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS, display: "grid", gridTemplateColumns: "236px 1fr" }}>
      {/* Sidebar */}
      <aside style={{ borderRight: "1px solid rgba(255,255,255,0.12)", padding: "26px 0", position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 22px 26px", display: "flex", alignItems: "baseline", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 26 }}>NOX</span>
          <span style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.5 }}>Admin</span>
        </div>
        <nav style={{ marginTop: 18, display: "flex", flexDirection: "column" }}>
          {nav.map((n) => {
            const on = section === n.key;
            return (
              <div key={n.key} className="navit" onClick={() => setSection(n.key)} style={{ background: on ? "rgba(255,255,255,0.06)" : "transparent", color: on ? "#fff" : "rgba(255,255,255,0.6)", borderColor: on ? "#fff" : "transparent" }}>
                <Dot color={on ? "#fff" : "rgba(255,255,255,0.25)"} />{n.label}
              </div>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", padding: "20px 22px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 12, opacity: 0.55 }}>
          Bruno · Dueño<br /><a href="/" style={{ color: "#fff", opacity: 0.7 }}>Volver al sitio →</a>
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: "34px 40px 90px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 600, lineHeight: 1 }}>{titles[section]}</h1>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.5 }}>Lunes 29 de junio, 2026</div>
          </div>
          <a href="/agendar" style={{ background: "#fff", color: "#0a0a0a", padding: "11px 20px", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>+ Nuevo turno</a>
        </div>

        {section === "resumen" && <Resumen />}
        {section === "agenda" && (
          <Agenda
            agenda={agenda} selDate={selDate} setSelDate={setSelDate} calOpen={calOpen} setCalOpen={setCalOpen}
            view={view} shiftDay={shiftDay} shiftMonth={shiftMonth} cancelAppt={cancelAppt}
          />
        )}
        {section === "clientes" && <Clientes />}
        {section === "stock" && <Stock stock={stock} adjust={adjust} />}
        {section === "ia" && <IA />}
      </main>
    </div>
  );
}

function Resumen() {
  const kpis = [
    { label: "Ingresos del mes", value: money(4860000), delta: "+12%", up: true },
    { label: "Turnos del mes", value: "286", delta: "+8%", up: true },
    { label: "Ocupación", value: "82%", delta: "+5%", up: true },
    { label: "Ticket promedio", value: money(17000), delta: "+3%", up: true },
    { label: "Nuevos clientes", value: "34", delta: "+11", up: true },
    { label: "Cancelaciones", value: "6%", delta: "−2%", up: false },
  ];
  const rev: [string, number][] = [["Lun", 320], ["Mar", 410], ["Mié", 380], ["Jue", 520], ["Vie", 690], ["Sáb", 760], ["Dom", 0]];
  const maxRev = 760;
  const weekTotal = money(rev.reduce((s, [, v]) => s + v * 1000, 0));
  const channels = [{ label: "Web", pct: "38%", color: "#ffffff" }, { label: "WhatsApp", pct: "39%", color: "#25D366" }, { label: "Agente IA", pct: "23%", color: "#7Cc6ff" }];
  const topServices = [
    { name: "Corte y Barba", pct: "38%" }, { name: "Corte Masculino", pct: "31%" }, { name: "Barba", pct: "14%" }, { name: "Color", pct: "9%" }, { name: "Alisado", pct: "8%" },
  ];
  const barberPerf = [
    { name: "Bruno", rev: 1240000 }, { name: "Lautaro", rev: 980000 }, { name: "Camila", rev: 910000 }, { name: "Thiago", rev: 760000 }, { name: "Ramiro", rev: 540000 },
  ];
  return (
    <>
      <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...CARD, padding: "22px 24px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{k.label}</div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{k.value}</span>
              <span style={{ fontSize: 12, color: k.up ? "#7ee0a8" : "#ff8a8a" }}>{k.delta}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Ingresos · últimos 7 días</div>
            <div style={{ fontFamily: SERIF, fontSize: 22 }}>{weekTotal}</div>
          </div>
          <div style={{ marginTop: 26, display: "flex", alignItems: "flex-end", gap: 14, height: 180 }}>
            {rev.map(([day, v]) => (
              <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{v ? `$${v}k` : "—"}</div>
                <div style={{ width: "100%", background: "linear-gradient(180deg,#fff,#cfcfcf)", height: `${Math.max(2, Math.round((v / maxRev) * 100))}%` }} />
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.45 }}>{day}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Reservas por canal</div>
          <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 128, height: 128, borderRadius: "50%", background: "conic-gradient(#ffffff 0 38%, #25D366 38% 77%, #7Cc6ff 77% 100%)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 78, height: 78, borderRadius: "50%", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: SERIF, fontSize: 24 }}>286</span>
                <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5 }}>turnos</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {channels.map((c) => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, background: c.color, display: "inline-block" }} />
                  <span style={{ fontSize: 13, minWidth: 104 }}>{c.label}</span>
                  <span style={{ fontFamily: SERIF, fontSize: 16 }}>{c.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 20 }}>Servicios más pedidos</div>
          {topServices.map((s) => (
            <div key={s.name} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7 }}><span>{s.name}</span><span style={{ opacity: 0.6 }}>{s.pct}</span></div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.1)" }}><div style={{ height: "100%", width: s.pct, background: "#fff" }} /></div>
            </div>
          ))}
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 20 }}>Rendimiento por profesional</div>
          {barberPerf.map((b) => (
            <div key={b.name} style={{ display: "grid", gridTemplateColumns: "90px 1fr auto", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <span style={{ fontSize: 13 }}>{b.name}</span>
              <div style={{ height: 6, background: "rgba(255,255,255,0.1)" }}><div style={{ height: "100%", width: `${Math.round((b.rev / 1240000) * 100)}%`, background: "linear-gradient(90deg,#888,#fff)" }} /></div>
              <span style={{ fontFamily: SERIF, fontSize: 15, minWidth: 84, textAlign: "right" }}>{money(b.rev)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

type AgendaProps = {
  agenda: Appt[]; selDate: string; setSelDate: (k: string) => void; calOpen: boolean; setCalOpen: (b: boolean) => void;
  view: { y: number; m: number }; shiftDay: (d: number) => void; shiftMonth: (d: number) => void; cancelAppt: (id: number) => void;
};

function Agenda({ agenda, selDate, setSelDate, calOpen, setCalOpen, view, shiftDay, shiftMonth, cancelAppt }: AgendaProps) {
  const sel = parseKey(selDate);
  const todayKey = dateKey(TODAY);
  const dayAppts = agenda.filter((a) => a.date === selDate);
  const activeCount = dayAppts.filter((a) => a.state === "active").length;
  const diffDays = Math.round((sel.getTime() - TODAY.getTime()) / 86400000);
  const relLabel = diffDays === 0 ? "Hoy" : diffDays === 1 ? "Mañana" : diffDays === -1 ? "Ayer" : diffDays > 0 ? `En ${diffDays} días` : `Hace ${-diffDays} días`;

  const { y: vy, m: vm } = view;
  const firstDow = (new Date(vy, vm, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const apptDays = new Set(agenda.filter((a) => a.state === "active").map((a) => a.date));

  const agendaKpis = [
    { label: "Turnos del día", value: String(activeCount) },
    { label: "Vía Agente IA", value: String(dayAppts.filter((a) => a.channel === "Agente IA" && a.state === "active").length) },
    { label: "Facturación estimada", value: money(activeCount * 17000) },
  ];

  return (
    <>
      <div style={{ marginTop: 26, display: "flex", alignItems: "center", justifyContent: "space-between", ...CARD, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="qbtn" onClick={() => shiftDay(-1)} style={{ width: 32, height: 32, fontSize: 17 }}>‹</button>
          <div style={{ minWidth: 280 }}>
            <div style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1, textTransform: "capitalize" }}>{`${DOW[sel.getDay()]} ${sel.getDate()} ${MONTHS[sel.getMonth()]}`}</div>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.45, marginTop: 3 }}>{relLabel}</div>
          </div>
          <button className="qbtn" onClick={() => shiftDay(1)} style={{ width: 32, height: 32, fontSize: 17 }}>›</button>
          <button className="miniact" onClick={() => { setSelDate(todayKey); }} style={{ marginLeft: 6 }}>Hoy</button>
        </div>
        <button className="miniact" onClick={() => setCalOpen(!calOpen)} style={{ display: "flex", alignItems: "center", gap: 9 }}>{calOpen ? "Cerrar calendario ✕" : "Ver mes ▾"}</button>
      </div>

      {calOpen && (
        <div style={{ marginTop: 14, ...CARD, padding: 22, maxWidth: 520 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button className="qbtn" onClick={() => shiftMonth(-1)}>‹</button>
            <span style={{ fontFamily: SERIF, fontSize: 20, textTransform: "capitalize" }}>{`${MONTHS[vm]} ${vy}`}</span>
            <button className="qbtn" onClick={() => shiftMonth(1)}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, textAlign: "center", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const d = idx + 1;
              const date = new Date(vy, vm, d);
              const key = dateKey(date);
              const isSel = key === selDate, isToday = key === todayKey, has = apptDays.has(key);
              return (
                <div key={d} onClick={() => setSelDate(key)} style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 13, background: isSel ? "#fff" : isToday ? "rgba(255,255,255,0.1)" : "transparent", color: isSel ? "#0a0a0a" : "#fff", cursor: "pointer", border: `1px solid ${isSel ? "#fff" : "rgba(255,255,255,0.08)"}`, position: "relative" }}>
                  <span>{d}</span>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: has ? (isSel ? "#0a0a0a" : "#25D366") : "transparent" }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 22, display: "flex", gap: 14 }}>
        {agendaKpis.map((k) => (
          <div key={k.label} style={{ flex: 1, ...CARD, padding: "18px 22px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{k.label}</div>
            <div style={{ marginTop: 8, fontFamily: SERIF, fontSize: 28 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {dayAppts.length === 0 ? (
        <div style={{ marginTop: 22, border: "1px dashed rgba(255,255,255,0.2)", padding: 48, textAlign: "center", opacity: 0.6, fontSize: 15 }}>Sin turnos para este día.</div>
      ) : (
        <div style={{ marginTop: 22, ...CARD }}>
          <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1.4fr 1.6fr 1.2fr 1.1fr 1.2fr", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <span>Hora</span><span>Cliente</span><span>Servicio</span><span>Profesional</span><span>Canal</span><span style={{ textAlign: "right" }}>Acciones</span>
          </div>
          {dayAppts.map((a) => (
            <div key={a.id} className="arow" style={{ display: "grid", gridTemplateColumns: "0.7fr 1.4fr 1.6fr 1.2fr 1.1fr 1.2fr", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: a.state === "cancelled" ? 0.4 : 1 }}>
              <span style={{ fontFamily: SERIF, fontSize: 18 }}>{a.time}</span>
              <span style={{ fontSize: 14 }}>{a.client}</span>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{a.service}</span>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{a.barber}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12 }}><Dot color={chColor(a.channel)} /> {a.channel}</span>
              <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {a.state === "active" ? (
                  <>
                    <button className="miniact" onClick={() => window.open("https://wa.me/5491155550123?text=" + encodeURIComponent(`Hola ${a.client}, necesitamos reagendar tu turno de las ${a.time}.`), "_blank")}>Reagendar</button>
                    <button className="miniact dng" onClick={() => { if (confirm(`¿Cancelar el turno de ${a.client} (${a.time})?`)) cancelAppt(a.id); }}>Cancelar</button>
                  </>
                ) : (
                  <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff7a7a" }}>Cancelado</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Clientes() {
  const cl = [
    { name: "Pablo Ortiz", visits: 14, last: "12/06", spent: 286000, channel: "WhatsApp" },
    { name: "Martín Sosa", visits: 9, last: "08/06", spent: 142000, channel: "Web" },
    { name: "Sofía Ledesma", visits: 7, last: "01/06", spent: 410000, channel: "Web" },
    { name: "Nicolás Paz", visits: 6, last: "28/05", spent: 96000, channel: "Agente IA" },
    { name: "Joaquín Vera", visits: 5, last: "20/05", spent: 105000, channel: "WhatsApp" },
    { name: "Tomás Gil", visits: 4, last: "14/05", spent: 92000, channel: "Agente IA" },
  ];
  return (
    <div style={{ marginTop: 28, ...CARD }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 1.1fr 1fr 1.1fr", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        <span>Cliente</span><span>Visitas</span><span>Último turno</span><span>Gastado</span><span>Canal habitual</span>
      </div>
      {cl.map((c) => (
        <div key={c.name} className="arow" style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 1.1fr 1fr 1.1fr", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 13 }}>{c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
            {c.name}
          </span>
          <span style={{ opacity: 0.8 }}>{c.visits}</span>
          <span style={{ opacity: 0.7, fontSize: 14 }}>{c.last}</span>
          <span style={{ fontFamily: SERIF, fontSize: 16 }}>{money(c.spent)}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13 }}><Dot color={chColor(c.channel)} /> {c.channel}</span>
        </div>
      ))}
    </div>
  );
}

function Stock({ stock, adjust }: { stock: Prod[]; adjust: (i: number, d: number) => void }) {
  const invValue = stock.reduce((s, p) => s + p.price * p.qty, 0);
  const lowCount = stock.filter((p) => p.qty > 0 && p.qty <= p.min).length;
  const outCount = stock.filter((p) => p.qty === 0).length;
  const kpis = [
    { label: "Valor de inventario", value: money(invValue), color: "#fff" },
    { label: "Stock bajo", value: String(lowCount), color: lowCount ? "#ffcf66" : "#fff" },
    { label: "Agotados", value: String(outCount), color: outCount ? "#ff7a7a" : "#fff" },
  ];
  return (
    <>
      <div style={{ marginTop: 28, display: "flex", gap: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ flex: 1, ...CARD, padding: "18px 22px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{k.label}</div>
            <div style={{ marginTop: 8, fontFamily: SERIF, fontSize: 28, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22, ...CARD }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.9fr 1.3fr 1fr 1.1fr", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <span>Producto</span><span>Precio</span><span>Stock</span><span>Ajustar</span><span>Valor</span><span style={{ textAlign: "right" }}>Estado</span>
        </div>
        {stock.map((p, i) => {
          const status = p.qty === 0 ? "Agotado" : p.qty <= p.min ? "Stock bajo" : "En stock";
          const col = p.qty === 0 ? "#ff7a7a" : p.qty <= p.min ? "#ffcf66" : "rgba(255,255,255,0.85)";
          const border = p.qty === 0 ? "rgba(255,90,90,0.5)" : p.qty <= p.min ? "rgba(255,200,80,0.5)" : "rgba(255,255,255,0.3)";
          return (
            <div key={p.sku} className="arow" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.9fr 1.3fr 1fr 1.1fr", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span><span style={{ fontFamily: SERIF, fontSize: 17 }}>{p.name}</span><br /><span style={{ fontSize: 11, opacity: 0.4, letterSpacing: "0.08em" }}>{p.sku}</span></span>
              <span style={{ fontFamily: SERIF, fontSize: 16 }}>{money(p.price)}</span>
              <span style={{ fontSize: 16, color: col }}>{p.qty}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="qbtn" onClick={() => adjust(i, -1)}>−</button>
                <button className="qbtn" onClick={() => adjust(i, 1)}>+</button>
              </span>
              <span style={{ opacity: 0.85 }}>{money(p.price * p.qty)}</span>
              <span style={{ textAlign: "right" }}><span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 9px", border: `1px solid ${border}`, color: col }}>{status}</span></span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function IA() {
  const kpis = [
    { label: "Turnos gestionados", value: "112" }, { label: "Reservas por IA", value: "88" },
    { label: "Cancelaciones por IA", value: "24" }, { label: "Tiempo ahorrado", value: "31 h" },
  ];
  const feed = [
    { text: "Reservó Corte y Barba para Tomás Gil · Jue 18:30 con Bruno", time: "Hace 8 min", action: "Reserva", dot: "#25D366" },
    { text: "Canceló turno de Lucía R. · Vie 11:00", time: "Hace 26 min", action: "Cancelación", dot: "#ff7a7a" },
    { text: "Reprogramó a Nicolás Paz · Sáb 16:00 → 17:00", time: "Hace 1 h", action: "Reagenda", dot: "#7Cc6ff" },
    { text: "Reservó Barba para Iván M. · Sáb 12:30 con Nahuel", time: "Hace 2 h", action: "Reserva", dot: "#25D366" },
    { text: "Respondió consulta de precios y derivó a la web", time: "Hace 3 h", action: "Consulta", dot: "rgba(255,255,255,0.5)" },
  ];
  return (
    <>
      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...CARD, padding: "20px 22px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{k.label}</div>
            <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 30 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Automatización</div>
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", background: "conic-gradient(#25D366 0 39%, rgba(255,255,255,0.12) 39% 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: SERIF, fontSize: 24, color: "#25D366" }}>39%</span>
                <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.5 }}>por IA</span>
              </div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.75 }}>El agente de WhatsApp gestiona reservas y cancelaciones leyendo la agenda en tiempo real, sin intervención humana.</div>
          </div>
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 18 }}>Actividad reciente del agente</div>
          {feed.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: f.dot, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14 }}>{f.text}</div>
                <div style={{ fontSize: 11, opacity: 0.45, marginTop: 3 }}>{f.time}</div>
              </div>
              <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>{f.action}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
