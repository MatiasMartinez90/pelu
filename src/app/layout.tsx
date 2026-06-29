import type { Metadata, Viewport } from "next";
import { Geist, Oswald } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { RegisterSW } from "@/components/register-sw";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const heading = Oswald({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
      className={`${sans.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-grain">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
