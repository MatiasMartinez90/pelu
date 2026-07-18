import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend-url";

type Context = { params: Promise<{ path: string[] }> };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const TOKEN = "[A-Za-z0-9_.~-]{10,1000}";
const PREFERENCE = new RegExp(`^shop-orders/${UUID}/preference$`);
const PAY_AT_STORE = new RegExp(`^shop-orders/${UUID}/pay-at-store$`);
const STATUS = new RegExp(`^status/${TOKEN}$`);
const DEMO = new RegExp(`^demo/${TOKEN}$`);

function allowed(method: string, path: string): boolean {
  if (method === "GET") return STATUS.test(path);
  if (method === "POST") return PREFERENCE.test(path) || PAY_AT_STORE.test(path) || DEMO.test(path);
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

  const target = new URL(`${backendUrl}/api/v1/payments/${joined}`);
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
    body: request.method === "GET" ? undefined : await request.text(),
    cache: "no-store",
  });
  const responseBody = response.status === 204 ? null : await response.text();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
      "cache-control": "private, no-store",
    },
  });
}

export { proxy as GET, proxy as POST };
