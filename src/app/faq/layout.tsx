import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Preguntas Frecuentes | ${site.name}`,
  description: "Turnos, pagos, cancelaciones y todo lo que necesitás saber de NOX Barber.",
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
