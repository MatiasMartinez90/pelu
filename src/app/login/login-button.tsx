"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

type DemoRole = "admin" | "barbero" | "cliente";

const demoProfiles: Array<{ role: DemoRole; label: string }> = [
  { role: "admin", label: "Ingresar como administrador" },
  { role: "barbero", label: "Ingresar como barbero" },
  { role: "cliente", label: "Ingresar como cliente" },
];

export function LoginButton({ callbackUrl, demoMode }: { callbackUrl: string; demoMode: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (demoMode) {
    return (
      <div style={{ width: "min(100%, 340px)", display: "grid", gap: 12 }}>
        <p style={{ margin: 0, textAlign: "center", fontSize: 13, opacity: 0.72 }}>
          Elegí el perfil que querés probar
        </p>
        {demoProfiles.map(({ role, label }) => (
          <button
            key={role}
            type="button"
            onClick={() => {
              setLoading(role);
              signIn("demo", { role, callbackUrl });
            }}
            disabled={!hydrated || loading !== null}
            style={{
              minHeight: 48,
              border: "1px solid rgba(255,255,255,.28)",
              borderRadius: 4,
              background: role === "admin" ? "#fff" : "transparent",
              color: role === "admin" ? "#111" : "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 650,
              cursor: !hydrated || loading ? "default" : "pointer",
              opacity: loading && loading !== role ? 0.45 : 1,
            }}
          >
            {loading === role ? "Ingresando…" : label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setLoading("keycloak");
        signIn("keycloak", { callbackUrl });
      }}
      disabled={!hydrated || loading !== null}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        background: "#fff",
        color: "#1f1f1f",
        border: "none",
        borderRadius: 4,
        padding: "14px 26px",
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: "0.02em",
        cursor: !hydrated || loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
        transition: "opacity .2s, transform .2s",
      }}
    >
      <GoogleIcon />
      {loading ? "Redirigiendo…" : "Ingresar con Google"}
    </button>
  );
}
