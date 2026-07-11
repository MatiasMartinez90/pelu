"use client";

import { useEffect, useRef, useState } from "react";

const SERIF = "'Bodoni Moda', Georgia, serif";
const SANS = "'Archivo', system-ui, sans-serif";

// Hero video + poster self-hosteados en /public (no dependen de servicios externos).
// El poster es el frame 0 exacto del video → sin salto en la transición.
const DEFAULT_VIDEO = "/videos/hero.mp4";
const DEFAULT_VIDEO_WEBM = "/videos/hero.webm";
const DEFAULT_POSTER = "/img/hero-poster.jpg";

type HeroProps = {
  brand?: string;
  videoSrc?: string;
  videoWebm?: string;
  poster?: string;
};

export function Hero({ brand = "NOX", videoSrc = DEFAULT_VIDEO, videoWebm = DEFAULT_VIDEO_WEBM, poster = DEFAULT_POSTER }: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.play().catch(() => {});
      // Si el video ya estaba listo antes de montar el listener (cache), marcar ready.
      if (v.readyState >= 3) setReady(true);
    }
  }, [videoSrc]);

  const marquee = ("✶  " + brand + "  ·  BARBERÍA PREMIUM  ·  BUENOS AIRES  ").repeat(3);

  return (
    <section
      className="nox-hero"
      style={{
        background: `#0a0a0a url(${poster}) 55% 26% / cover no-repeat`,
        fontFamily: SANS,
        color: "#fff",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        poster={poster}
        preload="metadata"
        onPlaying={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "55% 26%",
          filter: "saturate(1.02) contrast(1.02)",
          opacity: ready ? 1 : 0,
          transition: "opacity 600ms ease-in",
        }}
      >
        <source src={videoWebm} type="video/webm" />
        <source src={videoSrc} type="video/mp4" />
      </video>

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(95deg, rgba(8,8,8,0.82) 0%, rgba(8,8,8,0.5) 34%, rgba(8,8,8,0.12) 56%, rgba(8,8,8,0) 72%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0) 22%, rgba(8,8,8,0) 62%, rgba(8,8,8,0.7) 100%)" }} />

      {/* Top utility bar */}
      <header className="nox-hero-top">
        <span style={{ opacity: 0.85 }}>Buenos Aires · Est. 2014</span>
        <nav style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <a href="https://instagram.com/noxbarber" className="nox-link" style={{ color: "#fff", opacity: 0.85 }}>Instagram</a>
          <span className="nox-hero-lang" style={{ opacity: 0.45 }}>ES / EN</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4, width: 24 }}>
            <span style={{ height: 1.5, background: "#fff", width: "100%" }} />
            <span style={{ height: 1.5, background: "#fff", width: "100%" }} />
          </span>
        </nav>
      </header>

      {/* Main editorial overlay */}
      <div className="nox-hero-main">
        <div className="nox-hero-brand">{brand}</div>
        <div style={{ marginTop: 16, marginBottom: 32, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.82, paddingLeft: 4 }}>Barbería Premium</div>

        <nav style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 11, fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 500 }}>
          <a href="/servicios" className="nox-link" style={{ color: "#fff", opacity: 0.92 }}>Servicios</a>
          <div style={{ height: 14 }} />
          <a href="/equipo" className="nox-link" style={{ color: "#fff", opacity: 0.92 }}>Equipo</a>
          <a href="/galeria" className="nox-link" style={{ color: "#fff", opacity: 0.92 }}>Galería</a>
          <div style={{ height: 14 }} />
          <a href="/agendar" className="nox-cta">Agendar Turno</a>
          <a href="#tienda" className="nox-cta">Tienda</a>
          <div style={{ height: 14 }} />
          <a href="/nosotros" className="nox-link" style={{ color: "#fff", opacity: 0.78, fontSize: 14 }}>Nosotros</a>
          <a href="/faq" className="nox-link" style={{ color: "#fff", opacity: 0.78, fontSize: 14 }}>Preguntas Frecuentes</a>
          <a href="/contacto" className="nox-link" style={{ color: "#fff", opacity: 0.78, fontSize: 14 }}>Cómo Llegar</a>
        </nav>
      </div>

      {/* Right vertical caption */}
      <div className="nox-hero-vert" style={{ position: "absolute", right: 30, top: "50%", transform: "translateY(-50%) rotate(180deg)", writingMode: "vertical-rl", zIndex: 10, fontSize: 11, letterSpacing: "0.34em", textTransform: "uppercase", opacity: 0.6 }}>Cortes · Fade · Barba · Color</div>

      {/* Bottom marquee */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 15, overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.16)", padding: "16px 0", backdropFilter: "blur(2px)" }}>
        <div style={{ display: "flex", width: "max-content", animation: "nox-marquee 26s linear infinite", whiteSpace: "nowrap" }}>
          <span className="nox-marquee-txt">{marquee}</span>
          <span className="nox-marquee-txt">{marquee}</span>
        </div>
      </div>
    </section>
  );
}
