import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Dispatcher post-login: rutea al portal según el rol del usuario.
// admin → /admin, barbero → /barbero, cualquier otro logueado → /mi-cuenta.
export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session as { roles?: string[] } | null)?.roles ?? [];
  if (roles.includes("admin")) redirect("/admin");
  if (roles.includes("barbero")) redirect("/barbero");
  redirect("/mi-cuenta");
}
