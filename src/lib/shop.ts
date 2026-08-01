import { backendUrl } from "@/lib/backend-url";
import { site } from "@/lib/site";
import type { ShopCategory, ShopProduct, ShopProductList } from "@/lib/shop-types";

async function get<T>(path: string, tags: string[]): Promise<T> {
  const target = process.env.ECOMMERCE_API_URL
    ? `${process.env.ECOMMERCE_API_URL.replace(/\/$/, "")}/v1${path}`
    : `${backendUrl}/api/v1/shop${path}`;
  const response = await fetch(target, {
    next: { revalidate: 60, tags },
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`shop backend ${response.status}`);
  return response.json() as Promise<T>;
}

export function shopUrl(path = "/"): string {
  return new URL(path, `${site.onlineStoreUrl.replace(/\/$/, "")}/`).toString();
}

export function getShopCategories(): Promise<ShopCategory[]> {
  return get("/categories", ["shop-categories"]);
}

export function getShopProducts(params: {
  category?: string;
  q?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<ShopProductList> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.q) query.set("q", params.q);
  if (params.featured !== undefined) query.set("featured", String(params.featured));
  query.set("limit", String(params.limit ?? 24));
  query.set("offset", String(params.offset ?? 0));
  return get(`/products?${query}`, ["shop-products"]);
}

export async function getShopProduct(slug: string): Promise<ShopProduct | null> {
  const target = process.env.ECOMMERCE_API_URL
    ? `${process.env.ECOMMERCE_API_URL.replace(/\/$/, "")}/v1/products/${encodeURIComponent(slug)}`
    : `${backendUrl}/api/v1/shop/products/${encodeURIComponent(slug)}`;
  const response = await fetch(target, {
    next: { revalidate: 60, tags: ["shop-products", `shop-product-${slug}`] },
    headers: { accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`shop backend ${response.status}`);
  return response.json() as Promise<ShopProduct>;
}
