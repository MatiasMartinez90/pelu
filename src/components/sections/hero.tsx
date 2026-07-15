import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "@/components/sections/hero-video";

const SANS = "var(--font-sans)";

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
  const marquee = ("✶  " + brand + "  ·  BARBERÍA PREMIUM  ·  BUENOS AIRES  ").repeat(3);

  return (
    <section
      className="nox-hero"
      style={{ background: "#0a0a0a", fontFamily: SANS, color: "#fff" }}
    >
      <Image
        src={poster}
        alt=""
        fill
        preload
        sizes="100vw"
        aria-hidden="true"
        style={{
          objectFit: "cover",
          objectPosition: "55% 26%",
        }}
      />
      <HeroVideo mp4={videoSrc} webm={videoWebm} poster={poster} />

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
        <h1 className="nox-hero-brand">{brand}</h1>
        <div style={{ marginTop: 16, marginBottom: 32, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.82, paddingLeft: 4 }}>Barbería Premium</div>

        <nav style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 11, fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 500 }}>
          <Link href="/servicios" className="nox-link" style={{ color: "#fff", opacity: 0.92 }}>Servicios</Link>
          <div style={{ height: 14 }} />
          <Link href="/equipo" className="nox-link" style={{ color: "#fff", opacity: 0.92 }}>Equipo</Link>
          <Link href="/galeria" className="nox-link" style={{ color: "#fff", opacity: 0.92 }}>Galería</Link>
          <div style={{ height: 14 }} />
          <Link href="/agendar" prefetch className="nox-cta">Agendar Turno</Link>
          <a href="#tienda" className="nox-cta">Tienda</a>
          <div style={{ height: 14 }} />
          <div style={{ height: 14 }} />
          <Link href="/login" className="nox-link" style={{ color: "#fff", opacity: 0.92 }}>Ingresar</Link>
          <div style={{ height: 14 }} />
          <Link href="/nosotros" className="nox-link" style={{ color: "#fff", opacity: 0.78, fontSize: 14 }}>Nosotros</Link>
          <Link href="/faq" className="nox-link" style={{ color: "#fff", opacity: 0.78, fontSize: 14 }}>Preguntas Frecuentes</Link>
          <Link href="/contacto" className="nox-link" style={{ color: "#fff", opacity: 0.78, fontSize: 14 }}>Cómo Llegar</Link>
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
