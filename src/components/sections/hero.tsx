"use client";

import { useEffect, useRef } from "react";

const SERIF = "'Bodoni Moda', Georgia, serif";
const SANS = "'Archivo', system-ui, sans-serif";

// Hero video (Mixkit, licencia gratuita). Reemplazá por tu propio .mp4.
const DEFAULT_VIDEO = "https://assets.mixkit.co/videos/357/357-360.mp4";
const DEFAULT_POSTER =
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1600&q=85&auto=format&fit=crop";

type HeroProps = {
  brand?: string;
  videoSrc?: string;
  poster?: string;
};

export function Hero({ brand = "NOX", videoSrc = DEFAULT_VIDEO, poster = DEFAULT_POSTER }: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.play().catch(() => {});
    }
  }, [videoSrc]);

  const marquee = ("✶  " + brand + "  ·  BARBERÍA PREMIUM  ·  BUENOS AIRES  ").repeat(3);

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        overflow: "hidden",
        background: "#0a0a0a",
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
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "55% 26%",
          filter: "saturate(1.02) contrast(1.02)",
        }}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(95deg, rgba(8,8,8,0.82) 0%, rgba(8,8,8,0.5) 34%, rgba(8,8,8,0.12) 56%, rgba(8,8,8,0) 72%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0) 22%, rgba(8,8,8,0) 62%, rgba(8,8,8,0.7) 100%)" }} />

      {/* Top utility bar */}
      <header style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 40px", fontSize: 11.5, letterSpacing: "0.22em", textTransform: "uppercase" }}>
        <span style={{ opacity: 0.85 }}>Buenos Aires · Est. 2014</span>
        <nav style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <a href="https://instagram.com/noxbarber" className="nox-link" style={{ color: "#fff", opacity: 0.85 }}>Instagram</a>
          <span style={{ opacity: 0.45 }}>ES / EN</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4, width: 24 }}>
            <span style={{ height: 1.5, background: "#fff", width: "100%" }} />
            <span style={{ height: 1.5, background: "#fff", width: "100%" }} />
          </span>
        </nav>
      </header>

      {/* Main editorial overlay */}
      <div style={{ position: "absolute", left: 40, top: "14%", zIndex: 10, maxWidth: 640 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(88px,13vw,196px)", lineHeight: 0.84, letterSpacing: "0.01em", color: "#fff", textShadow: "0 2px 40px rgba(0,0,0,0.35)" }}>{brand}</div>
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
      <div style={{ position: "absolute", right: 30, top: "50%", transform: "translateY(-50%) rotate(180deg)", writingMode: "vertical-rl", zIndex: 10, fontSize: 11, letterSpacing: "0.34em", textTransform: "uppercase", opacity: 0.6 }}>Cortes · Fade · Barba · Color</div>

      {/* Bottom marquee */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 15, overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.16)", padding: "16px 0", backdropFilter: "blur(2px)" }}>
        <div style={{ display: "flex", width: "max-content", animation: "nox-marquee 26s linear infinite", whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 34, letterSpacing: "0.02em", opacity: 0.92 }}>{marquee}</span>
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 34, letterSpacing: "0.02em", opacity: 0.92 }}>{marquee}</span>
        </div>
      </div>
    </section>
  );
}
