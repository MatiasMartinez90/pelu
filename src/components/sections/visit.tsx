import { MapPin, Clock, Phone, CreditCard } from "lucide-react";
import { Instagram } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/section-heading";
import { site, waLink } from "@/lib/site";

export function Visit() {
  return (
    <section id="ubicacion" className="bg-card/40 py-24">
      <div className="container-px mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Encontranos"
          title="Ubicación"
          desc="Te esperamos en el local. Mejor con turno para no hacerte esperar."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="flex items-center gap-2 font-heading text-lg font-semibold">
                <Clock className="size-5 text-primary" /> Horarios
              </h3>
              <ul className="mt-4 space-y-2 text-sm">
                {site.hours.map((h) => (
                  <li
                    key={h.day}
                    className="flex justify-between border-b border-border/60 pb-2 last:border-0"
                  >
                    <span className="text-muted-foreground">{h.day}</span>
                    <span className="font-medium">{h.time}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-6">
                <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
                  <MapPin className="size-5 text-primary" /> Dirección
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {site.address}
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
                  <CreditCard className="size-5 text-primary" /> Pagos
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {site.payments}
                </p>
              </Card>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="flex-1">
                <a href={waLink(`Hola ${site.name}! Quiero agendar un turno.`)}>
                  <Phone className="size-4" /> Agendar por WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="flex-1">
                <a
                  href={site.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="size-4" /> @{site.instagram}
                </a>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            <iframe
              title="Ubicación en el mapa"
              src={site.mapsEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full min-h-80 w-full border-0"
            />
          </Card>
        </div>
      </div>
    </section>
  );
}
