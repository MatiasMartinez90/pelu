"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { gallery } from "@/lib/data";

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const next = useCallback(
    () => setOpen((i) => (i === null ? i : (i + 1) % gallery.length)),
    []
  );
  const prev = useCallback(
    () =>
      setOpen((i) =>
        i === null ? i : (i - 1 + gallery.length) % gallery.length
      ),
    []
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, prev]);

  return (
    <section id="galeria" className="container-px mx-auto max-w-6xl py-24">
      <SectionHeading
        eyebrow="Galería"
        title="Nuestro trabajo"
        desc="Una muestra de cortes, fades y diseños hechos en el local."
      />

      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {gallery.map((src, i) => (
          <button
            key={src}
            onClick={() => setOpen(i)}
            className="group relative aspect-square overflow-hidden rounded-xl"
          >
            <img
              src={src}
              alt={`Trabajo ${i + 1}`}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/15" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button
            aria-label="Cerrar"
            className="absolute right-4 top-4 text-white/80 hover:text-white"
            onClick={close}
          >
            <X className="size-7" />
          </button>
          <button
            aria-label="Anterior"
            className="absolute left-3 text-white/80 hover:text-white sm:left-8"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
          >
            <ChevronLeft className="size-9" />
          </button>
          <img
            src={gallery[open]}
            alt={`Trabajo ${open + 1}`}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            aria-label="Siguiente"
            className="absolute right-3 text-white/80 hover:text-white sm:right-8"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
          >
            <ChevronRight className="size-9" />
          </button>
        </div>
      )}
    </section>
  );
}
