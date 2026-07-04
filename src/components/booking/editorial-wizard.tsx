"use client";

import { useMemo, useState } from "react";

const SERIF = "'Bodoni Moda', Georgia, serif";
const SANS = "'Archivo', system-ui, sans-serif";
const WHATSAPP = "5491155550123";

const ars = new Intl.NumberFormat("es-AR");
const money = (n: number) => `$${ars.format(n)}`;

type Barber = { id: string; name: string; role: "BARBERO" | "ESTILISTA"; photo: string };
type Service = { id: string; name: string; desc: string; price: number; duration: string; barberIds: string[]; badge?: string };

const barbers: Barber[] = [
  { id: "thiago", name: "Thiago", role: "BARBERO", photo: "https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=600&q=80&auto=format&fit=crop" },
  { id: "lautaro", name: "Lautaro", role: "BARBERO", photo: "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&q=80&auto=format&fit=crop" },
  { id: "bruno", name: "Bruno", role: "BARBERO", photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&q=80&auto=format&fit=crop" },
  { id: "nahuel", name: "Nahuel", role: "BARBERO", photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80&auto=format&fit=crop" },
  { id: "ramiro", name: "Ramiro", role: "BARBERO", photo: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80&auto=format&fit=crop" },
  { id: "camila", name: "Camila", role: "ESTILISTA", photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80&auto=format&fit=crop" },
];

const services: Service[] = [
  { id: "corte-masculino", name: "Corte Masculino", desc: "Corte personalizado con estilo.", price: 15000, duration: "30 min", barberIds: ["thiago", "lautaro", "nahuel", "ramiro", "camila"] },
  { id: "corte-barba", name: "Corte y Barba", desc: "Corte de pelo + arreglo de barba. El pack completo.", price: 18000, duration: "30 min", barberIds: ["lautaro", "nahuel", "ramiro", "camila"], badge: "Más pedido" },
  { id: "barba", name: "Barba", desc: "Recorte y perfilado de barba.", price: 13000, duration: "30 min", barberIds: ["thiago", "lautaro", "nahuel", "ramiro", "camila"] },
  { id: "corte-masculino-bruno", name: "Corte Masculino con Bruno", desc: "Corte personalizado con nuestro master barber.", price: 20000, duration: "30 min", barberIds: ["bruno"] },
  { id: "corte-barba-bruno", name: "Corte y Barba con Bruno", desc: "Corte de pelo + arreglo de barba con Bruno.", price: 23000, duration: "30 min", barberIds: ["bruno"], badge: "Premium" },
  { id: "barba-bruno", name: "Barba con Bruno", desc: "Arreglo de barba con nuestro master barber.", price: 15000, duration: "30 min", barberIds: ["bruno"] },
  { id: "corte-mujer", name: "Corte Mujer", desc: "Corte femenino personalizado. Estilo y técnica profesional.", price: 15000, duration: "30 min", barberIds: ["camila"] },
  { id: "color", name: "Color", desc: "El valor varía según el trabajo a realizar. Consultá por WhatsApp.", price: 70000, duration: "2 hs", barberIds: ["camila"], badge: "Exclusivo" },
  { id: "alisado", name: "Alisado Orgánico (sin formol)", desc: "Look liso y natural. El valor varía según largo y volumen.", price: 165000, duration: "3 hs 30 min", barberIds: ["camila"], badge: "Exclusivo" },
];

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const servicesForBarber = (id: string) => services.filter((s) => s.barberIds.includes(id));

function slotsForDate(d: Date): string[] {
  const sat = d.getDay() === 6;
  const startH = sat ? 11 : 10;
  const endH = sat ? 20 : 21;
  const out: string[] = [];
  for (let h = startH; h < endH; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

const stepDefs = [
  { n: "01", label: "Barbero" },
  { n: "02", label: "Servicio" },
  { n: "03", label: "Fecha & Hora" },
  { n: "04", label: "Confirmación" },
];

export function EditorialWizard({ preselectServiceId }: { preselectServiceId?: string }) {
  const [step, setStep] = useState(0);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateTs, setDateTs] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const barber = barbers.find((b) => b.id === barberId) || null;
  const service = services.find((s) => s.id === serviceId) || null;
  const selDate = dateTs ? new Date(dateTs) : null;

  function pickBarber(b: Barber) {
    setBarberId(b.id);
    const pre = preselectServiceId
      ? servicesForBarber(b.id).find((s) => s.id === preselectServiceId)
      : undefined;
    if (pre) {
      setServiceId(pre.id);
      setStep(2);
    } else {
      setServiceId(null);
      setStep(1);
    }
  }
  function pickService(s: Service) {
    setServiceId(s.id);
    setStep(2);
  }
  const back = () => setStep((s) => (s > 0 ? s - 1 : 0));

  const dateLabel = selDate
    ? `${DOW[selDate.getDay()]} ${String(selDate.getDate()).padStart(2, "0")}/${String(selDate.getMonth() + 1).padStart(2, "0")}`
    : "";

  // calendario
  const { y, m } = view;
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDisabled = y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth());

  const slots = selDate ? slotsForDate(selDate) : [];
  const canContinue = !!(selDate && time);
  const formValid = name.trim().length > 1 && phone.trim().length > 5;

  function confirm() {
    if (!barber || !service || !selDate || !time || !formValid) return;
    const msg = [
      `Hola NOX Barber! Quiero reservar un turno:`,
      ``,
      `Profesional: ${barber.name}`,
      `Servicio: ${service.name} (${money(service.price)})`,
      `Fecha: ${dateLabel} - ${time} hs`,
      ``,
      `Mis datos:`,
      `Nombre: ${name}`,
      `Tel: ${phone}`,
      email ? `Email: ${email}` : ``,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="wz-page" style={{ fontFamily: SANS }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.7 }}>
            <a href="/" className="nox-link" style={{ opacity: 0.7 }}>NOX</a> · Reserva Online
          </div>
          <h1 style={{ marginTop: 14, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(44px,6vw,76px)", lineHeight: 0.95, letterSpacing: "0.01em" }}>
            Agendá tu turno
          </h1>
          <div style={{ width: 64, height: 1, background: "rgba(255,255,255,0.5)", margin: "22px auto 0" }} />
        </header>

        {/* Stepper */}
        <div style={{ marginTop: 44, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "8px 0" }}>
          {stepDefs.map((s, i) => {
            const op = i === step ? 1 : i < step ? 0.7 : 0.32;
            const bar = i === step ? "#fff" : "transparent";
            return (
              <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 18px", borderBottom: `1.5px solid ${bar}` }}>
                  <span style={{ fontFamily: SERIF, fontSize: 20, opacity: op }}>{s.n}</span>
                  <span style={{ fontSize: 11.5, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, opacity: op }}>{s.label}</span>
                </div>
                {i < stepDefs.length - 1 && <span style={{ opacity: 0.3, margin: "0 4px" }}>/</span>}
              </div>
            );
          })}
        </div>

        {/* STEP 0 · Barbero */}
        {step === 0 && (
          <div style={{ marginTop: 52 }}>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 15 }}>Elegí al profesional con el que querés atenderte</p>
            <div className="wz-barbers" style={{ marginTop: 36 }}>
              {barbers.map((b) => {
                const sel = b.id === barberId;
                return (
                  <div
                    key={b.id}
                    onClick={() => pickBarber(b)}
                    style={{ cursor: "pointer", border: `1px solid ${sel ? "#fff" : "rgba(255,255,255,0.14)"}`, background: "#101010", overflow: "hidden", transition: "border-color .25s" }}
                  >
                    <div style={{ position: "relative", height: 280, overflow: "hidden" }}>
                      <img src={b.photo} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 22%", filter: sel ? "none" : "grayscale(1) contrast(1.04)", transition: "filter .3s" }} />
                      <div style={{ position: "absolute", top: 12, left: 12, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", background: b.role === "ESTILISTA" ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.55)", color: b.role === "ESTILISTA" ? "#0a0a0a" : "#fff", padding: "4px 9px" }}>{b.role}</div>
                    </div>
                    <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600 }}>{b.name}</span>
                      <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", opacity: sel ? 1 : 0.5 }}>Elegir →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1 · Servicio */}
        {step === 1 && barber && (
          <div style={{ marginTop: 52 }}>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 15 }}>
              Servicios disponibles con <span style={{ color: "#fff", fontWeight: 600 }}>{barber.name}</span>
            </p>
            <div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              {servicesForBarber(barber.id).map((s) => (
                <div
                  key={s.id}
                  onClick={() => pickService(s)}
                  className="svc-row"
                  style={{ padding: "24px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <h3 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600 }}>{s.name}</h3>
                      {s.badge && <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.4)", padding: "3px 8px" }}>{s.badge}</span>}
                    </div>
                    <p style={{ marginTop: 6, color: "rgba(255,255,255,0.5)", fontSize: 14, maxWidth: 520 }}>{s.desc}</p>
                    <p style={{ marginTop: 8, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>{s.duration}</p>
                  </div>
                  <div className="svc-right">
                    <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600 }}>{money(s.price)}</div>
                    <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", background: "#fff", color: "#0a0a0a", padding: "6px 14px", display: "inline-block", fontWeight: 700 }}>Agendar</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={back} style={{ marginTop: 28, background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, letterSpacing: "0.08em", cursor: "pointer", fontFamily: SANS }}>← Volver a elegir profesional</button>
          </div>
        )}

        {/* STEP 2 · Fecha y hora */}
        {step === 2 && (
          <div style={{ marginTop: 52 }}>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 15 }}>Elegí el día y horario que más te convenga</p>
            <div className="wz-2col" style={{ marginTop: 32 }}>
              {/* Calendar */}
              <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#101010", padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button
                    onClick={() => !prevDisabled && setView({ y: m === 0 ? y - 1 : y, m: m === 0 ? 11 : m - 1 })}
                    style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: prevDisabled ? "default" : "pointer", opacity: prevDisabled ? 0.25 : 1 }}
                  >‹</button>
                  <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600 }}>{MONTHS[m]} {y}</span>
                  <button
                    onClick={() => setView({ y: m === 11 ? y + 1 : y, m: m === 11 ? 0 : m + 1 })}
                    style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}
                  >›</button>
                </div>
                <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, textAlign: "center", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <span key={d}>{d}</span>)}
                </div>
                <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                  {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const d = idx + 1;
                    const date = new Date(y, m, d);
                    const past = date < today;
                    const sunday = date.getDay() === 0;
                    const disabled = past || sunday;
                    const sel = dateTs != null && date.getTime() === dateTs;
                    return (
                      <div
                        key={d}
                        onClick={() => { if (!disabled) { setDateTs(date.getTime()); setTime(null); } }}
                        style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: sel ? "#fff" : "transparent", color: sel ? "#0a0a0a" : disabled ? "rgba(255,255,255,0.2)" : "#fff", cursor: disabled ? "not-allowed" : "pointer", border: `1px solid ${sel ? "#fff" : "rgba(255,255,255,0.08)"}` }}
                      >{d}</div>
                    );
                  })}
                </div>
              </div>

              {/* Slots */}
              <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#101010", padding: 22 }}>
                <h3 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600 }}>{selDate ? `Horarios — ${dateLabel}` : "Elegí una fecha"}</h3>
                {selDate ? (
                  <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {slots.map((t) => {
                      const sel = time === t;
                      return (
                        <div key={t} onClick={() => setTime(t)} style={{ textAlign: "center", padding: "11px 0", fontSize: 14, cursor: "pointer", border: `1px solid ${sel ? "#fff" : "rgba(255,255,255,0.18)"}`, background: sel ? "#fff" : "transparent", color: sel ? "#0a0a0a" : "#fff", transition: "background .15s" }}>{t}</div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ marginTop: 16, color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Seleccioná un día en el calendario para ver los horarios disponibles.</p>
                )}
              </div>
            </div>

            <div style={{ marginTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <button onClick={back} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, letterSpacing: "0.08em", cursor: "pointer", fontFamily: SANS }}>← Volver a servicios</button>
              <button onClick={() => canContinue && setStep(3)} style={{ background: canContinue ? "#fff" : "rgba(255,255,255,0.12)", color: canContinue ? "#0a0a0a" : "rgba(255,255,255,0.4)", border: "none", padding: "14px 38px", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, cursor: canContinue ? "pointer" : "not-allowed", fontFamily: SANS }}>Continuar</button>
            </div>
          </div>
        )}

        {/* STEP 3 · Confirmación */}
        {step === 3 && barber && service && selDate && time && (
          <div style={{ marginTop: 52 }}>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 15 }}>Revisá los datos y completá tu información</p>
            <div className="wz-2col" style={{ marginTop: 32 }}>
              {/* Summary */}
              <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#101010", padding: 28 }}>
                <h3 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600 }}>Resumen del turno</h3>
                <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <img src={barber.photo} alt="" style={{ width: 48, height: 48, objectFit: "cover", filter: "grayscale(1)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Profesional</div>
                      <div style={{ fontWeight: 600, fontSize: 16, marginTop: 2 }}>{barber.name}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Servicio</div>
                      <div style={{ fontWeight: 600, fontSize: 16, marginTop: 2 }}>{service.name}</div>
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600 }}>{money(service.price)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Fecha y hora</div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginTop: 2 }}>{dateLabel} - {time} hs</div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#101010", padding: 28 }}>
                <h3 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600 }}>Tus datos</h3>
                <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 20 }}>
                  {[
                    { label: "Nombre completo", ph: "Ej: Juan Pérez", val: name, set: setName },
                    { label: "Teléfono / WhatsApp", ph: "11 2345 6789", val: phone, set: setPhone },
                    { label: "Email (opcional)", ph: "tu@email.com", val: email, set: setEmail },
                  ].map((f) => (
                    <label key={f.label} style={{ display: "block" }}>
                      <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>{f.label}</span>
                      <input
                        className="wz-input"
                        value={f.val}
                        placeholder={f.ph}
                        onChange={(e) => f.set(e.target.value)}
                        style={{ marginTop: 8, width: "100%", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: 16, padding: "6px 0", outline: "none", fontFamily: SANS }}
                      />
                    </label>
                  ))}
                  <button onClick={confirm} style={{ marginTop: 6, width: "100%", background: formValid ? "#fff" : "rgba(255,255,255,0.12)", color: formValid ? "#0a0a0a" : "rgba(255,255,255,0.4)", border: "none", padding: 16, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, cursor: formValid ? "pointer" : "not-allowed", fontFamily: SANS }}>Confirmar turno</button>
                  <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Al confirmar se abre WhatsApp con tu reserva lista para enviar.</p>
                </div>
              </div>
            </div>
            <button onClick={back} style={{ marginTop: 28, background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, letterSpacing: "0.08em", cursor: "pointer", fontFamily: SANS }}>← Volver a elegir horario</button>
          </div>
        )}
      </div>
    </div>
  );
}
