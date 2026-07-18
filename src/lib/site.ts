import { formatMoney, installation } from "@/lib/installation";

// Vista backward-compatible del contrato de instalación. Los componentes no
// deben mantener copias propias de marca, contacto, moneda ni canales.
export const site = {
  tenant: installation.tenant,
  businessType: installation.businessType,
  url: (process.env.SITE_URL ?? installation.domains.site).replace(/\/$/, ""),
  name: installation.brand.name,
  shortName: installation.brand.shortName,
  establishedYear: installation.brand.establishedYear,
  tagline: installation.brand.tagline,
  city: installation.location.city,
  region: installation.location.region,
  description: installation.brand.description,
  phoneDisplay: installation.contact.phoneDisplay,
  whatsapp: installation.channels.whatsapp.address,
  instagram: installation.channels.instagram.address,
  instagramUrl: installation.channels.instagram.url,
  email: installation.contact.email,
  address: installation.location.address,
  streetAddress: installation.location.streetAddress,
  postalCode: installation.location.postalCode,
  neighborhood: installation.location.neighborhood,
  countryCode: installation.localization.countryCode,
  countryName: installation.localization.countryName,
  latitude: installation.location.latitude,
  longitude: installation.location.longitude,
  mapsQuery: installation.location.mapsQuery,
  directions: installation.location.directions,
  mapsEmbed: installation.location.mapsEmbed,
  hours: installation.hours,
  openingHours: installation.openingHours,
  payments: installation.payments.display,
  bookingEnabled: installation.booking.enabled,
  bookingPath: installation.booking.path,
  policies: installation.policies,
  onlineStoreUrl: process.env.NEXT_PUBLIC_SHOP_URL ?? installation.shop.url,
  locale: installation.localization.locale,
  language: installation.localization.language,
  timezone: installation.localization.timezone,
  currency: installation.localization.currency.code,
  theme: installation.brand.theme,
  seo: installation.seo,
  content: installation.content,
  copy: installation.copy,
  features: installation.features,
  shop: installation.shop,
  channels: installation.channels,
} as const;

export const publicIndexingEnabled = process.env.SITE_INDEXABLE !== "false";

export function absoluteUrl(path = "/") {
  return new URL(path, site.url).toString();
}

export function waLink(message?: string) {
  const base = `https://wa.me/${site.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function money(n: number) {
  return formatMoney(n);
}
