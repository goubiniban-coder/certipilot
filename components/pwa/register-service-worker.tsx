"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that keeps the tester app available offline
 * (public/sw.js), then hands it the files already loaded by this page so
 * that the next visit works without network. Production builds only: in
 * development the cached chunks would hide code changes.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const urls = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) => new URL(url).origin === location.origin && new URL(url).pathname.startsWith("/_next/static/"));
        registration.active?.postMessage({ type: "CACHE_URLS", urls: [location.pathname, ...urls] });
      })
      .catch((error) => console.error("Service worker non enregistré", error));
  }, []);
  return null;
}
