const CACHE = 'ps-cafe-v1';
const FILES = [
  '/ps-cafe-app/',
  '/ps-cafe-app/index.html',
  '/ps-cafe-app/app.js',
  '/ps-cafe-app/style.css',
  '/ps-cafe-app/img4.png'
];

// تثبيت وحفظ الملفات
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

// تفعيل وحذف الكاش القديم
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// الطلبات — الـ PHP دايما من النت، باقي الملفات من الكاش
self.addEventListener('fetch', e => {
  if (e.request.url.includes('.php')) {
    // API calls دايما من السيرفر
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
