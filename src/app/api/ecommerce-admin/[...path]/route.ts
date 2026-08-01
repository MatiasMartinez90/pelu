// BFF del admin para el data plane independiente de ecommerce.
// La sesión de Keycloak se valida aquí y la API key nunca llega al navegador.
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const commerceUrl = (process.env.ECOMMERCE_API_URL ?? "http://ecommerce-api:8080").replace(/\/$/, "");
const commerceKey = process.env.COMMERCE_API_KEY;
type Context = { params: Promise<{ path: string[] }> };

const ID = "[0-9a-fA-F-]{36}";
const ALLOWED = new RegExp(
  `^(products|products/${ID}(/stock)?|categories|categories/${ID}|orders|orders/${ID}/status)$`,
);

async function proxy(request: NextRequest, context: Context) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie: true });
  const accessToken = token?.accessToken as string | undefined;
  if (!token?.email || !accessToken) return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  if (!commerceKey) return NextResponse.json({ detail: "ecommerce no configurado" }, { status: 503 });

  const { path } = await context.params;
  const joined = path.join("/");
  if (!ALLOWED.test(joined)) return NextResponse.json({ detail: "ruta no permitida" }, { status: 404 });
  if (!["GET", "POST", "PATCH"].includes(request.method)) {
    return NextResponse.json({ detail: "método no permitido" }, { status: 405 });
  }
  const url = new URL(`/v1/admin/${joined}`, commerceUrl);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": request.headers.get("content-type") ?? "application/json",
    "x-api-key": commerceKey,
    "x-actor": String(token.email),
  };
  const response = await fetch(url, {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : await request.text(),
    cache: "no-store",
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "private, no-store" },
  });
}

export { proxy as GET, proxy as POST, proxy as PATCH };
