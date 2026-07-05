// v2: el SW solo maneja navegación offline. Los assets (/_next, imágenes,
// videos) los maneja el browser con HTTP cache normal — la v1 cacheaba
// assets con cache-first y servía CSS/JS viejos después de cada deploy,
// y rompía los range requests de los videos.
const CACHE = "nox-barber-v2";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
  }
  // Todo lo demás pasa directo al browser (sin respondWith).
});
