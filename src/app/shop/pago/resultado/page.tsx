import type { Metadata } from "next";
import { PaymentResult } from "@/components/shop/payment-result";

export const metadata: Metadata = {
  title: "Resultado del pago",
  robots: { index: false, follow: false },
};

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference = "" } = await searchParams;
  return <main className="shop-main shop-checkout-page"><PaymentResult token={reference} /></main>;
}
