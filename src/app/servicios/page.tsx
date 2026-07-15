import type { Metadata } from "next";
import Link from "next/link";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Servicios | ${site.name}`,
  description: "Cortes, fade, barba, color y alisado. Carta de servicios NOX.",
};

const ars = new Intl.NumberFormat("es-AR");
const money = (n: number) => `$${ars.format(n)}`;

type Svc = {
  name: string;
  desc: string;
  price: number;
  duration: string;
  badge?: string;
};

const services: Svc[] = [
  { name: "Corte Masculino", desc: "Corte personalizado con estilo.", price: 15000, duration: "30 min" },
  { name: "Corte y Barba", desc: "Corte de pelo + arreglo de barba. El pack completo.", price: 18000, duration: "30 min", badge: "Más pedido" },
  { name: "Barba", desc: "Recorte y perfilado de barba.", price: 13000, duration: "30 min" },
  { name: "Corte Masculino con Bruno", desc: "Corte personalizado con nuestro master barber.", price: 20000, duration: "30 min" },
  { name: "Corte y Barba con Bruno", desc: "Corte de pelo + arreglo de barba con Bruno.", price: 23000, duration: "30 min", badge: "Premium" },
  { name: "Barba con Bruno", desc: "Arreglo de barba con nuestro master barber.", price: 15000, duration: "30 min" },
  { name: "Corte Mujer", desc: "Corte femenino personalizado. Estilo y técnica profesional.", price: 15000, duration: "30 min" },
  { name: "Color", desc: "El valor varía según el trabajo a realizar. Consultá por WhatsApp.", price: 70000, duration: "2 hs", badge: "Exclusivo" },
  { name: "Alisado Orgánico (sin formol)", desc: "Look liso y natural. El valor varía según largo y volumen del cabello.", price: 165000, duration: "3 hs 30 min", badge: "Exclusivo" },
];

export default function ServiciosPage() {
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
          Cortes, fade, barba, color y alisado. Todos los servicios incluyen lavado y peinado. El pago se realiza en el local.
        </p>
      </section>

      <section className="px-fluid" style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: "clamp(72px,10vw,120px)" }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}>
          {services.map((s) => (
            <Link
              key={s.name}
              href="/agendar"
              className="svc-row"
              style={{ padding: "30px 12px", borderBottom: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <h3 style={{ fontFamily: SERIF, fontSize: "clamp(24px,3vw,34px)", fontWeight: 600, lineHeight: 1 }}>{s.name}</h3>
                  {s.badge && (
                    <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.4)", padding: "4px 9px" }}>{s.badge}</span>
                  )}
                </div>
                <p style={{ marginTop: 10, color: "rgba(255,255,255,0.55)", fontSize: 15, maxWidth: 560, lineHeight: 1.5 }}>{s.desc}</p>
                <div style={{ marginTop: 12, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)" }}>Duración · {s.duration}</div>
              </div>
              <div className="svc-right">
                <div style={{ fontFamily: SERIF, fontSize: "clamp(28px,3.4vw,40px)", fontWeight: 600 }}>{money(s.price)}</div>
                <span className="svc-go" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fff" }}>Reservar →</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="cta-box" style={{ marginTop: 72 }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(32px,4.5vw,52px)", fontWeight: 600, lineHeight: 1 }}>¿Listo para tu próximo corte?</h2>
            <p style={{ marginTop: 12, opacity: 0.65, fontSize: 15 }}>Elegí tu profesional, servicio y horario en segundos.</p>
          </div>
          <Link href="/agendar" className="nox-btn" style={{ fontSize: 13, padding: "16px 32px" }}>Agendar Turno</Link>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
