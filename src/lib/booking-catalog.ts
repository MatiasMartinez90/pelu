import "server-only";
import type { BookingCatalog } from "@/lib/booking-types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://nox-api.nox.svc.cluster.local";

export async function getBookingCatalog(): Promise<BookingCatalog> {
  const response = await fetch(`${BACKEND_URL}/api/v1/booking-bootstrap`, {
    cache: "force-cache",
    next: { revalidate: 300, tags: ["booking-catalog"] },
  });
  if (!response.ok) throw new Error(`booking bootstrap ${response.status}`);
  return response.json();
}
