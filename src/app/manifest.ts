import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: site.theme.background,
    theme_color: site.theme.primary,
    orientation: "portrait",
    icons: [192, 512].map((size) => ({
      src: `/api/icon/${size}`,
      sizes: `${size}x${size}`,
      type: "image/svg+xml",
      purpose: "maskable" as const,
    })),
  };
}
