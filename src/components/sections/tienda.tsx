import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/section-heading";
import { products } from "@/lib/data";
import { site, waLink, money } from "@/lib/site";

export function Tienda() {
  return (
    <section id="tienda" className="container-px mx-auto max-w-6xl py-24">
      <SectionHeading
        eyebrow="Productos"
        title="Tienda"
        desc="Llevate los productos que usamos en el local para mantener tu estilo en casa."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {products.map((p) => (
          <Card key={p.name} className="gap-0 overflow-hidden p-0">
            <div className="relative aspect-square overflow-hidden bg-secondary">
              <img
                src={p.photo}
                alt={p.name}
                className="size-full object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-heading text-lg font-semibold">{p.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              <ul className="mt-4 space-y-1.5">
                {p.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Check className="size-3.5 text-primary" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between">
                <span className="font-heading text-2xl font-bold text-primary">
                  {money(p.price)}
                </span>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={waLink(
                      `Hola ${site.name}! Quiero comprar ${p.name}.`
                    )}
                  >
                    Consultar
                  </a>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
