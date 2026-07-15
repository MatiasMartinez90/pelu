import { Instagram as InstagramIcon } from "@/components/icons";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { gallery } from "@/lib/data";
import { site } from "@/lib/site";

export function InstagramStrip() {
  return (
    <section id="galeria" className="container-px mx-auto max-w-6xl py-24">
      <div className="text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Seguinos
        </span>
        <h2 className="mt-3 font-heading text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          @{site.instagram}
        </h2>
        <span className="mx-auto mt-3 block h-0.5 w-16 bg-primary" />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {gallery.slice(0, 6).map((src, i) => (
          <a
            key={src}
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square overflow-hidden rounded-xl"
          >
            <Image
              src={src}
              alt={`Trabajo ${i + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
              <InstagramIcon className="size-7 text-white" />
            </div>
          </a>
        ))}
      </div>

      <div className="mt-10 flex justify-center gap-3">
        <Button asChild variant="outline" size="lg">
          <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer">
            <InstagramIcon className="size-4" /> Seguinos en Instagram
          </a>
        </Button>
        <Button asChild size="lg">
          <Link href="/galeria">Ver galería</Link>
        </Button>
      </div>
    </section>
  );
}
