const CACHE = "stroke-lab-v4";
const SHELL = [
  "/",
  "/demo",
  "/privacy/",
  "/terms/",
  "/404.html",
  "/stroke-slab-v1-480.webp",
  "/stroke-slab-v1-720.webp",
  "/stroke-slab-v1.webp",
  "/favicon.svg",
  "/apple-touch-icon-v1.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    const root = await cache.match("/");
    const html = root ? await root.text() : "";
    const entryAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((url) => typeof url === "string" && url.startsWith("/assets/"));
    await cache.addAll(entryAssets);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone());
    }
    return response;
  }).catch(() => event.request.mode === "navigate" ? caches.match("/404.html") : Response.error())));
});
