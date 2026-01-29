/**
 * Service Worker for Survey Aggregator
 * Provides offline capability and static asset caching
 */

const CACHE_NAME = 'survey-aggregator-disable-sw-v1';
const STATIC_ASSETS: string[] = [];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing (disabled mode)...');
  event.waitUntil(Promise.resolve());
  self.skipWaiting();
});

// Listen for skip waiting message from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating (disabled mode)...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log('Service Worker: Deleting cache:', name);
          return caches.delete(name);
        })
      );
    }).then(async () => {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.navigate(client.url);
      });
      await self.registration.unregister();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

