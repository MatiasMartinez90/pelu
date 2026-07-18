import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";
import { RegisterSW } from "@/components/register-sw";
import { WebVitals } from "@/components/web-vitals";
import { StructuredData } from "@/components/structured-data";
import { localBusinessJsonLd } from "@/lib/seo";
import { publicIndexingEnabled } from "@/lib/site";
import { mediaSource } from "@/lib/media";

const rootSocialImage = mediaSource("/img/hero-poster.jpg");

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | ${site.tagline} en ${site.city}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: site.name,
  },
  keywords: [site.name, ...site.seo.keywords, site.city],
  openGraph: {
    type: "website",
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    siteName: site.name,
    locale: site.locale.replace("-", "_"),
    url: site.url,
    images: [{ url: rootSocialImage, width: 640, height: 360, alt: `${site.name} — ${site.tagline}` }],
  },
  twitter: { card: "summary_large_image", images: [rootSocialImage] },
  alternates: { canonical: "/" },
  robots: { index: publicIndexingEnabled, follow: publicIndexingEnabled },
  icons: {
    icon: "/api/icon/192",
    apple: "/api/icon/192",
  },
};

export const viewport: Viewport = {
  themeColor: site.theme.primary,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={site.language}
      className="h-full antialiased"
      style={{
        "--background": site.theme.background,
        "--foreground": site.theme.foreground,
        "--card": site.theme.card,
        "--popover": site.theme.card,
        "--primary": site.theme.primary,
        "--ring": site.theme.primary,
        "--destructive": site.theme.primary,
        "--sidebar": site.theme.card,
        "--sidebar-primary": site.theme.primary,
        "--chart-1": site.theme.primary,
      } as React.CSSProperties}
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
            {site.copy.demoBanner}
          </div>
        )}
        <div id="contenido-principal">{children}</div>
        <WebVitals />
        <RegisterSW />
      </body>
    </html>
  );
}
