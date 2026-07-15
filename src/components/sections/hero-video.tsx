"use client";

import { useEffect, useRef, useState } from "react";

type NavigatorWithConnection = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean };
};

export function HeroVideo({ mp4, webm, poster }: { mp4: string; webm: string; poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const connection = (navigator as NavigatorWithConnection).connection;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrowViewport = matchMedia("(max-width: 767px)").matches;
    const constrained = connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
    // El video es una mejora progresiva posterior al HTML; este estado sólo
    // puede decidirse en el navegador porque Network Information no existe en SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!reducedMotion && !constrained && !narrowViewport) setEnabled(true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;

    const syncVisibility = () => {
      if (document.hidden) video.pause();
      else video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", syncVisibility);
    video.play().catch(() => {});
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      tabIndex={-1}
      poster={poster}
      preload="none"
      onLoadedData={() => setReady(true)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "55% 26%",
        opacity: ready ? 1 : 0,
        transition: "opacity 400ms ease-in",
      }}
    >
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
