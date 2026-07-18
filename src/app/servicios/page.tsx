import type { Metadata } from "next";
import Link from "next/link";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { money, site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { getPublicServices } from "@/lib/booking-catalog";

export const metadata: Metadata = pageMetadata({ title: "Servicios", description: `${site.content.servicesIntro} ${site.name}.`, path: "/servicios" });
export const dynamic = "force-dynamic";

const duration = (minutes: number) => minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;

export default async function ServiciosPage() {
  const services = await getPublicServices().catch(() => []);
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <EditorialNav active="servicios" />

      <section className="px-fluid" style={{ paddingTop: "clamp(48px,8vw,84px)", paddingBottom: 56, maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>
          Carta de servicios
        </div>
        <h1 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(56px,9vw,120px)", lineHeight: 0.88, letterSpacing: "0.01em" }}>
          Servicios
        </h1>
        <p style={{ marginTop: 24, maxWidth: 560, fontSize: 16, lineHeight: 1.6, opacity: 0.7 }}>
          {site.content.servicesIntro} {site.payments}
        </p>
      </section>

      <section className="px-fluid" style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: "clamp(72px,10vw,120px)" }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}>
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/servicios/${s.slug}`}
              className="svc-row"
              style={{ padding: "30px 12px", borderBottom: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <h2 style={{ fontFamily: SERIF, fontSize: "clamp(24px,3vw,34px)", fontWeight: 600, lineHeight: 1 }}>{s.name}</h2>
                  {s.badge && (
                    <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.4)", padding: "4px 9px" }}>{s.badge}</span>
                  )}
                </div>
                <p style={{ marginTop: 10, color: "rgba(255,255,255,0.55)", fontSize: 15, maxWidth: 560, lineHeight: 1.5 }}>{s.description}</p>
                <div style={{ marginTop: 12, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Duración · {duration(s.duration_min)}</div>
              </div>
              <div className="svc-right">
                <div style={{ fontFamily: SERIF, fontSize: "clamp(28px,3.4vw,40px)", fontWeight: 600 }}>{s.variable_price ? "Desde " : ""}{money(s.price)}</div>
                <span className="svc-go" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fff" }}>Ver servicio →</span>
              </div>
            </Link>
          ))}
          {services.length === 0 && <p role="status" style={{ padding: "32px 12px", opacity: 0.7 }}>No pudimos cargar los servicios. Probá nuevamente en unos minutos.</p>}
        </div>

        {site.bookingEnabled && <div className="cta-box" style={{ marginTop: 72 }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(32px,4.5vw,52px)", fontWeight: 600, lineHeight: 1 }}>¿Listo para tu próximo corte?</h2>
            <p style={{ marginTop: 12, opacity: 0.65, fontSize: 15 }}>Elegí tu profesional, servicio y horario en segundos.</p>
          </div>
          <Link href={site.bookingPath} className="nox-btn" style={{ fontSize: 13, padding: "16px 32px" }}>{site.copy.bookingCta}</Link>
        </div>}
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
