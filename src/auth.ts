import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

// Allowlist de emails con acceso al panel. Coma-separado en ADMIN_EMAILS.
const allow = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak],
  callbacks: {
    // Solo emails de la allowlist pueden loguearse (si la lista está vacía, permite a cualquiera que pase por Keycloak).
    signIn({ profile }) {
      if (allow.length === 0) return true;
      const email = (profile?.email as string | undefined)?.toLowerCase();
      return !!email && allow.includes(email);
    },
    // Guarda el access_token de Keycloak en el JWT de sesión: el BFF
    // (/api/backoffice) lo reenvía al backend, que lo valida contra JWKS.
    // El token nunca llega al browser. Se refresca solo al expirar.
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
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
      } catch {
        // Refresh falló: el BFF va a devolver 401 y el admin re-loguea.
        delete token.accessToken;
      }
      return token;
    },
    // Expone el accessToken en la sesión para que el BFF lo reenvíe al backend.
    session({ session, token }) {
      (session as { accessToken?: string }).accessToken = token.accessToken as
        | string
        | undefined;
      return session;
    },
    // Gatea /admin: sin sesión O sin accessToken (refresh vencido) → redirige a login.
    // Exigir accessToken evita renderizar el panel con sesión válida pero token muerto,
    // que terminaría en "Error 401" del BFF.
    authorized({ auth, request }) {
      const onAdmin = request.nextUrl.pathname.startsWith("/admin");
      if (onAdmin) {
        const accessToken = (auth as { accessToken?: string } | null)?.accessToken;
        return !!auth?.user && !!accessToken;
      }
      return true;
    },
  },
});
