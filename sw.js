// Versioned Service Worker cache with dynamic version from package.json
const CACHE_PREFIX = 'py-playground-v';
let CURRENT_CACHE = CACHE_PREFIX + 'dev';
// Only cache assets that actually exist in this project and use relative URLs for subpath deployments
const CORE_ASSETS = [
    './',
    './index.html',
    './templates.js',
    './py-worker.js',
    './styles.css',
    './fonts/local-fonts.css',
    './share.html',
    './404.html',
    './site.webmanifest'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        try {
            // Try to read version from package.json; fallback to v0
            const resp = await fetch('package.json', { cache: 'no-cache' }).catch(() => null);
            if (resp && resp.ok) {
                const pkg = await resp.json().catch(() => null);
                if (pkg && pkg.version) {
                    CURRENT_CACHE = CACHE_PREFIX + pkg.version;
                }
            }
        } catch {}
        try {
            const cache = await caches.open(CURRENT_CACHE);
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
        await Promise.all(keys.map(k => {
            if (k.startsWith(CACHE_PREFIX) && k !== CURRENT_CACHE) {
                return caches.delete(k);
            }
        }));
        self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Ignore non-http(s) schemes (e.g., chrome-extension://)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return; // don't call respondWith => let the request pass through
    }

    // NEW: do not intercept cross-origin requests at all (avoid affecting CDN requests)
    if (url.origin !== self.location.origin) {
        return; // let browser handle normally
    }

    // Route /s/* to share.html for link reconstruction
    if (url.pathname.includes('/s/')) {
        event.respondWith((async () => {
            try {
                const cache = await caches.open(CURRENT_CACHE);
                const cached = await cache.match('./share.html') || await caches.match('./share.html');
                if (cached) return cached;
                const res = await fetch('./share.html');
                if (res && res.ok) {
                    try { await cache.put('./share.html', res.clone()); } catch {}
                }
                return res;
            } catch (e) {
                // Last resort: basic inline response
                return new Response('<meta charset="utf-8"><p>Open <code>share.html</code> failed. Please refresh.</p>', { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
        })());
        return;
    }

    // Always bypass cache for worker script to avoid stale worker
    if (url.pathname.endsWith('/py-worker.js') || url.pathname.endsWith('py-worker.js')) {
        event.respondWith((async () => {
            try {
                const res = await fetch(req);
                // If network ok, update cache and return it
                if (res && res.ok) {
                    try {
                        const cache = await caches.open(CURRENT_CACHE);
                        await cache.put('./py-worker.js', res.clone());
                    } catch {}
                    return res;
                }
                // Fallback to cache when network gives non-ok
                const cached = await caches.match(req) || await caches.match('./py-worker.js');
                if (cached) return cached;
                return res; // may be non-ok, but return something
            } catch (e) {
                // Network error: try cache
                const cached = await caches.match(req) || await caches.match('./py-worker.js');
                if (cached) return cached;
                // Last resort: error response so we don't hang the fetch
                return new Response('/* worker unavailable */', { status: 503, headers: { 'Content-Type': 'application/javascript' } });
            }
        })());
        return;
    }

    // Always bypass cache for Pyodide core to avoid stale .data/.wasm files
    if (url.pathname.includes('/pyodide/')) {
        event.respondWith(fetch(req));
        return;
    }

    // Network-first for /data to prevent stale CSV
    if (url.pathname.includes('/data/')) {
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
                // Only cache successful same-origin GET responses; ignore others (incl. extensions)
                if (req.method === 'GET' && res && res.ok && url.origin === self.location.origin) {
                    try {
                        const cache = await caches.open(CURRENT_CACHE);
                        await cache.put(req, res.clone());
                    } catch (e) {
                        // Swallow caching errors to avoid affecting response
                    }
                }
                return res;
            } catch {
                return cached; // may be undefined
            }
        })());
    }
});
