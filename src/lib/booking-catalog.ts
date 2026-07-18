import "server-only";
import type { BookingCatalog, Service } from "@/lib/booking-types";
import { backendUrl } from "@/lib/backend-url";

export async function getBookingCatalog(): Promise<BookingCatalog> {
  const response = await fetch(`${backendUrl}/api/v1/booking-bootstrap`, {
    cache: "force-cache",
    next: { revalidate: 300, tags: ["booking-catalog"] },
  });
  if (!response.ok) throw new Error(`booking bootstrap ${response.status}`);
  return response.json();
}

export async function getPublicServices(): Promise<Service[]> {
  const catalog = await getBookingCatalog();
  const unique = new Map<string, Service>();
  for (const services of Object.values(catalog.services_by_barber)) {
    for (const service of services) unique.set(service.slug, service);
  }
  return [...unique.values()];
}
