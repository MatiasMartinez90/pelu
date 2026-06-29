import { Check } from "lucide-react";
import { stats } from "@/lib/data";
import { site } from "@/lib/site";

const points = [
  "Barberos profesionales con años de oficio",
  "Local con iluminación hexagonal y sillones premium",
  "Productos premium y herramientas esterilizadas",
  "Turnos online sin esperas ni vueltas",
];

export function About() {
  return (
    <section id="nosotros" className="bg-card/40 py-24">
      <div className="container-px mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=900&q=80&auto=format&fit=crop"
            alt="Barbero trabajando"
            className="aspect-[4/5] w-full rounded-2xl object-cover"
          />
          <div className="absolute -bottom-6 -right-4 hidden rounded-xl border border-primary/40 bg-background p-5 shadow-xl sm:block">
            <p className="font-heading text-3xl font-bold text-primary">+10</p>
            <p className="text-xs text-muted-foreground">años de experiencia</p>
          </div>
        </div>

        <div>
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">
            Sobre nosotros
          </span>
          <h2 className="mt-3 font-heading text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
            Más que una
            <br />
            barbería
          </h2>
          <p className="mt-5 text-muted-foreground">
            {site.name} nació con una idea simple: crear un espacio donde cada
            cliente se sienta único. Un lugar donde el estilo se encuentra con la
            precisión y la buena onda.
          </p>
          <p className="mt-4 text-muted-foreground">
            Desde un fade impecable hasta un arreglo de barba con toalla
            caliente, cada servicio está pensado al detalle. Esto no es solo un
            corte, es la experiencia {site.shortName}.
          </p>

          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm">{p}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="font-heading text-3xl font-bold text-primary">
                  {s.value}
                </dt>
                <dd className="mt-1 text-xs text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
