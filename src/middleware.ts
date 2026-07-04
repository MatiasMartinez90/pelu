export { auth as middleware } from "@/auth";

// Solo intercepta /admin (y subrutas). El resto del sitio queda público.
export const config = {
  matcher: ["/admin/:path*"],
};
