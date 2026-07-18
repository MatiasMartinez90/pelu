import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { site } from "@/lib/site";

const shopHost = new URL(site.onlineStoreUrl).host.toLowerCase();

const protectedProxy = auth(() => NextResponse.next());
const runProtectedProxy = protectedProxy as unknown as (
  request: NextRequest,
  event: NextFetchEvent,
) => Response | Promise<Response>;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const requestHost = (request.headers.get("host") ?? "").toLowerCase();
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/admin") || pathname.startsWith("/barbero")) {
    return runProtectedProxy(request, event);
  }
  if (requestHost === shopHost && !pathname.startsWith("/shop")) {
    const destination = request.nextUrl.clone();
    destination.pathname = pathname === "/" ? "/shop" : `/shop${pathname}`;
    return NextResponse.rewrite(destination);
  }
  return NextResponse.next();
}

// Auth protege los portales y el mismo proxy monta el shop en su host.
// Assets, medios y APIs conservan sus rutas originales.
export const config = {
  matcher: [
    "/pago/:path*",
    "/pago-demo/:path*",
    "/sitemap.xml",
    "/robots.txt",
    "/((?!api|_next/static|_next/image|media|.*\\..*).*)",
  ],
};
