import type { Metadata } from "next";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Nosotros | ${site.name}`,
  description: "Desde 2014 en Buenos Aires. El oficio detrás de NOX.",
};

const values = [
  { num: "01", title: "Precisión", text: "Cada corte se piensa y se ejecuta con detalle. No hay dos cabezas iguales." },
  { num: "02", title: "Tiempo", text: "Turnos sin apuro. Tu momento es tuyo, de principio a fin." },
  { num: "03", title: "Oficio", text: "Un equipo que se capacita siempre, con técnica y productos premium." },
];
const stats = [
  { value: "10", label: "Años de historia" },
  { value: "6", label: "Profesionales" },
  { value: "40K+", label: "Cortes realizados" },
  { value: "4.9★", label: "Rating de clientes" },
];

export default function NosotrosPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <EditorialNav />

      <section style={{ position: "relative", minHeight: "64vh", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <img src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1600&q=85&auto=format&fit=crop" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", filter: "grayscale(0.3) contrast(1.05)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,10,10,0.5) 0%,rgba(10,10,10,0) 40%,rgba(10,10,10,0.9) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, padding: "0 40px 56px", maxWidth: 1180, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.7 }}>Desde 2014 · Buenos Aires</div>
          <h1 style={{ marginTop: 16, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(56px,10vw,150px)", lineHeight: 0.86 }}>Nosotros</h1>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "90px 40px 40px", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 60, alignItems: "start" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.5, paddingTop: 12 }}>El oficio</div>
        <div>
          <p style={{ fontFamily: SERIF, fontSize: "clamp(26px,3.2vw,40px)", lineHeight: 1.25, fontWeight: 500 }}>Empezamos con una silla, una tijera y la idea de que un corte puede cambiarte el día.</p>
          <p style={{ marginTop: 28, fontSize: 16, lineHeight: 1.7, opacity: 0.7, maxWidth: 560 }}>Diez años después, NOX es un espacio donde la técnica y el detalle mandan. Cada corte es una conversación: entendemos qué querés, leemos tu pelo y tu estilo, y lo ejecutamos con precisión de relojería. Sin apuros, sin cortes en serie.</p>
          <p style={{ marginTop: 20, fontSize: 16, lineHeight: 1.7, opacity: 0.7, maxWidth: 560 }}>Trabajamos con productos premium, un equipo que se capacita constantemente y un ambiente pensado para que desconectes. Entrás con una idea, salís con la mejor versión.</p>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "60px 40px 40px" }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)", display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
          {values.map((v) => (
            <div key={v.num} style={{ padding: "40px 32px 40px 0", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 600, opacity: 0.3 }}>{v.num}</div>
              <h3 style={{ marginTop: 18, fontFamily: SERIF, fontSize: 26, fontWeight: 600 }}>{v.title}</h3>
              <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, opacity: 0.65 }}>{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 40px 60px" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.14)", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: "36px 28px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontFamily: SERIF, fontSize: "clamp(36px,4vw,54px)", fontWeight: 600, lineHeight: 1 }}>{s.value}</div>
              <div style={{ marginTop: 8, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.55 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 40px 120px" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.16)", padding: "56px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(32px,4.5vw,52px)", fontWeight: 600, lineHeight: 1 }}>Vení a conocernos</h2>
            <p style={{ marginTop: 12, opacity: 0.65, fontSize: 15 }}>Reservá tu turno y viví la experiencia NOX.</p>
          </div>
          <a href="/agendar" className="nox-btn" style={{ fontSize: 13, padding: "16px 32px" }}>Agendar Turno</a>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
