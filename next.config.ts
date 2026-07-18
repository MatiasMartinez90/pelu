import type { NextConfig } from "next";

const configuredMediaUrls = [
  process.env.NEXT_PUBLIC_MEDIA_PUBLIC_URL,
  process.env.NEXT_PUBLIC_MEDIA_TRANSFORM_URL,
].filter((value): value is string => Boolean(value));
const configuredMediaOrigins = [...new Set(configuredMediaUrls.map((value) => new URL(value).origin))];
const configuredMediaHosts = [...new Set(configuredMediaUrls.map((value) => new URL(value).hostname))];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      // /contacto embebe el mapa de OpenStreetMap (Google bloquea su embed sin key).
      "frame-src https://www.openstreetmap.org",
      "form-action 'self' https://auth.cloud-it.com.ar",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: https://images.unsplash.com ${configuredMediaOrigins.join(" ")}`.trim(),
      `media-src 'self' ${configuredMediaOrigins.join(" ")}`.trim(),
      "font-src 'self' data:",
      "connect-src 'self' https://api-nox.cloud-it.com.ar https://auth.cloud-it.com.ar",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // El CSS global pesa ~14 KB gzip. Inlinearlo elimina un round-trip
  // render-blocking que Lighthouse móvil midió en ~307 ms.
  experimental: { inlineCss: true },
  images: {
    ...(configuredMediaUrls.length > 0
      ? { loader: "custom" as const, loaderFile: "./src/lib/image-loader.ts" }
      : {}),
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...configuredMediaHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Video del hero (~1.5MB entre mp4+webm) y demás assets de /public
      // salían con cache-control: max-age=0 (se re-descargaban en cada
      // visita). No tienen hash en el nombre como _next/static, así que no
      // van "immutable": 1 semana + revalidate en background si cambian.
      {
        source: "/:path*(mp4|webm|jpg|jpeg|png|webp|avif|svg|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;

// ci: nox pipeline activo
