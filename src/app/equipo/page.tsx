import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { getBookingCatalog } from "@/lib/booking-catalog";

export const metadata: Metadata = pageMetadata({ title: "Equipo", description: `Conocé a los profesionales de ${site.name}: especialistas en cortes, fades, barba, color y estilo.`, path: "/equipo" });

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const team = await getBookingCatalog().then((catalog) => catalog.barbers).catch(() => []);
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
          {site.content.teamIntro}
        </p>
      </section>

      <section className="px-fluid" style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: "clamp(72px,10vw,120px)" }}>
        <div className="grid-team">
          {team.map((member) => (
            <Link key={member.slug} href={site.bookingEnabled ? `${site.bookingPath}?barbero=${member.slug}` : "/contacto"} className="mbr">
              <div className="mbr__ph">
                {member.photo_url ? (
                  <Image src={member.photo_url} alt={member.name} fill sizes="(max-width: 900px) 50vw, 25vw" />
                ) : (
                  <div aria-hidden="true" style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", fontFamily: SERIF, fontSize: 64, background: "#171717" }}>
                    {member.name.slice(0, 1)}
                  </div>
                )}
                {member.instagram && <span className="mbr__ig">@{member.instagram}</span>}
              </div>
              <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <h3 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{member.name}</h3>
                <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.55 }}>{member.role}</span>
              </div>
              {member.bio && <p style={{ marginTop: 10, color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.55, maxWidth: 320 }}>{member.bio}</p>}
            </Link>
          ))}
          {team.length === 0 && <p role="status" style={{ padding: "32px 0", opacity: 0.7 }}>No pudimos cargar el equipo. Probá nuevamente en unos minutos.</p>}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
