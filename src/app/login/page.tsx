import { LoginButton } from "./login-button";

const SERIF = "'Bodoni Moda', Georgia, serif";
const SANS = "'Archivo', system-ui, sans-serif";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main
      className="bg-grain"
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: SANS,
        padding: 24,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 64, lineHeight: 0.9, letterSpacing: "0.01em" }}>
          NOX
        </span>
        <span style={{ fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.55 }}>
          Barbería Premium
        </span>
      </div>

      <LoginButton callbackUrl={callbackUrl ?? "/admin"} />

      <a href="/" className="nox-link" style={{ color: "#fff", opacity: 0.5, fontSize: 13, letterSpacing: "0.08em" }}>
        ← Volver al sitio
      </a>
    </main>
  );
}
