import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Redirigiendo", description: "Acceso privado.", path: "/post-login", noIndex: true });

export default function PostLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
