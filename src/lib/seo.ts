import type { Metadata } from "next";
import { absoluteUrl, publicIndexingEnabled, site } from "@/lib/site";
import { mediaSource } from "@/lib/media";

const socialImage = mediaSource("/img/hero-poster.jpg");
const socialImageUrl = /^https?:\/\//.test(socialImage) ? socialImage : absoluteUrl(socialImage);

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
      locale: site.locale.replace("-", "_"),
      siteName: site.name,
      title: `${title} | ${site.name}`,
      description,
      url: absoluteUrl(path),
      images: [{ url: socialImageUrl, width: 640, height: 360, alt: `${site.name} — ${site.tagline}` }],
    },
    twitter: { card: "summary_large_image", title: `${title} | ${site.name}`, description, images: [socialImageUrl] },
  };
}

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": site.businessType === "appointments_business" ? "LocalBusiness" : "HairSalon",
  "@id": `${site.url}/#business`,
  name: site.name,
  url: site.url,
  description: site.description,
  telephone: site.phoneDisplay,
  email: site.email,
  image: socialImageUrl,
  priceRange: site.seo.priceRange,
  currenciesAccepted: site.currency,
  paymentAccepted: site.payments,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.streetAddress,
    addressLocality: site.city,
    addressRegion: site.region,
    postalCode: site.postalCode,
    addressCountry: site.countryCode,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: site.latitude,
    longitude: site.longitude,
  },
  openingHoursSpecification: site.openingHours.map((hours) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: hours.days,
    opens: hours.opens,
    closes: hours.closes,
  })),
  sameAs: site.channels.instagram.enabled ? [site.instagramUrl] : [],
};
