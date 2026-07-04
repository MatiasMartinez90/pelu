import type { Metadata } from "next";
import { EditorialNav } from "@/components/editorial/nav";
import { EditorialWizard } from "@/components/booking/editorial-wizard";
import { WhatsappFab } from "@/components/whatsapp-fab";
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
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <EditorialNav />
      <EditorialWizard preselectServiceId={servicio} />
      <WhatsappFab />
    </div>
  );
}
