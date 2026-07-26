"use client";

import Image from "next/image";
import { useState } from "react";
import { HeroVideo } from "@/components/sections/hero-video";

// Capa de medios del hero (poster + video + gradientes) con entrada tipo cortina:
// arranca casi negra y hace fade recién cuando el poster terminó de cargar, así el
// fade revela contenido real en vez de correr en vano antes de que llegue la imagen.
export function HeroMedia({ mp4, webm, poster }: { mp4: string; webm: string; poster: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="nox-hero-media"
      style={{
        position: "absolute",
        inset: 0,
        // 0.05 y no 0: Chrome descarta como candidato LCP lo que pinta con
        // opacity 0 y Lighthouse termina en NO_LCP (budget CI).
        opacity: loaded ? 1 : 0.05,
        transition: "opacity 1.4s ease",
      }}
    >
      <Image
        src={poster}
        alt=""
        fill
        priority
        sizes="100vw"
        onLoad={() => setLoaded(true)}
        style={{
          objectFit: "cover",
          objectPosition: "55% 26%",
        }}
      />
      <HeroVideo mp4={mp4} webm={webm} poster={poster} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(95deg, rgba(8,8,8,0.82) 0%, rgba(8,8,8,0.5) 34%, rgba(8,8,8,0.12) 56%, rgba(8,8,8,0) 72%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0) 22%, rgba(8,8,8,0) 62%, rgba(8,8,8,0.7) 100%)" }} />
    </div>
  );
}
