import type { Metadata } from "next";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Preguntas frecuentes", description: `Turnos, pagos, cancelaciones, servicios y todo lo que necesitás saber de ${site.name}.`, path: "/faq" });

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
