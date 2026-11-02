// KlipKit service worker: browser tools keep working offline after the first visit.
// Strategy: pages = network-first (fresh content, cached fallback); static assets, vendor engines
// and models = cache-first (immutable, versioned by filename). Never caches /api.
const VERSION = "klipkit-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("klipkit-v") && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())),
);

// The first visit happens before this worker controls the page, so its HTML, JS and CSS were never
// seen by "fetch" below. The page posts the URLs it already loaded; cache them now (same origin only).
self.addEventListener("message", (e) => {
  if (e.data?.type !== "cache-urls" || !Array.isArray(e.data.urls)) return;
  const urls = e.data.urls.filter((u) => {
    try {
      const p = new URL(u, location.origin);
      return p.origin === location.origin && !p.pathname.startsWith("/api/") && !p.pathname.startsWith("/models/");
    } catch {
      return false;
    }
  });
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(urls.map((u) => c.add(u).catch(() => {})))));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  const immutable = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/vendor/") || url.pathname.startsWith("/models/");
  if (immutable) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => (res.ok && caches.open(VERSION).then((c) => c.put(e.request, res.clone())), res))));
  } else if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then((res) => (caches.open(VERSION).then((c) => c.put(e.request, res.clone())), res)).catch(() => caches.match(e.request)));
  }
});
