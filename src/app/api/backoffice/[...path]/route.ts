// BFF del admin: proxya /api/backoffice/* → {BACKEND_URL}/api/v1/admin/*
// inyectando el access_token de Keycloak de la sesión Auth.js.
// El token y la API key de Chatwoot nunca llegan al browser.
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { backendUrl } from "@/lib/backend-url";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // getToken() lee el JWT crudo (cookie cifrada) sin pasar por el callback
  // session() — a diferencia de auth(), que sí pasa por session() acá (no
  // solo en middleware) y por eso nunca ve accessToken desde que se sacó de
  // ahí para no exponerlo al browser.
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie: true });
  const accessToken = token?.accessToken as string | undefined;
  if (!token?.email || !accessToken) {
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  }

  const { path } = await params;
  const url = new URL(`${backendUrl}/api/v1/admin/${path.join("/")}`);
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
  const joinedPath = path.join("/");
  if (
    resp.ok &&
    req.method !== "GET" &&
    /^(barbers|services|site-profile|schedule-rules|settings)(\/|$)/.test(joinedPath)
  ) {
    revalidateTag("booking-catalog", "max");
  }
  const privateMaxAge =
    req.method === "GET" && joinedPath === "dashboard/summary"
      ? 10
      : req.method === "GET" && /^(barbers|services|settings|stock)$/.test(joinedPath)
        ? 30
        : 0;
  return new NextResponse(body, {
    status: resp.status,
    headers: {
      "content-type": resp.headers.get("content-type") ?? "application/json",
      "Cache-Control": privateMaxAge
        ? `private, max-age=${privateMaxAge}, stale-while-revalidate=30`
        : "private, no-store",
      Vary: "Cookie",
    },
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
};
