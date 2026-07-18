import Link from "next/link";
import { site } from "@/lib/site";

export const SERIF = "var(--font-serif)";
export const SANS = "var(--font-sans)";

const baseItems = [
  { href: "/servicios", label: "Servicios", key: "servicios" },
  { href: "/equipo", label: "Equipo", key: "equipo" },
  { href: "/galeria", label: "Galería", key: "galeria" },
];

export function EditorialNav({ active }: { active?: string }) {
  return (
    <header className="enav">
      <Link
        href="/"
        style={{
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: "0.02em",
          color: "#fff",
        }}
      >
        {site.shortName}
      </Link>
      <nav className="enav-links">
        {[...baseItems, ...(site.shop.enabled ? [{ href: site.onlineStoreUrl, label: "Tienda", key: "tienda" }] : [])].map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className="nox-link"
            style={{ opacity: active === it.key ? 1 : 0.7 }}
          >
            {it.label}
          </Link>
        ))}
        {site.features.customerPortal && (
          <Link href="/login" className="nox-link" style={{ opacity: 0.7 }}>
            Ingresar
          </Link>
        )}
        {installationBookingLink()}
      </nav>
    </header>
  );
}

function installationBookingLink() {
  if (!site.bookingEnabled) return null;
  return (
    <Link href={site.bookingPath} prefetch className="nox-btn">
      {site.copy.bookingCta}
    </Link>
  );
}
