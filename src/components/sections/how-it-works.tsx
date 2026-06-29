import { SectionHeading } from "@/components/section-heading";
import { steps } from "@/lib/data";

export function HowItWorks() {
  return (
    <section className="bg-card/40 py-24">
      <div className="container-px mx-auto max-w-6xl">
        <SectionHeading eyebrow="Simple y rápido" title="¿Cómo funciona?" />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-border bg-background p-8 text-center"
            >
              <span className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-primary font-heading text-2xl font-bold text-primary">
                {s.n}
              </span>
              <h3 className="mt-5 font-heading text-xl font-semibold">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
