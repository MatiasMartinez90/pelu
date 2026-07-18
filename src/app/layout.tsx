import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";
import { RegisterSW } from "@/components/register-sw";
import { WebVitals } from "@/components/web-vitals";
import { StructuredData } from "@/components/structured-data";
import { localBusinessJsonLd } from "@/lib/seo";
import { publicIndexingEnabled } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | ${site.tagline} en ${site.city}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: site.name,
  },
  keywords: [
    site.name,
    "barbería",
    "barbershop",
    "corte de pelo",
    "fade",
    "barba",
    "turno online",
    site.city,
  ],
  openGraph: {
    type: "website",
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    siteName: site.name,
    locale: "es_AR",
    url: site.url,
    images: [{ url: "/img/hero-poster.jpg", width: 640, height: 360, alt: `${site.name} — ${site.tagline}` }],
  },
  twitter: { card: "summary_large_image", images: ["/img/hero-poster.jpg"] },
  alternates: { canonical: "/" },
  robots: { index: publicIndexingEnabled, follow: publicIndexingEnabled },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-grain">
        <StructuredData data={localBusinessJsonLd} />
        <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
        {process.env.DEMO_MODE === "true" && (
          <div
            role="status"
            style={{
              padding: "7px 16px",
              background: "#c40000",
              color: "#fff",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.14em",
            }}
          >
            MODO DEMO · LOS DATOS SE RESTABLECEN PERIÓDICAMENTE
          </div>
        )}
        <div id="contenido-principal">{children}</div>
        <WebVitals />
        <RegisterSW />
      </body>
    </html>
  );
}
