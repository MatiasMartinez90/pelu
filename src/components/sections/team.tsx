import { Instagram } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/section-heading";
import { barbers } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Team() {
  return (
    <section id="barberos" className="container-px mx-auto max-w-6xl py-24">
      <SectionHeading
        eyebrow="El equipo"
        title="Nuestros barberos"
        desc="Elegí tu barbero favorito y reservá directamente con él."
      />

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {barbers.map((b) => (
          <Card
            key={b.id}
            className="group gap-0 overflow-hidden p-0 transition-colors hover:border-primary/50"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={b.photo}
                alt={b.name}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
              {b.instagram && (
                <a
                  href={`https://instagram.com/${b.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Instagram de ${b.name}`}
                  className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Instagram className="size-4" />
                </a>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-heading text-lg font-semibold">{b.name}</h3>
              <p
                className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  b.role === "ESTILISTA" ? "text-pink-400" : "text-primary"
                )}
              >
                {b.role}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{b.bio}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
