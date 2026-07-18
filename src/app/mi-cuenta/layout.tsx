import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Mi cuenta", description: "Turnos y preferencias de cliente.", path: "/mi-cuenta", noIndex: true });

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
