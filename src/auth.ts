import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import Credentials from "next-auth/providers/credentials";
import { installation } from "@/lib/installation";

// Allowlist de emails con rol admin garantizado (fallback si Keycloak aún no asigna roles).
// Coma-separado en ADMIN_EMAILS.
const allow = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type Role = "admin" | "barbero" | "cliente";

const demoRequested = process.env.DEMO_MODE === "true";
const demoAuthSecret = process.env.DEMO_AUTH_SECRET ?? "";

// Fail closed: nunca habilitar el login público demo con un secreto ausente o débil.
if (demoRequested && demoAuthSecret.length < 32) {
  throw new Error("DEMO_MODE requiere DEMO_AUTH_SECRET de al menos 32 caracteres");
}

const demoEnabled = demoRequested && demoAuthSecret.length >= 32;
const installationId = process.env.INSTALLATION_ID ?? installation.tenant;
const demoUsers: Record<Role, { name: string; email: string }> = {
  admin: { name: "Administrador Demo", email: `admin@${installationId}.demo.local` },
  barbero: { name: "Profesional Demo", email: `profesional@${installationId}.demo.local` },
  cliente: { name: "Cliente Demo", email: `cliente@${installationId}.demo.local` },
};

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "barbero" || value === "cliente";
}

function base64url(value: string | ArrayBuffer): string {
  const bytes = typeof value === "string"
    ? new TextEncoder().encode(value)
    : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createDemoAccessToken(role: Role): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 8 * 60 * 60;
  const user = demoUsers[role];
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: process.env.DEMO_AUTH_ISSUER ?? `${installationId}-demo`,
    aud: process.env.DEMO_AUTH_AUDIENCE ?? `${installationId}-demo-api`,
    sub: `demo-${role}`,
    iat: now,
    exp: expiresAt,
    email: user.email,
    email_verified: true,
    name: user.name,
    demo_role: role,
    demo_barber_slug: role === "barbero" ? installation.demo.defaultBarberSlug : undefined,
  }));
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(demoAuthSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned));
  return { token: `${unsigned}.${base64url(signature)}`, expiresAt };
}

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
  providers: [
    Keycloak,
    ...(demoEnabled
      ? [Credentials({
          id: "demo",
          name: "Demo",
          credentials: {
            role: { label: "Perfil", type: "text" },
          },
          authorize(credentials) {
            const role = credentials?.role;
            if (!isRole(role)) return null;
            return { id: `demo-${role}`, ...demoUsers[role] };
          },
        })]
      : []),
  ],
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
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "demo") {
        const role = user?.id?.replace("demo-", "");
        if (!isRole(role)) return null;
        const demoToken = await createDemoAccessToken(role);
        token.accessToken = demoToken.token;
        token.expiresAt = demoToken.expiresAt;
        token.email = demoUsers[role].email;
        token.name = demoUsers[role].name;
        token.roles = [role];
        token.authProvider = "demo";
        delete token.refreshToken;
        return token;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.email = (profile?.email as string | undefined) ?? (token.email as string | undefined);
        token.roles = effectiveRoles(token.email as string | undefined, rolesFromAccessToken(account.access_token));
        token.authProvider = "keycloak";
        return token;
      }
      const expiresAt = (token.expiresAt as number | undefined) ?? 0;
      if (token.authProvider === "demo") {
        if (Date.now() >= (expiresAt - 30) * 1000) delete token.accessToken;
        return token;
      }
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
    // Expone roles en la sesión. accessToken NO se forwardea acá a propósito
    // (se filtró client-side por /api/auth/session antes de este fix). El
    // middleware de abajo (authorized()) también pasa por ESTE callback —
    // no lo bypasea como decía un comentario anterior acá, verificado en
    // incidente real: exigir accessToken en authorized() rompía el gate de
    // /admin por completo, porque ya nunca llega. El BFF (auth() en las
    // route handlers de /api/{backoffice,barber,me}, que sí leen el JWT
    // completo sin pasar por acá) sigue siendo quien valida el accessToken
    // de verdad contra el backend; si está vencido, esas rutas devuelven
    // 401 y admin/page.tsx dispara un re-login.
    session({ session, token }) {
      const s = session as { roles?: Role[] };
      s.roles = (token.roles as Role[] | undefined) ?? [];
      return session;
    },
    // Gatea rutas protegidas por rol.
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const a = auth as { user?: unknown; roles?: Role[] } | null;
      const roles = a?.roles ?? [];

      if (path.startsWith("/admin")) {
        return !!a?.user && roles.includes("admin");
      }
      if (path.startsWith("/barbero")) {
        return !!a?.user && (roles.includes("barbero") || roles.includes("admin"));
      }
      return true;
    },
  },
});
