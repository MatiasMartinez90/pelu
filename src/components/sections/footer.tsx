import { Scissors, MapPin, Phone, Clock } from "lucide-react";
import { Instagram } from "@/components/icons";
import { site, waLink } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container-px mx-auto grid max-w-6xl gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Scissors className="size-5" />
            </span>
            <span className="font-heading text-xl font-bold tracking-wide">
              {site.name}
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            {site.tagline} en {site.city}. {site.description.split(".")[1]}.
          </p>
        </div>

        <div>
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wide">
            Navegación
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="#servicios" className="hover:text-foreground">
                Servicios
              </a>
            </li>
            <li>
              <a href="#equipo" className="hover:text-foreground">
                Equipo
              </a>
            </li>
            <li>
              <a href="#galeria" className="hover:text-foreground">
                Galería
              </a>
            </li>
            <li>
              <a href="#visitanos" className="hover:text-foreground">
                Visitanos
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wide">
            Contacto
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              {site.address}
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              <a href={waLink()} className="hover:text-foreground">
                {site.phoneDisplay}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Instagram className="mt-0.5 size-4 shrink-0 text-primary" />
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                @{site.instagram}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wide">
            Horarios
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {site.hours.map((h) => (
              <li key={h.day} className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  {h.day}: {h.time}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-px mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.name}. Todos los derechos
            reservados.
          </p>
          <p>Hecho con ✂️ en {site.city}.</p>
        </div>
      </div>
    </footer>
  );
}
