import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { StructuredData } from "@/components/structured-data";
import { site, waLink } from "@/lib/site";

const noticeHours = site.policies.cancellationNoticeMinutes / 60;
const noticeText = Number.isInteger(noticeHours)
  ? `${noticeHours} ${noticeHours === 1 ? "hora" : "horas"}`
  : `${site.policies.cancellationNoticeMinutes} minutos`;
const faqs = [
  { q: "¿Necesito reservar turno o puedo ir sin cita?", a: site.bookingEnabled ? `Trabajamos con turno para que no esperes. Podés reservar online desde “${site.copy.bookingCta}”.` : "Consultanos antes de venir para confirmar disponibilidad." },
  { q: "¿Cómo pago?", a: site.payments },
  { q: "¿Puedo cancelar o reprogramar mi turno?", a: `${site.policies.cancellationNotes} Te pedimos avisar con al menos ${noticeText} de anticipación.` },
  { q: "¿Necesito llegar antes de mi turno?", a: site.policies.arrivalRecommendation },
  ...(site.shop.enabled ? [{ q: "¿Venden productos para llevar?", a: site.shop.pickupOnly ? "Sí. Podés comprar en la tienda online y retirar tu pedido en el local." : "Sí. Podés comprar directamente desde nuestra tienda online." }] : []),
];

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <StructuredData data={faqJsonLd} schema="faq-page" />
      <EditorialNav />

      <section className="px-fluid" style={{ paddingTop: "clamp(48px,8vw,84px)", paddingBottom: 56, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>Ayuda</div>
        <h1 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(56px,9vw,120px)", lineHeight: 0.88 }}>Preguntas<br />Frecuentes</h1>
      </section>

      <section className="px-fluid" style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}>
          {faqs.map((f, i) => (
            <details key={f.q} className="faq-item faq-details" open={i === 0} style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", padding: "28px 12px" }}>
              <summary style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, cursor: "pointer" }}>
                <h2 style={{ fontFamily: SERIF, fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 600, lineHeight: 1.2 }}>{f.q}</h2>
                <span className="faq-plus" aria-hidden="true" style={{ fontSize: 28, lineHeight: 1, opacity: 0.75, flexShrink: 0 }}>+</span>
              </summary>
              <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.7, opacity: 0.78, maxWidth: 640 }}>{f.a}</p>
            </details>
          ))}
        </div>

        <div className="cta-box" style={{ marginTop: 56 }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 600 }}>¿No encontrás tu respuesta?</h2>
            <p style={{ marginTop: 10, opacity: 0.65, fontSize: 15 }}>Escribinos y te ayudamos.</p>
          </div>
          {site.channels.whatsapp.enabled ? (
            <a href={waLink()} target="_blank" rel="noreferrer" className="nox-btn" style={{ fontSize: 13, padding: "16px 32px" }}>Escribir por WhatsApp</a>
          ) : (
            <a href={`mailto:${site.email}`} className="nox-btn" style={{ fontSize: 13, padding: "16px 32px" }}>Enviar email</a>
          )}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
