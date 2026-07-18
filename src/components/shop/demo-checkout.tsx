"use client";

import { useEffect, useState } from "react";
import { paymentApi } from "@/lib/shop-client";
import type { PaymentStatus } from "@/lib/shop-types";

export function DemoCheckout({ token }: { token: string }) {
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    paymentApi<PaymentStatus>(`status/${token}`).then(setPayment).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Link inválido.");
    });
  }, [token]);

  async function settle(outcome: "approved" | "rejected") {
    setBusy(true);
    setError("");
    try {
      await paymentApi<PaymentStatus>(`demo/${token}`, {
        method: "POST",
        body: JSON.stringify({ outcome }),
      });
      window.location.assign(`/pago/resultado?reference=${encodeURIComponent(token)}&result=${outcome}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos simular el pago.");
      setBusy(false);
    }
  }

  return (
    <main className="shop-main shop-checkout-page">
      <section className="shop-demo-payment" aria-labelledby="demo-payment-title">
        <p className="shop-eyebrow">Entorno de demostración</p>
        <h1 id="demo-payment-title">Checkout de prueba</h1>
        <p>Este flujo usa el mismo dominio de pagos y auditoría que Mercado Pago, pero no mueve dinero real{payment?.purpose === "appointment" ? " y el turno ya está confirmado" : ""}.</p>
        {payment && <div className="shop-demo-total"><span>Total</span><strong>{new Intl.NumberFormat("es-AR", { style: "currency", currency: payment.currency, maximumFractionDigits: 0 }).format(payment.amount)}</strong></div>}
        {error && <p className="shop-alert" role="alert">{error}</p>}
        <div className="shop-confirmation-actions">
          <button className="shop-button" type="button" disabled={busy || !payment} onClick={() => settle("approved")}>Simular pago aprobado</button>
          <button className="shop-text-button" type="button" disabled={busy || !payment} onClick={() => settle("rejected")}>Simular pago rechazado</button>
        </div>
      </section>
    </main>
  );
}
