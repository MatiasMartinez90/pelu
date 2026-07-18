import type { MetadataRoute } from "next";
import { absoluteUrl, publicIndexingEnabled } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!publicIndexingEnabled) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/barbero", "/mi-cuenta", "/login", "/post-login", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
