import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend-url";

const METRICS = new Set(["FCP", "LCP", "CLS", "INP", "TTFB"]);
const RATINGS = new Set(["good", "needs-improvement", "poor"]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    !METRICS.has(body.name) ||
    typeof body.value !== "number" ||
    !Number.isFinite(body.value) ||
    body.value < 0 ||
    body.value > 120_000 ||
    !RATINGS.has(body.rating) ||
    typeof body.path !== "string" ||
    body.path.length > 160 ||
    !["mobile", "desktop"].includes(body.device)
  ) {
    return NextResponse.json({ error: "invalid metric" }, { status: 400 });
  }

  const metric = {
    name: body.name,
    value: body.value,
    rating: body.rating,
    path: body.path,
    device: body.device,
  };
  try {
    const response = await fetch(`${backendUrl}/api/v1/telemetry/web-vitals`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
      },
      body: JSON.stringify(metric),
      signal: AbortSignal.timeout(2_000),
      cache: "no-store",
    });
    if (!response.ok && response.status !== 429) {
      console.warn(JSON.stringify({ event: "web_vital_forward_failed", status: response.status }));
    }
  } catch {
    // Telemetría best-effort: nunca afecta la navegación del visitante.
  }
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
