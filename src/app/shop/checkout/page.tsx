"use client";

import { FormEvent, useRef, useState } from "react";
import { useCart } from "@/components/shop/cart-provider";
import { shopApi } from "@/lib/shop-client";
import type { ShopOrder } from "@/lib/shop-types";
import { money, site } from "@/lib/site";

export default function CheckoutPage() {
  const { cart, loading, error: cartError, reset } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart?.items.length) return;
    setSubmitting(true);
    setError("");
    const data = new FormData(event.currentTarget);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const value = await shopApi<ShopOrder>("checkout", {
        method: "POST",
        headers: { "idempotency-key": idempotencyKey.current },
        body: JSON.stringify({
          cart_token: cart.token,
          payment_method: "pay_at_store",
          customer: {
            name: data.get("name"),
            email: data.get("email"),
            phone: data.get("phone"),
          },
          customer_notes: data.get("notes"),
        }),
      });
      setOrder(value);
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos confirmar el pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <main className="shop-main shop-checkout-page">
        <section className="shop-confirmation" aria-labelledby="confirmation-title">
          <span aria-hidden="true">✓</span><p className="shop-eyebrow">Pedido #{String(order.order_number).padStart(6, "0")}</p>
          <h1 id="confirmation-title">¡Listo, {order.customer_name.split(" ")[0]}!</h1>
          <p>Recibimos tu pedido. Te avisaremos cuando esté listo para retirar.</p>
          <dl><div><dt>Total</dt><dd>{money(order.total)}</dd></div><div><dt>Pago</dt><dd>En el local</dd></div><div><dt>Retiro</dt><dd>{order.pickup_location}</dd></div></dl>
          <a className="shop-button" href={site.onlineStoreUrl}>Volver al shop</a>
        </section>
      </main>
    );
  }
  if (loading) return <main className="shop-main"><div className="shop-loading"><span /><span /><span /></div></main>;
  if (!cart?.items.length) {
    return <main className="shop-main shop-checkout-page"><div className="shop-empty"><h1>No hay productos para confirmar.</h1><a className="shop-button" href={site.onlineStoreUrl}>Volver al shop</a></div></main>;
  }

  return (
    <main className="shop-main shop-checkout-page">
      <div className="shop-page-heading"><p className="shop-eyebrow">Retiro en el local</p><h1>Confirmá tu pedido</h1></div>
      {(error || cartError) && <p className="shop-alert" role="alert">{error || cartError}</p>}
      <div className="shop-checkout-layout">
        <form className="shop-checkout-form" onSubmit={submit}>
          <fieldset disabled={submitting}>
            <legend>Datos de contacto</legend>
            <label>Nombre y apellido<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
            <div className="shop-form-row">
              <label>Email<input name="email" type="email" autoComplete="email" required /></label>
              <label>Teléfono<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={21} /></label>
            </div>
            <label>Notas para el pedido <span>(opcional)</span><textarea name="notes" rows={4} maxLength={1000} /></label>
          </fieldset>
          <section className="shop-payment-choice" aria-labelledby="payment-title"><div><span aria-hidden="true">●</span><div><h2 id="payment-title">Pago en el local</h2><p>Aboná cuando retires. En la próxima fase también podrás elegir Mercado Pago.</p></div></div></section>
          <button className="shop-button" type="submit" disabled={submitting}>{submitting ? "Confirmando…" : `Confirmar pedido · ${money(cart.subtotal)}`}</button>
        </form>
        <aside className="shop-order-preview">
          <p className="shop-eyebrow">Tu pedido</p>
          {cart.items.map((item) => <div key={item.product.slug}><span>{item.quantity} × {item.product.name}</span><strong>{money(item.line_total)}</strong></div>)}
          <div className="shop-summary-total"><span>Total</span><strong>{money(cart.subtotal)}</strong></div>
          <p>Retiro en {site.address}</p>
        </aside>
      </div>
    </main>
  );
}
