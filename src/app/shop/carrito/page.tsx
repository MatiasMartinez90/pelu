"use client";

import Image from "next/image";
import { useCart } from "@/components/shop/cart-provider";
import { mediaAssetPath } from "@/lib/media-assets";
import { money, site } from "@/lib/site";

export default function CartPage() {
  const { cart, loading, busy, error, setQuantity, remove } = useCart();
  const checkoutUrl = new URL("/checkout", site.onlineStoreUrl).toString();
  const catalogUrl = site.onlineStoreUrl;

  if (loading) return <main className="shop-main"><div className="shop-loading"><span /><span /><span /></div></main>;
  if (!cart?.items.length) {
    return (
      <main className="shop-main shop-cart-page">
        <div className="shop-empty"><p className="shop-eyebrow">Tu carrito</p><h1>Todavía está vacío.</h1><p>Elegí productos del catálogo y volvé cuando quieras.</p><a className="shop-button" href={catalogUrl}>Ver productos</a></div>
      </main>
    );
  }

  return (
    <main className="shop-main shop-cart-page">
      <div className="shop-page-heading"><p className="shop-eyebrow">Tu selección</p><h1>Carrito</h1><span>{cart.total_quantity} {cart.total_quantity === 1 ? "producto" : "productos"}</span></div>
      {error && <p className="shop-alert" role="alert">{error}</p>}
      <div className="shop-cart-layout">
        <section className="shop-cart-items" aria-label="Productos del carrito">
          {cart.items.map((item) => {
            const image = item.product.image_url ? mediaAssetPath(item.product.image_url) : null;
            return (
              <article className="shop-cart-item" key={item.product.slug}>
                <div className="shop-cart-thumb">{image ? <Image src={image} alt="" fill sizes="120px" /> : <span>{item.product.name.slice(0, 2)}</span>}</div>
                <div className="shop-cart-product"><p>{item.product.category_name ?? "Producto"}</p><h2>{item.product.name}</h2><button type="button" disabled={busy} onClick={() => remove(item.product.slug)}>Eliminar</button></div>
                <div className="shop-quantity" aria-label={`Cantidad de ${item.product.name}`}>
                  <button type="button" aria-label="Quitar uno" disabled={busy} onClick={() => setQuantity(item.product.slug, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label="Agregar uno" disabled={busy || item.quantity >= item.product.available_qty} onClick={() => setQuantity(item.product.slug, item.quantity + 1)}>+</button>
                </div>
                <strong>{money(item.line_total)}</strong>
              </article>
            );
          })}
        </section>
        <aside className="shop-summary">
          <p className="shop-eyebrow">Resumen</p>
          <div><span>Subtotal</span><strong>{money(cart.subtotal)}</strong></div>
          <div><span>Entrega</span><strong>Retiro gratis</strong></div>
          <div className="shop-summary-total"><span>Total</span><strong>{money(cart.subtotal)}</strong></div>
          <a className="shop-button" href={checkoutUrl}>Continuar compra</a>
          <p>Pagás en el local cuando retirás tu pedido.</p>
        </aside>
      </div>
    </main>
  );
}
