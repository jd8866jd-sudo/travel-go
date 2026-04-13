/**
 * Travel Go!!! Service Worker - Offline Support
 * 版本：10.3.0
 */

const CACHE_NAME = 'travel-go-v10.3';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/vue@3/dist/vue.global.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map(url => cache.add(url)));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => name !== CACHE_NAME ? caches.delete(name) : Promise.resolve()));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const networkRes = await fetch(req);
      const url = new URL(req.url);
      if (networkRes && networkRes.ok && (url.origin === self.location.origin || url.protocol.startsWith('http'))) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, networkRes.clone()).catch(() => {});
      }
      return networkRes;
    } catch (err) {
      if (req.mode === 'navigate') {
        const fallback = await caches.match('./') || await caches.match('./index.html');
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
