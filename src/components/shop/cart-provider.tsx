"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { site } from "@/lib/site";
import { ShopApiError, shopApi } from "@/lib/shop-client";
import type { ShopCart } from "@/lib/shop-types";

type CartContextValue = {
  cart: ShopCart | null;
  loading: boolean;
  busy: boolean;
  error: string;
  add: (slug: string, quantity?: number) => Promise<void>;
  setQuantity: (slug: string, quantity: number) => Promise<void>;
  remove: (slug: string) => Promise<void>;
  reset: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = `${site.tenant}:shop-cart-token`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<ShopCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initialization = useRef<Promise<ShopCart> | null>(null);

  const create = useCallback(async () => {
    const value = await shopApi<ShopCart>("carts", { method: "POST", body: "{}" });
    localStorage.setItem(storageKey, value.token);
    setCart(value);
    return value;
  }, []);

  const ensure = useCallback(async (): Promise<ShopCart> => {
    if (cart) return cart;
    if (initialization.current) return initialization.current;
    initialization.current = (async () => {
      const token = localStorage.getItem(storageKey);
      if (token) {
        try {
          const value = await shopApi<ShopCart>(`carts/${token}`);
          setCart(value);
          return value;
        } catch (cause) {
          if (!(cause instanceof ShopApiError) || ![404, 422].includes(cause.status)) throw cause;
          localStorage.removeItem(storageKey);
        }
      }
      return create();
    })().finally(() => {
      initialization.current = null;
      setLoading(false);
    });
    return initialization.current;
  }, [cart, create]);

  useEffect(() => {
    const token = localStorage.getItem(storageKey);
    if (!token) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    shopApi<ShopCart>(`carts/${token}`)
      .then(setCart)
      .catch((cause) => {
        if (cause instanceof ShopApiError && [404, 422].includes(cause.status)) {
          localStorage.removeItem(storageKey);
          return;
        }
        setError(cause instanceof Error ? cause.message : "No pudimos cargar el carrito.");
      })
      .finally(() => setLoading(false));
  }, []);

  const mutate = useCallback(async (operation: () => Promise<ShopCart>) => {
    setBusy(true);
    setError("");
    try {
      setCart(await operation());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos actualizar el carrito.");
      throw cause;
    } finally {
      setBusy(false);
    }
  }, []);

  const setQuantity = useCallback(async (slug: string, quantity: number) => {
    const current = await ensure();
    if (quantity <= 0) {
      await mutate(() => shopApi(`carts/${current.token}/items/${slug}`, { method: "DELETE" }));
      return;
    }
    await mutate(() => shopApi(`carts/${current.token}/items/${slug}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    }));
  }, [ensure, mutate]);

  const add = useCallback(async (slug: string, quantity = 1) => {
    const current = await ensure();
    const existing = current.items.find((item) => item.product.slug === slug)?.quantity ?? 0;
    await setQuantity(slug, existing + quantity);
  }, [ensure, setQuantity]);

  const remove = useCallback(async (slug: string) => setQuantity(slug, 0), [setQuantity]);
  const reset = useCallback(() => {
    localStorage.removeItem(storageKey);
    setCart(null);
    setError("");
    initialization.current = null;
  }, []);

  const value = useMemo(
    () => ({ cart, loading, busy, error, add, setQuantity, remove, reset }),
    [cart, loading, busy, error, add, setQuantity, remove, reset],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart requiere CartProvider");
  return value;
}
