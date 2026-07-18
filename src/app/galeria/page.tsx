import type { Metadata } from "next";
import Image from "next/image";
import { EditorialNav, SERIF, SANS } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { mediaAsset } from "@/lib/media-assets";

export const metadata: Metadata = pageMetadata({ title: "Galería", description: `Cortes, fades, barba y diseños realizados por el equipo de ${site.name}.`, path: "/galeria" });

const urls = [
  mediaAsset("gallery.work01"),
  mediaAsset("gallery.work02"),
  mediaAsset("gallery.work03"),
  mediaAsset("gallery.work04"),
  mediaAsset("gallery.work05"),
  mediaAsset("gallery.work06"),
  mediaAsset("gallery.work07"),
  mediaAsset("gallery.work08"),
];
const ars = ["3 / 4", "1 / 1", "4 / 5", "3 / 4", "1 / 1", "5 / 6", "4 / 5", "3 / 4"];

export default function GaleriaPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <EditorialNav active="galeria" />

      <section className="px-fluid" style={{ paddingTop: "clamp(48px,8vw,84px)", paddingBottom: 56, maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>
          Nuestro trabajo
        </div>
        <h1 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(56px,9vw,120px)", lineHeight: 0.88 }}>
          Galería
        </h1>
        <p style={{ marginTop: 24, maxWidth: 560, fontSize: 16, lineHeight: 1.6, opacity: 0.7 }}>
          {site.content.galleryIntro}
        </p>
      </section>

      <section className="px-fluid" style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: "clamp(72px,10vw,120px)" }}>
        <div className="gal">
          {urls.map((src, i) => (
            <div key={src} className="gcell" style={{ aspectRatio: ars[i % ars.length] }}>
              <Image
                src={src}
                alt={`Trabajo de ${site.name}`}
                width={800}
                height={1000}
                loading="lazy"
                sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
