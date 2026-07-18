import type { Metadata } from "next";
import { DemoCheckout } from "@/components/shop/demo-checkout";

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
  return <DemoCheckout token={token} />;
}
