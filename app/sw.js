// Luma Pad service worker — makes the app work offline.
// Bump VERSION together with APP_VERSION in index.html on every release.
const VERSION = 'v3';
const CACHE = 'luma-pad-' + VERSION;
const ASSETS = [
  './', 'index.html', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'fonts/outfit-200.woff2', 'fonts/outfit-300.woff2', 'fonts/outfit-400.woff2', 'fonts/outfit-600.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('luma-pad-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const staticAsset = /\/(fonts|icons)\//.test(url.pathname);
  e.respondWith(staticAsset ? cacheFirst(req) : networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

// Pages: try the network first (so updates show up quickly), but give up after 2.5 s
// and use the saved copy, so a bad connection never hangs the app.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(req, { signal: ctrl.signal, cache: 'no-cache' });
    clearTimeout(timer);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (_) {
    return (await cache.match(req, { ignoreSearch: true })) ||
           (req.mode === 'navigate' ? await cache.match('index.html') : Response.error());
  }
}
