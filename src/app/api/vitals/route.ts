import { NextRequest, NextResponse } from "next/server";

const METRICS = new Set(["FCP", "LCP", "CLS", "INP", "TTFB"]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    !METRICS.has(body.name) ||
    typeof body.value !== "number" ||
    !Number.isFinite(body.value) ||
    typeof body.path !== "string" ||
    body.path.length > 160
  ) {
    return NextResponse.json({ error: "invalid metric" }, { status: 400 });
  }

  console.info(JSON.stringify({ event: "web_vital", ...body, receivedAt: new Date().toISOString() }));
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
