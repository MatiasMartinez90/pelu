import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { Gallery } from "@/components/sections/gallery";
import { Cta } from "@/components/sections/cta";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Galería | ${site.name}`,
  description: "Mirá nuestros cortes, fades y diseños.",
};

export default function GaleriaPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20">
        <Gallery />
        <Cta />
      </main>
      <Footer />
      <WhatsappFab />
    </>
  );
}
