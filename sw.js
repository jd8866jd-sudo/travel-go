/**
 * Travel Go!!! Service Worker - Offline Support
 * 版本：10.3.0
 */

const CACHE_NAME = 'travel-go-v10.3.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  'https://unpkg.com/vue@3/dist/vue.global.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap'
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>離線中</title>
<style>body{font-family:sans-serif;background:#f0f9ff;color:#334155;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px} .card{max-width:420px;background:#fff;border-radius:20px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)} h1{margin:0 0 12px;font-size:22px} p{line-height:1.7;margin:8px 0}</style></head>
<body><div class="card"><h1>目前離線中</h1><p>若你之前已成功開啟過 Travel Go!!!，主程式與已儲存資料仍可使用。</p><p>天氣、翻譯、即時匯率等需要網路的功能，恢復連線後會自動正常。</p></div></body></html>`;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      APP_SHELL.map(async (url) => {
        try {
          await cache.add(url);
          console.log('SW cached:', url);
        } catch (err) {
          console.warn('SW cache skipped:', url, err);
        }
      })
    );
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()));
    await self.clients.claim();
  })());
});

const isApiRequest = (url) => {
  return url.includes('open.er-api.com') ||
         url.includes('api.open-meteo.com') ||
         url.includes('translate.googleapis.com') ||
         url.includes('nominatim.openstreetmap.org');
};

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', networkResponse.clone());
        return networkResponse;
      } catch (err) {
        return (await caches.match(request)) ||
               (await caches.match('./index.html')) ||
               new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
      }
    })());
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          status: 503
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (err) {
      if (request.destination === 'document') {
        return (await caches.match('./index.html')) || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
      }
      throw err;
    }
  })());
});
