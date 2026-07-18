import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Portal del barbero", description: "Agenda privada del equipo.", path: "/barbero", noIndex: true });

export default function BarberLayout({ children }: { children: React.ReactNode }) {
  return children;
}
