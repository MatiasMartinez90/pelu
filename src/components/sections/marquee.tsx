const words = [
  "Fade",
  "Barba",
  "Diseño",
  "Color",
  "Ritual",
  "Estilo",
  "Navaja",
  "Premium",
];

export function Marquee() {
  const items = [...words, ...words];
  return (
    <div className="border-y border-border bg-primary py-3 text-primary-foreground">
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
        {items.map((w, i) => (
          <span
            key={i}
            className="font-heading text-sm font-semibold uppercase tracking-widest"
          >
            {w} <span className="opacity-50">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
