import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

// Allowlist de emails con rol admin garantizado (fallback si Keycloak aún no asigna roles).
// Coma-separado en ADMIN_EMAILS.
const allow = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type Role = "admin" | "barbero" | "cliente";

// Extrae realm_access.roles del access token de Keycloak (que ya los incluye por default).
// Decodifica solo el payload (no valida firma: eso lo hace el backend contra JWKS).
function rolesFromAccessToken(accessToken?: string): Role[] {
  if (!accessToken) return [];
  try {
    const payload = accessToken.split(".")[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    const realmRoles: string[] = json?.realm_access?.roles ?? [];
    return realmRoles.filter((r): r is Role =>
      r === "admin" || r === "barbero" || r === "cliente",
    );
  } catch {
    return [];
  }
}

// Rol efectivo: admin por allowlist O por rol Keycloak; luego barbero; default cliente.
function effectiveRoles(email: string | undefined, klRoles: Role[]): Role[] {
  const set = new Set<Role>(klRoles);
  if (email && allow.includes(email.toLowerCase())) set.add("admin");
  if (set.size === 0) set.add("cliente");
  return [...set];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak],
  // Página de login propia (estilo del sitio) en vez de la default de Auth.js.
  pages: { signIn: "/login" },
  callbacks: {
    // H-02: exigir email verificado. H-01: NO fail-open — cualquier usuario Google
    // verificado puede loguearse (será "cliente"); el acceso a /admin lo decide el rol.
    signIn({ profile }) {
      if (profile && profile.email_verified === false) return false;
      return true;
    },
    // Guarda el access_token de Keycloak en el JWT de sesión: el BFF
    // (/api/backoffice) lo reenvía al backend, que lo valida contra JWKS.
    // El token nunca llega al browser. Se refresca solo al expirar.
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.email = (profile?.email as string | undefined) ?? (token.email as string | undefined);
        token.roles = effectiveRoles(token.email as string | undefined, rolesFromAccessToken(account.access_token));
        return token;
      }
      const expiresAt = (token.expiresAt as number | undefined) ?? 0;
      if (Date.now() < (expiresAt - 30) * 1000 || !token.refreshToken) {
        return token;
      }
      try {
        const resp = await fetch(
          `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
          {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              client_id: process.env.AUTH_KEYCLOAK_ID ?? "",
              client_secret: process.env.AUTH_KEYCLOAK_SECRET ?? "",
              refresh_token: token.refreshToken as string,
            }),
          },
        );
        if (!resp.ok) throw new Error(`refresh ${resp.status}`);
        const data = await resp.json();
        token.accessToken = data.access_token;
        token.refreshToken = data.refresh_token ?? token.refreshToken;
        token.expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in ?? 300);
        token.roles = effectiveRoles(token.email as string | undefined, rolesFromAccessToken(data.access_token));
      } catch {
        // Refresh falló: el BFF va a devolver 401 y el admin re-loguea.
        delete token.accessToken;
      }
      return token;
    },
    // Expone accessToken + roles en la sesión.
    session({ session, token }) {
      const s = session as { accessToken?: string; roles?: Role[] };
      s.accessToken = token.accessToken as string | undefined;
      s.roles = (token.roles as Role[] | undefined) ?? [];
      return session;
    },
    // Gatea rutas protegidas por rol.
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const a = auth as { user?: unknown; accessToken?: string; roles?: Role[] } | null;
      const roles = a?.roles ?? [];

      if (path.startsWith("/admin")) {
        // admin: sesión + accessToken vivo (evita "Error 401" del BFF) + rol admin.
        return !!a?.user && !!a.accessToken && roles.includes("admin");
      }
      if (path.startsWith("/barbero")) {
        return !!a?.user && !!a.accessToken && (roles.includes("barbero") || roles.includes("admin"));
      }
      return true;
    },
  },
});
