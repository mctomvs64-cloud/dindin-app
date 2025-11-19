const CACHE_NAME = 'din-din-cache-v1';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.protocol.startsWith('http')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((resp) => {
            // put a copy in cache for future
            return caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(event.request, resp.clone());
              } catch (e) {
                // ignore opaque responses or cross-origin failures
              }
              return resp;
            });
          })
          .catch(() => {
            // fallback to cached root page for navigation
            if (event.request.mode === 'navigate') return caches.match('/index.html');
          });
      })
    );
  }
});
