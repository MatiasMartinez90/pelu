import type { MetadataRoute } from "next";
import { absoluteUrl, publicIndexingEnabled } from "@/lib/site";
import { getPublicServices } from "@/lib/booking-catalog";

const routes = ["", "/servicios", "/equipo", "/galeria", "/nosotros", "/faq", "/contacto", "/agendar"];
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!publicIndexingEnabled) return [];
  const services = await getPublicServices().catch(() => []);
  const allRoutes = [...routes, ...services.map(({ slug }) => `/servicios/${slug}`)];
  return allRoutes.map((path) => ({
    url: absoluteUrl(path || "/"),
    lastModified: new Date("2026-07-18T00:00:00.000Z"),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/agendar" ? 0.9 : 0.7,
  }));
}
