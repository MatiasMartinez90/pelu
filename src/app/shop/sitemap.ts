import type { MetadataRoute } from "next";
import { getShopProducts, shopUrl } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getShopProducts({ limit: 100 });
  const now = new Date();
  return [
    { url: shopUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    ...products.items.map((product) => ({
      url: shopUrl(`/productos/${product.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
