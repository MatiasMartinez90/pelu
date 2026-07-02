import type { Metadata } from "next";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Equipo | ${site.name}`,
  description: "Seis profesionales, un mismo estándar premium.",
};

type Member = {
  name: string;
  role: string;
  bio: string;
  instagram: string;
  photo: string;
};

const team: Member[] = [
  { name: "Thiago", role: "Barbero", bio: "Especialista en fades y cortes clásicos. Precisión en cada pasada.", instagram: "thiago.barber", photo: "https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=600&q=80&auto=format&fit=crop" },
  { name: "Lautaro", role: "Barbero", bio: "El rey de los diseños a navaja y los cortes modernos.", instagram: "lautaro.barber", photo: "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&q=80&auto=format&fit=crop" },
  { name: "Bruno", role: "Master Barber", bio: "Fundador. Experiencia premium de punta a punta.", instagram: "bruno.barber", photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&q=80&auto=format&fit=crop" },
  { name: "Nahuel", role: "Barbero", bio: "Cortes prolijos y mucha buena onda. Tu corte de confianza.", instagram: "nahuel.barber", photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80&auto=format&fit=crop" },
  { name: "Ramiro", role: "Barbero", bio: "Detallista al máximo. Terminaciones impecables a tijera.", instagram: "ramiro.barber", photo: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80&auto=format&fit=crop" },
  { name: "Camila", role: "Estilista", bio: "Especialista en corte femenino, color y alisado profesional.", instagram: "camila.estilista", photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80&auto=format&fit=crop" },
];

export default function EquipoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <EditorialNav active="equipo" />

      <section style={{ padding: "84px 40px 56px", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>
          Maestros del oficio
        </div>
        <h1 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(56px,9vw,120px)", lineHeight: 0.88 }}>
          El Equipo
        </h1>
        <p style={{ marginTop: 24, maxWidth: 560, fontSize: 16, lineHeight: 1.6, opacity: 0.7 }}>
          Seis profesionales, un mismo estándar: precisión, detalle y experiencia premium de punta a punta.
        </p>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px 120px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 22 }}>
          {team.map((m) => (
            <a key={m.name} href="/agendar" className="mbr">
              <div className="mbr__ph">
                <img src={m.photo} alt={m.name} />
                <span className="mbr__ig">@{m.instagram}</span>
              </div>
              <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <h3 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{m.name}</h3>
                <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.55 }}>{m.role}</span>
              </div>
              <p style={{ marginTop: 10, color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.55, maxWidth: 320 }}>{m.bio}</p>
            </a>
          ))}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
