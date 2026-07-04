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
    // Gatea /admin: sin sesión → redirige a login.
    authorized({ auth, request }) {
      const onAdmin = request.nextUrl.pathname.startsWith("/admin");
      if (onAdmin) return !!auth?.user;
      return true;
    },
  },
});
