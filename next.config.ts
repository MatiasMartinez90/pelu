import type { NextConfig } from "next";

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
      "form-action 'self' https://auth.cloud-it.com.ar",
      "script-src 'self' 'unsafe-inline'",
      // layout.tsx carga Bodoni Moda/Archivo directo de Google Fonts (Geist/
      // Oswald ya van por next/font, self-hosted, y no necesitan esto).
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https://images.unsplash.com",
      "media-src 'self'",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api-nox.cloud-it.com.ar https://auth.cloud-it.com.ar",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
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
    ];
  },
};

export default nextConfig;

// ci: nox pipeline activo
