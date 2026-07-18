"use client";

import { FormEvent, useRef, useState } from "react";
import { useCart } from "@/components/shop/cart-provider";
import { paymentApi, shopApi } from "@/lib/shop-client";
import type { PaymentPreference, ShopOrder } from "@/lib/shop-types";
import { money, site } from "@/lib/site";

export default function CheckoutPage() {
  const { cart, loading, error: cartError, reset } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pay_at_store" | "mercado_pago">("pay_at_store");
  const [pendingOnline, setPendingOnline] = useState<{ order: ShopOrder; cartToken: string } | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const paymentIdempotencyKey = useRef<string | null>(null);

  async function startOnlinePayment(value: ShopOrder, cartToken: string) {
    paymentIdempotencyKey.current ??= crypto.randomUUID();
    const preference = await paymentApi<PaymentPreference>(
      `shop-orders/${value.id}/preference`,
      {
        method: "POST",
        headers: { "idempotency-key": paymentIdempotencyKey.current },
        body: JSON.stringify({ cart_token: cartToken }),
      },
    );
    sessionStorage.setItem(
      "nox:shop-payment-return",
      JSON.stringify({ orderNumber: value.order_number, statusToken: preference.status_token }),
    );
    reset();
    window.location.assign(preference.checkout_url);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart?.items.length) return;
    setSubmitting(true);
    setError("");
    const data = new FormData(event.currentTarget);
    idempotencyKey.current ??= crypto.randomUUID();
    let createdOrder: ShopOrder | null = null;
    const cartToken = cart.token;
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
      createdOrder = value;
      if (paymentMethod === "mercado_pago") {
        await startOnlinePayment(value, cartToken);
      } else {
        setOrder(value);
        reset();
      }
    } catch (cause) {
      if (createdOrder && paymentMethod === "mercado_pago") {
        setPendingOnline({ order: createdOrder, cartToken });
      }
      setError(cause instanceof Error ? cause.message : "No pudimos confirmar el pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryOnlinePayment() {
    if (!pendingOnline) return;
    setSubmitting(true);
    setError("");
    try {
      await startOnlinePayment(pendingOnline.order, pendingOnline.cartToken);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos generar el link de pago.");
      setSubmitting(false);
    }
  }

  async function switchToStorePayment() {
    if (!pendingOnline) return;
    setSubmitting(true);
    setError("");
    try {
      await paymentApi(`shop-orders/${pendingOnline.order.id}/pay-at-store`, {
        method: "POST",
        body: JSON.stringify({ cart_token: pendingOnline.cartToken }),
      });
      setOrder(pendingOnline.order);
      setPendingOnline(null);
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cambiar el medio de pago.");
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
  if (pendingOnline) {
    return (
      <main className="shop-main shop-checkout-page">
        <section className="shop-confirmation" aria-labelledby="payment-recovery-title">
          <span aria-hidden="true">!</span>
          <p className="shop-eyebrow">Pedido #{String(pendingOnline.order.order_number).padStart(6, "0")}</p>
          <h1 id="payment-recovery-title">Tu pedido está reservado</h1>
          <p>No pudimos abrir Mercado Pago. Podés reintentar sin duplicar el pedido o abonarlo al retirar.</p>
          {error && <p className="shop-alert" role="alert">{error}</p>}
          <div className="shop-confirmation-actions">
            <button className="shop-button" type="button" onClick={retryOnlinePayment} disabled={submitting}>
              {submitting ? "Generando link…" : "Reintentar Mercado Pago"}
            </button>
            <button className="shop-text-button" type="button" onClick={() => void switchToStorePayment()} disabled={submitting}>Pagar en el local</button>
          </div>
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
            <label>Notas para el pedido <span className="shop-optional">(opcional)</span><textarea name="notes" rows={4} maxLength={1000} /></label>
          </fieldset>
          <fieldset className="shop-payment-choice">
            <legend>¿Cómo querés pagar?</legend>
            <label className={paymentMethod === "pay_at_store" ? "is-selected" : ""}>
              <input type="radio" name="payment" value="pay_at_store" checked={paymentMethod === "pay_at_store"} onChange={() => setPaymentMethod("pay_at_store")} />
              <span><strong>En el local</strong><small>Aboná cuando retires tu pedido.</small></span>
            </label>
            <label className={paymentMethod === "mercado_pago" ? "is-selected" : ""}>
              <input type="radio" name="payment" value="mercado_pago" checked={paymentMethod === "mercado_pago"} onChange={() => setPaymentMethod("mercado_pago")} />
              <span><strong>Mercado Pago</strong><small>Pagá ahora en un checkout seguro.</small></span>
            </label>
          </fieldset>
          <button className="shop-button" type="submit" disabled={submitting}>{submitting ? "Confirmando…" : `${paymentMethod === "mercado_pago" ? "Continuar a Mercado Pago" : "Confirmar pedido"} · ${money(cart.subtotal)}`}</button>
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
