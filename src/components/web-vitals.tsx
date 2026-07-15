"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

type NavigatorWithConnection = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean };
};

export function WebVitals() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    const connection = (navigator as NavigatorWithConnection).connection;
    const payload = JSON.stringify({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      path: pathname,
      device: matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
      connection: connection?.effectiveType ?? "unknown",
      saveData: connection?.saveData ?? false,
      release: process.env.NEXT_PUBLIC_RELEASE ?? "unknown",
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/vitals", new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch("/api/vitals", {
      method: "POST",
      body: payload,
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  });

  return null;
}
