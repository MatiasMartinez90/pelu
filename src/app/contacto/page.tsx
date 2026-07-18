import type { Metadata } from "next";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { site, waLink } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Cómo llegar", description: `Dirección, horarios y contacto de ${site.name} en ${site.neighborhood}, ${site.city}.`, path: "/contacto" });

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapsQuery)}`;

const info = [
  { label: "Dirección", value: site.streetAddress, sub: `${site.neighborhood}, ${site.city}` },
  { label: "Cómo llegar", value: site.directions, sub: "" },
  { label: "Teléfono", value: site.phoneDisplay, sub: "" },
  { label: "Email", value: site.email, sub: "" },
];

export default function ContactoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <EditorialNav />

      <section className="px-fluid" style={{ paddingTop: "clamp(48px,8vw,84px)", paddingBottom: 48, maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>Visitanos</div>
        <h1 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(56px,9vw,120px)", lineHeight: 0.88 }}>Cómo Llegar</h1>
      </section>

      <section className="px-fluid nox-split2" style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40 }}>
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
            {site.channels.whatsapp.enabled && <a href={waLink()} target="_blank" rel="noreferrer" className="nox-link" style={{ border: "1px solid rgba(255,255,255,0.3)", padding: "13px 22px", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>WhatsApp</a>}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.14)", overflow: "hidden", minHeight: 440, position: "relative" }}>
          <iframe src={site.mapsEmbed} title="Ubicación" style={{ width: "100%", height: "100%", minHeight: 440, border: 0, filter: "grayscale(1) contrast(1.05)" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </section>

      <section className="px-fluid" style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 20, paddingBottom: "clamp(72px,10vw,120px)" }}>
        <div className="grid-3cells" style={{ border: "1px solid rgba(255,255,255,0.14)" }}>
          {site.hours.map((hours) => (
            <div key={hours.day} className="cell-line" style={{ padding: "32px 28px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.5 }}>{hours.day}</div>
              <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: hours.time.toLowerCase() === "cerrado" ? "rgba(255,255,255,0.4)" : "#fff" }}>{hours.time}</div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
