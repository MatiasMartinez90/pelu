import type { Metadata } from "next";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Galería | ${site.name}`,
  description: "Una selección de cortes, fades y diseños hechos en el local.",
};

const urls = [
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521490683712-35a1cb235d1c?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=800&q=80&auto=format&fit=crop",
];
const ars = ["3 / 4", "1 / 1", "4 / 5", "3 / 4", "1 / 1", "5 / 6", "4 / 5", "3 / 4"];

export default function GaleriaPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <EditorialNav active="galeria" />

      <section style={{ padding: "84px 40px 56px", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>
          Nuestro trabajo
        </div>
        <h1 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(56px,9vw,120px)", lineHeight: 0.88 }}>
          Galería
        </h1>
        <p style={{ marginTop: 24, maxWidth: 560, fontSize: 16, lineHeight: 1.6, opacity: 0.7 }}>
          Una selección de cortes, fades y diseños hechos en el local. Pasá el mouse para ver cada pieza en color.
        </p>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px 120px" }}>
        <div className="gal">
          {urls.map((src, i) => (
            <div key={src} className="gcell" style={{ aspectRatio: ars[i % ars.length] }}>
              <img src={src} alt="Trabajo NOX" loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
