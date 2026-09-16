/* ============================================================
   گرماسنج — utils.js
   ابزارهای مشترک: اعداد فارسی، رنگ دمایی، شبکه، حافظه، زمان.
   ============================================================ */
(function () {
  'use strict';
  window.GS = window.GS || {};
  var U = {};

  /* ---------- اعداد فارسی ---------- */
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  U.fa = function (s) { return String(s).replace(/\d/g, function (d) { return FA[+d]; }); };
  U.toEn = function (s) {
    return String(s == null ? '' : s)
      .replace(/[۰-۹]/g, function (d) { return String(FA.indexOf(d)); })
      .replace(/[^\d.\-]/g, '');
  };
  U.fmt = function (n) {
    if (n == null || !isFinite(n)) return '—';
    return U.fa(Math.round(n).toLocaleString('en-US'));
  };
  /** نمایش فشرده برای اعداد بزرگ (تیکر و نمودارها) */
  U.fmtCompact = function (n) {
    if (n == null || !isFinite(n)) return '—';
    var a = Math.abs(n);
    if (a >= 1e12) return U.fa((n / 1e12).toFixed(2)) + ' همت';
    if (a >= 1e9) return U.fa((n / 1e9).toFixed(n < 1e10 ? 2 : 1)) + ' میلیارد';
    if (a >= 1e6) return U.fa((n / 1e6).toFixed(1)) + 'م';
    return U.fmt(n);
  };
  U.fmtMoney = function (n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 1e9) return U.fa((n / 1e9).toFixed(n < 1e10 ? 2 : 1)) + ' میلیارد';
    if (n >= 1e6) return U.fa((n / 1e6).toFixed(1)) + ' میلیون';
    return U.fmt(n);
  };
  U.pct = function (v, d) {
    if (v == null || !isFinite(v)) return '—';
    d = (d == null) ? 1 : d;
    var sign = v > 0.049 ? '+' : (v < -0.049 ? '−' : '');
    return sign + U.fa(Math.abs(v).toFixed(d)) + '٪';
  };
  U.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /** عددخوان مقاوم: تگ HTML، ارقام فارسی و جداکننده‌ها را تحمل می‌کند */
  U.num = function (x) {
    if (x == null) return null;
    if (typeof x === 'number') return isFinite(x) ? x : null;
    var s = String(x).replace(/<[^>]*>/g, '');
    s = s.replace(/[۰-۹]/g, function (d) { return String(FA.indexOf(d)); });
    var v = parseFloat(s.replace(/[٬،,\s]/g, ''));
    return isFinite(v) ? v : null;
  };

  /** جست‌وجوی عمیق کلیدهای کاندید در JSONهای ناهمسان */
  U.deepFind = function (obj, keys, depth) {
    depth = depth || 0;
    if (obj == null || depth > 6) return null;
    var i, k, v, r;
    if (Array.isArray(obj)) {
      for (i = 0; i < obj.length; i++) { r = U.deepFind(obj[i], keys, depth + 1); if (r != null) return r; }
      return null;
    }
    if (typeof obj === 'object') {
      for (i = 0; i < keys.length; i++) { k = keys[i]; v = U.num(obj[k]); if (v != null) return v; }
      var vals = Object.values(obj);
      for (i = 0; i < vals.length; i++) { r = U.deepFind(vals[i], keys, depth + 1); if (r != null) return r; }
    }
    return null;
  };

  /* ---------- رنگ دمایی ---------- */
  var STOPS = [[-30, [34, 160, 166]], [0, [151, 146, 135]], [25, [214, 156, 64]], [55, [255, 120, 44]], [90, [255, 60, 36]]];
  U.tempRGB = function (t) {
    t = U.clamp(t, -30, 90);
    for (var i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i][0]) {
        var t0 = STOPS[i - 1][0], c0 = STOPS[i - 1][1];
        var t1 = STOPS[i][0], c1 = STOPS[i][1];
        var k = (t - t0) / (t1 - t0);
        return [Math.round(c0[0] + (c1[0] - c0[0]) * k), Math.round(c0[1] + (c1[1] - c0[1]) * k), Math.round(c0[2] + (c1[2] - c0[2]) * k)];
      }
    }
    return STOPS[STOPS.length - 1][1].slice();
  };
  U.tempColor = function (t) { var c = U.tempRGB(t); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };
  U.tempRGBA = function (t, a) { var c = U.tempRGB(t); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  /* ---------- زمان ---------- */
  U.ageMin = function (ts) {
    if (!ts || ts < 1e9) return null;
    var t = ts > 1e12 ? ts / 1000 : ts;
    return Math.max(0, Math.round((Date.now() / 1000 - t) / 60));
  };
  U.ageLabel = function (min) {
    if (min == null) return '';
    if (min < 1) return 'همین حالا';
    if (min < 60) return U.fa(min) + ' دقیقه پیش';
    if (min < 1440) return U.fa(Math.round(min / 60)) + ' ساعت پیش';
    return U.fa(Math.round(min / 1440)) + ' روز پیش';
  };
  U.relLabel = function (ts) {
    if (!ts) return 'بدون داده';
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 8) return 'همین حالا';
    if (s < 60) return U.fa(s) + ' ثانیه پیش';
    return U.ageLabel(s / 60);
  };
  U.clockFa = function () {
    try { return U.fa(new Date().toLocaleTimeString('en-GB', { hour12: false })); }
    catch (e) { return ''; }
  };
  U.todayFa = function () {
    try {
      return new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    } catch (e) { return ''; }
  };
  /** ساعت تهران: {h (اعشاری), dow (0=شنبه..6=جمعه)} */
  U.tehranNow = function () {
    try {
      var p = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var h = +p.hour; if (h === 24) h = 0;
      h = h + (+p.minute) / 60;
      var dow = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(p.weekday);
      return { h: h, dow: dow };
    } catch (e) { return { h: -1, dow: -1 }; }
  };

  /* ---------- حافظه محلی امن ---------- */
  U.store = {
    get: function (k, fb) {
      try {
        var v = localStorage.getItem(k);
        return v == null ? fb : JSON.parse(v);
      } catch (e) { return fb; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- شبکه ---------- */
  U.shortUrl = function (u) {
    try {
      var m = String(u).match(/[?&](?:url|quest)=([^&]+)/);
      if (m) return decodeURIComponent(m[1]).slice(0, 84) + ' ⟂پراکسی';
    } catch (e) {}
    return String(u).replace(/^https?:\/\//, '').slice(0, 84);
  };
  U.bust = function (u) { return u + (u.indexOf('?') > -1 ? '&' : '?') + '_cb=' + Date.now().toString(36); };

  function fetchOnce(url, timeout, asText) {
    if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
    var ctl = (typeof window !== 'undefined' && 'AbortController' in window) ? new AbortController() : null;
    var timer = null;
    if (ctl) timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, timeout);
    var t0 = performance.now ? performance.now() : Date.now();
    var opts = { cache: 'no-store', mode: 'cors' };
    if (ctl) opts.signal = ctl.signal;
    return fetch(url, opts).then(function (r) {
      if (timer) clearTimeout(timer);
      var ms = Math.round((performance.now ? performance.now() : Date.now()) - t0);
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.ms = ms; throw e; }
      return (asText ? r.text() : r.json()).then(function (body) { return { body: body, ms: ms }; });
    }).catch(function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }

  /**
   * دریافت JSON با تلاش مستقیم و سپس پراکسی‌ها.
   * خروجی: {j, via, ms, proxyId} یا null
   */
  U.fetchJSONAny = function (url, opt) {
    opt = opt || {};
    var timeout = opt.timeout || 10000;
    var directTimeout = opt.directTimeout || 6000;
    var log = opt.log || function () {};
    var proxies = (window.GS && GS.config) ? (GS.config.PROXIES || []) : [];
    var target = U.bust(url);

    function attempt(u, to, via, proxy) {
      return fetchOnce(u, to, false).then(function (res) {
        var body = res.body;
        if (proxy && proxy.jsonWrapped) {
          try { body = typeof body.contents === 'string' ? JSON.parse(body.contents) : body.contents; }
          catch (e) { body = body.contents; }
        }
        log(true, U.shortUrl(u) + ' → ' + JSON.stringify(body).slice(0, 96), res.ms);
        return { j: body, via: via, ms: res.ms, proxyId: proxy ? proxy.id : null };
      }).catch(function (e) {
        log(false, U.shortUrl(u) + ' → ' + String((e && e.message) || e).slice(0, 60));
        throw e;
      });
    }

    var chain = attempt(target, directTimeout, 'direct', null).catch(function () { return null; });
    proxies.forEach(function (p) {
      chain = chain.then(function (hit) {
        if (hit && hit.j != null) return hit;
        return attempt(p.build(target), timeout, p.jsonWrapped ? 'proxy(get)' : 'proxy', p).catch(function () { return null; });
      });
    });
    return chain.then(function (hit) { return (hit && hit.j != null) ? hit : null; });
  };

  /** مشابه بالا برای پاسخ‌های متنی (TSETMC قدیمی) */
  U.fetchTextAny = function (url, opt) {
    opt = opt || {};
    var timeout = opt.timeout || 10000;
    var log = opt.log || function () {};
    var proxies = (window.GS && GS.config) ? (GS.config.PROXIES || []) : [];
    var target = U.bust(url);

    function attempt(u, to, via) {
      return fetchOnce(u, to, true).then(function (res) {
        var t = res.body;
        if (!t || t.length < 20) throw new Error('empty');
        log(true, U.shortUrl(u) + ' → ' + String(t).slice(0, 84).replace(/\s+/g, ' '), res.ms);
        return { t: t, via: via, ms: res.ms };
      }).catch(function (e) {
        log(false, U.shortUrl(u) + ' → ' + String((e && e.message) || e).slice(0, 60));
        throw e;
      });
    }

    var chain = attempt(target, 5000, 'direct').catch(function () { return null; });
    proxies.forEach(function (p) {
      // allorigins/get برای متن مناسب نیست
      if (p.jsonWrapped) return;
      chain = chain.then(function (hit) {
        if (hit) return hit;
        return attempt(p.build(target), timeout, 'proxy').catch(function () { return null; });
      });
    });
    return chain;
  };

  /* ---------- مسابقه‌ی موازی: مستقیم + همه‌ی پراکسی‌ها ----------
     مسیر سریع: اگر درخواست مستقیم جواب داد (۱–۲ ثانیه) برنده است و بقیه
     لغو می‌شوند؛ در غیر این صورت اولین پاسخِ «معتبر» می‌برد. برخلاف روش
     ترتیبی قبلی، کندترین منبع دیگر کل صفحه را قفل نمی‌کند. */
  var NO_CORS_RE = /tgju|tsetmc|fipiran|brsapi/i;

  function raceFetch(url, opt, asText) {
    opt = opt || {};
    var timeout = opt.timeout || 9000;
    var validate = opt.validate;
    var log = opt.log || function () {};
    if (typeof fetch !== 'function') return Promise.resolve(null);
    var proxies = (typeof window !== 'undefined' && window.GS && GS.config) ? (GS.config.PROXIES || []) : [];
    if (asText) proxies = proxies.filter(function (p) { return !p.jsonWrapped; });
    var proxyDelay = (opt.proxyDelay != null) ? opt.proxyDelay : (NO_CORS_RE.test(url) ? 0 : 900);
    var target = U.bust(url);
    return new Promise(function (resolve) {
      var done = false;
      var pending = 1 + proxies.length;
      var ctls = [];
      function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
      function settle(v) {
        if (done) return; done = true;
        ctls.forEach(function (c) { try { c.abort(); } catch (e) {} });
        resolve(v);
      }
      function attempt(u, via, proxy) {
        if (done) { pending--; return; }
        var ctl = null;
        try { ctl = (typeof window !== 'undefined' && 'AbortController' in window) ? new AbortController() : null; } catch (e) { ctl = null; }
        if (ctl) ctls.push(ctl);
        var finished = false;
        var to = setTimeout(function () { if (!finished) { finished = true; try { if (ctl) ctl.abort(); } catch (e) {} pending--; if (!done && pending <= 0) settle(null); } }, timeout);
        var t0 = now();
        var fopts = { cache: 'no-store', mode: 'cors' };
        if (ctl) fopts.signal = ctl.signal;
        fetch(u, fopts).then(function (r) {
          if (finished) throw new Error('late');
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return asText ? r.text() : r.json();
        }).then(function (body) {
          clearTimeout(to);
          if (finished || done) return;
          finished = true;
          if (proxy && proxy.jsonWrapped && !asText) {
            try { body = (typeof body.contents === 'string') ? JSON.parse(body.contents) : body.contents; } catch (e) { body = body.contents; }
          }
          if (body == null || (asText && String(body).length < 10)) throw new Error('empty');
          if (validate) { var okv = false; try { okv = !!validate(body); } catch (e) { okv = false; } if (!okv) throw new Error('invalid'); }
          var ms = Math.round(now() - t0);
          var preview = String(asText ? body : JSON.stringify(body)).slice(0, 96).replace(/\s+/g, ' ');
          log(true, U.shortUrl(u) + ' → ' + preview, ms);
          pending--;
          settle({ j: asText ? undefined : body, t: asText ? body : undefined, via: via, ms: ms, proxyId: proxy ? proxy.id : null });
        }).catch(function (e) {
          clearTimeout(to);
          if (finished || done) return;
          finished = true;
          if (via === 'direct') log(false, U.shortUrl(u) + ' → ' + String((e && e.message) || e).slice(0, 60));
          pending--;
          if (!done && pending <= 0) settle(null);
        });
      }
      attempt(target, 'direct', null);
      setTimeout(function () {
        if (done) return;
        proxies.forEach(function (p) { attempt(p.build(target), p.jsonWrapped ? 'proxy(get)' : 'proxy', p); });
      }, proxyDelay);
    });
  }

  /* جایگزینی مسیر ترتیبی قدیمی با مسابقه‌ی موازی (امضای سازگار) */
  U.fetchJSONAny = function (url, opt) {
    return raceFetch(url, opt, false).then(function (r) {
      return r ? { j: r.j, via: r.via, ms: r.ms, proxyId: r.proxyId } : null;
    });
  };
  U.fetchTextAny = function (url, opt) {
    return raceFetch(url, opt, true).then(function (r) {
      return r ? { t: r.t, via: r.via, ms: r.ms } : null;
    });
  };

  /**
   * raceSuccess: اولین نتیجه‌ی معتبر را بدون انتظار برای بقیه برمی‌گرداند.
   * (جایگزین درستِ allSettled که تا کندترین پاسخ صبر می‌کرد)
   */
  U.raceSuccess = function (fns, maxWaitMs) {
    maxWaitMs = maxWaitMs || 15000;
    return new Promise(function (resolve) {
      var done = false, pending = fns.length;
      if (!pending) { resolve(null); return; }
      var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, maxWaitMs);
      fns.forEach(function (fn) {
        Promise.resolve().then(fn).then(function (v) {
          if (done) return;
          if (v != null) { done = true; clearTimeout(timer); resolve(v); }
          else if (--pending === 0) { done = true; clearTimeout(timer); resolve(null); }
        }).catch(function () {
          if (done) return;
          if (--pending === 0) { done = true; clearTimeout(timer); resolve(null); }
        });
      });
    });
  };

  /* ---------- DOM ---------- */
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  U.el = function (html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /** شمارش متحرک اعداد */
  U.animateNum = function (el, to, fm, dur) {
    if (!el) return;
    dur = dur || 600;
    var from = parseFloat(el.dataset.v || '0');
    el.dataset.v = to;
    if (!isFinite(from)) from = 0;
    if (Math.abs(to - from) < 1e-9) { el.textContent = fm(to); return; }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof requestAnimationFrame !== 'function') { el.textContent = fm(to); return; }
    var t0 = performance.now();
    function step(now) {
      var k = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = fm(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  GS.utils = U;
})();
