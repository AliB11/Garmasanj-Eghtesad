/* ============================================================
   گرماسنج — utils.js
   ابزارهای مشترک: اعداد فارسی، رنگ دمایی، شبکه، حافظه، زمان.
   ============================================================ */
(function () {
  'use strict';
  window.GS = window.GS || {};
  var U = {};

  /* ---------- اعداد فارسی و عربی ---------- */
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  var AR = '٠١٢٣٤٥٦٧٨٩';
  U.fa = function (s) { return String(s).replace(/\d/g, function (d) { return FA[+d]; }); };
  U.toEn = function (s) {
    return String(s == null ? '' : s)
      .replace(/[۰-۹]/g, function (d) { return String(FA.indexOf(d)); })
      .replace(/[٠-٩]/g, function (d) { return String(AR.indexOf(d)); })
      .replace(/[−–—]/g, '-')
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

  /** عددخوان مقاوم: تگ HTML، ارقام فارسی/عربی، علامت منفی و جداکننده‌ها را تحمل می‌کند */
  U.num = function (x) {
    if (x == null) return null;
    if (typeof x === 'number') return isFinite(x) ? x : null;
    var s = String(x).replace(/<[^>]*>/g, '');
    s = s.replace(/[۰-۹]/g, function (d) { return String(FA.indexOf(d)); });
    s = s.replace(/[٠-٩]/g, function (d) { return String(AR.indexOf(d)); });
    s = s.replace(/[−–—]/g, '-');
    var v = parseFloat(s.replace(/[٬،,\s]/g, ''));
    return isFinite(v) ? v : null;
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
  /** تاریخ کوتاه شمسی برای محور نمودارها: «۲۵ شهریور» (اختیاری با ساعت) */
  var _dfCache = {};
  U.dateFa = function (ms, withTime) {
    try {
      var k = withTime ? 't' : 'd';
      if (!_dfCache[k]) {
        var o = { calendar: 'persian', timeZone: 'Asia/Tehran', day: 'numeric', month: 'short' };
        if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; o.hour12 = false; }
        _dfCache[k] = new Intl.DateTimeFormat('fa-IR', o);
      }
      return _dfCache[k].format(new Date(ms));
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

  /**
   * وضعیت جلسه‌ی بازار آزاد تهران (ارز/طلا/سکه) از روی GS.config.SESSION.
   * خروجی: {open, label, next} — next: توضیح کوتاه زمان بازگشایی.
   */
  U.marketSession = function () {
    var n = U.tehranNow();
    var S = (window.GS && GS.config && GS.config.SESSION) ? GS.config.SESSION : null;
    if (n.h < 0 || !S) return { open: true, label: 'نامشخص', next: '' };
    var win = S.days[n.dow];
    var open = !!(win && n.h >= win[0] && n.h < win[1]);
    var DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    var next = '';
    if (!open) {
      if (win && n.h < win[0]) next = 'بازگشایی امروز ساعت ' + U.fa(win[0]);
      else {
        var d = (n.dow + 1) % 7, tries = 0;
        while (!S.days[d] && tries < 7) { d = (d + 1) % 7; tries++; }
        next = 'بازگشایی ' + (d === (n.dow + 1) % 7 ? 'فردا' : DAYS[d]) + ' ساعت ' + U.fa(S.days[d] ? S.days[d][0] : 9);
      }
    }
    return { open: open, label: open ? 'باز' : 'بسته', next: next };
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

  /* ---------- کلیپ‌بورد و اشتراک ---------- */
  /** کپی متن؛ اول Clipboard API، بعد روش قدیمی. خروجی Promise<boolean> */
  U.copyText = function (text) {
    return new Promise(function (resolve) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { resolve(true); }, function () { resolve(legacy()); });
          return;
        }
      } catch (e) {}
      resolve(legacy());
    });
    function legacy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand && document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      } catch (e) { return false; }
    }
  };
  /** اشتراک بومی (موبایل) با بازگشت به کپی. خروجی: 'shared' | 'copied' | 'failed' */
  U.shareText = function (title, text) {
    if (navigator.share) {
      return navigator.share({ title: title, text: text }).then(function () { return 'shared'; })
        .catch(function () { return U.copyText(text).then(function (ok) { return ok ? 'copied' : 'failed'; }); });
    }
    return U.copyText(text).then(function (ok) { return ok ? 'copied' : 'failed'; });
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
