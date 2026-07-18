import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend-url";

type Context = { params: Promise<{ path: string[] }> };

const CATALOG = /^((categories)|(products(\/[a-z0-9-]+)?))$/;
const CART = /^carts\/[A-Za-z0-9_-]{32,128}(\/items\/[a-z0-9-]+)?$/;

function allowed(method: string, path: string): boolean {
  if (method === "GET") return CATALOG.test(path) || CART.test(path);
  if (method === "POST") return path === "carts" || path === "checkout";
  if (method === "PUT" || method === "DELETE") return CART.test(path) && path.includes("/items/");
  return false;
}

async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const joined = path.join("/");
  if (!allowed(request.method, joined)) {
    return NextResponse.json({ detail: "not found" }, { status: 404 });
  }
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    const requestHost = request.headers.get("host") ?? request.nextUrl.host;
    if (origin && new URL(origin).host !== requestHost) {
      return NextResponse.json({ detail: "origin no permitido" }, { status: 403 });
    }
  }

  const target = new URL(`${backendUrl}/api/v1/shop/${joined}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": request.headers.get("content-type") ?? "application/json",
  };
  const forwardedFor = request.headers.get("x-forwarded-for");
  const idempotencyKey = request.headers.get("idempotency-key");
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "DELETE" ? undefined : await request.text(),
    cache: "no-store",
  });
  const isPublicCatalog = request.method === "GET" && CATALOG.test(joined);
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
      "cache-control": isPublicCatalog
        ? response.headers.get("cache-control") ?? "public, s-maxage=60"
        : "private, no-store",
    },
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
