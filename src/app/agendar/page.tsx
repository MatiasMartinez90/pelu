import type { Metadata } from "next";
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
    <>
      <EditorialWizard preselectServiceId={servicio} />
      <WhatsappFab />
    </>
  );
}
