import Image from "next/image";
import { AddToCart } from "@/components/shop/add-to-cart";
import { mediaAssetPath } from "@/lib/media-assets";
import { money } from "@/lib/site";
import { shopUrl } from "@/lib/shop";
import type { ShopProduct } from "@/lib/shop-types";

export function ProductCard({ product }: { product: ShopProduct }) {
  const image = product.image_url ? mediaAssetPath(product.image_url) : null;
  return (
    <article className="shop-product-card">
      <a href={shopUrl(`/productos/${product.slug}`)} className="shop-product-media" aria-label={`Ver ${product.name}`}>
        {image ? (
          <Image src={image} alt={product.name} fill sizes="(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 30vw" />
        ) : (
          <span className="shop-product-placeholder" aria-hidden="true">{product.name.slice(0, 2)}</span>
        )}
        {product.featured && <span className="shop-badge">Destacado</span>}
      </a>
      <div className="shop-product-info">
        <div>
          <p className="shop-eyebrow">{product.category_name ?? "Cuidado"}</p>
          <h2><a href={shopUrl(`/productos/${product.slug}`)}>{product.name}</a></h2>
          <p className="shop-product-copy">{product.short_description || product.description || "Producto profesional seleccionado por nuestro equipo."}</p>
        </div>
        <div className="shop-product-buy">
          <strong>{money(product.price)}</strong>
          <AddToCart slug={product.slug} inStock={product.in_stock} compact />
        </div>
      </div>
    </article>
  );
}
