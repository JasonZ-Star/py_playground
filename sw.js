// Versioned Service Worker cache with dynamic version from package.json
const CACHE_PREFIX = 'py-playground-v';
let CURRENT_CACHE = CACHE_PREFIX + '0';
// Only cache assets that actually exist in this project and use relative URLs for subpath deployments
const CORE_ASSETS = [
    './',
    './index.html',
    './templates.js',
    './py-worker.js',
    './fonts/local-fonts.css'
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

    // Always bypass cache for worker script to avoid stale worker
    if (url.pathname.endsWith('/py-worker.js') || url.pathname.endsWith('py-worker.js')) {
        event.respondWith(fetch(req));
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
