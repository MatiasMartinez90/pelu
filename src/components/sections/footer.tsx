import Link from "next/link";

const SERIF = "var(--font-serif)";
const SANS = "var(--font-sans)";

const WA = "https://wa.me/5491155550123";
const IG = "https://instagram.com/noxbarber";

export function Footer({ brand = "NOX" }: { brand?: string }) {
  return (
    <footer style={{ background: "#0a0a0a", color: "#fff", borderTop: "1px solid rgba(255,255,255,0.16)", fontFamily: SANS }}>
      <div className="nfoot-grid">
        {/* Newsletter */}
        <div className="nfoot-cell">
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.6 }}>Newsletter</div>
          <p style={{ marginTop: 14, fontFamily: SERIF, fontSize: 24, lineHeight: 1.15, maxWidth: 300 }}>Sumate y enterate de novedades y promos.</p>
          <div style={{ marginTop: 24, display: "flex", alignItems: "stretch", maxWidth: 340 }}>
            <label className="sr-only" htmlFor="newsletter-email">Correo electrónico</label>
            <input id="newsletter-email" className="nox-foot-input" type="email" autoComplete="email" placeholder="Tu email" style={{ flex: 1, minWidth: 0, background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontFamily: SANS, fontSize: 14, padding: "12px 4px" }} />
            <button type="button" className="nox-news">Suscribirme</button>
          </div>
        </div>

        {/* Explorar */}
        <div className="nfoot-cell">
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.6 }}>Explorar</div>
          <nav style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 13, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <Link href="/servicios" className="nox-link" style={{ opacity: 0.85 }}>Servicios</Link>
            <Link href="/equipo" className="nox-link" style={{ opacity: 0.85 }}>Equipo</Link>
            <Link href="/galeria" className="nox-link" style={{ opacity: 0.85 }}>Galería</Link>
            <a href="#tienda" className="nox-link" style={{ opacity: 0.85 }}>Tienda</a>
            <Link href="/agendar" className="nox-link" style={{ opacity: 0.85 }}>Agendar Turno</Link>
          </nav>
        </div>

        {/* Info */}
        <div className="nfoot-cell">
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.6 }}>Información</div>
          <nav style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 13, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <a href={WA} target="_blank" rel="noreferrer" className="nox-link" style={{ opacity: 0.85 }}>Atención al Cliente</a>
            <Link href="/faq" className="nox-link" style={{ opacity: 0.85 }}>Preguntas Frecuentes</Link>
            <Link href="/nosotros" className="nox-link" style={{ opacity: 0.85 }}>Nosotros</Link>
            <Link href="/empleos" className="nox-link" style={{ opacity: 0.85 }}>Trabajá con Nosotros</Link>
          </nav>
        </div>

        {/* Social */}
        <div className="nfoot-cell" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 13, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <a href={IG} target="_blank" rel="noreferrer" className="nox-link" style={{ opacity: 0.85 }}>Instagram</a>
            <a href="#" className="nox-link" style={{ opacity: 0.85 }}>Facebook</a>
            <a href={WA} target="_blank" rel="noreferrer" className="nox-link" style={{ opacity: 0.85 }}>WhatsApp</a>
          </nav>
          <div style={{ marginTop: 30, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(44px, 8vw, 64px)", lineHeight: 0.8, opacity: 0.92 }}>{brand}</div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="nfoot-bottom">
        <div className="nfoot-bcell">
          <div style={{ letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.55, marginBottom: 8 }}>Horarios</div>
          <div style={{ opacity: 0.8 }}>Lunes a Viernes · 10:00 – 21:00</div>
          <div style={{ opacity: 0.8 }}>Sábados · 11:00 – 20:00</div>
          <div style={{ opacity: 0.5 }}>Domingos · Cerrado</div>
        </div>
        <div className="nfoot-bcell" style={{ opacity: 0.8 }}>
          <div style={{ letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>NOX Barber</div>
          Av. Cabildo 2200, CABA · Buenos Aires, Argentina<br />
          El pago se realiza en el local · Efectivo y transferencia
        </div>
        <div className="nfoot-bcell" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 18, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            <span style={{ opacity: 0.9 }}>ES</span>
            <span style={{ opacity: 0.65 }}>EN</span>
          </div>
          <div style={{ opacity: 0.5, marginTop: 24 }}>© 2026 NOX Barber</div>
        </div>
      </div>
    </footer>
  );
}
