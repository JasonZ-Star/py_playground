// sw.js - Service Worker for offline caching and performance
const CACHE_NAME = 'py-playground-v1';

// Core assets to cache on install
const CORE_ASSETS = [
    './',
    './index.html',
    './templates.js',
    './py-worker.js',
    './index.js',
    // Monaco editor local fallback paths
    './monaco/min/vs/loader.js',
    './monaco/min/vs/editor/editor.main.js',
    './monaco/min/vs/editor/editor.main.css',
    './monaco/min/vs/editor/editor.main.nls.js',
    './monaco/min/vs/base/worker/workerMain.js',
    // Monaco worker files (critical for editor functionality)
    './monaco/min/vs/base/common/worker/simpleWorker.nls.js',
    './monaco/min/vs/editor/editor.worker.js',
    './monaco/min/vs/language/json/json.worker.js',
    './monaco/min/vs/language/css/css.worker.js',
    './monaco/min/vs/language/html/html.worker.js',
    './monaco/min/vs/language/typescript/ts.worker.js',
    // Alternative spelling (monoca typo mentioned in requirements)
    './monoca/min/vs/loader.js',
    // Pyodide core
    './pyodide/pyodide.js',
    // Data files
    './data/boston_housing.csv'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching core assets');
            // Add assets one by one to avoid failing if some don't exist
            return Promise.allSettled(
                CORE_ASSETS.map(url => 
                    cache.add(url).catch(err => {
                        console.warn(`[SW] Failed to cache ${url}:`, err.message);
                        return null;
                    })
                )
            );
        }).then(() => {
            console.log('[SW] Core assets cached');
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Service worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        // Network first strategy
        fetch(request, { cache: 'no-store' })
            .then((response) => {
                // Clone response before caching (can only read once)
                const responseToCache = response.clone();
                
                // Cache successful responses
                if (response.ok) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache).catch(err => {
                            console.warn('[SW] Failed to cache response:', err.message);
                        });
                    });
                }
                
                return response;
            })
            .catch((error) => {
                // Network failed, try cache
                console.log('[SW] Network failed, trying cache for:', request.url);
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('[SW] Serving from cache:', request.url);
                        return cachedResponse;
                    }
                    
                    // No cache available
                    console.error('[SW] No cache available for:', request.url);
                    throw error;
                });
            })
    );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
