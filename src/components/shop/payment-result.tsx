"use client";

import { useEffect, useState } from "react";
import { paymentApi } from "@/lib/shop-client";
import type { PaymentStatus } from "@/lib/shop-types";
import { site } from "@/lib/site";

const terminal = new Set(["approved", "rejected", "cancelled", "refunded", "expired"]);

function title(status: PaymentStatus["status"]) {
  if (status === "approved") return "Pago aprobado";
  if (status === "refunded") return "Pago devuelto";
  if (["rejected", "cancelled", "expired"].includes(status)) return "El pago no se completó";
  return "Estamos verificando tu pago";
}

function storedOrderNumber(token: string): number | null {
  const stored = sessionStorage.getItem("nox:shop-payment-return");
  if (!stored) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (
      typeof value === "object"
      && value !== null
      && "statusToken" in value
      && value.statusToken === token
      && "orderNumber" in value
      && Number.isInteger(value.orderNumber)
    ) {
      return value.orderNumber as number;
    }
  } catch {
    sessionStorage.removeItem("nox:shop-payment-return");
  }
  return null;
}

export function PaymentResult({ token }: { token: string }) {
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + 5 * 60_000;
    async function refresh() {
      try {
        const value = await paymentApi<PaymentStatus>(`status/${token}`);
        if (stopped) return;
        setPayment(value);
        setOrderNumber(storedOrderNumber(token));
        setError("");
        if (!terminal.has(value.status) && Date.now() < deadline) {
          timer = setTimeout(refresh, document.hidden ? 10_000 : 3_000);
        }
      } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : "No pudimos consultar el pago.");
      }
    }
    void refresh();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  if (!token) {
    return <section className="shop-confirmation"><h1>Link de pago inválido</h1><a className="shop-button" href={site.onlineStoreUrl}>Volver al shop</a></section>;
  }
  return (
    <section className="shop-confirmation" aria-live="polite" aria-busy={!payment && !error}>
      <span aria-hidden="true">{payment?.status === "approved" ? "✓" : payment && terminal.has(payment.status) ? "!" : "…"}</span>
      {orderNumber && <p className="shop-eyebrow">Pedido #{String(orderNumber).padStart(6, "0")}</p>}
      <h1>{payment ? title(payment.status) : error ? "No pudimos verificar el pago" : "Consultando el pago"}</h1>
      {error && <p className="shop-alert" role="alert">{error}</p>}
      {payment?.status === "approved" && <p>Tu pedido quedó confirmado. Te avisaremos cuando esté listo para retirar.</p>}
      {payment && ["created", "pending"].includes(payment.status) && <p>Puede demorar unos instantes. Esta pantalla se actualiza automáticamente.</p>}
      {payment && ["rejected", "cancelled", "expired"].includes(payment.status) && <p>No se acreditó ningún pago. Volvé al shop para intentarlo nuevamente.</p>}
      {payment?.status === "refunded" && <p>El proveedor informó que el importe fue devuelto.</p>}
      {payment && <dl><div><dt>Total</dt><dd>{new Intl.NumberFormat("es-AR", { style: "currency", currency: payment.currency, maximumFractionDigits: 0 }).format(payment.amount)}</dd></div><div><dt>Estado</dt><dd>{payment.status}</dd></div></dl>}
      <a className="shop-button" href={site.onlineStoreUrl}>Volver al shop</a>
    </section>
  );
}
