import Link from "next/link";

export const SERIF = "var(--font-serif)";
export const SANS = "var(--font-sans)";

const items = [
  { href: "/servicios", label: "Servicios", key: "servicios" },
  { href: "/equipo", label: "Equipo", key: "equipo" },
  { href: "/galeria", label: "Galería", key: "galeria" },
  { href: "/#tienda", label: "Tienda", key: "tienda" },
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
        NOX
      </Link>
      <nav className="enav-links">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className="nox-link"
            style={{ opacity: active === it.key ? 1 : 0.7 }}
          >
            {it.label}
          </Link>
        ))}
        <Link href="/login" className="nox-link" style={{ opacity: 0.7 }}>
          Ingresar
        </Link>
        <Link href="/agendar" prefetch className="nox-btn">
          Agendar Turno
        </Link>
      </nav>
    </header>
  );
}
