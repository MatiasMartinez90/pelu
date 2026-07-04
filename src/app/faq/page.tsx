"use client";

import { useState } from "react";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";

const WA = "https://wa.me/5491155550123";

const faqs = [
  { q: "¿Necesito reservar turno o puedo ir sin cita?", a: "Trabajamos con turno para que no esperes. Podés reservar por la web o por WhatsApp en segundos. Si venís sin turno, te atendemos según disponibilidad del momento." },
  { q: "¿Cómo pago?", a: "El pago se realiza en el local: aceptamos efectivo y transferencia. No cobramos seña para reservar." },
  { q: "¿Puedo cancelar o reprogramar mi turno?", a: "Sí, sin costo. Podés hacerlo desde tu cuenta o respondiendo el mensaje de confirmación de WhatsApp. Te pedimos avisar con al menos 2 horas de anticipación." },
  { q: "¿Cuánto dura un corte?", a: "La mayoría de los servicios duran 30 minutos. Color y alisado llevan más tiempo (entre 2 y 3½ horas), por eso se coordinan aparte." },
  { q: "¿Atienden público de todos los géneros?", a: "Sí. Tenemos servicios de corte masculino, femenino, barba, color y alisado. Camila es nuestra especialista en corte femenino y color." },
  { q: "¿Los precios del color y alisado son fijos?", a: "No: varían según el largo, el volumen y el trabajo a realizar. El valor publicado es el punto de partida. Coordinamos una evaluación sin cargo para darte el precio exacto." },
  { q: "¿Venden productos para llevar?", a: "Sí, en nuestra tienda online y en el local. Pomadas, aceites de barba, sprays y más, de la misma línea premium que usamos." },
];

export default function FaqPage() {
  const [open, setOpen] = useState(0);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <EditorialNav />

      <section className="px-fluid" style={{ paddingTop: "clamp(48px,8vw,84px)", paddingBottom: 56, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>Ayuda</div>
        <h1 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(56px,9vw,120px)", lineHeight: 0.88 }}>Preguntas<br />Frecuentes</h1>
      </section>

      <section className="px-fluid" style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="faq-item" onClick={() => setOpen(isOpen ? -1 : i)} style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", padding: "28px 12px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
                  <h3 style={{ fontFamily: SERIF, fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 600, lineHeight: 1.2 }}>{f.q}</h3>
                  <span style={{ fontSize: 28, lineHeight: 1, opacity: 0.6, flexShrink: 0, transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform .25s" }}>+</span>
                </div>
                <div style={{ maxHeight: isOpen ? 240 : 0, overflow: "hidden", transition: "max-height .3s ease, opacity .3s", opacity: isOpen ? 1 : 0 }}>
                  <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.7, opacity: 0.7, maxWidth: 640 }}>{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="cta-box" style={{ marginTop: 56 }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 600 }}>¿No encontrás tu respuesta?</h2>
            <p style={{ marginTop: 10, opacity: 0.65, fontSize: 15 }}>Escribinos por WhatsApp y te ayudamos al toque.</p>
          </div>
          <a href={WA} target="_blank" rel="noreferrer" className="nox-btn" style={{ fontSize: 13, padding: "16px 32px" }}>Escribir por WhatsApp</a>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
