export const SERIF = "'Bodoni Moda', Georgia, serif";
export const SANS = "'Archivo', system-ui, sans-serif";

const items = [
  { href: "/servicios", label: "Servicios", key: "servicios" },
  { href: "/equipo", label: "Equipo", key: "equipo" },
  { href: "/galeria", label: "Galería", key: "galeria" },
  { href: "/#tienda", label: "Tienda", key: "tienda" },
];

export function EditorialNav({ active }: { active?: string }) {
  return (
    <header className="enav">
      <a
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
      </a>
      <nav className="enav-links">
        {items.map((it) => (
          <a
            key={it.key}
            href={it.href}
            className="nox-link"
            style={{ opacity: active === it.key ? 1 : 0.7 }}
          >
            {it.label}
          </a>
        ))}
        <a href="/agendar" className="nox-btn">
          Agendar Turno
        </a>
      </nav>
    </header>
  );
}
