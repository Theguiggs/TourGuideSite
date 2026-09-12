/* Murmure LW-5. Ne jamais stocker les pages visitées ni les réponses privées. */
const VERSION = 'lw5-v1';
const SHELL = `murmure-shell-${VERSION}`;
const STATIC = 'murmure-static-v1';
const OFFLINE = { fr: '/offline/fr.html', en: '/offline/en.html' };
const PRECACHE = [...Object.values(OFFLINE), '/favicon-192.png', '/favicon-512.png', '/apple-touch-icon-180.png', '/pwa/display.woff2'];
const MAX_STATIC = 120;

function cacheableAsset(request) {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin
    && !request.headers.has('authorization') && !url.search
    && url.pathname.startsWith('/_next/static/')
    && /\.(?:js|css|woff2?|png|svg)$/.test(url.pathname);
}
function offlinePath(url) { return new URL(url).pathname.split('/')[1] === 'en' ? OFFLINE.en : OFFLINE.fr; }

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(PRECACHE);
    // Première installation seulement : une mise à jour attend le choix du visiteur.
    if (!self.registration.active) await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('murmure-shell-') && name !== SHELL).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // AppSync, Cognito, Stripe, S3, tuiles : réseau seul.
  if (!url.search && !request.headers.has('authorization') && PRECACHE.includes(url.pathname) && request.mode !== 'navigate') {
    event.respondWith((async () => (await (await caches.open(SHELL)).match(url.pathname)) || fetch(request))());
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.status < 500) return response;
      } catch { /* Repli autonome, sans HTML privé ni nonce réutilisé. */ }
      const fallback = await (await caches.open(SHELL)).match(offlinePath(request.url));
      return fallback || new Response('Offline / Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })());
    return;
  }
  if (!cacheableAsset(request)) return; // API, RSC, images optimisées, URLs signées même origine.
  event.respondWith((async () => {
    let cache;
    let cached;
    try { cache = await caches.open(STATIC); cached = await cache.match(request); } catch { /* Réseau utilisable sans CacheStorage. */ }
    if (cached) return cached;
    const response = await fetch(request);
    if (cache && response.ok && response.type === 'basic' && !response.redirected && !/no-store|private/i.test(response.headers.get('cache-control') || '')) {
      try {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STATIC)).map((key) => cache.delete(key)));
      } catch { /* Un quota dépassé ne doit pas casser une ressource reçue. */ }
    }
    return response;
  })());
});
