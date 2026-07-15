import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
  { name: "Thiago", role: "Barbero", bio: "Especialista en fades y cortes clásicos. Precisión en cada pasada.", instagram: "thiago.barber", photo: "/media/team/thiago.v1.webp" },
  { name: "Lautaro", role: "Barbero", bio: "El rey de los diseños a navaja y los cortes modernos.", instagram: "lautaro.barber", photo: "/media/team/lautaro.v1.webp" },
  { name: "Bruno", role: "Master Barber", bio: "Fundador. Experiencia premium de punta a punta.", instagram: "bruno.barber", photo: "/media/team/bruno.v1.webp" },
  { name: "Nahuel", role: "Barbero", bio: "Cortes prolijos y mucha buena onda. Tu corte de confianza.", instagram: "nahuel.barber", photo: "/media/team/nahuel.v1.webp" },
  { name: "Ramiro", role: "Barbero", bio: "Detallista al máximo. Terminaciones impecables a tijera.", instagram: "ramiro.barber", photo: "/media/team/ramiro.v1.webp" },
  { name: "Camila", role: "Estilista", bio: "Especialista en corte femenino, color y alisado profesional.", instagram: "camila.estilista", photo: "/media/team/camila.v1.webp" },
];

export default function EquipoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <EditorialNav active="equipo" />

      <section className="px-fluid" style={{ paddingTop: "clamp(48px,8vw,84px)", paddingBottom: 56, maxWidth: 1180, margin: "0 auto" }}>
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

      <section className="px-fluid" style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: "clamp(72px,10vw,120px)" }}>
        <div className="grid-team">
          {team.map((m) => (
            <Link key={m.name} href="/agendar" className="mbr">
              <div className="mbr__ph">
                <Image src={m.photo} alt={m.name} fill unoptimized sizes="(max-width: 900px) 50vw, 25vw" />
                <span className="mbr__ig">@{m.instagram}</span>
              </div>
              <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <h3 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{m.name}</h3>
                <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.55 }}>{m.role}</span>
              </div>
              <p style={{ marginTop: 10, color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.55, maxWidth: 320 }}>{m.bio}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
