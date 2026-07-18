// BFF del portal cliente: proxya /api/me/* → {BACKEND_URL}/api/v1/me/*
// inyectando el access_token de Keycloak de la sesión Auth.js.
// El token nunca llega al browser. Cualquier usuario logueado puede usarlo
// (el backend resuelve la identidad por el email del token).
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend-url";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // getToken() lee el JWT crudo sin pasar por session() (ver backoffice/route.ts).
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie: true });
  const accessToken = token?.accessToken as string | undefined;
  if (!token?.email || !accessToken) {
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  }

  const { path } = await params;
  const url = new URL(`${backendUrl}/api/v1/me/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const init: RequestInit = {
    method: req.method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": req.headers.get("content-type") ?? "application/json",
    },
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const resp = await fetch(url, init);
  const body = await resp.text();
  return new NextResponse(body, {
    status: resp.status,
    headers: { "content-type": resp.headers.get("content-type") ?? "application/json" },
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
};
