"use client";

import { useState } from "react";

const SERIF = "'Bodoni Moda', Georgia, serif";
const SANS = "'Archivo', system-ui, sans-serif";
const ars = new Intl.NumberFormat("es-AR");
const money = (n: number) => `$${ars.format(n)}`;
const CARD = { border: "1px solid rgba(255,255,255,0.14)" } as const;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const TODAY = new Date(2026, 5, 29);

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block" }} />;
}
const chColor = (ch: string) => (ch === "WhatsApp" ? "#25D366" : "rgba(255,255,255,0.6)");

type Appt = { id: number; date: string; time: string; client: string; service: string; barber: string; channel: string; state: string };
const INIT_AGENDA: Appt[] = [
  { id: 1, date: "2026-06-29", time: "10:00", client: "Martín Sosa", service: "Corte Masculino", barber: "Thiago", channel: "Web", state: "active" },
  { id: 2, date: "2026-06-29", time: "10:30", client: "Diego Funes", service: "Corte y Barba", barber: "Lautaro", channel: "WhatsApp", state: "active" },
  { id: 3, date: "2026-06-29", time: "11:30", client: "Pablo Ortiz", service: "Corte y Barba con Bruno", barber: "Bruno", channel: "WhatsApp", state: "active" },
  { id: 4, date: "2026-06-29", time: "13:00", client: "Sofía Ledesma", service: "Color", barber: "Camila", channel: "Web", state: "active" },
  { id: 5, date: "2026-06-29", time: "16:00", client: "Nicolás Paz", service: "Barba", barber: "Nahuel", channel: "WhatsApp", state: "active" },
  { id: 6, date: "2026-06-29", time: "17:30", client: "Joaquín Vera", service: "Corte y Barba", barber: "Ramiro", channel: "WhatsApp", state: "active" },
  { id: 7, date: "2026-06-29", time: "18:30", client: "Tomás Gil", service: "Corte y Barba con Bruno", barber: "Bruno", channel: "WhatsApp", state: "active" },
  { id: 8, date: "2026-06-30", time: "11:00", client: "Ariel Costa", service: "Corte Masculino", barber: "Thiago", channel: "Web", state: "active" },
  { id: 9, date: "2026-06-30", time: "12:30", client: "Iván Méndez", service: "Barba", barber: "Nahuel", channel: "WhatsApp", state: "active" },
  { id: 10, date: "2026-06-30", time: "17:00", client: "Lucas Bravo", service: "Corte y Barba", barber: "Lautaro", channel: "WhatsApp", state: "active" },
  { id: 11, date: "2026-07-01", time: "10:30", client: "Franco Ríos", service: "Corte y Barba con Bruno", barber: "Bruno", channel: "Web", state: "active" },
  { id: 12, date: "2026-07-01", time: "15:00", client: "Camila Ferro", service: "Color", barber: "Camila", channel: "WhatsApp", state: "active" },
  { id: 13, date: "2026-07-02", time: "16:00", client: "Bruno Díaz", service: "Corte Masculino", barber: "Ramiro", channel: "WhatsApp", state: "active" },
  { id: 14, date: "2026-07-02", time: "18:30", client: "Juan Pérez", service: "Corte y Barba con Bruno", barber: "Bruno", channel: "WhatsApp", state: "active" },
  { id: 15, date: "2026-07-03", time: "11:00", client: "Sergio Lasa", service: "Corte y Barba", barber: "Lautaro", channel: "Web", state: "active" },
  { id: 16, date: "2026-07-03", time: "12:00", client: "Marcos Vidal", service: "Barba", barber: "Nahuel", channel: "WhatsApp", state: "active" },
  { id: 17, date: "2026-07-03", time: "19:00", client: "Elena Ruiz", service: "Corte Mujer", barber: "Camila", channel: "WhatsApp", state: "active" },
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

type Staff = { id: number; name: string; role: string; active: boolean };
const INIT_STAFF: Staff[] = [
  { id: 1, name: "Bruno", role: "Master Barber", active: true },
  { id: 2, name: "Thiago", role: "Barbero", active: true },
  { id: 3, name: "Lautaro", role: "Barbero", active: true },
  { id: 4, name: "Nahuel", role: "Barbero", active: true },
  { id: 5, name: "Ramiro", role: "Barbero", active: true },
  { id: 6, name: "Camila", role: "Estilista", active: true },
];
type SvcP = { id: number; name: string; price: number };
const INIT_SVC: SvcP[] = [
  { id: 1, name: "Corte Masculino", price: 15000 },
  { id: 2, name: "Corte y Barba", price: 18000 },
  { id: 3, name: "Barba", price: 13000 },
  { id: 4, name: "Corte y Barba con Bruno", price: 23000 },
  { id: 5, name: "Color", price: 70000 },
  { id: 6, name: "Alisado Orgánico", price: 165000 },
];
type Admin = { id: number; name: string; email: string; role: string };
const INIT_ADMINS: Admin[] = [
  { id: 1, name: "Bruno Díaz", email: "bruno@noxbarber.com.ar", role: "Dueño" },
  { id: 2, name: "Camila Ferro", email: "camila@noxbarber.com.ar", role: "Editor" },
];
type Block = { id: number; label: string; from: string; to: string; scope: string };
const INIT_BLOCKS: Block[] = [
  { id: 1, label: "Feriado nacional", from: "09/07/2026", to: "09/07/2026", scope: "Todo el día" },
  { id: 2, label: "Vacaciones · Bruno", from: "14/07/2026", to: "28/07/2026", scope: "Solo Bruno" },
  { id: 3, label: "Cierre por mantenimiento", from: "Hoy 20:00", to: "Hoy 21:00", scope: "Todo el local" },
];

type Msg = { from: string; text: string; time: string };
type Convo = { id: number; name: string; phone: string; status: string; assignedTo: string | null; unread: number; time: string; tags: string[]; client: { visits: number; lastVisit: string; ltv: number; nextAppt: string }; msgs: Msg[] };
const INIT_CONVOS: Convo[] = [
  { id: 1, name: "Pablo Ortiz", phone: "+54 9 11 6055-1234", status: "pendiente", assignedTo: null, unread: 2, time: "11:42", tags: ["Cliente VIP"], client: { visits: 14, lastVisit: "12/06/2026", ltv: 286000, nextAppt: "Hoy 11:30 · Bruno" }, msgs: [
    { from: "client", text: "Hola! Quería saber si tienen lugar hoy a la tarde", time: "11:38" },
    { from: "bot", text: "¡Hola Pablo! Sí, tenemos disponibilidad hoy. ¿Con qué profesional te gustaría atenderte?", time: "11:39" },
    { from: "client", text: "Con Bruno si se puede", time: "11:40" },
    { from: "bot", text: "Bruno tiene libre a las 18:30. ¿Te lo reservo?", time: "11:40" },
    { from: "client", text: "Dale, pero puede ser un poco más temprano?", time: "11:42" },
  ] },
  { id: 2, name: "Sofía Ledesma", phone: "+54 9 11 5544-9821", status: "bot", assignedTo: null, unread: 0, time: "11:20", tags: ["Color"], client: { visits: 7, lastVisit: "01/06/2026", ltv: 410000, nextAppt: "—" }, msgs: [
    { from: "client", text: "Buenas, cuánto sale el color completo?", time: "11:18" },
    { from: "bot", text: "¡Hola Sofía! El servicio de Color arranca en $70.000 y el valor final depende del largo y el trabajo. ¿Querés que coordinemos un turno de evaluación sin cargo?", time: "11:19" },
    { from: "client", text: "Lo voy a pensar, gracias!", time: "11:20" },
  ] },
  { id: 3, name: "Iván Méndez", phone: "+54 9 11 3322-7766", status: "abandonada", assignedTo: null, unread: 1, time: "Ayer", tags: ["Sin cerrar"], client: { visits: 2, lastVisit: "20/04/2026", ltv: 36000, nextAppt: "—" }, msgs: [
    { from: "client", text: "Quiero turno para barba el sábado", time: "Ayer 19:02" },
    { from: "bot", text: "¡Genial! El sábado tengo 12:00, 16:30 y 18:00. ¿Cuál preferís?", time: "Ayer 19:02" },
  ] },
  { id: 4, name: "Joaquín Vera", phone: "+54 9 11 7788-2211", status: "humano", assignedTo: "Bruno", unread: 0, time: "10:55", tags: ["Reclamo"], client: { visits: 5, lastVisit: "20/05/2026", ltv: 105000, nextAppt: "03/07 17:30 · Ramiro" }, msgs: [
    { from: "client", text: "El corte de la última vez no me quedó como pedí", time: "10:48" },
    { from: "bot", text: "Lamento escuchar eso, Joaquín. Te derivo con el equipo para resolverlo 🙏", time: "10:49" },
    { from: "agent", text: "Hola Joaquín, soy Bruno. Te ofrezco un retoque sin cargo esta semana, ¿te viene bien el jueves?", time: "10:55" },
  ] },
  { id: 5, name: "Camila Ferro", phone: "+54 9 11 9001-4567", status: "resuelta", assignedTo: null, unread: 0, time: "Lun", tags: [], client: { visits: 7, lastVisit: "01/07/2026", ltv: 410000, nextAppt: "01/07 15:00 · Camila" }, msgs: [
    { from: "client", text: "Confirmo mi turno del martes 👍", time: "Lun 09:30" },
    { from: "bot", text: "¡Perfecto Camila! Te esperamos el martes a las 15:00. Cualquier cambio avisanos por acá.", time: "Lun 09:30" },
  ] },
];

const NAV = [
  { key: "resumen", label: "Resumen" }, { key: "agenda", label: "Agenda" },
  { key: "clientes", label: "Clientes" }, { key: "stock", label: "Stock" },
  { key: "ia", label: "Agente IA" }, { key: "conversaciones", label: "Conversaciones" },
  { key: "ajustes", label: "Administración" }, { key: "disponibilidad", label: "Disponibilidad" },
];
const TITLES: Record<string, string> = { resumen: "Resumen", agenda: "Agenda", clientes: "Clientes", stock: "Gestión de stock", ia: "Agente IA · WhatsApp", conversaciones: "Conversaciones · WhatsApp", ajustes: "Administración del sitio", disponibilidad: "Disponibilidad de la agenda" };

export default function AdminPage() {
  const [section, setSection] = useState("resumen");
  const [agenda, setAgenda] = useState(INIT_AGENDA);
  const [stock, setStock] = useState(INIT_STOCK);
  const [selDate, setSelDate] = useState(dateKey(TODAY));
  const [calOpen, setCalOpen] = useState(false);
  const [view, setView] = useState({ y: 2026, m: 5 });
  const [staff, setStaff] = useState(INIT_STAFF);
  const [svc, setSvc] = useState(INIT_SVC);
  const [admins, setAdmins] = useState(INIT_ADMINS);
  const [booking, setBooking] = useState({ web: true, whatsapp: true });
  const [availEnabled, setAvailEnabled] = useState(true);
  const [availMode, setAvailMode] = useState<"open" | "allowlist">("open");
  const [markedDays, setMarkedDays] = useState<string[]>([]);
  const [blocks, setBlocks] = useState(INIT_BLOCKS);
  const [availView, setAvailView] = useState({ y: 2026, m: 6 });
  const [convos, setConvos] = useState(INIT_CONVOS);
  const [selConvo, setSelConvo] = useState(1);
  const [convoFilter, setConvoFilter] = useState("Todas");

  return (
    <div className="adm-shell" style={{ background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <aside className="adm-side">
        <div className="adm-brand">
          <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 26 }}>NOX</span>
          <span style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.5 }}>Admin</span>
        </div>
        <nav className="adm-nav">
          {NAV.map((n) => {
            const on = section === n.key;
            return (
              <div key={n.key} className="navit" onClick={() => setSection(n.key)} style={{ background: on ? "rgba(255,255,255,0.06)" : "transparent", color: on ? "#fff" : "rgba(255,255,255,0.6)", borderColor: on ? "#fff" : "transparent" }}>
                <Dot color={on ? "#fff" : "rgba(255,255,255,0.25)"} />{n.label}
              </div>
            );
          })}
        </nav>
        <div className="adm-user">
          Bruno · Dueño<br /><a href="/" style={{ color: "#fff", opacity: 0.7 }}>Volver al sitio →</a>
        </div>
      </aside>

      <main className="adm-main">
        <div className="adm-head">
          <div>
            <h1 className="adm-title">{TITLES[section]}</h1>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.5 }}>Lunes 29 de junio, 2026</div>
          </div>
          <a href="/agendar" style={{ background: "#fff", color: "#0a0a0a", padding: "11px 20px", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>+ Nuevo turno</a>
        </div>

        {section === "resumen" && <Resumen />}
        {section === "agenda" && (
          <Agenda agenda={agenda} selDate={selDate} setSelDate={setSelDate} calOpen={calOpen} setCalOpen={setCalOpen} view={view} setView={setView}
            shiftDay={(d) => { const dt = parseKey(selDate); dt.setDate(dt.getDate() + d); setSelDate(dateKey(dt)); setView({ y: dt.getFullYear(), m: dt.getMonth() }); }}
            cancelAppt={(id) => setAgenda((a) => a.map((x) => (x.id === id ? { ...x, state: "cancelled" } : x)))} />
        )}
        {section === "clientes" && <Clientes />}
        {section === "stock" && <Stock stock={stock} adjust={(i, d) => setStock((s) => s.map((p, idx) => (idx === i ? { ...p, qty: Math.max(0, p.qty + d) } : p)))} />}
        {section === "ia" && <IA />}
        {section === "conversaciones" && (
          <Conversaciones convos={convos} setConvos={setConvos} selConvo={selConvo} setSelConvo={setSelConvo} filter={convoFilter} setFilter={setConvoFilter} />
        )}
        {section === "ajustes" && (
          <Ajustes staff={staff} setStaff={setStaff} svc={svc} setSvc={setSvc} admins={admins} setAdmins={setAdmins} booking={booking} setBooking={setBooking} />
        )}
        {section === "disponibilidad" && (
          <Disponibilidad availEnabled={availEnabled} setAvailEnabled={setAvailEnabled} availMode={availMode} setAvailMode={setAvailMode}
            markedDays={markedDays} setMarkedDays={setMarkedDays} blocks={blocks} setBlocks={setBlocks} view={availView} setView={setAvailView} />
        )}
      </main>
    </div>
  );
}

function Resumen() {
  const kpis = [
    { label: "Ingresos del mes", value: money(4860000), delta: "+12%", up: true }, { label: "Turnos del mes", value: "286", delta: "+8%", up: true },
    { label: "Ocupación", value: "82%", delta: "+5%", up: true }, { label: "Ticket promedio", value: money(17000), delta: "+3%", up: true },
    { label: "Nuevos clientes", value: "34", delta: "+11", up: true }, { label: "Cancelaciones", value: "6%", delta: "−2%", up: false },
  ];
  const rev: [string, number][] = [["Lun", 320], ["Mar", 410], ["Mié", 380], ["Jue", 520], ["Vie", 690], ["Sáb", 760], ["Dom", 0]];
  const weekTotal = money(rev.reduce((s, [, v]) => s + v * 1000, 0));
  const channels = [{ label: "Web", pct: "38%", color: "#ffffff" }, { label: "WhatsApp", pct: "62%", color: "#25D366" }];
  const topServices = [{ name: "Corte y Barba", pct: "38%" }, { name: "Corte Masculino", pct: "31%" }, { name: "Barba", pct: "14%" }, { name: "Color", pct: "9%" }, { name: "Alisado", pct: "8%" }];
  const barberPerf = [{ name: "Bruno", rev: 1240000 }, { name: "Lautaro", rev: 980000 }, { name: "Camila", rev: 910000 }, { name: "Thiago", rev: 760000 }, { name: "Ramiro", rev: 540000 }];
  return (
    <>
      <div className="adm-kpis" style={{ marginTop: 30, gap: 16 }}>
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
      <div className="adm-grid" style={{ marginTop: 18, "--cols": "1.6fr 1fr" } as React.CSSProperties}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Ingresos · últimos 7 días</div>
            <div style={{ fontFamily: SERIF, fontSize: 22 }}>{weekTotal}</div>
          </div>
          <div className="adm-chart" style={{ marginTop: 26 }}>
            {rev.map(([day, v]) => (
              <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{v ? `$${v}k` : "—"}</div>
                <div style={{ width: "100%", background: "linear-gradient(180deg,#fff,#cfcfcf)", height: `${Math.max(2, Math.round((v / 760) * 100))}%` }} />
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.45 }}>{day}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Reservas por canal</div>
          <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 128, height: 128, borderRadius: "50%", background: "conic-gradient(#ffffff 0 38%, #25D366 38% 100%)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
      <div className="adm-grid" style={{ marginTop: 16 }}>
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

type AgendaP = { agenda: Appt[]; selDate: string; setSelDate: (k: string) => void; calOpen: boolean; setCalOpen: (b: boolean) => void; view: { y: number; m: number }; setView: (v: { y: number; m: number }) => void; shiftDay: (d: number) => void; cancelAppt: (id: number) => void };
function Agenda({ agenda, selDate, setSelDate, calOpen, setCalOpen, view, setView, shiftDay, cancelAppt }: AgendaP) {
  const sel = parseKey(selDate);
  const todayKey = dateKey(TODAY);
  const dayAppts = agenda.filter((a) => a.date === selDate);
  const activeCount = dayAppts.filter((a) => a.state === "active").length;
  const diffDays = Math.round((sel.getTime() - TODAY.getTime()) / 86400000);
  const relLabel = diffDays === 0 ? "Hoy" : diffDays === 1 ? "Mañana" : diffDays === -1 ? "Ayer" : diffDays > 0 ? `En ${diffDays} días` : `Hace ${-diffDays} días`;
  const { y: vy, m: vm } = view;
  const firstDow = (new Date(vy, vm, 1).getDay() + 6) % 7;
  const dim = new Date(vy, vm + 1, 0).getDate();
  const apptDays = new Set(agenda.filter((a) => a.state === "active").map((a) => a.date));
  const kpis = [
    { label: "Turnos del día", value: String(activeCount) },
    { label: "Vía WhatsApp", value: String(dayAppts.filter((a) => a.channel === "WhatsApp" && a.state === "active").length) },
    { label: "Facturación estimada", value: money(activeCount * 17000) },
  ];
  return (
    <>
      <div style={{ marginTop: 26, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, ...CARD, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button className="qbtn" onClick={() => shiftDay(-1)} style={{ width: 32, height: 32, fontSize: 17 }}>‹</button>
          <div style={{ minWidth: 280 }}>
            <div style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1, textTransform: "capitalize" }}>{`${DOW[sel.getDay()]} ${sel.getDate()} ${MONTHS[sel.getMonth()]}`}</div>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.45, marginTop: 3 }}>{relLabel}</div>
          </div>
          <button className="qbtn" onClick={() => shiftDay(1)} style={{ width: 32, height: 32, fontSize: 17 }}>›</button>
          <button className="miniact" onClick={() => { setSelDate(todayKey); setView({ y: TODAY.getFullYear(), m: TODAY.getMonth() }); }} style={{ marginLeft: 6 }}>Hoy</button>
        </div>
        <button className="miniact" onClick={() => setCalOpen(!calOpen)} style={{ display: "flex", alignItems: "center", gap: 9 }}>{calOpen ? "Cerrar calendario ✕" : "Ver mes ▾"}</button>
      </div>
      {calOpen && (
        <div style={{ marginTop: 14, ...CARD, padding: 22, maxWidth: 520 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button className="qbtn" onClick={() => setView({ y: vm === 0 ? vy - 1 : vy, m: vm === 0 ? 11 : vm - 1 })}>‹</button>
            <span style={{ fontFamily: SERIF, fontSize: 20, textTransform: "capitalize" }}>{`${MONTHS[vm]} ${vy}`}</span>
            <button className="qbtn" onClick={() => setView({ y: vm === 11 ? vy + 1 : vy, m: vm === 11 ? 0 : vm + 1 })}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, textAlign: "center", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: dim }).map((_, idx) => {
              const d = idx + 1; const date = new Date(vy, vm, d); const key = dateKey(date);
              const isSel = key === selDate, isToday = key === todayKey, has = apptDays.has(key);
              return (
                <div key={d} onClick={() => setSelDate(key)} style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 13, background: isSel ? "#fff" : isToday ? "rgba(255,255,255,0.1)" : "transparent", color: isSel ? "#0a0a0a" : "#fff", cursor: "pointer", border: `1px solid ${isSel ? "#fff" : "rgba(255,255,255,0.08)"}` }}>
                  <span>{d}</span><span style={{ width: 4, height: 4, borderRadius: "50%", background: has ? (isSel ? "#0a0a0a" : "#25D366") : "transparent" }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="adm-kpis" style={{ marginTop: 22 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...CARD, padding: "18px 22px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{k.label}</div>
            <div style={{ marginTop: 8, fontFamily: SERIF, fontSize: 28 }}>{k.value}</div>
          </div>
        ))}
      </div>
      {dayAppts.length === 0 ? (
        <div style={{ marginTop: 22, border: "1px dashed rgba(255,255,255,0.2)", padding: 48, textAlign: "center", opacity: 0.6, fontSize: 15 }}>Sin turnos para este día.</div>
      ) : (
        <div className="tbl-wrap" style={{ marginTop: 22, ...CARD }}>
          <div className="tbl-row" style={{ display: "grid", gridTemplateColumns: "0.7fr 1.4fr 1.6fr 1.2fr 1.1fr 1.2fr", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <span>Hora</span><span>Cliente</span><span>Servicio</span><span>Profesional</span><span>Canal</span><span style={{ textAlign: "right" }}>Acciones</span>
          </div>
          {dayAppts.map((a) => (
            <div key={a.id} className="arow tbl-row" style={{ display: "grid", gridTemplateColumns: "0.7fr 1.4fr 1.6fr 1.2fr 1.1fr 1.2fr", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: a.state === "cancelled" ? 0.4 : 1 }}>
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
                ) : (<span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff7a7a" }}>Cancelado</span>)}
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
    { name: "Pablo Ortiz", visits: 14, last: "12/06", spent: 286000, channel: "WhatsApp" }, { name: "Martín Sosa", visits: 9, last: "08/06", spent: 142000, channel: "Web" },
    { name: "Sofía Ledesma", visits: 7, last: "01/06", spent: 410000, channel: "Web" }, { name: "Nicolás Paz", visits: 6, last: "28/05", spent: 96000, channel: "WhatsApp" },
    { name: "Joaquín Vera", visits: 5, last: "20/05", spent: 105000, channel: "WhatsApp" }, { name: "Tomás Gil", visits: 4, last: "14/05", spent: 92000, channel: "WhatsApp" },
  ];
  return (
    <div className="tbl-wrap" style={{ marginTop: 28, ...CARD }}>
      <div className="tbl-row" style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 1.1fr 1fr 1.1fr", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        <span>Cliente</span><span>Visitas</span><span>Último turno</span><span>Gastado</span><span>Canal habitual</span>
      </div>
      {cl.map((c) => (
        <div key={c.name} className="arow tbl-row" style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 1.1fr 1fr 1.1fr", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 13 }}>{initials(c.name)}</span>{c.name}
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
        {stock.map((p, i) => {
          const status = p.qty === 0 ? "Agotado" : p.qty <= p.min ? "Stock bajo" : "En stock";
          const col = p.qty === 0 ? "#ff7a7a" : p.qty <= p.min ? "#ffcf66" : "rgba(255,255,255,0.85)";
          const border = p.qty === 0 ? "rgba(255,90,90,0.5)" : p.qty <= p.min ? "rgba(255,200,80,0.5)" : "rgba(255,255,255,0.3)";
          return (
            <div key={p.sku} className="arow tbl-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.9fr 1.3fr 1fr 1.1fr", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span><span style={{ fontFamily: SERIF, fontSize: 17 }}>{p.name}</span><br /><span style={{ fontSize: 11, opacity: 0.4, letterSpacing: "0.08em" }}>{p.sku}</span></span>
              <span style={{ fontFamily: SERIF, fontSize: 16 }}>{money(p.price)}</span>
              <span style={{ fontSize: 16, color: col }}>{p.qty}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}><button className="qbtn" onClick={() => adjust(i, -1)}>−</button><button className="qbtn" onClick={() => adjust(i, 1)}>+</button></span>
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
  const kpis = [{ label: "Turnos gestionados", value: "112" }, { label: "Reservas por IA", value: "88" }, { label: "Cancelaciones por IA", value: "24" }, { label: "Tiempo ahorrado", value: "31 h" }];
  const feed = [
    { text: "Reservó Corte y Barba para Tomás Gil · Jue 18:30 con Bruno", time: "Hace 8 min", action: "Reserva", dot: "#25D366" },
    { text: "Canceló turno de Lucía R. · Vie 11:00", time: "Hace 26 min", action: "Cancelación", dot: "#ff7a7a" },
    { text: "Reprogramó a Nicolás Paz · Sáb 16:00 → 17:00", time: "Hace 1 h", action: "Reagenda", dot: "#7Cc6ff" },
    { text: "Reservó Barba para Iván M. · Sáb 12:30 con Nahuel", time: "Hace 2 h", action: "Reserva", dot: "#25D366" },
    { text: "Respondió consulta de precios y derivó a la web", time: "Hace 3 h", action: "Consulta", dot: "rgba(255,255,255,0.5)" },
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
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", background: "conic-gradient(#25D366 0 39%, rgba(255,255,255,0.12) 39% 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: SERIF, fontSize: 24, color: "#25D366" }}>39%</span><span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.5 }}>por IA</span>
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
              <div style={{ flex: 1 }}><div style={{ fontSize: 14 }}>{f.text}</div><div style={{ fontSize: 11, opacity: 0.45, marginTop: 3 }}>{f.time}</div></div>
              <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>{f.action}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  bot: { label: "Bot atendiendo", color: "#7Cc6ff", dot: "#7Cc6ff" },
  pendiente: { label: "Pendiente", color: "#ffcf66", dot: "#ffcf66" },
  humano: { label: "Atendido por humano", color: "#7ee0a8", dot: "#7ee0a8" },
  abandonada: { label: "Abandonada", color: "#ff7a7a", dot: "#ff7a7a" },
  resuelta: { label: "Resuelta", color: "rgba(255,255,255,0.5)", dot: "rgba(255,255,255,0.4)" },
};

type ConvP = { convos: Convo[]; setConvos: React.Dispatch<React.SetStateAction<Convo[]>>; selConvo: number; setSelConvo: (id: number) => void; filter: string; setFilter: (f: string) => void };
function Conversaciones({ convos, setConvos, selConvo, setSelConvo, filter, setFilter }: ConvP) {
  const [draft, setDraft] = useState("");
  const filters = ["Todas", "Pendientes", "Abandonadas", "Bot", "Intervenidas"];
  const match = (c: Convo) => filter === "Todas" || (filter === "Pendientes" && c.status === "pendiente") || (filter === "Abandonadas" && c.status === "abandonada") || (filter === "Bot" && c.status === "bot") || (filter === "Intervenidas" && c.status === "humano");
  const list = convos.filter(match);
  const active = convos.find((c) => c.id === selConvo) || null;

  const counts = { pend: convos.filter((c) => c.status === "pendiente").length, aband: convos.filter((c) => c.status === "abandonada").length, humano: convos.filter((c) => c.status === "humano").length, bot: convos.filter((c) => c.status === "bot").length };
  const kpis = [
    { label: "Sin atender", value: String(counts.pend), color: counts.pend ? "#ffcf66" : "#fff" },
    { label: "Abandonadas", value: String(counts.aband), color: counts.aband ? "#ff7a7a" : "#fff" },
    { label: "Con humano", value: String(counts.humano), color: "#7ee0a8" },
    { label: "Bot activo", value: String(counts.bot), color: "#7Cc6ff" },
  ];
  const select = (id: number) => { setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c))); setSelConvo(id); };
  const upd = (id: number, patch: Partial<Convo>) => setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const send = () => { if (!active || !draft.trim()) return; setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, status: "humano", assignedTo: c.assignedTo || "Bruno", msgs: [...c.msgs, { from: "agent", text: draft.trim(), time: "ahora" }] } : c))); setDraft(""); };

  return (
    <>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 12, opacity: 0.5 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#25D366" }} />Integrado con Chatwoot · WhatsApp Business · Sincronizado hace 1 min
      </div>
      <div className="adm-kpis" style={{ marginTop: 18, gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...CARD, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.5 }}>{k.label}</div>
            <div style={{ marginTop: 6, fontFamily: SERIF, fontSize: 26, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, overflowX: "auto", ...CARD }}>
        <div style={{ minWidth: 940, display: "grid", gridTemplateColumns: "320px 1fr 260px", height: 620, overflow: "hidden" }}>
          {/* lista */}
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", gap: 6, padding: 14, borderBottom: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap" }}>
              {filters.map((f) => (
                <span key={f} onClick={() => setFilter(f)} style={{ fontSize: 11, letterSpacing: "0.06em", padding: "5px 11px", cursor: "pointer", background: filter === f ? "#fff" : "transparent", color: filter === f ? "#0a0a0a" : "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.18)" }}>{f}</span>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {list.map((c) => {
                const m = STATUS_META[c.status]; const last = c.msgs[c.msgs.length - 1]; const sel = c.id === selConvo;
                const prev = (last.from === "client" ? "" : last.from === "agent" ? "Vos: " : "Bot: ") + last.text;
                return (
                  <div key={c.id} onClick={() => select(c.id)} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", background: sel ? "rgba(255,255,255,0.06)" : "transparent", borderLeft: `2px solid ${sel ? "#fff" : "transparent"}` }}>
                    <span style={{ width: 42, height: 42, borderRadius: "50%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 15, flexShrink: 0 }}>{initials(c.name)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                        <span style={{ fontSize: 11, opacity: 0.45, flexShrink: 0 }}>{c.time}</span>
                      </div>
                      <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prev}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}><Dot color={m.dot} size={6} />{m.label}</span>
                        {c.unread > 0 && <span style={{ background: "#25D366", color: "#0a0a0a", fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{c.unread}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* thread */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
            {active && (() => {
              const m = STATUS_META[active.status];
              const isBot = ["bot", "pendiente", "abandonada"].includes(active.status);
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 14 }}>{initials(active.name)}</span>
                      <div style={{ minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{active.name}</div><div style={{ fontSize: 12, opacity: 0.5 }}>{active.phone}</div></div>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: m.color }}><Dot color={m.dot} />{m.label}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14, minHeight: 0, background: "#0c0c0c" }}>
                    {active.msgs.map((msg, i) => {
                      const isClient = msg.from === "client", isAgent = msg.from === "agent";
                      return (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isClient ? "flex-start" : "flex-end", maxWidth: "74%", alignSelf: isClient ? "flex-start" : "flex-end" }}>
                          <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: isClient ? "rgba(255,255,255,0.5)" : isAgent ? "#7ee0a8" : "#7Cc6ff", marginBottom: 4 }}>{isClient ? active.name : isAgent ? active.assignedTo || "Equipo" : "Bot NOX"}</div>
                          <div style={{ background: isClient ? "#161616" : isAgent ? "#25422f" : "#1d2c3a", border: `1px solid ${isClient ? "rgba(255,255,255,0.1)" : isAgent ? "rgba(126,224,168,0.3)" : "rgba(124,198,255,0.3)"}`, padding: "11px 14px", fontSize: 14, lineHeight: 1.45 }}>{msg.text}</div>
                          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>{msg.time}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "14px 16px" }}>
                    {isBot && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                        <span style={{ fontSize: 12.5, opacity: 0.6 }}>El bot está atendiendo. Tomá la conversación para responder vos.</span>
                        <button className="miniact" onClick={() => upd(active.id, { status: "humano", assignedTo: "Bruno" })} style={{ borderColor: "#7ee0a8", color: "#7ee0a8", whiteSpace: "nowrap" }}>Tomar conversación</button>
                      </div>
                    )}
                    {active.status === "humano" && (
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Escribí un mensaje…" style={{ flex: 1, minWidth: 180, background: "#161616", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontFamily: SANS, fontSize: 14, padding: "12px 14px", outline: "none" }} />
                        <button className="miniact" onClick={send} style={{ background: "#25D366", color: "#0a0a0a", borderColor: "#25D366" }}>Enviar</button>
                        <button className="miniact" onClick={() => upd(active.id, { status: "resuelta" })}>Resolver</button>
                        <button className="miniact" onClick={() => upd(active.id, { status: "bot", assignedTo: null })}>Volver al bot</button>
                      </div>
                    )}
                    {active.status === "resuelta" && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                        <span style={{ fontSize: 12.5, opacity: 0.6 }}>Conversación resuelta.</span>
                        <button className="miniact" onClick={() => upd(active.id, { status: "humano", assignedTo: "Bruno" })}>Reabrir y responder</button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
          {/* ficha */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.12)", padding: 20, overflowY: "auto", minHeight: 0 }}>
            {active && (
              <>
                <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>Ficha del cliente</div>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                  {[["Visitas", String(active.client.visits)], ["Última visita", active.client.lastVisit], ["Valor de vida (LTV)", money(active.client.ltv)], ["Próximo turno", active.client.nextAppt]].map(([l, v]) => (
                    <div key={l}><div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.45 }}>{l}</div><div style={{ fontSize: 15, marginTop: 3 }}>{v}</div></div>
                  ))}
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.45, marginBottom: 8 }}>Etiquetas</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{active.tags.map((t) => <span key={t} style={{ fontSize: 11, padding: "4px 9px", border: "1px solid rgba(255,255,255,0.25)" }}>{t}</span>)}</div>
                  </div>
                  <div style={{ marginTop: 6, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.5 }}>{active.assignedTo ? `Asignado a ${active.assignedTo}` : "Sin asignar"}</div>
                    <a href="/agendar" className="miniact" style={{ display: "inline-block", marginTop: 12, textDecoration: "none" }}>Crear turno</a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

type AjP = { staff: Staff[]; setStaff: React.Dispatch<React.SetStateAction<Staff[]>>; svc: SvcP[]; setSvc: React.Dispatch<React.SetStateAction<SvcP[]>>; admins: Admin[]; setAdmins: React.Dispatch<React.SetStateAction<Admin[]>>; booking: { web: boolean; whatsapp: boolean }; setBooking: React.Dispatch<React.SetStateAction<{ web: boolean; whatsapp: boolean }>> };
function Ajustes({ staff, setStaff, svc, setSvc, admins, setAdmins, booking, setBooking }: AjP) {
  const bump = (id: number, pct: number) => setSvc((s) => s.map((x) => (x.id === id ? { ...x, price: Math.max(0, Math.round((x.price * (1 + pct / 100)) / 500) * 500) } : x)));
  const channels = [{ key: "web" as const, label: "Reservas por Web", on: booking.web }, { key: "whatsapp" as const, label: "Reservas por WhatsApp", on: booking.whatsapp }];
  return (
    <div className="adm-grid" style={{ marginTop: 28 }}>
      <div style={{ ...CARD, padding: 24, gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Personal · {staff.filter((p) => p.active).length} activos</div>
          <button className="miniact" onClick={() => { const name = prompt("Nombre del nuevo profesional:"); if (!name) return; const role = prompt("Rol (Barbero / Estilista / Master Barber):", "Barbero") || "Barbero"; setStaff((s) => [...s, { id: Date.now(), name, role, active: true }]); }}>+ Agregar profesional</button>
        </div>
        <div className="adm-staff">
          {staff.map((p) => (
            <div key={p.id} style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 15 }}>{initials(p.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1 }}>{p.name}</div><div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5, marginTop: 3 }}>{p.role}</div></div>
                <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: p.active ? "#7ee0a8" : "rgba(255,255,255,0.4)" }}>{p.active ? "Activo" : "Inactivo"}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="miniact" onClick={() => setStaff((s) => s.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))} style={{ flex: 1 }}>{p.active ? "Desactivar" : "Activar"}</button>
                <button className="miniact dng" onClick={() => { if (confirm(`¿Quitar a ${p.name} del equipo?`)) setStaff((s) => s.filter((x) => x.id !== p.id)); }}>Quitar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...CARD, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Precios de servicios</div>
          <button className="miniact" onClick={() => { if (!confirm("¿Aumentar TODOS los precios un 10%?")) return; setSvc((s) => s.map((x) => ({ ...x, price: Math.round((x.price * 1.1) / 500) * 500 }))); }}>+10% a todos</button>
        </div>
        {svc.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: 14 }}>{s.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: SERIF, fontSize: 18, minWidth: 96, textAlign: "right" }}>{money(s.price)}</span>
              <button className="qbtn" onClick={() => bump(s.id, -10)}>−</button><button className="qbtn" onClick={() => bump(s.id, 10)}>+</button>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.4 }}>Los botones ajustan ±10%, redondeando a $500.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Usuarios admin</div>
            <button className="miniact" onClick={() => { const email = prompt("Email del nuevo admin:"); if (!email) return; const name = prompt("Nombre:") || email.split("@")[0]; const role = prompt("Rol (Editor / Recepción / Dueño):", "Editor") || "Editor"; setAdmins((a) => [...a, { id: Date.now(), name, email, role }]); }}>+ Invitar</button>
          </div>
          {admins.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15 }}>{a.name}</div><div style={{ fontSize: 12, opacity: 0.5 }}>{a.email}</div></div>
              <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: a.role === "Dueño" ? "#ffcf66" : "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)", padding: "4px 9px" }}>{a.role}</span>
              {a.role !== "Dueño" && <button className="miniact dng" onClick={() => { if (confirm(`¿Quitar acceso admin a ${a.name}?`)) setAdmins((ad) => ad.filter((x) => x.id !== a.id)); }}>Quitar</button>}
            </div>
          ))}
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6, marginBottom: 16 }}>Canales de reserva</div>
          {channels.map((b) => (
            <div key={b.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div><div style={{ fontSize: 14 }}>{b.label}</div><div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{b.on ? "Activado" : "Pausado"}</div></div>
              <div onClick={() => setBooking((bk) => ({ ...bk, [b.key]: !bk[b.key] }))} style={{ width: 44, height: 24, borderRadius: 12, background: b.on ? "#25D366" : "rgba(255,255,255,0.2)", position: "relative", cursor: "pointer", transition: "background .2s" }}>
                <span style={{ position: "absolute", top: 2, left: b.on ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type DispP = { availEnabled: boolean; setAvailEnabled: React.Dispatch<React.SetStateAction<boolean>>; availMode: "open" | "allowlist"; setAvailMode: (m: "open" | "allowlist") => void; markedDays: string[]; setMarkedDays: React.Dispatch<React.SetStateAction<string[]>>; blocks: Block[]; setBlocks: React.Dispatch<React.SetStateAction<Block[]>>; view: { y: number; m: number }; setView: React.Dispatch<React.SetStateAction<{ y: number; m: number }>> };
function Disponibilidad({ availEnabled, setAvailEnabled, availMode, setAvailMode, markedDays, setMarkedDays, blocks, setBlocks, view, setView }: DispP) {
  const { y: vy, m: vm } = view;
  const fd = (new Date(vy, vm, 1).getDay() + 6) % 7;
  const dim = new Date(vy, vm + 1, 0).getDate();
  const allow = availMode === "allowlist";
  const toggleDay = (key: string) => setMarkedDays((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
  return (
    <>
      <div style={{ marginTop: 28, ...CARD, padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1 }}>Estado general de la agenda</div>
          <div style={{ marginTop: 8, fontSize: 13, color: availEnabled ? "#7ee0a8" : "#ff7a7a" }}>{availEnabled ? "Agenda abierta" : "Agenda cerrada — no se aceptan reservas"}</div>
        </div>
        <div onClick={() => setAvailEnabled((v) => !v)} style={{ width: 58, height: 30, borderRadius: 15, background: availEnabled ? "#25D366" : "rgba(255,255,255,0.2)", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 3, left: availEnabled ? 31 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
        </div>
      </div>
      <div className="adm-grid" style={{ marginTop: 16, "--cols": "1.1fr 1fr" } as React.CSSProperties}>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Días de apertura</div>
          <div style={{ marginTop: 16, display: "flex", border: "1px solid rgba(255,255,255,0.18)" }}>
            <div onClick={() => { setAvailMode("open"); setMarkedDays([]); }} style={{ flex: 1, textAlign: "center", padding: 10, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", background: !allow ? "#fff" : "transparent", color: !allow ? "#0a0a0a" : "rgba(255,255,255,0.6)" }}>Abierta por defecto</div>
            <div onClick={() => { setAvailMode("allowlist"); setMarkedDays([]); }} style={{ flex: 1, textAlign: "center", padding: 10, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", background: allow ? "#fff" : "transparent", color: allow ? "#0a0a0a" : "rgba(255,255,255,0.6)" }}>Solo días elegidos</div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>{allow ? "Marcá solo los días que querés ABRIR. El resto queda cerrado." : "Marcá los días que querés CERRAR. El resto queda abierto."}</div>
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button className="qbtn" onClick={() => setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: v.m === 0 ? 11 : v.m - 1 }))}>‹</button>
            <span style={{ fontFamily: SERIF, fontSize: 20, textTransform: "capitalize" }}>{`${MONTHS[vm]} ${vy}`}</span>
            <button className="qbtn" onClick={() => setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: v.m === 11 ? 0 : v.m + 1 }))}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, textAlign: "center", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {Array.from({ length: fd }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: dim }).map((_, idx) => {
              const d = idx + 1; const key = dateKey(new Date(vy, vm, d)); const marked = markedDays.includes(key); const open = allow ? marked : !marked;
              return (
                <div key={d} onClick={() => toggleDay(key)} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: marked ? (allow ? "rgba(40,200,90,0.22)" : "rgba(255,90,90,0.22)") : "transparent", color: open ? "#fff" : "rgba(255,120,120,0.9)", cursor: "pointer", border: `1px solid ${marked ? (allow ? "rgba(40,200,90,0.6)" : "rgba(255,90,90,0.6)") : "rgba(255,255,255,0.08)"}` }}>{d}</div>
              );
            })}
          </div>
        </div>
        <div style={{ ...CARD, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>Bloqueos puntuales</div>
            <button className="miniact" onClick={() => { const label = prompt("Motivo del bloqueo (ej: Feriado, Vacaciones):"); if (!label) return; const from = prompt("Desde (ej: 01/07/2026 14:00):", "") || "—"; const to = prompt("Hasta (ej: 01/07/2026 18:00):", "") || "—"; const scope = prompt("Alcance (Todo el local / Solo un profesional):", "Todo el local") || "Todo el local"; setBlocks((b) => [...b, { id: Date.now(), label, from, to, scope }]); }}>+ Agregar bloqueo</button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.5, marginBottom: 16 }}>Cerrá franjas específicas: desde una hora puntual hasta varios meses (feriados, vacaciones, eventos).</div>
          {blocks.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff7a7a", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15 }}>{b.label}</div><div style={{ fontSize: 12, opacity: 0.55, marginTop: 3 }}>{b.from} → {b.to} · {b.scope}</div></div>
              <button className="miniact dng" onClick={() => setBlocks((bl) => bl.filter((x) => x.id !== b.id))}>Quitar</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
