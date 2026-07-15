import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administración | NOX",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const summary = `/api/backoffice/dashboard/summary?month=${month}`;

  return (
    <>
      {/* Inicia el BFF autenticado al parsear HTML, antes de hidratar el panel. */}
      <link rel="preload" as="fetch" href={summary} crossOrigin="use-credentials" />
      {children}
    </>
  );
}
