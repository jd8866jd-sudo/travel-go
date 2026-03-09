/**
 * Travel Go!!! Service Worker - Offline Support
 * 版本：10.1.2 (每次修改此檔案建議更新版本號以清除舊快取)
 */

const CACHE_NAME = 'travel-go-v10.2';

// 需要快取的資源清單
const urlsToCache = [
  './',
  './index.html',        // 你的主程式檔名
  './manifest.json',
  './icon.png',
  
  // 核心外部框架 (一定要快取，否則沒網路會白屏)
  'https://unpkg.com/vue@3/dist/vue.global.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  
  // 字體資源 (選填，若有網路時載入過通常會自動緩存)
  'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap'
];

// 安裝 Service Worker 並快取資源
self.addEventListener('install', event => {
  // 強制讓新的 SW 立即接管，不用等待舊版關閉
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: 正在預載離線資源...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('SW: 所有資源已就緒，可支援離線使用！');
      })
  );
});

// 激活時清理舊版本的快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: 清除舊版快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 攔截請求：優先從快取抓取資料，沒快取才連網
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 找到快取就回傳，否則發送網路請求
        return response || fetch(event.request).then(fetchRes => {
          // 可選擇性地將新請求也存入快取 (動態快取)
          return fetchRes;
        });
      })
      .catch(() => {
        // 如果連網失敗且沒快取，這裡可以回傳一個斷網提示頁面
        console.log('SW: 偵測到離線狀態且無快取資源');
      })
  );
});
