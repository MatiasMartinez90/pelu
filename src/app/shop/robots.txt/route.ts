import { publicIndexingEnabled } from "@/lib/site";
import { shopUrl } from "@/lib/shop";

export function GET() {
  const rules = publicIndexingEnabled
    ? [
        "User-Agent: *",
        "Allow: /",
        "Disallow: /carrito",
        "Disallow: /checkout",
        "Disallow: /pago/",
        "Disallow: /pago-demo/",
        "Disallow: /api/",
      ]
    : ["User-Agent: *", "Disallow: /"];
  const body = [...rules, "", `Sitemap: ${shopUrl("/sitemap.xml")}`, `Host: ${shopUrl("/")}`, ""].join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
