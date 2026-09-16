/* گرماسنج — Service Worker: کش آفلاین پوسته؛ داده همیشه از شبکه */
var CACHE = 'garmasanj-shell-v8';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/data/snapshot.json',
  './assets/css/main.css',
  './assets/js/config.js',
  './assets/js/utils.js',
  './assets/js/data.js',
  './assets/js/charts.js',
  './assets/js/ui.js',
  './assets/js/features.js',
  './assets/js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  // فقط فایل‌های همین مبدأ؛ APIها همیشه از شبکه
  if (url.origin !== location.origin) return;
  if (e.request.method !== 'GET') return;
  // داده‌ی قیمتی: اول شبکه (تازه)، بعد کش (آفلاین)
  if (/\/assets\/data\/.*\.json$/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
