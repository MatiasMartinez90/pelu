// Configuración central del sitio. Cambiá estos valores para rebrandear.
export const site = {
  url: (process.env.SITE_URL ?? "https://nox.cloud-it.com.ar").replace(/\/$/, ""),
  name: "NOX Barber",
  shortName: "NOX",
  tagline: "Barbería Premium",
  city: "Buenos Aires",
  description:
    "NOX Barber — barbería premium en Buenos Aires. Agendá tu turno online. Cortes, fade, barba, diseño y color con un equipo profesional.",
  // Datos de contacto (placeholders — reemplazá por los reales)
  phoneDisplay: "+54 9 11 5555-0123",
  whatsapp: "5491155550123", // sin signos, formato wa.me
  instagram: "noxbarber",
  instagramUrl: "https://instagram.com/noxbarber",
  email: "hola@noxbarber.com.ar",
  address: "Av. Cabildo 2200, CABA",
  streetAddress: "Av. Cabildo 2200",
  postalCode: "C1428",
  neighborhood: "Belgrano",
  countryCode: "AR",
  latitude: -34.5625,
  longitude: -58.456,
  mapsQuery: "Av. Cabildo 2200, CABA",
  mapsEmbed:
    "https://www.google.com/maps?q=Av.%20Cabildo%202200%2C%20CABA&output=embed",
  hours: [
    { day: "Lunes a Viernes", time: "10:00 – 21:00" },
    { day: "Sábados", time: "11:00 – 20:00" },
    { day: "Domingos", time: "Cerrado" },
  ],
  payments: "Efectivo y transferencia. El pago se realiza en el local.",
} as const;

export const publicIndexingEnabled = process.env.SITE_INDEXABLE !== "false";

export function absoluteUrl(path = "/") {
  return new URL(path, site.url).toString();
}

export function waLink(message?: string) {
  const base = `https://wa.me/${site.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

const ars = new Intl.NumberFormat("es-AR");
export function money(n: number) {
  return `$${ars.format(n)}`;
}
