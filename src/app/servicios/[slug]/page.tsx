import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialNav, SANS, SERIF } from "@/components/editorial/nav";
import { Footer } from "@/components/sections/footer";
import { StructuredData } from "@/components/structured-data";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { getPublicServices } from "@/lib/booking-catalog";
import { absoluteUrl, money, site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

async function findService(slug: string) {
  const services = await getPublicServices().catch(() => []);
  return services.find((service) => service.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await findService(slug);
  if (!service) return pageMetadata({ title: "Servicio no encontrado", description: `El servicio solicitado no está disponible en ${site.name}.`, path: `/servicios/${slug}`, noIndex: true });
  return pageMetadata({
    title: service.name,
    description: `${service.description} Duración aproximada: ${service.duration_min} minutos. Reservá online en ${site.name}.`,
    path: `/servicios/${service.slug}`,
  });
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = await findService(slug);
  if (!service) notFound();

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${absoluteUrl(`/servicios/${service.slug}`)}#service`,
    name: service.name,
    description: service.description,
    provider: { "@id": `${site.url}/#business` },
    areaServed: { "@type": "City", name: site.city },
    offers: {
      "@type": "Offer",
      price: service.price,
      priceCurrency: site.currency,
      url: absoluteUrl(`${site.bookingPath}?servicio=${service.slug}`),
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Servicios", item: absoluteUrl("/servicios") },
      { "@type": "ListItem", position: 3, name: service.name, item: absoluteUrl(`/servicios/${service.slug}`) },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: SANS }}>
      <StructuredData data={serviceJsonLd} schema="service" />
      <StructuredData data={breadcrumbJsonLd} schema="breadcrumbs" />
      <EditorialNav active="servicios" />
      <main className="px-fluid" style={{ maxWidth: 900, margin: "0 auto", paddingTop: "clamp(56px,9vw,110px)", paddingBottom: "clamp(80px,12vw,140px)" }}>
        <nav aria-label="Migas de pan" style={{ fontSize: 13, opacity: 0.72 }}>
          <Link href="/">Inicio</Link> <span aria-hidden="true">/</span> <Link href="/servicios">Servicios</Link>
        </nav>
        <p style={{ marginTop: 48, fontSize: 12, letterSpacing: "0.35em", textTransform: "uppercase", opacity: 0.72 }}>{service.badge ?? `Servicio ${site.shortName}`}</p>
        <h1 style={{ marginTop: 16, fontFamily: SERIF, fontSize: "clamp(48px,8vw,100px)", lineHeight: 0.94 }}>{service.name}</h1>
        <p style={{ marginTop: 28, maxWidth: 680, fontSize: "clamp(18px,2vw,24px)", lineHeight: 1.55, opacity: 0.82 }}>{service.description}</p>
        <dl style={{ display: "flex", flexWrap: "wrap", gap: "28px 56px", marginTop: 40, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,.18)" }}>
          <div><dt style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", opacity: 0.72 }}>Duración</dt><dd style={{ marginTop: 8, fontSize: 20 }}>{service.duration_min} minutos</dd></div>
          <div><dt style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", opacity: 0.72 }}>Precio</dt><dd style={{ marginTop: 8, fontSize: 20 }}>{service.variable_price ? "Desde " : ""}{money(service.price)}</dd></div>
        </dl>
        {site.bookingEnabled && <Link href={`${site.bookingPath}?servicio=${service.slug}`} className="nox-btn" style={{ display: "inline-block", marginTop: 44, padding: "16px 32px" }}>Reservar este servicio</Link>}
      </main>
      <Footer />
      <WhatsappFab />
    </div>
  );
}
