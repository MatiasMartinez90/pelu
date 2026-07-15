import type { Metadata, Viewport } from "next";
import { Archivo, Bodoni_Moda } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { RegisterSW } from "@/components/register-sw";
import { WebVitals } from "@/components/web-vitals";

const sans = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "optional",
});

const serif = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  display: "optional",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://noxbarber.com.ar"),
  title: `${site.name} | ${site.tagline} en ${site.city}`,
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
  },
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
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-grain">
        <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
        <div id="contenido-principal">{children}</div>
        <WebVitals />
        <RegisterSW />
      </body>
    </html>
  );
}
