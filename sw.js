// Minimal service worker to avoid registration errors and enable basic caching.
const CACHE_NAME = 'py-playground-v4';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/templates.js',
  '/index.js'
  // Removed pre-caching of '/data/boston_housing.csv' to avoid stale data
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);
    } catch (e) {
      // Ignore caching errors to keep SW non-intrusive
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Always bypass cache for worker script to avoid stale worker
  if (url.pathname.endsWith('/py-worker.js')) {
    event.respondWith(fetch(req));
    return;
  }

  // Always bypass cache for Pyodide core to avoid stale .data/.wasm files
  if (url.pathname.startsWith('/pyodide/')) {
    event.respondWith(fetch(req));
    return;
  }

  // Network-first for /data to prevent stale CSV
  if (url.pathname.startsWith('/data/')) {
    event.respondWith((async () => {
      try { return await fetch(req); } catch { return caches.match(req); }
    })());
    return;
  }

  // Network-first for HTML, cache-first for others
  if (req.destination === 'document') {
    event.respondWith((async () => {
      try { return await fetch(req); } catch { return caches.match(req); }
    })());
  } else {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
        return res;
      } catch {
        return cached; // may be undefined
      }
    })());
  }
});
