import type { Metadata } from "next";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Cómo llegar | ${site.name}`,
  description: "Dirección, horarios y contacto de NOX Barber.",
};

const ADDR = "Av. Cabildo 2200, C1428 CABA";
const WA = "https://wa.me/5491155550123";
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDR)}`;
const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(ADDR)}&output=embed`;

const info = [
  { label: "Dirección", value: "Av. Cabildo 2200", sub: "Belgrano, CABA" },
  { label: "Cómo llegar", value: "Subte D · Estación Ministro Carranza", sub: "Colectivos: 15, 29, 60, 152" },
  { label: "Teléfono / WhatsApp", value: "+54 9 11 5555-0123", sub: "" },
  { label: "Email", value: "hola@noxbarber.com.ar", sub: "" },
];
const hours = [
  { days: "Lunes a Viernes", time: "10:00 – 21:00", color: "#fff" },
  { days: "Sábados", time: "11:00 – 20:00", color: "#fff" },
  { days: "Domingos", time: "Cerrado", color: "rgba(255,255,255,0.4)" },
];

export default function ContactoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <EditorialNav />

      <section style={{ padding: "84px 40px 48px", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>Visitanos</div>
        <h1 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(56px,9vw,120px)", lineHeight: 0.88 }}>Cómo Llegar</h1>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px 40px", display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 32, alignItems: "stretch" }}>
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.14)" }}>
          {info.map((i) => (
            <div key={i.label} style={{ padding: "26px 28px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.5 }}>{i.label}</div>
              <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 22, fontWeight: 500, lineHeight: 1.3 }}>{i.value}</div>
              {i.sub && <div style={{ marginTop: 6, fontSize: 14, opacity: 0.55 }}>{i.sub}</div>}
            </div>
          ))}
          <div style={{ padding: "26px 28px", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="nox-btn" style={{ padding: "13px 22px" }}>Abrir en Maps</a>
            <a href={WA} target="_blank" rel="noreferrer" className="nox-link" style={{ border: "1px solid rgba(255,255,255,0.3)", padding: "13px 22px", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>WhatsApp</a>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.14)", overflow: "hidden", minHeight: 440, position: "relative" }}>
          <iframe src={mapEmbed} title="Ubicación" style={{ width: "100%", height: "100%", minHeight: 440, border: 0, filter: "grayscale(1) invert(0.9) contrast(0.85)" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 40px 120px" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.14)", display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
          {hours.map((h) => (
            <div key={h.days} style={{ padding: "32px 28px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{h.days}</div>
              <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: h.color }}>{h.time}</div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
