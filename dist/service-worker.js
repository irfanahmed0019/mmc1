const CACHE_NAME = 'makemycut-v1';
const ASSETS_CACHE = 'makemycut-assets-v1';
const API_CACHE = 'makemycut-api-v1';

// Assets to pre-cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.ico'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(ASSETS_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (![CACHE_NAME, ASSETS_CACHE, API_CACHE].includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. IGNORE non-http(s) requests (chrome-extension, etc)
    if (!url.protocol.startsWith('http')) return;

    // 2. EXCLUDE Auth & Mutations from Cache - NETWORK ONLY
    if (
        url.pathname.includes('/auth') ||
        event.request.method !== 'GET' ||
        (url.hostname.includes('supabase.co') && event.request.method !== 'GET')
    ) {
        return; // Default network behavior (fail hard if offline)
    }

    // 3. API Requests (Supabase GET) - NETWORK FIRST
    if (url.hostname.includes('supabase.co') && event.request.method === 'GET') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone and cache successful responses
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(API_CACHE).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // 4. Static Assets & Pages - CACHE FIRST
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((response) => {
                    // Cache new static assets
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseClone = response.clone();
                    caches.open(ASSETS_CACHE).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                });
            })
            .catch(() => {
                // Offline Fallback for Navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});
