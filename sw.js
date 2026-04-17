// Cache-Version bei jedem Release bumpen, damit PWA-Updates durchkommen.
// 17.04.2026 21:50 — Capo-Tickets c34643c0 + 753a0055: Updates kommen in PWA nicht an.
// Loesung: network-first fuer HTML, immediate skipWaiting+claim, Clients anzeigen "neue Version".
const CACHE_NAME = 'casa2035-v10-20260417-2256';
const STATIC_ASSETS = ['/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim()).then(() => {
      // Clients informieren, dass neue Version aktiv ist → Client kann reloaden
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }));
      });
    })
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // HTML immer network-first (damit Index-Updates durchkommen)
  const isHtml = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Nicht-HTML cachen
        if (res.ok && !isHtml) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(m => m || caches.match('/')))
  );
});

// Mit postMessage kann Client "SKIP_WAITING" triggern — sofortiger Update
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
