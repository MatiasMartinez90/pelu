import type { Metadata } from "next";
import { absoluteUrl, publicIndexingEnabled, site } from "@/lib/site";

type PageMetadata = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

export function pageMetadata({ title, description, path, noIndex = false }: PageMetadata): Metadata {
  const index = publicIndexingEnabled && !noIndex;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: index, googleBot: { index, follow: index } },
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: site.name,
      title: `${title} | ${site.name}`,
      description,
      url: absoluteUrl(path),
      images: [{ url: absoluteUrl("/img/hero-poster.jpg"), width: 640, height: 360, alt: `${site.name} — ${site.tagline}` }],
    },
    twitter: { card: "summary_large_image", title: `${title} | ${site.name}`, description, images: [absoluteUrl("/img/hero-poster.jpg")] },
  };
}

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "@id": `${site.url}/#business`,
  name: site.name,
  url: site.url,
  description: site.description,
  telephone: site.phoneDisplay,
  email: site.email,
  image: absoluteUrl("/img/hero-poster.jpg"),
  priceRange: "$$",
  currenciesAccepted: "ARS",
  paymentAccepted: "Efectivo, transferencia",
  address: {
    "@type": "PostalAddress",
    streetAddress: site.streetAddress,
    addressLocality: site.city,
    addressRegion: "CABA",
    postalCode: site.postalCode,
    addressCountry: site.countryCode,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: site.latitude,
    longitude: site.longitude,
  },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "10:00", closes: "21:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "11:00", closes: "20:00" },
  ],
  sameAs: [site.instagramUrl],
};
