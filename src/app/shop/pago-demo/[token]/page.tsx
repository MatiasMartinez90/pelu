import type { Metadata } from "next";
import { DemoCheckout } from "@/components/shop/demo-checkout";
import { backendUrl } from "@/lib/backend-url";
import type { PaymentStatus } from "@/lib/shop-types";

export const metadata: Metadata = {
  title: "Checkout de demostración",
  robots: { index: false, follow: false },
};

export default async function DemoCheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let initialPayment: PaymentStatus | null = null;

  try {
    const response = await fetch(
      `${backendUrl}/api/v1/payments/status/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (response.ok) {
      initialPayment = await response.json() as PaymentStatus;
    }
  } catch {
    // Keep the page available when the backend is briefly unreachable.
    // The client component will retry the status request after hydration.
  }

  return <DemoCheckout token={token} initialPayment={initialPayment} />;
}
