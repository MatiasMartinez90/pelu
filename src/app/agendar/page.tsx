import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { Wizard } from "@/components/booking/wizard";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Agendá tu turno | ${site.name}`,
  description: "Reservá tu turno online en segundos.",
};

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string }>;
}) {
  const { servicio } = await searchParams;
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 pt-28">
        <Wizard preselectServiceId={servicio} />
      </main>
      <Footer />
      <WhatsappFab />
    </>
  );
}
