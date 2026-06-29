import { CalendarClock, Timer, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

const features = [
  {
    icon: CalendarClock,
    title: "Reserva Online 24/7",
    desc: "Agendá cuando quieras, desde cualquier lugar.",
  },
  {
    icon: Timer,
    title: "Sin Espera",
    desc: "Llegás a tu hora y te atendemos al toque.",
  },
  {
    icon: MapPin,
    title: "Ubicación Céntrica",
    desc: site.address,
  },
];

export function Cta() {
  return (
    <section className="container-px mx-auto max-w-6xl py-16">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-card to-card px-6 py-16 text-center sm:px-12">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          No te quedes afuera
        </span>
        <h2 className="mx-auto mt-3 max-w-2xl font-heading text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          Agendá tu turno ahora
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Elegí tu barbero favorito, el servicio que necesitás y el horario que
          te quede cómodo. Reservá en segundos y venite tranquilo.
        </p>

        <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col items-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <f.icon className="size-6" />
              </span>
              <h3 className="mt-3 font-heading text-base font-semibold">
                {f.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <Button asChild size="lg" className="mt-10 text-base">
          <a href="/agendar">Reservar mi turno</a>
        </Button>
      </div>
    </section>
  );
}
