import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://nox-api.nox.svc.cluster.local";
const ALLOWED = new Set(["api/v1/availability", "api/v1/bookings"]);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.join("/");
  if (!ALLOWED.has(joined)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const target = new URL(`${BACKEND_URL}/${joined}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": request.headers.get("content-type") ?? "application/json",
  };
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}

export { proxy as GET, proxy as POST };
