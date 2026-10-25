// Service worker of the tester app: keeps /testeur and its assets available
// offline. Data lives in IndexedDB (lib/offline/db.ts), never in this cache.
const CACHE = "certipilot-testeur-v1";
const APP_PATH = "/testeur";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type === "CACHE_URLS" && Array.isArray(message.urls)) {
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        Promise.all(
          message.urls.map((url) =>
            fetch(url, { credentials: "same-origin" })
              .then((response) => {
                if (response.ok && !response.redirected) return cache.put(url, response);
              })
              .catch(() => undefined),
          ),
        ),
      ),
    );
  }
  if (message.type === "CLEAR") event.waitUntil(caches.delete(CACHE));
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The app page: network first, the last good copy when offline.
  if (request.mode === "navigate" && url.pathname === APP_PATH) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response.ok && !response.redirected) await cache.put(APP_PATH, response.clone());
          return response;
        } catch {
          const cached = await cache.match(APP_PATH);
          if (cached) return cached;
          throw new Error("offline");
        }
      })(),
    );
    return;
  }

  // Hashed build files never change: cache first.
  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
