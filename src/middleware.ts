// Ejecuta el callback `authorized` de auth.ts en cada request de /admin.
// Sin sesión → Auth.js redirige a la pantalla de login de Keycloak.
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/admin/:path*"],
};
