import type { Metadata } from "next";
import { EditorialNav } from "@/components/editorial/nav";
import { EditorialWizard } from "@/components/booking/editorial-wizard";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { getBookingCatalog } from "@/lib/booking-catalog";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { notFound } from "next/navigation";

export const metadata: Metadata = pageMetadata({ title: "Agendá tu turno", description: `Reservá tu turno online en ${site.name}: elegí profesional, servicio, fecha y horario disponible.`, path: site.bookingPath });

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string; barbero?: string }>;
}) {
  if (!site.bookingEnabled) notFound();
  const { servicio, barbero } = await searchParams;
  const catalog = await getBookingCatalog().catch(() => ({
    barbers: [],
    services_by_barber: {},
  }));
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <EditorialNav />
      <EditorialWizard
        preselectServiceId={servicio}
        preselectBarberId={barbero}
        initialCatalog={catalog}
        initialLoadError={catalog.barbers.length === 0}
      />
      <WhatsappFab />
    </div>
  );
}
