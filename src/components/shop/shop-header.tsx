"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/shop/cart-provider";
import { site } from "@/lib/site";

export function ShopHeader() {
  const { cart, loading } = useCart();
  const total = cart?.total_quantity ?? 0;
  return (
    <header className="shop-header">
      <a href={site.onlineStoreUrl} className="shop-brand" aria-label={`${site.name} Shop, inicio`}>
        <span>{site.shortName}</span><small>SHOP</small>
      </a>
      <nav aria-label="Navegación de la tienda" className="shop-nav">
        <a href={site.onlineStoreUrl}>Productos</a>
        <a href={site.url}>Sitio principal</a>
        <a href={new URL("/carrito", site.onlineStoreUrl).toString()} className="shop-cart-link" aria-label={`Carrito, ${total} productos`}>
          <ShoppingBag aria-hidden="true" size={19} />
          <span>{loading ? "·" : total}</span>
        </a>
      </nav>
    </header>
  );
}
