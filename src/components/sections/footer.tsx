import Link from "next/link";
import { site, waLink } from "@/lib/site";

const SERIF = "var(--font-serif)";
const SANS = "var(--font-sans)";

export function Footer({ brand = site.shortName }: { brand?: string }) {
  const whatsappUrl = waLink();
  return (
    <footer style={{ background: "#0a0a0a", color: "#fff", borderTop: "1px solid rgba(255,255,255,0.16)", fontFamily: SANS }}>
      <div className="nfoot-grid">
        {/* Newsletter */}
        {site.features.newsletter ? <div className="nfoot-cell">
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.6 }}>Newsletter</div>
          <p style={{ marginTop: 14, fontFamily: SERIF, fontSize: 24, lineHeight: 1.15, maxWidth: 300 }}>{site.copy.newsletterTitle}</p>
          <div style={{ marginTop: 24, display: "flex", alignItems: "stretch", maxWidth: 340 }}>
            <label className="sr-only" htmlFor="newsletter-email">Correo electrónico</label>
            <input id="newsletter-email" className="nox-foot-input" type="email" autoComplete="email" placeholder="Tu email" style={{ flex: 1, minWidth: 0, background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontFamily: SANS, fontSize: 14, padding: "12px 4px" }} />
            <button type="button" className="nox-news">Suscribirme</button>
          </div>
        </div> : <div className="nfoot-cell">
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.6 }}>Contacto</div>
          <p style={{ marginTop: 14, fontFamily: SERIF, fontSize: 24, lineHeight: 1.15, maxWidth: 300 }}>¿Tenés una consulta? Estamos para ayudarte.</p>
          <a href={`mailto:${site.email}`} className="nox-link" style={{ marginTop: 24, opacity: 0.85 }}>{site.email}</a>
        </div>}

        {/* Explorar */}
        <div className="nfoot-cell">
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.6 }}>Explorar</div>
          <nav style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 13, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <Link href="/servicios" className="nox-link" style={{ opacity: 0.85 }}>Servicios</Link>
            <Link href="/equipo" className="nox-link" style={{ opacity: 0.85 }}>Equipo</Link>
            <Link href="/galeria" className="nox-link" style={{ opacity: 0.85 }}>Galería</Link>
            {site.shop.enabled && <a href={site.onlineStoreUrl} className="nox-link" style={{ opacity: 0.85 }}>Tienda</a>}
            {site.bookingEnabled && <Link href={site.bookingPath} className="nox-link" style={{ opacity: 0.85 }}>{site.copy.bookingCta}</Link>}
          </nav>
        </div>

        {/* Info */}
        <div className="nfoot-cell">
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.6 }}>Información</div>
          <nav style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 13, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {site.channels.whatsapp.enabled && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="nox-link" style={{ opacity: 0.85 }}>Atención al Cliente</a>}
            <Link href="/faq" className="nox-link" style={{ opacity: 0.85 }}>Preguntas Frecuentes</Link>
            <Link href="/nosotros" className="nox-link" style={{ opacity: 0.85 }}>Nosotros</Link>
          </nav>
        </div>

        {/* Social */}
        <div className="nfoot-cell" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 13, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {site.channels.instagram.enabled && <a href={site.instagramUrl} target="_blank" rel="noreferrer" className="nox-link" style={{ opacity: 0.85 }}>Instagram</a>}
            {site.channels.whatsapp.enabled && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="nox-link" style={{ opacity: 0.85 }}>WhatsApp</a>}
          </nav>
          <div style={{ marginTop: 30, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(44px, 8vw, 64px)", lineHeight: 0.8, opacity: 0.92 }}>{brand}</div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="nfoot-bottom">
        <div className="nfoot-bcell">
          <div style={{ letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.55, marginBottom: 8 }}>Horarios</div>
          {site.hours.map((item) => <div key={item.day} style={{ opacity: item.time === "Cerrado" ? 0.5 : 0.8 }}>{item.day} · {item.time}</div>)}
        </div>
        <div className="nfoot-bcell" style={{ opacity: 0.8 }}>
          <div style={{ letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>{site.name}</div>
          {site.address} · {site.city}<br />
          {site.payments}
        </div>
        <div className="nfoot-bcell" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 18, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            <span style={{ opacity: 0.9 }}>ES</span>
            <span style={{ opacity: 0.65 }}>EN</span>
          </div>
          <div style={{ opacity: 0.5, marginTop: 24 }}>© {new Date().getFullYear()} {site.name}</div>
        </div>
      </div>
    </footer>
  );
}
