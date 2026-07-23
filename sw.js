// Service Worker — caches everything so the game works fully offline.
const CACHE_NAME = 'treasure-hunt-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './crypto-utils.js',
  './qrcode.min.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache first (offline-first), fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // If it's a navigation request and network fails, serve index
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});