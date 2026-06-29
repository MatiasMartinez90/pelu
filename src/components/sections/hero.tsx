import { Star, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Typewriter } from "@/components/typewriter";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section
      id="inicio"
      className="bg-hex relative flex min-h-[100svh] items-center overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,10,10,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-1 bg-primary" />

      <div className="container-px relative mx-auto w-full max-w-5xl py-28 text-center">
        <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          <span className="h-px w-8 bg-primary" />
          Barbería Premium
          <span className="h-px w-8 bg-primary" />
        </span>

        <h1 className="mt-8 font-heading text-6xl font-bold uppercase leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
          {site.name}
        </h1>

        <p className="mt-6 font-heading text-2xl font-medium text-foreground/90 sm:text-3xl">
          <Typewriter
            words={[
              "Estilo, precisión y actitud.",
              "Tu mejor versión.",
              "La experiencia premium.",
            ]}
          />
        </p>

        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Agendá tu turno con los mejores barberos y viví la experiencia{" "}
          {site.shortName}.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-w-52 text-base">
            <a href="/agendar">Agendar turno</a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="min-w-52 text-base"
          >
            <a href="#servicios">Ver servicios</a>
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Star className="size-4 fill-primary text-primary" />
            4.9 en Google
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 text-primary" />
            {site.address}
          </span>
        </div>
      </div>

      <a
        href="#nosotros"
        aria-label="Bajar"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground"
      >
        <ChevronDown className="size-7 animate-bounce" />
      </a>
    </section>
  );
}
