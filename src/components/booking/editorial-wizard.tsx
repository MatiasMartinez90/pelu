"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Barber, BookingCatalog, Service } from "@/lib/booking-types";

const SERIF = "var(--font-serif)";
const SANS = "var(--font-sans)";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/booking";

const ars = new Intl.NumberFormat("es-AR");
const money = (n: number) => `$${ars.format(n)}`;

type Booking = {
  id: string;
  barber: string;
  service: string;
  starts_at: string;
  price: number;
};

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const stepDefs = [
  { n: "01", label: "Barbero" },
  { n: "02", label: "Servicio" },
  { n: "03", label: "Fecha & Hora" },
  { n: "04", label: "Confirmación" },
];

async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API}${path}`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export function EditorialWizard({
  preselectServiceId,
  initialCatalog,
  initialLoadError = false,
}: {
  preselectServiceId?: string;
  initialCatalog: BookingCatalog;
  initialLoadError?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [barbers] = useState<Barber[]>(initialCatalog.barbers);
  const [services, setServices] = useState<Service[]>([]);
  const [barberSlug, setBarberSlug] = useState<string | null>(null);
  const [serviceSlug, setServiceSlug] = useState<string | null>(null);
  const [dateTs, setDateTs] = useState<number | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const loadError = initialLoadError;
  const availabilityController = useRef<AbortController | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const barber = barbers.find((b) => b.slug === barberSlug) || null;
  const service = services.find((s) => s.slug === serviceSlug) || null;
  const selDate = dateTs ? new Date(dateTs) : null;

  const refreshSlots = useCallback(async () => {
    if (!barberSlug || !serviceSlug || !selDate) return;
    await Promise.resolve();
    availabilityController.current?.abort();
    const controller = new AbortController();
    availabilityController.current = controller;
    setSlotsLoading(true);
    setSlots([]);
    try {
      const data = await apiGet<{ slots: string[] }>(
        `/api/v1/availability?barber=${barberSlug}&service=${serviceSlug}&date=${isoDate(selDate)}`,
        controller.signal,
      );
      if (availabilityController.current === controller) setSlots(data.slots);
    } catch (error) {
      if ((error as Error).name !== "AbortError" && availabilityController.current === controller) {
        setSlots([]);
      }
    } finally {
      if (availabilityController.current === controller) setSlotsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberSlug, serviceSlug, dateTs]);

  useEffect(() => {
    // Sincroniza la selección con el endpoint dinámico de disponibilidad.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSlots();
    return () => availabilityController.current?.abort();
  }, [refreshSlots]);

  function pickBarber(b: Barber) {
    const availableServices = initialCatalog.services_by_barber[b.slug] ?? [];
    setBarberSlug(b.slug);
    setServices(availableServices);
    if (preselectServiceId && availableServices.some((s) => s.slug === preselectServiceId)) {
      setServiceSlug(preselectServiceId);
      setStep(2);
    } else {
      setServiceSlug(null);
      setStep(1);
    }
  }

  function pickService(s: Service) {
    setServiceSlug(s.slug);
    setStep(2);
  }
  const back = () => setStep((s) => (s > 0 ? s - 1 : 0));

  const dateLabel = selDate
    ? `${DOW[selDate.getDay()]} ${String(selDate.getDate()).padStart(2, "0")}/${String(selDate.getMonth() + 1).padStart(2, "0")}`
    : "";

  const { y, m } = view;
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDisabled = y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth());

  const canContinue = !!(selDate && time);
  const formValid = name.trim().length > 1 && phone.trim().length > 5;

  async function confirm() {
    if (!barber || !service || !selDate || !time || !formValid || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/api/v1/bookings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          barber: barber.slug,
          service: service.slug,
          date: isoDate(selDate),
          time,
          customer: { name: name.trim(), phone: phone.trim(), email: email.trim() || null },
        }),
      });
      if (res.status === 201) {
        setConfirmed(await res.json());
        return;
      }
      if (res.status === 409 || res.status === 422) {
        const body = await res.json().catch(() => null);
        const detail = body?.detail;
        setErrorMsg(
          (typeof detail === "object" ? detail?.message : detail) ||
            "Ese horario ya no está disponible. Elegí otro."
        );
        setTime(null);
        setStep(2);
        refreshSlots();
        return;
      }
      setErrorMsg("No pudimos procesar la reserva. Probá de nuevo en unos minutos.");
    } catch {
      setErrorMsg("No hay conexión con el servidor de reservas. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Pantalla de éxito ──
  if (confirmed) {
    const d = new Date(confirmed.starts_at);
    return (
      <div className="wz-page" style={{ fontFamily: SANS }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.7 }}>Reserva confirmada</div>
          <h1 style={{ marginTop: 14, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(40px,6vw,64px)", lineHeight: 0.95 }}>¡Te esperamos!</h1>
          <div style={{ margin: "36px auto 0", border: "1px solid rgba(255,255,255,0.16)", background: "#101010", padding: 28, textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              ["Servicio", confirmed.service],
              ["Profesional", confirmed.barber],
              ["Fecha", `${DOW[d.getDay()]} ${d.toLocaleDateString("es-AR")} · ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs`],
              ["Precio", money(confirmed.price)],
              ["A nombre de", name],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>{l}</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            El pago se realiza en el local · Av. Cabildo 2200, CABA.
            <br />Para cancelar o reprogramar escribinos por WhatsApp.
          </p>
          <Link href="/" className="nox-btn" style={{ display: "inline-block", marginTop: 24, padding: "14px 32px" }}>Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wz-page" style={{ fontFamily: SANS }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.7 }}>
            <Link href="/" className="nox-link" style={{ opacity: 0.7 }}>NOX</Link> · Reserva Online
          </div>
          <h1 style={{ marginTop: 14, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(44px,6vw,76px)", lineHeight: 0.95, letterSpacing: "0.01em" }}>
            Agendá tu turno
          </h1>
          <div style={{ width: 64, height: 1, background: "rgba(255,255,255,0.5)", margin: "22px auto 0" }} />
        </header>

        {errorMsg && (
          <div role="alert" style={{ margin: "24px auto 0", maxWidth: 640, border: "1px solid rgba(255,120,120,0.5)", background: "rgba(255,90,90,0.08)", color: "#ffb3b3", padding: "14px 18px", fontSize: 14, textAlign: "center" }}>
            {errorMsg}
          </div>
        )}
        {loadError && (
          <div role="alert" style={{ margin: "24px auto 0", maxWidth: 640, border: "1px solid rgba(255,120,120,0.5)", padding: "14px 18px", fontSize: 14, textAlign: "center", color: "#ffb3b3" }}>
            No pudimos cargar la información de reservas. Recargá la página o escribinos por WhatsApp.
          </div>
        )}

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
            {barbers.length === 0 && !loadError && (
              <p style={{ textAlign: "center", marginTop: 40, opacity: 0.5 }}>Cargando profesionales…</p>
            )}
            <div className="wz-barbers" style={{ marginTop: 36 }}>
              {barbers.map((b, index) => {
                const sel = b.slug === barberSlug;
                return (
                  <button
                    type="button"
                    key={b.slug}
                    onClick={() => pickBarber(b)}
                    aria-pressed={sel}
                    style={{ cursor: "pointer", border: `1px solid ${sel ? "#fff" : "rgba(255,255,255,0.24)"}`, background: "#101010", color: "#fff", overflow: "hidden", transition: "border-color .25s", padding: 0, textAlign: "left", fontFamily: SANS }}
                  >
                    <div style={{ position: "relative", height: 280, overflow: "hidden" }}>
                      {b.photo_url && (
                        <Image
                          src={b.photo_url}
                          alt={b.name}
                          fill
                          unoptimized={b.photo_url.startsWith("/media/")}
                          loading={index < 2 ? "eager" : "lazy"}
                          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                          style={{ objectFit: "cover", objectPosition: "center 22%", filter: sel ? "none" : "grayscale(1) contrast(1.04)", transition: "filter .3s" }}
                        />
                      )}
                      <div style={{ position: "absolute", top: 12, left: 12, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", background: b.role === "ESTILISTA" ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.55)", color: b.role === "ESTILISTA" ? "#0a0a0a" : "#fff", padding: "4px 9px" }}>{b.role}</div>
                    </div>
                    <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600 }}>{b.name}</span>
                      <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", opacity: sel ? 1 : 0.5 }}>Elegir →</span>
                    </div>
                  </button>
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
            {services.length === 0 && (
              <p style={{ textAlign: "center", marginTop: 40, opacity: 0.5 }}>Cargando servicios…</p>
            )}
            <div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              {services.map((s) => (
                <button
                  type="button"
                  key={s.slug}
                  onClick={() => pickService(s)}
                  className="svc-row"
                  style={{ width: "100%", padding: "24px 8px", border: 0, borderBottom: "1px solid rgba(255,255,255,0.18)", cursor: "pointer", background: "transparent", color: "#fff", textAlign: "left", fontFamily: SANS }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <h3 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600 }}>{s.name}</h3>
                      {s.badge && <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.4)", padding: "3px 8px" }}>{s.badge}</span>}
                    </div>
                    <p style={{ marginTop: 6, color: "rgba(255,255,255,0.5)", fontSize: 14, maxWidth: 520 }}>{s.description}</p>
                    <p style={{ marginTop: 8, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>{s.duration_min} min</p>
                  </div>
                  <div className="svc-right">
                    <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600 }}>{s.variable_price ? `desde ${money(s.price)}` : money(s.price)}</div>
                    <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", background: "#fff", color: "#0a0a0a", padding: "6px 14px", display: "inline-block", fontWeight: 700 }}>Agendar</div>
                  </div>
                </button>
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
                    type="button"
                    aria-label="Mes anterior"
                    onClick={() => !prevDisabled && setView({ y: m === 0 ? y - 1 : y, m: m === 0 ? 11 : m - 1 })}
                    style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: prevDisabled ? "default" : "pointer", opacity: prevDisabled ? 0.25 : 1 }}
                  >‹</button>
                  <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600 }}>{MONTHS[m]} {y}</span>
                  <button
                    type="button"
                    aria-label="Mes siguiente"
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
                      <button
                        type="button"
                        key={d}
                        onClick={() => { if (!disabled) { setDateTs(date.getTime()); setTime(null); } }}
                        disabled={disabled}
                        aria-label={`${DOW[date.getDay()]} ${d} de ${MONTHS[m]}`}
                        aria-pressed={sel}
                        style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: sel ? "#fff" : "transparent", color: sel ? "#0a0a0a" : disabled ? "rgba(255,255,255,0.32)" : "#fff", cursor: disabled ? "not-allowed" : "pointer", border: `1px solid ${sel ? "#fff" : "rgba(255,255,255,0.16)"}`, fontFamily: SANS }}
                      >{d}</button>
                    );
                  })}
                </div>
              </div>

              {/* Slots (server-side: reglas − bloqueos − turnos) */}
              <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#101010", padding: 22 }}>
                <h3 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600 }}>{selDate ? `Horarios — ${dateLabel}` : "Elegí una fecha"}</h3>
                {selDate ? (
                  slotsLoading ? (
                    <p role="status" aria-live="polite" style={{ marginTop: 16, color: "rgba(255,255,255,0.68)", fontSize: 14 }}>Buscando horarios…</p>
                  ) : slots.length === 0 ? (
                    <p style={{ marginTop: 16, color: "rgba(255,255,255,0.45)", fontSize: 14 }}>No quedan horarios libres ese día. Probá con otra fecha.</p>
                  ) : (
                    <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                      {slots.map((t) => {
                        const sel = time === t;
                        return (
                          <button type="button" aria-pressed={sel} key={t} onClick={() => setTime(t)} style={{ textAlign: "center", padding: "11px 0", fontSize: 14, cursor: "pointer", border: `1px solid ${sel ? "#fff" : "rgba(255,255,255,0.28)"}`, background: sel ? "#fff" : "transparent", color: sel ? "#0a0a0a" : "#fff", transition: "background .15s", fontFamily: SANS }}>{t}</button>
                        );
                      })}
                    </div>
                  )
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
                    {barber.photo_url && <Image src={barber.photo_url} alt="" width={48} height={48} sizes="48px" unoptimized={barber.photo_url.startsWith("/media/")} style={{ width: 48, height: 48, objectFit: "cover", filter: "grayscale(1)" }} />}
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
                    <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600 }}>{service.variable_price ? `desde ${money(service.price)}` : money(service.price)}</div>
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
                    { label: "Nombre completo", ph: "Ej: Juan Pérez", val: name, set: setName, type: "text", autoComplete: "name" },
                    { label: "Teléfono / WhatsApp", ph: "11 2345 6789", val: phone, set: setPhone, type: "tel", autoComplete: "tel" },
                    { label: "Email (opcional)", ph: "tu@email.com", val: email, set: setEmail, type: "email", autoComplete: "email" },
                  ].map((f) => (
                    <label key={f.label} style={{ display: "block" }}>
                      <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>{f.label}</span>
                      <input
                        className="wz-input"
                        type={f.type}
                        autoComplete={f.autoComplete}
                        value={f.val}
                        placeholder={f.ph}
                        onChange={(e) => f.set(e.target.value)}
                        style={{ marginTop: 8, width: "100%", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: 16, padding: "6px 0", outline: "none", fontFamily: SANS }}
                      />
                    </label>
                  ))}
                  <button onClick={confirm} disabled={submitting} style={{ marginTop: 6, width: "100%", background: formValid && !submitting ? "#fff" : "rgba(255,255,255,0.12)", color: formValid && !submitting ? "#0a0a0a" : "rgba(255,255,255,0.4)", border: "none", padding: 16, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, cursor: formValid && !submitting ? "pointer" : "not-allowed", fontFamily: SANS }}>
                    {submitting ? "Reservando…" : "Confirmar turno"}
                  </button>
                  <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Al confirmar, tu turno queda reservado. El pago se realiza en el local.</p>
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
