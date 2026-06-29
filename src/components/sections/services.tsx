import { Clock, Scissors, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/section-heading";
import { services, barbers } from "@/lib/data";
import { site, waLink, money } from "@/lib/site";
import { cn } from "@/lib/utils";

function whoDoes(barberIds: string[]) {
  return barberIds
    .map((id) => barbers.find((b) => b.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

export function Services() {
  return (
    <section id="servicios" className="container-px mx-auto max-w-6xl py-24">
      <SectionHeading
        eyebrow="Nuestros servicios"
        title="¿Qué buscás?"
        desc="Precios claros, turnos puntuales y terminación premium en cada servicio."
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const premium = s.id.endsWith("-bruno") || s.consultar;
          return (
            <Card
              key={s.id}
              className={cn(
                "relative gap-0 overflow-hidden p-6 transition-colors hover:border-primary/50",
                s.badge && "border-primary/50"
              )}
            >
              {s.badge && (
                <Badge className="absolute right-4 top-4">{s.badge}</Badge>
              )}
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  {premium ? (
                    <Crown className="size-5" />
                  ) : (
                    <Scissors className="size-5" />
                  )}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  {s.duration}
                </span>
              </div>

              <h3 className="mt-4 font-heading text-xl font-semibold">
                {s.name}
              </h3>
              {s.desc && (
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              )}
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-primary/80">
                Con {whoDoes(s.barberIds)}
              </p>

              <p className="mt-4 font-heading text-2xl font-bold text-primary">
                {money(s.price)}
              </p>

              <Button
                asChild
                className="mt-5 w-full"
                variant={s.consultar ? "outline" : "default"}
              >
                {s.consultar ? (
                  <a
                    href={waLink(
                      `Hola ${site.name}! Quiero consultar por ${s.name}.`
                    )}
                  >
                    Consultar por WhatsApp
                  </a>
                ) : (
                  <a href={`/agendar?servicio=${s.id}`}>Agendar</a>
                )}
              </Button>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
