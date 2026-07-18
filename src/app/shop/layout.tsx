import type { Metadata } from "next";
import { CartProvider } from "@/components/shop/cart-provider";
import { ShopHeader } from "@/components/shop/shop-header";
import { site } from "@/lib/site";
import "./shop.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.onlineStoreUrl),
  title: { default: `Shop | ${site.name}`, template: `%s | ${site.name} Shop` },
  description: `Productos seleccionados por ${site.name}. Comprá online y retirá en el local.`,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.name} Shop`,
    description: "Productos profesionales con retiro en el local.",
    url: site.onlineStoreUrl,
    type: "website",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="shop-shell">
        <ShopHeader />
        {children}
        <footer className="shop-footer">
          <div><strong>{site.name}</strong><span>Selección profesional · Retiro en el local</span></div>
          <div><span>{site.address}</span><a href={site.url}>Volver al sitio</a></div>
        </footer>
      </div>
    </CartProvider>
  );
}
