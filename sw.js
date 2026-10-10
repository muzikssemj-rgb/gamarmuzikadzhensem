/* ============================================================================
   GAMAR MUZIKA -- service worker (offline support)
   ----------------------------------------------------------------------------
   * App shell + core libraries are pre-cached on install.
      * Code files use stale-while-revalidate so a redeploy reaches users on their next visit.

   When you redeploy, bump VERSION below so old caches are removed cleanly.
   ============================================================================ */
const VERSION = "gm-2.0.2";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE = [
  "./", "index.html", "manifest.webmanifest", "css/app.css", 
  "js/core.js", "js/questions-data.js", "js/data.js", "js/report.js", "js/session.js", "js/pwa.js",
  "vendor/jspdf.umd.min.js",
  "fonts/press-start-2p-latin-400-normal.woff2", "fonts/press-start-2p-latin-ext-400-normal.woff2",
  "fonts/vt323-latin-400-normal.woff2", "fonts/vt323-latin-ext-400-normal.woff2",
  "icons/icon.svg", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isCode = (url) => /\.(?:js|css|json|webmanifest|html)$/.test(url.pathname) && !url.pathname.includes("/vendor/");

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}

async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) (await caches.open(RUNTIME)).put(req, res.clone());
  return res;
}

async function navigate(req) {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);   // slow network? fall back to the cached shell
    const res = await fetch(req, { signal: ctl.signal });
    clearTimeout(timer);
    if (res && res.ok) (await caches.open(SHELL)).put("index.html", res.clone());
    return res;
  } catch (e) {
    return (await caches.match("index.html")) || (await caches.match("./")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;              // Firebase, Google, etc.
  if (req.mode === "navigate") { event.respondWith(navigate(req)); return; }
  if (isCode(url)) { event.respondWith(staleWhileRevalidate(req, SHELL)); return; }
  event.respondWith(cacheFirst(req));
});

self.addEventListener("message", (event) => { if (event.data === "SKIP_WAITING") self.skipWaiting(); });
