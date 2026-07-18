"use client";

import { useState } from "react";
import { useCart } from "@/components/shop/cart-provider";

export function AddToCart({ slug, inStock, compact = false }: { slug: string; inStock: boolean; compact?: boolean }) {
  const { add, busy } = useCart();
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    try {
      await add(slug);
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1600);
    } catch {
      // El provider muestra el error contextual junto al carrito.
    }
  }

  return (
    <button
      type="button"
      className={compact ? "shop-button shop-button--compact" : "shop-button"}
      disabled={!inStock || busy}
      onClick={handleAdd}
      aria-live="polite"
    >
      {!inStock ? "Sin stock" : added ? "Agregado ✓" : "Agregar al carrito"}
    </button>
  );
}
