"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stepper, type StepId } from "@/components/booking/stepper";
import { Calendar } from "@/components/booking/calendar";
import {
  barbers,
  servicesForBarber,
  type Barber,
  type Service,
} from "@/lib/data";
import { site, waLink, money } from "@/lib/site";
import { cn } from "@/lib/utils";

function slotsForDate(date: Date): string[] {
  const sat = date.getDay() === 6;
  const startH = sat ? 11 : 10;
  const endH = sat ? 20 : 21; // último turno media hora antes
  const out: string[] = [];
  for (let h = startH; h < endH; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function Wizard({ preselectServiceId }: { preselectServiceId?: string }) {
  const [step, setStep] = useState<StepId>(0);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const myServices = useMemo(
    () => (barber ? servicesForBarber(barber.id) : []),
    [barber]
  );
  const slots = useMemo(() => (date ? slotsForDate(date) : []), [date]);

  function pickBarber(b: Barber) {
    setBarber(b);
    const pre = preselectServiceId
      ? servicesForBarber(b.id).find((s) => s.id === preselectServiceId)
      : undefined;
    if (pre) {
      setService(pre);
      setStep(2);
    } else {
      setService(null);
      setStep(1);
    }
  }

  function pickService(s: Service) {
    setService(s);
    setStep(2);
  }

  function back() {
    setStep((s) => (s > 0 ? ((s - 1) as StepId) : s));
  }

  const dateLabel = date
    ? `${DOW[date.getDay()]} ${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`
    : "";

  function confirm() {
    if (!barber || !service || !date || !time) return;
    const msg = [
      `Hola ${site.name}! Quiero reservar un turno:`,
      ``,
      `🧔 Barbero: ${barber.name}`,
      `✂️ Servicio: ${service.name} (${money(service.price)})`,
      `📅 Fecha: ${dateLabel} - ${time} hs`,
      ``,
      `Mis datos:`,
      `Nombre: ${form.name}`,
      `Tel: ${form.phone}`,
      form.email ? `Email: ${form.email}` : ``,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(waLink(msg), "_blank");
  }

  const formValid = form.name.trim().length > 1 && form.phone.trim().length > 5;

  return (
    <div className="container-px mx-auto max-w-5xl">
      <div className="text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Reserva online
        </span>
        <h1 className="mt-2 font-heading text-5xl font-bold uppercase tracking-tight sm:text-6xl">
          Agendá tu turno
        </h1>
        <span className="mx-auto mt-3 block h-0.5 w-20 bg-primary" />
      </div>

      <div className="mt-10">
        <Stepper current={step} />
      </div>

      {/* Paso 1: barbero */}
      {step === 0 && (
        <div className="mt-12">
          <p className="text-center text-muted-foreground">
            Elegí al barbero con el que querés atenderte
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((b) => (
              <button
                key={b.id}
                onClick={() => pickBarber(b)}
                className={cn(
                  "flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary",
                  barber?.id === b.id ? "border-primary" : "border-border"
                )}
              >
                <img
                  src={b.photo}
                  alt={b.name}
                  className="size-16 rounded-lg object-cover"
                />
                <div>
                  <p className="font-heading text-lg font-semibold">{b.name}</p>
                  <p
                    className={cn(
                      "text-xs font-medium uppercase tracking-wide",
                      b.role === "ESTILISTA" ? "text-pink-400" : "text-primary"
                    )}
                  >
                    {b.role}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 2: servicio */}
      {step === 1 && barber && (
        <div className="mt-12">
          <p className="text-center text-muted-foreground">
            Seleccioná el servicio que necesitás
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myServices.map((s) => (
              <Card
                key={s.id}
                className={cn(
                  "relative gap-0 p-5 transition-colors hover:border-primary",
                  service?.id === s.id && "border-primary"
                )}
              >
                {s.badge && (
                  <Badge className="absolute right-3 top-3">{s.badge}</Badge>
                )}
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-semibold">
                    {s.name}
                  </h3>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {s.duration}
                  </span>
                </div>
                {s.desc && (
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                )}
                <p className="mt-4 font-heading text-2xl font-bold text-primary">
                  {money(s.price)}
                </p>
                <Button className="mt-4 w-full" onClick={() => pickService(s)}>
                  Agendar
                </Button>
              </Card>
            ))}
          </div>
          <BackLink onClick={back} label="Volver a elegir barbero" />
        </div>
      )}

      {/* Paso 3: fecha y hora */}
      {step === 2 && (
        <div className="mt-12">
          <p className="text-center text-muted-foreground">
            Elegí el día y horario que más te convenga
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Calendar
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setTime(null);
              }}
            />
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-heading text-lg font-semibold">
                {date ? `Horarios — ${dateLabel}` : "Elegí una fecha"}
              </h3>
              {date ? (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setTime(s)}
                      className={cn(
                        "rounded-md border px-2 py-2.5 text-sm transition-colors",
                        time === s
                          ? "border-primary bg-primary font-semibold text-primary-foreground"
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Seleccioná un día en el calendario para ver los horarios
                  disponibles.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <BackLink
              onClick={back}
              label="Volver a elegir servicio"
              inline
            />
            <Button
              size="lg"
              disabled={!date || !time}
              onClick={() => setStep(3)}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Paso 4: confirmación */}
      {step === 3 && barber && service && date && time && (
        <div className="mt-12">
          <p className="text-center text-muted-foreground">
            Revisá los datos y completá tu información
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card className="gap-0 p-6">
              <h3 className="font-heading text-xl font-semibold">
                Resumen del turno
              </h3>
              <div className="mt-4 space-y-3">
                <SummaryRow label="Barbero" value={barber.name} img={barber.photo} />
                <SummaryRow
                  label="Servicio"
                  value={service.name}
                  extra={money(service.price)}
                />
                <SummaryRow
                  label="Fecha y hora"
                  value={`${dateLabel} - ${time} hs`}
                />
              </div>
            </Card>

            <Card className="gap-0 p-6">
              <h3 className="font-heading text-xl font-semibold">Tus datos</h3>
              <div className="mt-4 space-y-4">
                <Field
                  label="Nombre completo"
                  placeholder="Ej: Juan Pérez"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />
                <Field
                  label="Teléfono / WhatsApp"
                  placeholder="11 2345 6789"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                />
                <Field
                  label="Email (opcional)"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!formValid}
                  onClick={confirm}
                >
                  Confirmar turno
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Al confirmar se abre WhatsApp con tu reserva lista para enviar.
                </p>
              </div>
            </Card>
          </div>
          <BackLink onClick={back} label="Volver a elegir horario" />
        </div>
      )}
    </div>
  );
}

function BackLink({
  onClick,
  label,
  inline,
}: {
  onClick: () => void;
  label: string;
  inline?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        !inline && "mt-8"
      )}
    >
      <ArrowLeft className="size-4" /> {label}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  extra,
  img,
}: {
  label: string;
  value: string;
  extra?: string;
  img?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
      {img ? (
        <img src={img} alt={value} className="size-10 rounded-md object-cover" />
      ) : null}
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
      {extra && <p className="font-heading font-bold text-primary">{extra}</p>}
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}
