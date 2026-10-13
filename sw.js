/* گرماسنج — Service Worker: پوسته و داده هر دو «شبکه اول، کش به‌عنوان پشتیبان».
   چرا شبکه اول؟ چون با کش-اول، تا وقتی نام کش عوض نشود کاربر کد قدیمی را
   می‌بیند و هر انتشارِ جدیدِ پوسته پشتِ کش گیر می‌کرد. کش فقط برای آفلاین است.
   نکته‌ی نصب: پیش‌تر از `cache.addAll` استفاده می‌شد که «همه‌یا‌هیچ» است؛
   یک فایلِ ۴۰۴ (مثلاً history.json در نسخه‌ی تازه) کلِ کشِ آفلاین را می‌سوزاند
   و کاربرِ بی‌شبکه صفحه‌ی خالی می‌گرفت. حالا هر فایل جدا کش می‌شود و
   شکستِ یکی، بقیه را از بین نمی‌برد. */
var CACHE = 'garmasanj-shell-v20';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/data/snapshot.json',
  './assets/data/live.json',
  './assets/data/history.json',
  './embed.html',
  './assets/img/icon-192.svg',
  './assets/img/icon-512.svg',
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
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        // هر فایل جدا: نبودِ یک فایل نباید کلِ پوسته‌ی آفلاین را از کار بیندازد
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
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
    fetch(e.request).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () {
      // آفلاین: پوسته از کش؛ اگر خودِ صفحه هم نبود، ایندکس را بده (مثل اپ تک‌صفحه‌ای)
      return caches.match(e.request).then(function (hit) {
        return hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : hit);
      });
    })
  );
});
