/**
 * Service Worker for Survey Aggregator
 * Provides offline capability and static asset caching
 */

const CACHE_NAME = 'survey-aggregator-v4'; // Updated to force cache refresh for IndexedDB version fix (v8->v9)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/benchpoint-icon.svg',
  '/favicon-16x16.svg',
  '/favicon-32x32.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // CRITICAL FIX: Delete ALL old caches to ensure fresh JavaScript loads
      // This prevents cached code with old IndexedDB versions from being served
      return Promise.all(
        cacheNames.map((name) => {
          console.log('Service Worker: Deleting cache:', name);
          return caches.delete(name);
        })
      );
    }).then(() => {
      // Force immediate control of all pages
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network-first strategy for JavaScript files to ensure latest code loads
  // CRITICAL: Never cache JS files to prevent old IndexedDB version code from being served
  if (url.pathname.endsWith('.js') || url.pathname.includes('/static/js/')) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          return response;
        })
        .catch(() => {
          // Only fallback to cache if network completely fails
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first strategy for other static assets
  if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first strategy for API/data requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          // Return offline page if available
          return caches.match('/index.html');
        });
      })
  );
});

