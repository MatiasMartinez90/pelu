import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/shop/add-to-cart";
import { StructuredData } from "@/components/structured-data";
import { mediaAssetPath } from "@/lib/media-assets";
import { money, site } from "@/lib/site";
import { getShopProduct, shopUrl } from "@/lib/shop";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getShopProduct(slug);
  if (!product) return {};
  const description = product.short_description || product.description || `Comprá ${product.name} y retirá en el local.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: shopUrl(`/productos/${product.slug}`) },
    openGraph: {
      title: product.name,
      description,
      url: shopUrl(`/productos/${product.slug}`),
      images: product.image_url ? [mediaAssetPath(product.image_url)] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getShopProduct(slug);
  if (!product) notFound();
  const image = product.image_url ? mediaAssetPath(product.image_url) : null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description || product.short_description,
    image: image ? [image] : undefined,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url: shopUrl(`/productos/${product.slug}`),
      priceCurrency: site.currency,
      price: product.price,
      availability: `https://schema.org/${product.in_stock ? "InStock" : "OutOfStock"}`,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  return (
    <main className="shop-main shop-detail">
      <StructuredData data={schema} schema="product" />
      <a className="shop-back" href={shopUrl("/")}>← Volver al catálogo</a>
      <div className="shop-detail-grid">
        <div className="shop-detail-media">
          {image ? <Image src={image} alt={product.name} fill priority sizes="(max-width: 850px) 100vw, 55vw" /> : <span className="shop-product-placeholder" aria-hidden="true">{product.name.slice(0, 2)}</span>}
        </div>
        <article className="shop-detail-info">
          <p className="shop-eyebrow">{product.category_name ?? "Selección profesional"}</p>
          <h1>{product.name}</h1>
          <p className="shop-detail-price">{money(product.price)}</p>
          <p className="shop-detail-copy">{product.description || "Producto profesional seleccionado por nuestro equipo."}</p>
          <dl className="shop-detail-meta">
            <div><dt>Stock</dt><dd>{product.in_stock ? "Disponible" : "Agotado"}</dd></div>
            <div><dt>Entrega</dt><dd>Retiro en el local</dd></div>
            <div><dt>SKU</dt><dd>{product.sku}</dd></div>
          </dl>
          <AddToCart slug={product.slug} inStock={product.in_stock} />
          <p className="shop-pickup-note">Te avisamos cuando tu pedido esté listo. El pago se realiza al retirar.</p>
        </article>
      </div>
    </main>
  );
}
