/* ============================================================
   گرماسنج — data.js (نسل ۳: موتور چندمنبعی راستی‌آزمایی‌شده)
   - همه‌ی پارسرها با پاسخ واقعی هر API (شهریور ۱۴۰۵) تطبیق داده شده‌اند
   - بدون پراکسی: فقط اندپوینت‌های مستقیم و CORSباز
   - TGJU با ۵ آینه‌ی موازی (اولین پاسخ معتبر می‌برد)
   - بوت‌استرپ: اسنپ‌شات واقعی + کش مرورگر → اولین نقاشی هرگز خالی نیست
   - اعتبارسنجی: جهش نامعتبر (>۲۵٪) رد می‌شود و قیمت قبلی می‌ماند؛
     اگر همان جهش چند چرخه‌ی پیاپی تکرار شد، بازار واقعاً جابه‌جا شده و پذیرفته می‌شود
   - حریم خصوصی: کلید ناواسان فقط مستقیم ارسال می‌شود (هرگز از پراکسی عبور نمی‌کند)
   ============================================================ */
(function () {
  'use strict';
  window.GS = window.GS || {};

  var U = GS.utils, CFG = GS.config;
  var CH = CFG.CHAIN;

  /* ---------------- وضعیت داخلی ---------------- */
  var QUOTES = {};   // sym -> {p,chg,chgPct,high,low,src,srcFa,ts,live,stale,agree}
  var HIST = {};     // sym -> [{t,p}] سری نشست برای شیب و اسپارک‌لاین
  var SRC = {};      // sourceId -> {ok,ms,at,note}
  var RAW = {};      // providerId -> {d, ts}
  var NETLOG = [];
  var DIAG = [];
  var listeners = {};
  var SNAP_TS = 0;

  var LS_Q = 'garmasanj_quotes_v7';
  var LS_HIST = 'garmasanj_hist_v6';
  var LS_MAN = 'garmasanj_manual_v6';
  var LS_NAV = 'garmasanj_navasan_v6';
  var LS_MIRROR = 'garmasanj_tgju_mirror_v1';
  var FAST_TTL = 90000, SLOW_TTL = 25 * 60000;
  var REJECT = {};   // sym -> {p, n} شمارنده‌ی جهش‌های ردشده‌ی پیاپی (خودترمیمی نگهبان)
  var BOOT_CACHE = null; // کوت‌های نشست قبلی برای «از آخرین بازدیدت»

  CFG.SOURCES.forEach(function (s) { SRC[s.id] = { ok: null, ms: null, at: 0, note: 'هنوز تلاش نشده' }; });
  CFG.ASSETS.forEach(function (a) { QUOTES[a.sym] = { p: null, chg: null, chgPct: null, high: null, low: null, src: null, srcFa: '', ts: 0, live: false, stale: true, agree: 0 }; });

  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  function emit(ev, data) { (listeners[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) {} }); }
  function netlog(ok, note, ms) {
    NETLOG.push({ ok: !!ok, note: String(note).slice(0, 140), ms: ms || null, at: Date.now() });
    if (NETLOG.length > 80) NETLOG.shift();
  }
  function diag(src, ok, detail) { DIAG.push({ src: src, ok: !!ok, detail: String(detail).slice(0, 120) }); if (DIAG.length > 60) DIAG.shift(); }
  function markSrc(id, ok, note, ms) {
    if (!SRC[id]) return;
    SRC[id] = { ok: !!ok, ms: (ms == null ? SRC[id].ms : ms), at: Date.now(), note: note || '' };
  }
  function markIdle(id, note) {
    if (!SRC[id]) return;
    SRC[id] = { ok: null, ms: null, at: Date.now(), note: note || '' };
  }

  function asset(sym) {
    for (var i = 0; i < CFG.ASSETS.length; i++) if (CFG.ASSETS[i].sym === sym) return CFG.ASSETS[i];
    return null;
  }
  function quote(sym) { return QUOTES[sym] || null; }

  /* ============================================================
     لایه‌ی شبکه (مستقیم، بدون پراکسی)
     ============================================================ */
  function nowMs() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  function fetchJSON(url, opt) {
    opt = opt || {};
    var timeout = opt.timeout || 9000;
    if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
    var ctl = null;
    try { ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null; } catch (e) { ctl = null; }
    var timer = null;
    if (ctl) timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, timeout);
    var t0 = nowMs();
    var fopts = { cache: 'no-store', mode: 'cors' };
    if (ctl) fopts.signal = ctl.signal;
    return fetch(url, fopts).then(function (r) {
      if (timer) clearTimeout(timer);
      var ms = Math.round(nowMs() - t0);
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.ms = ms; throw e; }
      return r.json().then(function (j) {
        if (opt.validate) {
          var okv = false;
          try { okv = !!opt.validate(j); } catch (e) { okv = false; }
          if (!okv) { var e2 = new Error('invalid body'); e2.ms = ms; throw e2; }
        }
        return { j: j, ms: ms };
      });
    }).catch(function (e) { if (timer) clearTimeout(timer); throw e; });
  }

  /** اولین موفقیت از میان تلاش‌ها ( short-circuit روی اولین غیرنال) */
  function firstOk(fns, capMs) {
    capMs = capMs || 12000;
    return new Promise(function (resolve) {
      var done = false, pending = fns.length;
      if (!pending) { resolve(null); return; }
      var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, capMs);
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
  }

  /* ============================================================
     ارائه‌دهنده‌ها (ایران: مستقیم + مسابقه‌ی پراکسی — CORSگریز)
     ============================================================ */

  /** پراکسی‌های CORS بازِ مستند — فقط وقتی مستقیم جواب نداد */
  var IR_PROXY_BUILDERS = [
    function (u) { return 'https://cors.isomorphic-git.org/' + u; },
    function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); }
  ];
  var IR_DELAY = 2500; // اگر مستقیم در این مدت نبُرد، پراکسی‌ها وارد مسابقه می‌شوند

  /**
   * واکشی مقاوم برای هاست‌های ایرانی: اول مستقیم، با تأخیر کوتاه
   * پراکسی‌ها هم مسابقه می‌دهند؛ اولین پاسخ «معتبر» می‌برد.
   * خروجی مثل fetchJSON +‎ via‎، یا null.
   */
  function fetchIranian(url, opt) {
    opt = opt || {};
    var validate = opt.validate, timeout = opt.timeout || 9000;
    if (opt.noProxy) { // داده‌ی حساس (مثل کلید API) هرگز از واسطه عبور نمی‌کند
      return fetchJSON(url, { timeout: timeout, validate: validate })
        .then(function (r) { r.via = 'direct'; return r; }, function () { return null; });
    }
    return new Promise(function (resolve) {
      var settled = false, pending = 1 + IR_PROXY_BUILDERS.length;
      var proxyStarted = false, timer = null;
      function done(v) {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          resolve(v);
        }
      }
      function oneFail() { if (--pending <= 0) done(null); }
      function startProxies() {
        if (proxyStarted || settled) return;
        proxyStarted = true;
        if (timer) { clearTimeout(timer); timer = null; }
        IR_PROXY_BUILDERS.forEach(function (b) {
          var pu = b(url);
          fetchJSON(pu, { timeout: 12000, validate: validate }).then(function (r) {
            r.via = 'proxy'; r.proxyUrl = pu; done(r);
          }, oneFail);
        });
      }

      fetchJSON(url, { timeout: timeout, validate: validate }).then(function (r) {
        r.via = 'direct'; done(r);
      }, function () {
        oneFail();
        startProxies();
      });

      timer = setTimeout(startProxies, IR_DELAY);
    });
  }

  /* ----- TGJU: مسابقه‌ی ۵ آینه ----- */
  function tgjuValid(j) {
    return j && j.current && typeof j.current === 'object' && j.current.price_dollar_rl && typeof j.current.price_dollar_rl === 'object';
  }
  /** آینه‌ی برنده‌ی قبلی اول می‌رود؛ بقیه با فاصله‌ی کوتاه پشت سرش (کاهش ۵× ترافیک بی‌فایده) */
  function orderedMirrors() {
    var last = U.store.get(LS_MIRROR, null);
    var list = CFG.TGJU_MIRRORS.slice();
    if (last && list.indexOf(last) > 0) { list.splice(list.indexOf(last), 1); list.unshift(last); }
    return list;
  }
  var MIRROR_STAGGER = 350;
  function fetchTGJU() {
    var jobs = orderedMirrors().map(function (host, idx) {
      return function () {
        var url = host.replace(/\/$/, '') + '/ajax.json';
        var delay = idx === 0 ? 0 : MIRROR_STAGGER * idx;
        return new Promise(function (res) { setTimeout(res, delay); }).then(function () {
          return fetchIranian(url, { timeout: 9000, validate: tgjuValid });
        }).then(function (r) {
          if (!r) {
            netlog(false, host.replace('https://', '') + ' → مستقیم+پراکسی بی‌پاسخ');
            return null;
          }
          if (r.via === 'proxy') netlog(true, host.replace('https://', '') + ' ⟂پراکسی', r.ms);
          U.store.set(LS_MIRROR, host);
          return { current: r.j.current, via: host.replace('https://', '') + (r.via === 'proxy' ? ' ⟂' : ''), ms: r.ms };
        }).catch(function () { return null; });
      };
    });
    return firstOk(jobs, 18000).then(function (d) {
      if (d) {
        var n = Object.keys(d.current).length;
        markSrc('tgju', true, 'دلار ' + U.fmt(U.num(d.current.price_dollar_rl.p) / 10) + ' · ' + U.fa(n) + ' کلید از ' + d.via, d.ms);
        netlog(true, d.via + '/ajax.json → ' + n + ' کلید', d.ms);
      } else {
        markSrc('tgju', false, 'هر ۵ آینه بی‌پاسخ (فیلتر/CORS؟)');
      }
      return d;
    });
  }

  /** ساعت تهرانِ TGJU («2026-09-16 19:59:59») به timestamp */
  function tehranTs(s) {
    try {
      var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
      if (!m) return null;
      var t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - 12600000; // ‎+3:30
      if (!isFinite(t) || t < Date.UTC(2024, 0, 1) || t > Date.now() + 3600000) return null;
      return t;
    } catch (e) { return null; }
  }

  /** نگاشت یک سطر TGJU به کوت — قانون dt و تبدیل ریال→تومان */
  function tgjuQuote(a, entry) {
    if (!entry || typeof entry !== 'object') return null;
    var p = U.num(entry.p);
    if (!(p > 0)) return null;
    var div = (a.rial === false) ? 1 : 10;
    var chg = U.num(entry.d), pct = U.num(entry.dp);
    if (entry.dt === 'low') { // d و dp قدرمطلق‌اند؛ جهت از dt می‌آید
      if (chg != null && chg > 0) chg = -chg;
      if (pct != null && pct > 0) pct = -pct;
    }
    return {
      p: p / div, chg: (chg == null ? null : chg / div), chgPct: pct,
      high: divH(entry.h), low: divH(entry.l),
      ts: tehranTs(entry.ts) || Date.now(), src: 'tgju', srcFa: 'TGJU'
    };
    function divH(v) { var n = U.num(v); return (n == null ? null : n / div); }
  }

  /* ----- نوبیتکس: دو GET موازی ----- */
  function nbOne(src) {
    return fetchIranian('https://api.nobitex.ir/market/stats?srcCurrency=' + src + '&dstCurrency=rls', {
      timeout: 9000,
      validate: function (j) { return j && j.stats && (j.stats[src + '-rls'] || j.stats[src + '-rlt']); }
    }).then(function (r) {
      var st = r.j.stats[src + '-rls'] || r.j.stats[src + '-rlt'];
      return { st: st, ms: r.ms };
    });
  }
  function fetchNobitex() {
    return Promise.all([nbOne('usdt').catch(function () { return null; }), nbOne('btc').catch(function () { return null; })])
      .then(function (rs) {
        var out = {};
        if (rs[0]) {
          var p = U.num(rs[0].st.latest) / 10;
          if (p >= 30000 && p <= 3000000) out.usdt = { p: Math.round(p), chgPct: U.num(rs[0].st.dayChange) };
        }
        if (rs[1]) {
          var b = U.num(rs[1].st.latest) / 10;
          if (b >= 1e8 && b <= 2e13) out.btc = { p: Math.round(b), chgPct: U.num(rs[1].st.dayChange) };
        }
        if (!out.usdt && !out.btc) { markSrc('nobitex', false, 'بی‌پاسخ/نامعتبر'); return null; }
        markSrc('nobitex', true, out.usdt ? ('تتر ' + U.fmt(out.usdt.p)) : 'BTC', (rs[0] || rs[1]).ms);
        return out;
      }).catch(function () { markSrc('nobitex', false, 'خطا'); return null; });
  }

  /* ----- والکس ----- */
  function fetchWallex() {
    return fetchIranian('https://api.wallex.ir/v1/markets', {
      timeout: 11000,
      validate: function (j) { return j && j.result && j.result.symbols && j.result.symbols.USDTTMN; }
    }).then(function (r) {
      var syms = r.j.result.symbols;
      var out = {};
      function one(key, lo, hi) {
        var s = syms[key];
        if (!s) return null;
        var st = s.stats || s;
        var p = U.num(st.lastPrice);
        if (!(p >= lo && p <= hi)) return null;
        return { p: Math.round(p), chgPct: U.num(st['24h_ch']) };
      }
      var u = one('USDTTMN', 30000, 3000000);
      var b = one('BTCTMN', 1e8, 2e13);
      if (u) out.usdt = u;
      if (b) out.btc = b;
      if (!u && !b) { markSrc('wallex', false, 'بازار TMN پیدا نشد', r.ms); return null; }
      markSrc('wallex', true, u ? ('تتر ' + U.fmt(u.p)) : 'BTC', r.ms);
      return out;
    }).catch(function (e) { markSrc('wallex', false, String((e && e.message) || 'بی‌پاسخ').slice(0, 40)); return null; });
  }

  /**
   * تطبیق واحد بیت‌پین: مقیاس پاسخ نامطمئن است (ریال/تومان) —
   * نزدیک‌ترین نامزد به لنگر (آخرین کوت معتبر) انتخاب می‌شود.
   */
  function fitRate(v, anchor, lo, hi) {
    if (!(v > 0)) return null;
    var c = [v, v / 10, v * 10], i;
    if (anchor > 0) {
      for (i = 0; i < 3; i++) if (Math.abs(c[i] - anchor) / anchor <= 0.12) return c[i];
      return null;
    }
    for (i = 0; i < 3; i++) if (c[i] >= lo && c[i] <= hi) return c[i];
    return null;
  }

  /* ----- بیت‌پین (فقط وقتی نوبیتکس+والکس جواب ندادند — پاسخ سنگین) ----- */
  function fetchBitpin() {
    return fetchIranian('https://api.bitpin.ir/v1/mkt/markets/', {
      timeout: 13000,
      validate: function (j) { return j && Array.isArray(j.results) && j.results.length > 10; }
    }).then(function (r) {
      var out = {};
      r.j.results.forEach(function (o) {
        if (!o || typeof o !== 'object') return;
        var code = String(o.code || '');
        var raw = U.num(o.price);
        if (!(raw > 0)) return;
        var ch = U.num(o.price_info && o.price_info.change);
        if (code === 'USDT_IRT') {
          var fu = fitRate(raw, QUOTES.USDT.p, 8e4, 2e6);
          if (fu) out.usdt = { p: Math.round(fu), chgPct: ch };
        }
        if (code === 'BTC_IRT') {
          var fb = fitRate(raw, QUOTES.BTC_TM.p, 5e8, 5e11);
          if (fb) out.btc = { p: Math.round(fb), chgPct: ch };
        }
      });
      if (!out.usdt && !out.btc) { markSrc('bitpin', false, 'بازار IRT پیدا نشد', r.ms); return null; }
      markSrc('bitpin', true, out.usdt ? ('تتر ' + U.fmt(out.usdt.p)) : 'BTC', r.ms);
      return out;
    }).catch(function (e) { markSrc('bitpin', false, String((e && e.message) || 'بی‌پاسخ').slice(0, 40)); return null; });
  }

  /* ----- گروه جهانی BTC/PAXG ----- */
  function fetchCG() {
    return fetchJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold,tether&vs_currencies=usd&include_24hr_change=true', {
      timeout: 10000,
      validate: function (j) { return j && j.bitcoin && U.num(j.bitcoin.usd) > 1000; }
    }).then(function (r) {
      markSrc('coingecko', true, 'BTC $' + U.fmt(U.num(r.j.bitcoin.usd)), r.ms);
      return {
        btc: { p: U.num(r.j.bitcoin.usd), chgPct: U.num(r.j.bitcoin.usd_24h_change) },
        paxg: (r.j['pax-gold'] && U.num(r.j['pax-gold'].usd) > 100) ? { p: U.num(r.j['pax-gold'].usd), chgPct: U.num(r.j['pax-gold'].usd_24h_change) } : null
      };
    }).catch(function () { markSrc('coingecko', false, 'بی‌پاسخ (محدودیت نرخ؟)'); return null; });
  }
  function fetchKraken() {
    return fetchJSON('https://api.kraken.com/0/public/Ticker?pair=XBTUSD,PAXGUSD', {
      timeout: 10000,
      validate: function (j) { return j && j.result && (j.result.XXBTZUSD || j.result.XBTUSD); }
    }).then(function (r) {
      function one(key) {
        var t = r.j.result[key];
        if (!t) return null;
        var last = U.num(t.c && t.c[0]), open = U.num(t.o);
        if (!(last > 0)) return null;
        return { p: last, chgPct: (open > 0 ? (last / open - 1) * 100 : null) };
      }
      var btc = one('XXBTZUSD') || one('XBTUSD');
      var paxg = one('PAXGUSD');
      if (!btc && !paxg) { markSrc('kraken', false, 'ساختار نامعتبر', r.ms); return null; }
      markSrc('kraken', true, btc ? ('BTC $' + U.fmt(btc.p)) : 'PAXG', r.ms);
      return { btc: btc, paxg: paxg };
    }).catch(function () { markSrc('kraken', false, 'بی‌پاسخ'); return null; });
  }
  function fetchBinance() {
    return fetchJSON('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT', {
      timeout: 10000,
      validate: function (j) { return j && U.num(j.lastPrice) > 1000; }
    }).then(function (r) {
      markSrc('binance', true, 'BTC $' + U.fmt(U.num(r.j.lastPrice)), r.ms);
      return { btc: { p: U.num(r.j.lastPrice), chgPct: U.num(r.j.priceChangePercent) } };
    }).catch(function () { markSrc('binance', false, 'بی‌پاسخ'); return null; });
  }
  function fetchCoinbase() {
    return fetchJSON('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
      timeout: 10000,
      validate: function (j) { return j && j.data && U.num(j.data.amount) > 1000; }
    }).then(function (r) {
      markSrc('coinbase', true, 'BTC $' + U.fmt(U.num(r.j.data.amount)), r.ms);
      return { btc: { p: U.num(r.j.data.amount), chgPct: null } };
    }).catch(function () { markSrc('coinbase', false, 'بی‌پاسخ'); return null; });
  }

  /* ----- مرجع برابری‌های جهانی ----- */
  function fetchFrankfurter() {
    return fetchJSON('https://api.frankfurter.dev/v1/latest?from=USD', {
      timeout: 9000,
      validate: function (j) { return j && j.rates && U.num(j.rates.EUR) > 0.5 && U.num(j.rates.EUR) < 2; }
    }).then(function (r) {
      markSrc('frankfurter', true, 'EUR/USD ' + (1 / U.num(r.j.rates.EUR)).toFixed(4), r.ms);
      return { rates: r.j.rates, date: r.j.date };
    }).catch(function () { markSrc('frankfurter', false, 'بی‌پاسخ'); return null; });
  }
  function fetchErapi() {
    return fetchJSON('https://open.er-api.com/v6/latest/USD', {
      timeout: 9000,
      validate: function (j) { return j && j.rates && U.num(j.rates.EUR) > 0.5 && U.num(j.rates.EUR) < 2; }
    }).then(function (r) {
      markSrc('erapi', true, 'EUR/USD ' + (1 / U.num(r.j.rates.EUR)).toFixed(4), r.ms);
      return { rates: r.j.rates };
    }).catch(function () { markSrc('erapi', false, 'بی‌پاسخ'); return null; });
  }

  /* ----- ناواسان (کلید رایگان کاربر) ----- */
  function getNavasanKey() { try { return U.store.get(LS_NAV, null) || null; } catch (e) { return null; } }
  function setNavasanKey(k) { U.store.set(LS_NAV, k); }
  function clearNavasanKey() { U.store.del(LS_NAV); delete RAW.navasan; try { recompute(); } catch (e) {} }

  function fitUnit(v, anchor, lo, hi) {
    if (!(v > 0)) return null;
    var c = [v, v / 10, v * 10];
    var i;
    if (anchor > 0) {
      for (i = 0; i < 3; i++) if (Math.abs(c[i] - anchor) / anchor <= 0.15) return c[i];
      return null;
    }
    for (i = 0; i < 3; i++) if (c[i] >= lo && c[i] <= hi) return c[i];
    return null;
  }

  function fetchNavasan() {
    var key = getNavasanKey();
    if (!key) { markIdle('navasan', 'نیاز به کلید رایگان — از «تنظیمات» اضافه کن'); return Promise.resolve(null); }
    // حریم خصوصی: کلید کاربر فقط مستقیم به ناواسان می‌رود — هرگز از پراکسی عمومی عبور نمی‌کند
    return fetchIranian('https://api.navasan.tech/latest/?api_key=' + encodeURIComponent(key), {
      timeout: 11000, noProxy: true,
      validate: function (j) { return j && (j.usd_sell || j.usd || j.dollar); }
    }).then(function (r) {
      if (!r) { markSrc('navasan', false, 'بی‌پاسخ یا کلید نامعتبر'); return null; }
      var j = r.j;
      function pick(keys) {
        for (var i = 0; i < keys.length; i++) {
          var o = j[keys[i]];
          if (o && U.num(o.value != null ? o.value : o.price) != null) {
            var v = U.num(o.value != null ? o.value : o.price);
            var ch = U.num(o.change) || 0;
            return { p: v, chgPct: (v > 0 ? ch / v * 100 : 0) };
          }
        }
        return null;
      }
      var out = {
        usd: pick(['usd_sell', 'usd', 'dollar', 'usd_buy']),
        eur: pick(['eur', 'euro']),
        g18: pick(['geram18', 'geram_18', 'gold18']),
        emami: pick(['sekke', 'sekee', 'emami']),
        ounce: pick(['ounce', 'ons', 'xau'])
      };
      if (out.ounce && !(out.ounce.p > 200 && out.ounce.p < 20000)) out.ounce = null;
      if (!out.usd && !out.g18 && !out.emami) { markSrc('navasan', false, 'داده‌ی معتبر نداشت', r.ms); return null; }
      markSrc('navasan', true, 'مسیر کلیددار فعال', r.ms);
      return out;
    }).catch(function () { markSrc('navasan', false, 'بی‌پاسخ یا کلید نامعتبر'); return null; });
  }

  /* ----- تاریخچه‌ی ۲۴ساعته BTC برای اسپارک‌لاین ----- */
  function fetchBtcHist() {
    return fetchJSON('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1',
      { timeout: 11000 }).then(function (r) {
        if (!r.j || !Array.isArray(r.j.prices) || r.j.prices.length < 4) return null;
        return r.j.prices.map(function (pt) { return { t: pt[0], p: U.num(pt[1]) }; }).filter(function (x) { return x.p; });
      }).catch(function () { return null; });
  }

  /* ============================================================
     ثبت کوت + تاریخچه + اجماع
     ============================================================ */
  function histPush(sym, price) {
    if (!(price > 0)) return;
    var h = HIST[sym] || (HIST[sym] = []);
    var last = h[h.length - 1];
    if (last && Math.abs(last.p - price) / price < 0.0002 && Date.now() - last.t < 60000) { last.t = Date.now(); return; }
    h.push({ t: Date.now(), p: price });
    if (h.length > 200) HIST[sym] = h.slice(-200);
  }
  function histSave() {
    var slim = {};
    Object.keys(HIST).forEach(function (k) { slim[k] = (HIST[k] || []).slice(-80); });
    U.store.set(LS_HIST, slim);
  }
  function histLoad() {
    var h = U.store.get(LS_HIST, null);
    if (h && typeof h === 'object') {
      Object.keys(h).forEach(function (k) {
        if (Array.isArray(h[k])) HIST[k] = h[k].filter(function (x) { return x && x.t && x.p; }).slice(-200);
      });
    }
  }

  /** اجماع خوشه‌ای: پرجمعیت‌ترین خوشه‌ی ±tol، نماینده = پر‌وزن‌ترین */
  function consensus(cands, tol) {
    tol = tol || 0.02;
    var v = (cands || []).filter(function (c) { return c && c.p != null && c.p > 0 && isFinite(c.p); });
    if (!v.length) return null;
    var best = null, bestScore = -1;
    v.forEach(function (c) {
      var cl = v.filter(function (o) { return Math.abs(o.p - c.p) / c.p <= tol; });
      var score = cl.length * 10 + cl.reduce(function (s, o) { return s + (o.w || 0); }, 0);
      if (score > bestScore) { bestScore = score; best = cl; }
    });
    var rep = best[0], maxW = -1;
    best.forEach(function (c) { if ((c.w || 0) > maxW) { maxW = c.w || 0; rep = c; } });
    return { p: rep.p, chgPct: rep.chgPct, src: rep.src, agree: best.length, srcs: best.map(function (o) { return o.src; }).join(' + ') };
  }

  /**
   * بهداشتِ دامنه‌ی روز: سقف و کف فقط وقتی پذیرفته می‌شوند که قیمت را در بر
   * بگیرند، وارونه نباشند و دامنه‌ای غیرممکن نسازند.
   * چرا؟ سقف/کفِ یک منبع (یا اسنپ‌شاتِ چند روز پیش) نباید روی قیمتِ امروزِ
   * منبعی دیگر بنشیند و عددی مثل «قیمت زیر کف امروز» تولید کند.
   */
  var RANGE_MAX_SPAN = 0.35; // دامنه‌ی روزِ بیش از ۳۵٪ قیمت، غیرواقعی است
  function saneRange(p, high, low) {
    var h = (high != null && isFinite(high) && high > 0) ? high : null;
    var l = (low != null && isFinite(low) && low > 0) ? low : null;
    if (h == null || l == null) return { high: null, low: null };
    if (h < l) return { high: null, low: null };
    if (p < l || p > h) return { high: null, low: null };
    if ((h - l) / p > RANGE_MAX_SPAN) return { high: null, low: null };
    return { high: h, low: l };
  }

  /**
   * ثبت کوت با اعتبارسنجی جهش: اگر قیمت زنده‌ی جدید بیش از ۲۵٪ با
   * آخرین قیمت زنده فاصله داشت، رد می‌شود و قبلی می‌ماند.
   */
  function setQ(sym, q) {
    var cur = QUOTES[sym];
    if (!cur || !q || !(q.p > 0) || !isFinite(q.p)) return false;
    var J = CFG.JUMP || { maxPct: 0.25, confirmCycles: 3, confirmBand: 0.05 };
    if (cur.live && cur.p > 0 && q.live !== false && !cur.est && q.src !== 'manual') {
      var jump = Math.abs(q.p - cur.p) / cur.p;
      if (jump > J.maxPct) {
        // خودترمیمی: اگر همین قیمت «دور» چند چرخه‌ی پیاپی تکرار شود، بازار واقعاً جابه‌جا شده است
        var r = REJECT[sym];
        if (r && Math.abs(q.p - r.p) / r.p <= J.confirmBand) r.n++;
        else r = REJECT[sym] = { p: q.p, n: 1 };
        if (r.n < J.confirmCycles) {
          diag(asset(sym) ? asset(sym).fa : sym, false, 'جهش ' + Math.round(jump * 100) + '٪ از ' + (q.srcFa || q.src) + ' رد شد (' + U.fa(r.n) + '/' + U.fa(J.confirmCycles) + ')');
          return false;
        }
        diag(asset(sym) ? asset(sym).fa : sym, true, 'جهش ' + Math.round(jump * 100) + '٪ پس از ' + U.fa(r.n) + ' تأیید پیاپی پذیرفته شد');
        emit('toast', { kind: 'warn', title: 'جهش تأییدشده', msg: (asset(sym) ? asset(sym).fa : sym) + ' ' + Math.round(jump * 100) + '٪ جابه‌جا شد و پس از چند چرخه تأیید، پذیرفته شد.' });
      }
    }
    delete REJECT[sym];
    var dir = (cur.p != null) ? Math.sign(q.p - cur.p) : 1;
    var changed = (cur.p !== q.p);
    // به‌روزرسانی از همان منبع می‌تواند فیلدهای ناقص را از کوت قبلی قرض بگیرد؛
    // کوتِ تازه از منبعی دیگر باید خودبسنده باشد (تغییرِ دیروز به قیمتِ امروز نسبت داده نشود)
    var sameSrc = !!(cur.src && q.src && cur.src === q.src);
    var rng = saneRange(q.p, q.high, q.low);
    QUOTES[sym] = {
      p: q.p,
      chg: (q.chg != null && isFinite(q.chg)) ? q.chg : (sameSrc ? cur.chg : null),
      chgPct: (q.chgPct != null && isFinite(q.chgPct) && Math.abs(q.chgPct) <= 25) ? q.chgPct : (sameSrc ? cur.chgPct : null),
      high: rng.high, low: rng.low,
      src: q.src || cur.src, srcFa: q.srcFa || cur.srcFa,
      ts: q.ts || Date.now(),
      live: q.live !== false, stale: !!q.stale,
      est: !!q.est,
      agree: q.agree || 1
    };
    if (q.chg == null && QUOTES[sym].chgPct != null) {
      QUOTES[sym].chg = Math.round(QUOTES[sym].p * QUOTES[sym].chgPct / 100);
    }
    histPush(sym, q.p);
    if (changed) emit('price', { sym: sym, dir: dir });
    return true;
  }

  /**
   * ثبت مشتق/فرمول با وراثت سرزندگی: اگر ورودی‌ها زنده نیستند،
   * مقدار واقعی موجود (اسنپ‌شات/کش/قدیمی) هرگز بازنویسی نمی‌شود و
   * فقط خانه‌ی خالی با برچسب «تخمین» پر می‌شود. (رفع فساد بوت)
   */
  function setDerived(sym, q, inputsLive, exact) {
    if (!q || !(q.p > 0)) return false;
    if (inputsLive) { q.live = true; q.est = !exact; }
    else {
      var cur = QUOTES[sym];
      if (cur && cur.p > 0) return false;
      q.live = false; q.est = true; q.stale = true;
    }
    return setQ(sym, q);
  }

  /** شیب نشست: درصد تغییر بر ساعت (رگرسیون لگاریتمی) */
  function slope(sym) {
    var h = HIST[sym] || [];
    if (h.length < 4) return 0;
    var pts = h.slice(-24).filter(function (pt) { return pt && pt.p > 0; }), n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    if (n < 4) return 0;
    var t0 = pts[0].t;
    pts.forEach(function (pt) {
      var x = (pt.t - t0) / 3600000, y = Math.log(pt.p);
      sx += x; sy += y; sxx += x * x; sxy += x * y;
    });
    var den = n * sxx - sx * sx;
    if (!den) return 0;
    var res = (n * sxy - sx * sy) / den * 100;
    return isFinite(res) ? U.clamp(res, -10, 10) : 0;
  }

  /* ============================================================
     انبار نتایج + بازمحاسبه‌ی تدریجی
     ============================================================ */
  function raw(id, ttl) {
    var r = RAW[id];
    if (!r) return null;
    if (Date.now() - r.ts > (ttl || FAST_TTL)) return null;
    return r.d;
  }
  function ingest(id, d) {
    if (d == null) return false;
    RAW[id] = { d: d, ts: Date.now() };
    try { recompute(); } catch (e) { diag('بازمحاسبه', false, String((e && e.message) || e).slice(0, 80)); }
    return true;
  }

  function manualUsd() {
    var m = U.store.get(LS_MAN, null);
    if (m && m.v > 0 && (Date.now() - m.ts < 24 * 3600000)) return m.v;
    return null;
  }
  function setManualUsd(v) {
    v = Math.round(v);
    if (!(v > 0)) return false;
    U.store.set(LS_MAN, { v: v, ts: Date.now() });
    try { recompute(); } catch (e) {}
    cacheSave();
    return true;
  }
  function clearManualUsd() {
    U.store.del(LS_MAN);
    if (QUOTES.USD && QUOTES.USD.src === 'manual') { QUOTES.USD.live = false; QUOTES.USD.stale = true; }
    try { recompute(); } catch (e) {}
  }

  function clearCache() {
    U.store.del(LS_Q);
    U.store.del(LS_HIST);
  }

  function cacheSave() {
    var q = {};
    Object.keys(QUOTES).forEach(function (s) {
      var x = QUOTES[s];
      if (x && x.p > 0 && x.live) q[s] = { p: x.p, chg: x.chg, chgPct: x.chgPct, high: x.high, low: x.low, src: x.src, srcFa: x.srcFa, ts: x.ts };
    });
    if (!Object.keys(q).length) return;
    U.store.set(LS_Q, { ts: Date.now(), q: q });
  }

  function cacheLoad() {
    var c = U.store.get(LS_Q, null);
    if (!c || !c.q) return 0;
    BOOT_CACHE = { ts: c.ts || 0, q: {} };
    Object.keys(c.q).forEach(function (s) {
      if (!QUOTES[s]) return;
      var x = c.q[s];
      if (x && x.p > 0) {
        BOOT_CACHE.q[s] = x.p;
        QUOTES[s] = {
          p: x.p, chg: x.chg != null ? x.chg : null, chgPct: x.chgPct != null ? x.chgPct : null,
          high: x.high != null ? x.high : null, low: x.low != null ? x.low : null,
          src: x.src || 'cache', srcFa: (x.srcFa || 'کش') + ' (کش)',
          ts: x.ts || c.ts || 0, live: false, stale: true, agree: 1, fromCache: true
        };
      }
    });
    return c.ts || 0;
  }

  /**
   * «از آخرین بازدیدت»: تفاوت قیمت‌های کلیدی با نشست قبلی (فقط اگر کش
   * دست‌کم ۳۰ دقیقه قدیمی باشد تا نویز نشود). یک‌بار پس از اولین چرخه‌ی زنده.
   */
  var sinceDone = false;
  function sinceLastVisit() {
    if (sinceDone || !BOOT_CACHE || !BOOT_CACHE.ts) return null;
    if (Date.now() - BOOT_CACHE.ts < 30 * 60000) { sinceDone = true; return null; }
    var rows = [];
    ['USD', 'G18', 'EMAMI', 'USDT', 'BTC_USD'].forEach(function (s) {
      var prev = BOOT_CACHE.q[s], q = QUOTES[s];
      if (!(prev > 0) || !q || !q.live || !(q.p > 0)) return;
      rows.push({ sym: s, fa: (asset(s) || {}).short || s, prev: prev, now: q.p, pct: (q.p / prev - 1) * 100 });
    });
    if (rows.length < 2) return null;
    sinceDone = true;
    var out = { since: BOOT_CACHE.ts, rows: rows };
    emit('since', out);
    return out;
  }

  /** بوت‌استرپ از اسنپ‌شات واقعی همراه نسخه */
  function snapshotLoad() {
    return fetchJSON('assets/data/snapshot.json', { timeout: 6000 }).then(function (r) {
      var j = r.j;
      if (!j || !j.quotes) return 0;
      SNAP_TS = Date.parse(j.generated_at) || 0;
      var n = 0;
      Object.keys(j.quotes).forEach(function (s) {
        if (!QUOTES[s]) return;
        var x = j.quotes[s];
        var cur = QUOTES[s];
        var olderCache = !!(cur && cur.fromCache && SNAP_TS > (cur.ts || 0) + 60000);
        if (x && x.p > 0 && (cur.p == null || olderCache)) {
          var sr = saneRange(x.p, x.high, x.low);
          QUOTES[s] = {
            p: x.p, chg: x.chg != null ? x.chg : null, chgPct: x.chgPct != null ? x.chgPct : null,
            high: sr.high, low: sr.low,
            src: 'snapshot', srcFa: x.derived ? 'اسنپ‌شات (مشتق)' : 'اسنپ‌شات انتشار',
            ts: SNAP_TS, live: false, stale: true, agree: 1
          };
          n++;
        }
      });
      markSrc('snapshot', true, U.fa(n) + ' کوت اولیه (' + (j.generated_fa || '') + ')', r.ms);
      try { recompute(true); } catch (e) {}
      emit('quotes', { boot: true });
      return SNAP_TS;
    }).catch(function () {
      markSrc('snapshot', false, 'فایل اسنپ‌شات خوانده نشد');
      return 0;
    });
  }

  /* ----- انتشار زنده‌ی سرور (هم‌مبدأ؛ از CORS و فیلتر عبور می‌کند) ----- */
  function fetchLive() {
    return fetchJSON('assets/data/live.json', {
      timeout: 6000,
      validate: function (j) { return j && j.quotes && U.num(j.quotes.USD && j.quotes.USD.p) > 0; }
    }).then(function (r) {
      var age = '';
      try { age = U.relLabel(Date.parse(r.j.generated_at) || 0); } catch (e) {}
      markSrc('live', true, U.fa(Object.keys(r.j.quotes).length) + ' کوت · ' + age, r.ms);
      return { quotes: r.j.quotes, fx: r.j.fx || null, at: Date.parse(r.j.generated_at) || 0 };
    }).catch(function () { markSrc('live', false, 'فایل انتشار خوانده نشد'); return null; });
  }

  /** بوت: اول اسنپ‌شات (نمایش فوری)، بعد انتشار زنده */
  function bootAll() {
    return snapshotLoad().then(function () {
      return fetchLive().then(function (d) { if (d != null) ingest('live', d); return d; })
        .catch(function () { return null; });
    }).then(function (d) {
      // تاریخچه‌ی بلندمدت بوت را معطل نمی‌کند؛ هر وقت رسید رویداد 'history' می‌آید
      try { fetchHistory(); } catch (e) {}
      return d;
    });
  }

  /** قلب موتور: ساخت همه‌ی کوت‌ها از تازه‌ترین خروجی هر ارائه‌دهنده */
  function recompute(fromBoot) {
    var tgRaw = raw('tgju'), ex = raw('ex'), gl = raw('global'), fx = raw('fx'),
        nav = raw('navasan', SLOW_TTL), lvRaw = raw('live', 12 * 3600000);
    if (!tgRaw && !ex && !gl && !fx && !nav && !lvRaw && !fromBoot && !manualUsd()) return;

    /* ---- پارس TGJU ---- */
    var T = {};
    if (tgRaw && tgRaw.current) {
      CFG.ASSETS.forEach(function (a) {
        if (a.derived || !a.tgju || !a.tgju.length) return;
        for (var i = 0; i < a.tgju.length; i++) {
          var e = tgRaw.current[a.tgju[i]];
          if (e) {
            var q = null;
            try { q = tgjuQuote(a, e); } catch (err) { q = null; }
            if (q && q.p > 0) { T[a.sym] = q; break; }
          }
        }
      });
    }

    /* ---- صرافی‌های ایران (اولویت: نوبیتکس، والکس، بیت‌پین) ---- */
    var E = {};
    if (ex) {
      ['usdt', 'btc'].forEach(function (k) {
        var hit = null, srcFa = '';
        if (ex.nb && ex.nb[k]) { hit = ex.nb[k]; srcFa = 'نوبیتکس'; }
        else if (ex.wx && ex.wx[k]) { hit = ex.wx[k]; srcFa = 'والکس'; }
        else if (ex.bp && ex.bp[k]) { hit = ex.bp[k]; srcFa = 'بیت‌پین'; }
        if (hit) E[k] = { p: hit.p, chgPct: hit.chgPct, src: 'exchange', srcFa: srcFa, ts: Date.now() };
      });
    }

    /* ---- اجماع جهانی BTC و PAXG ---- */
    var G = {};
    if (gl) {
      var bc = consensus([
        gl.cg && gl.cg.btc ? { p: gl.cg.btc.p, chgPct: gl.cg.btc.chgPct, src: 'CoinGecko', w: 9 } : null,
        gl.rk && gl.rk.btc ? { p: gl.rk.btc.p, chgPct: gl.rk.btc.chgPct, src: 'Kraken', w: 9 } : null,
        gl.bn && gl.bn.btc ? { p: gl.bn.btc.p, chgPct: gl.bn.btc.chgPct, src: 'Binance', w: 10 } : null,
        gl.cb && gl.cb.btc ? { p: gl.cb.btc.p, chgPct: gl.cb.btc.chgPct, src: 'Coinbase', w: 8 } : null
      ], 0.02);
      if (bc) G.btc = { p: Math.round(bc.p), chgPct: bc.chgPct, src: 'global', srcFa: bc.agree > 1 ? ('توافق ' + U.fa(bc.agree) + ' منبع جهانی') : bc.src, agree: bc.agree, ts: Date.now() };
      var pc = consensus([
        gl.cg && gl.cg.paxg ? { p: gl.cg.paxg.p, chgPct: gl.cg.paxg.chgPct, src: 'CoinGecko', w: 9 } : null,
        gl.rk && gl.rk.paxg ? { p: gl.rk.paxg.p, chgPct: gl.rk.paxg.chgPct, src: 'Kraken', w: 9 } : null
      ], 0.02);
      if (pc) G.paxg = { p: Math.round(pc.p * 100) / 100, chgPct: pc.chgPct, src: 'global', srcFa: 'PAXG جهانی', agree: pc.agree, ts: Date.now() };
    }

    /* ---- انتشار زنده‌ی سرور: پس از مستقیم‌ها، پیش از فرمول‌ها ---- */
    var LV = {};
    if (lvRaw && lvRaw.quotes) {
      Object.keys(lvRaw.quotes).forEach(function (sym) {
        if (!QUOTES[sym]) return;
        var x = lvRaw.quotes[sym];
        if (x && x.p > 0) LV[sym] = {
          p: x.p, chg: x.chg, chgPct: x.chgPct, high: x.high, low: x.low,
          ts: x.ts || lvRaw.at || Date.now(), src: 'live', srcFa: 'انتشار زنده' + (x.src ? ' · ' + x.src : ''), agree: x.agree || 1
        };
      });
    }

    /* ---- دلار (ورود دستی بر همه مقدم است) ---- */
    var man = manualUsd();
    var usdP = null;
    if (man) { setQ('USD', { p: man, src: 'manual', srcFa: 'ورود دستی', ts: Date.now(), live: true }); usdP = man; }
    else if (T.USD) { if (setQ('USD', T.USD)) usdP = T.USD.p; }
    else if (nav && nav.usd) {
      var nv = fitUnit(nav.usd.p, QUOTES.USD.p, 30000, 3000000);
      if (nv && setQ('USD', { p: Math.round(nv), chgPct: nav.usd.chgPct, src: 'navasan', srcFa: 'ناواسان', ts: Date.now() })) usdP = nv;
    }
    else if (LV.USD) { if (setQ('USD', LV.USD)) usdP = LV.USD.p; }
    if (!usdP && E.usdt) { // تتر ≈ دلار (پروکسی صادقانه با برچسب)
      if (setQ('USD', { p: E.usdt.p, chgPct: E.usdt.chgPct, src: E.usdt.src, srcFa: E.usdt.srcFa + ' (معادل تتر)', ts: Date.now() })) usdP = E.usdt.p;
    }
    if (!usdP) usdP = QUOTES.USD.p; // اسنپ‌شات/کش/قدیمی

    /* ---- انس جهانی ---- */
    var ozP = null;
    if (T.OUNCE_USD) { if (setQ('OUNCE_USD', T.OUNCE_USD)) ozP = T.OUNCE_USD.p; }
    else if (G.paxg) { if (setQ('OUNCE_USD', { p: G.paxg.p, chgPct: G.paxg.chgPct, src: 'global', srcFa: 'PAXG جهانی', ts: Date.now() })) ozP = G.paxg.p; }
    else if (nav && nav.ounce) { if (setQ('OUNCE_USD', { p: nav.ounce.p, chgPct: nav.ounce.chgPct, src: 'navasan', srcFa: 'ناواسان', ts: Date.now() })) ozP = nav.ounce.p; }
    else if (LV.OUNCE_USD) { if (setQ('OUNCE_USD', LV.OUNCE_USD)) ozP = LV.OUNCE_USD.p; }
    if (!ozP) ozP = QUOTES.OUNCE_USD.p;

    var usdLive = !!(QUOTES.USD && QUOTES.USD.live);
    var ozLive = !!(QUOTES.OUNCE_USD && QUOTES.OUNCE_USD.live);

    /* ---- سایر ارزها: TGJU ← ناواسان ← برابری جهانی × دلار ---- */
    var rates = fx && fx.rates;
    function cross(perUsd) { // perUsd: چند واحد ارز به‌ازای هر دلار → تومانِ هر واحد
      if (!(usdP > 0) || !(perUsd > 0)) return null;
      return usdP / perUsd;
    }
    var fiatJobs = [
      { sym: 'EUR', nav: nav && nav.eur, lo: 30000, hi: 4000000, implied: rates ? cross(U.num(rates.EUR)) : null, ref: 'EUR/USD جهانی' },
      { sym: 'GBP', lo: 30000, hi: 5000000, implied: rates ? cross(U.num(rates.GBP)) : null, ref: 'GBP/USD جهانی' },
      { sym: 'AED', lo: 5000, hi: 1000000, implied: usdP ? usdP / CH.AED_PEG : null, ref: 'پگ درهم' },
      { sym: 'CHF', lo: 30000, hi: 4000000, implied: rates ? cross(U.num(rates.CHF)) : null, ref: 'USD/CHF جهانی' },
      { sym: 'CNY', lo: 3000, hi: 500000, implied: rates ? cross(U.num(rates.CNY)) : null, ref: 'USD/CNY جهانی' },
      { sym: 'TRY', lo: 500, hi: 200000, implied: rates ? cross(U.num(rates.TRY)) : null, ref: 'USD/TRY جهانی' }
    ];
    fiatJobs.forEach(function (fj) {
      if (T[fj.sym]) { setQ(fj.sym, T[fj.sym]); return; }
      if (fj.nav) {
        var nv2 = fitUnit(fj.nav.p, QUOTES[fj.sym].p, fj.lo, fj.hi);
        if (nv2) { setQ(fj.sym, { p: Math.round(nv2), chgPct: fj.nav.chgPct, src: 'navasan', srcFa: 'ناواسان', ts: Date.now() }); return; }
      }
      if (LV[fj.sym]) { setQ(fj.sym, LV[fj.sym]); return; }
      if (fj.implied && fj.implied >= fj.lo && fj.implied <= fj.hi) {
        setDerived(fj.sym, { p: Math.round(fj.implied), chgPct: QUOTES.USD.chgPct, src: 'fx', srcFa: 'دلار × ' + fj.ref, ts: Date.now() }, usdLive);
      }
    });

    /* ---- طلا: TGJU ← ناواسان ← انتشار زنده ← فرمول (فقط با ورودی زنده) ---- */
    var fairG18 = (ozP > 0 && usdP > 0) ? (ozP / CH.OUNCE_G) * CH.K18 * usdP : null;
    var g18Done = false;
    if (T.G18) { setQ('G18', T.G18); g18Done = true; }
    if (!g18Done && nav && nav.g18) {
      var ng = fitUnit(nav.g18.p, QUOTES.G18.p, 1000000, 400000000);
      if (ng) { setQ('G18', { p: Math.round(ng), chgPct: nav.g18.chgPct, src: 'navasan', srcFa: 'ناواسان', ts: Date.now() }); g18Done = true; }
    }
    if (!g18Done && LV.G18) { setQ('G18', LV.G18); g18Done = true; }
    if (!g18Done && fairG18) setDerived('G18', { p: Math.round(fairG18), chgPct: QUOTES.OUNCE_USD.chgPct, src: 'formula', srcFa: 'فرمول اونس × دلار', ts: Date.now() }, ozLive && usdLive);
    var g18P = QUOTES.G18.p, g18Live = !!(QUOTES.G18 && QUOTES.G18.live);
    if (T.G24) setQ('G24', T.G24);
    else if (LV.G24) setQ('G24', LV.G24);
    else if (g18P > 0) setDerived('G24', { p: Math.round(g18P * CH.G24_K), chgPct: QUOTES.G18.chgPct, src: 'formula', srcFa: 'مشتق از طلای ۱۸', ts: Date.now() }, g18Live);
    if (T.MESGHAL) setQ('MESGHAL', T.MESGHAL);
    else if (LV.MESGHAL) setQ('MESGHAL', LV.MESGHAL);
    else if (g18P > 0) setDerived('MESGHAL', { p: Math.round(g18P * CH.MESGHAL_K), chgPct: QUOTES.G18.chgPct, src: 'formula', srcFa: 'مشتق از طلای ۱۸', ts: Date.now() }, g18Live);
    if (ozP > 0 && usdP > 0) {
      setDerived('OUNCE_TM', {
        p: Math.round(ozP * usdP), chgPct: ((QUOTES.OUNCE_USD.chgPct || 0) + (QUOTES.USD.chgPct || 0)),
        src: 'formula', srcFa: 'اونس × دلار', ts: Date.now()
      }, ozLive && usdLive, true);
    }

    /* ---- سکه: TGJU ← ناواسان ← ارزش ذاتی ← کش ---- */
    var g24P = QUOTES.G24.p || (g18P > 0 ? g18P * CH.G24_K : null);
    function intrinsic(sym) {
      if (!(g24P > 0)) return null;
      if (sym === 'EMAMI' || sym === 'BAHAR') return g24P * CH.EMAMI_G;
      if (sym === 'NIM') return g24P * CH.NIM_G;
      if (sym === 'ROB') return g24P * CH.ROB_G;
      if (sym === 'GERAMI') return g24P * CH.GERAMI_G;
      return null;
    }
    var g24Live = !!(QUOTES.G24 && QUOTES.G24.live);
    ['EMAMI', 'BAHAR', 'NIM', 'ROB', 'GERAMI'].forEach(function (sym) {
      if (T[sym]) { setQ(sym, T[sym]); return; }
      if (sym === 'EMAMI' && nav && nav.emami) {
        var nc = fitUnit(nav.emami.p, QUOTES.EMAMI.p, 1e7, 3e9);
        if (nc) { setQ(sym, { p: Math.round(nc), chgPct: nav.emami.chgPct, src: 'navasan', srcFa: 'ناواسان', ts: Date.now() }); return; }
      }
      if (LV[sym]) { setQ(sym, LV[sym]); return; }
      var iv = intrinsic(sym);
      if (iv) setDerived(sym, { p: Math.round(iv), chgPct: QUOTES.G18.chgPct, src: 'formula', srcFa: 'ارزش ذاتی (تقریبی)', ts: Date.now() }, g24Live || g18Live);
    });

    /* ---- رمزارز: مستقیم ← انتشار زنده ← تبدیل (فقط با ورودی زنده) ---- */
    if (E.usdt) setQ('USDT', { p: E.usdt.p, chgPct: E.usdt.chgPct, src: E.usdt.src, srcFa: E.usdt.srcFa, ts: Date.now() });
    else if (T.USDT) setQ('USDT', T.USDT);
    else if (LV.USDT) setQ('USDT', LV.USDT);
    if (G.btc) setQ('BTC_USD', { p: G.btc.p, chgPct: G.btc.chgPct, src: G.btc.src, srcFa: G.btc.srcFa, agree: G.btc.agree, ts: Date.now() });
    else if (LV.BTC_USD) setQ('BTC_USD', LV.BTC_USD);
    else if (QUOTES.BTC_TM.p > 0 && usdP > 0) {
      setDerived('BTC_USD', { p: Math.round(QUOTES.BTC_TM.p / usdP), chgPct: QUOTES.BTC_TM.chgPct, src: 'formula', srcFa: 'تومانی ÷ دلار', ts: Date.now() }, !!(QUOTES.BTC_TM.live && QUOTES.USD.live), true);
    }
    var btcUsdP = QUOTES.BTC_USD.p, btcUsdLive = !!(QUOTES.BTC_USD && QUOTES.BTC_USD.live);
    if (E.btc) setQ('BTC_TM', { p: E.btc.p, chgPct: E.btc.chgPct, src: E.btc.src, srcFa: E.btc.srcFa, ts: Date.now() });
    else if (T.BTC_TM) setQ('BTC_TM', T.BTC_TM);
    else if (LV.BTC_TM) setQ('BTC_TM', LV.BTC_TM);
    else if (btcUsdP > 0 && usdP > 0) {
      setDerived('BTC_TM', {
        p: Math.round(btcUsdP * usdP), chgPct: ((QUOTES.BTC_USD.chgPct || 0) + (QUOTES.USD.chgPct || 0)),
        src: 'formula', srcFa: 'دلاری × دلار', ts: Date.now()
      }, btcUsdLive && usdLive, true);
    }

    /* ---- تاریخچه‌ی BTC برای اسپارک‌لاین ---- */
    var bh = raw('btcHist', SLOW_TTL);
    if (bh && bh.length > 4 && usdP > 0) {
      var key = bh[0].t + '_' + bh[bh.length - 1].t;
      if (key !== btcHistKey) {
        btcHistKey = key;
        HIST.BTC_USD = bh.slice(-48).map(function (pt) { return { t: pt.t, p: Math.round(pt.p) }; });
        HIST.BTC_TM = bh.slice(-48).map(function (pt) { return { t: pt.t, p: Math.round(pt.p * usdP) }; });
      }
    }

    emit('quotes', {});
  }
  var btcHistKey = '';

  function diagCycle() {
    ['USD', 'EUR', 'G18', 'MESGHAL', 'OUNCE_USD', 'EMAMI', 'NIM', 'USDT', 'BTC_USD', 'BTC_TM'].forEach(function (s) {
      var q = QUOTES[s];
      if (q && q.p != null) diag((asset(s) || {}).fa || s, q.live, U.fmtCompact(q.p) + ' ← ' + (q.srcFa || ''));
    });
  }

  /* ============================================================
     شاخص‌های مشتق و زنجیره
     ============================================================ */
  function P(sym) { var q = QUOTES[sym]; return (q && q.p > 0) ? q.p : null; }

  function derived() {
    var out = {};
    var usd = P('USD'), usdt = P('USDT'), eur = P('EUR'), g18 = P('G18'),
        g24 = P('G24') || (g18 ? g18 * CH.G24_K : null),
        oz = P('OUNCE_USD'), emami = P('EMAMI'), bahar = P('BAHAR'), mesghal = P('MESGHAL'),
        btcU = P('BTC_USD'), btcT = P('BTC_TM'), nim = P('NIM'), rob = P('ROB'),
        gerami = P('GERAMI');
    if (usd && usdt) out.usdtPrem = (usdt - usd) / usd * 100;
    if (g24 && emami) {
      out.intrinsicEmami = g24 * CH.EMAMI_G;
      out.bubble = (emami / out.intrinsicEmami - 1) * 100;
    }
    if (g24 && bahar) {
      out.intrinsicBahar = g24 * CH.EMAMI_G;
      out.bubbleBahar = (bahar / out.intrinsicBahar - 1) * 100;
    }
    if (g24 && nim) {
      out.intrinsicNim = g24 * CH.NIM_G;
      out.bubbleNim = (nim / out.intrinsicNim - 1) * 100;
    }
    if (g24 && rob) {
      out.intrinsicRob = g24 * CH.ROB_G;
      out.bubbleRob = (rob / out.intrinsicRob - 1) * 100;
    }
    if (g24 && gerami) {
      out.intrinsicGerami = g24 * CH.GERAMI_G;
      out.bubbleGerami = (gerami / out.intrinsicGerami - 1) * 100;
    }
    if (oz && usd) {
      out.fairG18 = (oz / CH.OUNCE_G) * CH.K18 * usd;
      if (g18) out.goldPrem = (g18 / out.fairG18 - 1) * 100;
      out.ounceTm = oz * usd;
    }
    if (g18 && mesghal) out.mesghalDev = (mesghal / (g18 * CH.MESGHAL_K) - 1) * 100;
    if (eur && usd) out.eurUsdImplied = eur / usd;
    if (btcT && btcU) {
      out.btcImpliedUsd = btcT / btcU;
      if (usd) out.btcUsdGap = (out.btcImpliedUsd / usd - 1) * 100;
    }
    return out;
  }

  function chain() {
    var dv = derived();
    var signal = '', tone = '';
    if (dv.bubble != null && dv.goldPrem != null) {
      if (dv.bubble > 22 && Math.abs(dv.goldPrem) < 4) { signal = 'در زنجیره‌ی طلا، مثقال از سکه ارزنده‌تر است — حباب سکه را نخر.'; tone = 'warn'; }
      else if (dv.goldPrem < -3) { signal = 'طلا زیر ارزش جهانی معامله می‌شود — فرصت ارزشی در مثقال.'; tone = 'good'; }
      else if (dv.bubble > 30) { signal = 'حباب سکه در محدوده‌ی خطر — خرید سکه به تعویق بیفتد.'; tone = 'bad'; }
      else if (Math.abs(dv.goldPrem) <= 3 && dv.bubble >= 8 && dv.bubble <= 22) { signal = 'زنجیره متعادل است — نه مثقال گران است نه سکه ارزان.'; tone = 'neutral'; }
      else { signal = 'زنجیره در حال بازتنظیم است — انحراف‌ها را زیر نظر بگیر.'; tone = 'neutral'; }
    }
    function node(sym, extra) {
      var q = QUOTES[sym];
      if (!q || !(q.p > 0)) return null;
      var o = { p: q.p, chgPct: q.chgPct || 0, srcFa: q.srcFa };
      if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
      return o;
    }
    return {
      ounce: node('OUNCE_USD'),
      usd: node('USD'),
      fairG18: dv.fairG18 || null,
      g18: node('G18', { dev: dv.goldPrem }),
      mesghal: node('MESGHAL', { dev: dv.mesghalDev }),
      intrinsicEmami: dv.intrinsicEmami || null,
      emami: node('EMAMI', { bubble: dv.bubble }),
      usdtPrem: dv.usdtPrem != null ? dv.usdtPrem : null,
      btcGap: dv.btcUsdGap != null ? dv.btcUsdGap : null,
      signal: signal, tone: tone
    };
  }

  /**
   * نبض بازار: پهنا، میانگین تغییر و امتیاز ‎-100..+100
   * اصلاح مهم: دارایی‌های «بی‌تغییر» (بازار بسته/کم‌تحرک) دیگر منفی حساب نمی‌شوند.
   * - ups/downs/flat: تعداد؛ part: سهم دارایی‌های متحرک (مشارکت)
   * - breadth: سهم مثبت‌ها فقط میان متحرک‌ها؛ اثرش در امتیاز با مشارکت وزن می‌خورد
   * - مشتقات (اونس تومانی) شمرده نمی‌شوند تا یک حرکت دوبار حساب نشود
   */
  function mood() {
    var act = CFG.ASSETS.filter(function (a) {
      var q = QUOTES[a.sym];
      return !a.derived && q && q.p > 0 && q.chgPct != null && isFinite(q.chgPct);
    });
    if (!act.length) return { n: 0, ups: 0, downs: 0, flat: 0, part: 0, breadth: 50, avg: 0, score: 0, best: null, worst: null, label: '—', quiet: true };
    var upN = act.filter(function (a) { return QUOTES[a.sym].chgPct > 0.05; }).length;
    var downN = act.filter(function (a) { return QUOTES[a.sym].chgPct < -0.05; }).length;
    var flatN = act.length - upN - downN;
    var movers = upN + downN;
    var part = movers / act.length;
    var breadth = movers ? upN / movers * 100 : 50;
    var sum = act.reduce(function (s, a) { return s + QUOTES[a.sym].chgPct; }, 0);
    var avg = sum / act.length;
    var sorted = act.slice().sort(function (a, b) { return QUOTES[b.sym].chgPct - QUOTES[a.sym].chgPct; });
    var score = U.clamp(avg * 15 + (breadth - 50) * 1.1 * part, -100, 100);
    var label = score >= 50 ? 'طوفانی' : score >= 20 ? 'داغ' : score >= 5 ? 'مثبت' :
      score > -5 ? 'آرام' : score > -20 ? 'منفی' : score > -50 ? 'سرد' : 'یخ‌زده';
    var upsP = Math.round(upN / act.length * 100), downsP = Math.round(downN / act.length * 100);
    return {
      // بی‌تغییر از تفاضل حساب می‌شود تا سه درصدِ نمایشی هیچ‌وقت روی هم ۹۹ یا ۱۰۱ نشود
      n: act.length, ups: upsP, downs: downsP, flat: Math.max(0, 100 - upsP - downsP),
      part: part, breadth: Math.round(breadth),
      quiet: part < 0.35, avg: avg, score: Math.round(score),
      best: sorted[0].sym, worst: sorted[sorted.length - 1].sym, label: label
    };
  }

  function meta(sym) {
    var q = QUOTES[sym];
    if (!q) return null;
    return { ts: q.ts, srcs: q.srcFa, agree: q.agree, stale: q.stale, live: q.live };
  }

  /* ============================================================
     حلقه‌های دریافت
     ============================================================ */
  var fastBusy = false, slowBusy = false, okOnce = false, bootDone = false;

  function safeCall(fn) {
    try {
      var r = fn();
      if (r && typeof r.catch === 'function') return r.catch(function () { return null; });
      return Promise.resolve(r);
    } catch (e) { return Promise.resolve(null); }
  }
  function withCap(promise, ms) {
    return Promise.race([promise, new Promise(function (res) { setTimeout(function () { res('cap'); }, ms); })]);
  }

  function exJob() {
    return Promise.all([safeCall(fetchNobitex), safeCall(fetchWallex)]).then(function (rs) {
      var out = { nb: rs[0], wx: rs[1], bp: null };
      var hasUsdt = (rs[0] && rs[0].usdt) || (rs[1] && rs[1].usdt);
      var hasBtc = (rs[0] && rs[0].btc) || (rs[1] && rs[1].btc);
      if (!hasUsdt || !hasBtc) {
        return safeCall(fetchBitpin).then(function (bp) { out.bp = bp; return out; });
      }
      markIdle('bitpin', 'پوشش با نوبیتکس/والکس — فراخوانی نشد');
      return out;
    });
  }
  function globalJob() {
    return Promise.all([safeCall(fetchCG), safeCall(fetchKraken), safeCall(fetchBinance), safeCall(fetchCoinbase)])
      .then(function (rs) {
        var out = { cg: rs[0], rk: rs[1], bn: rs[2], cb: rs[3] };
        return (out.cg || out.rk || out.bn || out.cb) ? out : null;
      });
  }
  function fxJob() {
    return safeCall(fetchFrankfurter).then(function (f) {
      if (f) { markIdle('erapi', 'پوشش با Frankfurter — فراخوانی نشد'); return f; }
      return safeCall(fetchErapi);
    });
  }

  function tickFast() {
    if (fastBusy) return Promise.resolve(false);
    fastBusy = true;
    emit('cycle', { phase: 'fast', start: true });
    var t0 = Date.now();
    var jobs = [
      ['live', fetchLive], ['tgju', fetchTGJU], ['ex', exJob], ['global', globalJob], ['fx', fxJob]
    ];
    var run = Promise.all(jobs.map(function (pair) {
      return safeCall(pair[1]).then(function (d) { if (d != null) ingest(pair[0], d); return d; });
    }));
    return withCap(run, 32000).then(function () {
      cacheSave(); histSave(); fastBusy = false;
      diagCycle();
      emit('cycle', { phase: 'fast', start: false, ms: Date.now() - t0 });
      var live = CFG.ASSETS.filter(function (a) { return QUOTES[a.sym].live; }).length;
      if (!okOnce && live >= 3) {
        okOnce = true;
        emit('toast', { kind: 'ok', title: 'بازار وصل شد', msg: U.fa(live) + ' کوت زنده فعال است.' });
        try { sinceLastVisit(); } catch (e) {}
      }
      return true;
    }).catch(function () { fastBusy = false; emit('cycle', { phase: 'fast', start: false }); return false; });
  }

  function tickSlow() {
    if (slowBusy) return Promise.resolve(false);
    slowBusy = true;
    emit('cycle', { phase: 'slow', start: true });
    var t0 = Date.now();
    var run = Promise.all([
      safeCall(fetchNavasan).then(function (d) { if (d != null) ingest('navasan', d); return d; }),
      safeCall(fetchBtcHist).then(function (d) { if (d != null) ingest('btcHist', d); return d; }),
      safeCall(fetchHistory)
    ]);
    return withCap(run, 40000).then(function () {
      cacheSave(); histSave(); slowBusy = false;
      emit('cycle', { phase: 'slow', start: false, ms: Date.now() - t0 });
      return true;
    }).catch(function () { slowBusy = false; emit('cycle', { phase: 'slow', start: false }); return false; });
  }

  /* ============================================================
     تاریخچه‌ی بلندمدت — از انتشارهای سرور (assets/data/history.json)
     recent: نقاط خام ۱۴ روز اخیر، daily: خلاصه‌ی روزانه [day, close, high, low]
     ============================================================ */
  var HISTORY = null;
  var TEHRAN_OFF = 3.5 * 3600000;

  function fetchHistory() {
    return fetchJSON('assets/data/history.json', {
      timeout: 9000,
      validate: function (j) { return j && j.daily && j.recent; }
    }).then(function (r) {
      HISTORY = r.j;
      emit('history', HISTORY);
      return HISTORY;
    }).catch(function () { return null; });
  }

  function dayMs(dayKey) { return Date.parse(dayKey + 'T12:00:00Z') - TEHRAN_OFF; } // ظهر تهران همان روز

  /** آیا تاریخچه برای این نماد وجود دارد؟ چند روز؟ */
  function historyMeta(sym) {
    if (!HISTORY) return { ok: false, days: 0, points: 0, from: null };
    var d = (HISTORY.daily && HISTORY.daily[sym]) || [];
    var r = (HISTORY.recent && HISTORY.recent[sym]) || [];
    return { ok: d.length >= 2, days: d.length, points: r.length, from: d.length ? dayMs(d[0][0]) : null, at: Date.parse(HISTORY.generated_at) || 0 };
  }

  /**
   * سری قیمت برای نمودار: [{t,p}] — بازه بر حسب روز.
   * تا ۱۴ روز از نقاط خام، بیشتر از آن از بسته‌های روزانه؛ قیمت زنده‌ی فعلی همیشه نقطه‌ی آخر است.
   */
  function series(sym, days) {
    days = days || 30;
    var now = Date.now(), from = now - days * 86400000, out = [];
    if (HISTORY) {
      if (days <= 14 && HISTORY.recent && HISTORY.recent[sym]) {
        HISTORY.recent[sym].forEach(function (x) { var t = x[0] * 1000; if (t >= from && x[1] > 0) out.push({ t: t, p: x[1] }); });
      }
      if (out.length < 2 && HISTORY.daily && HISTORY.daily[sym]) {
        out = [];
        HISTORY.daily[sym].forEach(function (x) { var t = dayMs(x[0]); if (t >= from - 86400000 && x[1] > 0) out.push({ t: t, p: x[1], hi: x[2], lo: x[3] }); });
      }
    }
    var q = QUOTES[sym];
    if (q && q.p > 0) {
      var last = out[out.length - 1];
      if (!last || q.ts > last.t + 60000) out.push({ t: q.ts || now, p: q.p, live: true });
      else { last.p = q.p; last.live = true; }
    }
    return out;
  }

  /** درصد تغییر نسبت به «days» روز پیش (null اگر تاریخچه کافی نیست) */
  function changeOver(sym, days) {
    var q = QUOTES[sym];
    if (!HISTORY || !q || !(q.p > 0)) return null;
    var target = Date.now() - days * 86400000, best = null;
    var rec = (HISTORY.recent && HISTORY.recent[sym]) || [];
    for (var i = 0; i < rec.length; i++) { var t = rec[i][0] * 1000; if (t <= target + 3 * 3600000) best = { t: t, p: rec[i][1] }; else break; }
    if (!best) {
      var dl = (HISTORY.daily && HISTORY.daily[sym]) || [];
      for (var j = 0; j < dl.length; j++) { var tt = dayMs(dl[j][0]); if (tt <= target + 12 * 3600000) best = { t: tt, p: dl[j][1] }; else break; }
    }
    if (!best || !(best.p > 0)) return null;
    // اگر قدیمی‌ترین نقطه‌ی موجود بیش از ۱٫۵ روز از هدف جدیدتر است، بازه پوشش داده نشده
    if (best.t > target + 1.5 * 86400000) return null;
    return { pct: (q.p / best.p - 1) * 100, from: best.t, fromP: best.p, days: Math.round((Date.now() - best.t) / 86400000) };
  }

  /** تغییر نسبت به «days» روز پیش؛ اگر تاریخچه کوتاه‌تر است، از قدیمی‌ترین نقطه (حداقل minDays روز) */
  function changeOverAvail(sym, days, minDays) {
    var c = changeOver(sym, days);
    if (c) return c;
    var q = QUOTES[sym];
    if (!HISTORY || !q || !(q.p > 0)) return null;
    var oldest = null;
    var dl = (HISTORY.daily && HISTORY.daily[sym]) || [];
    if (dl.length && dl[0][1] > 0) oldest = { t: dayMs(dl[0][0]), p: dl[0][1] };
    var rec = (HISTORY.recent && HISTORY.recent[sym]) || [];
    if (rec.length && rec[0][1] > 0 && (!oldest || rec[0][0] * 1000 < oldest.t)) oldest = { t: rec[0][0] * 1000, p: rec[0][1] };
    if (!oldest) return null;
    var age = (Date.now() - oldest.t) / 86400000;
    if (age < (minDays || 2)) return null;
    return { pct: (q.p / oldest.p - 1) * 100, from: oldest.t, fromP: oldest.p, days: Math.round(age) };
  }

  /** خلاصه‌ی هفتگی برای حکم: تغییر ۷ روزه‌ی دارایی‌های کلیدی (یا کوتاه‌ترین بازه‌ی موجود، ≥۲ روز) + حباب سکه‌ی آن زمان */
  function weekly() {
    if (!HISTORY) return null;
    var syms = ['USD', 'G18', 'EMAMI', 'USDT', 'BTC_USD', 'OUNCE_USD'];
    var out = { rows: [], days: 0 }, any = false;
    syms.forEach(function (s) {
      var c = changeOverAvail(s, 7, 2);
      if (!c) return;
      any = true;
      out.days = Math.max(out.days, c.days);
      var a = asset(s);
      out.rows.push({ sym: s, fa: a ? a.short : s, pct: c.pct, days: c.days });
    });
    if (!any) return null;
    // حباب سکه‌ی هفته‌ی پیش از سری‌های تاریخی
    var e = changeOverAvail('EMAMI', 7, 2), g24 = changeOverAvail('G24', 7, 2), g18 = changeOverAvail('G18', 7, 2);
    var g24Then = g24 ? g24.fromP : (g18 ? g18.fromP * CH.G24_K : null);
    if (e && g24Then) out.bubbleThen = (e.fromP / (g24Then * CH.EMAMI_G) - 1) * 100;
    var dv = derived();
    if (dv.bubble != null) out.bubbleNow = dv.bubble;
    return out;
  }

  /* ---------------- بوت ماژول ---------------- */
  histLoad();
  var cacheTs = cacheLoad();

  GS.data = {
    quotes: QUOTES,
    quote: quote, asset: asset,
    meta: meta,
    slope: slope,
    hist: function (sym) { return HIST[sym] || []; },
    src: SRC,
    netlog: NETLOG,
    diag: DIAG,
    derived: derived,
    chain: chain,
    mood: mood,
    tickFast: tickFast,
    tickSlow: tickSlow,
    snapshotLoad: snapshotLoad,
    bootAll: bootAll,
    on: on, emit: emit,
    cacheTs: cacheTs,
    setManualUsd: setManualUsd,
    clearManualUsd: clearManualUsd,
    getManualUsd: manualUsd,
    setNavasanKey: setNavasanKey,
    getNavasanKey: getNavasanKey,
    clearNavasanKey: clearNavasanKey,
    clearCache: clearCache,
    liveCount: function () { return CFG.ASSETS.filter(function (a) { return QUOTES[a.sym] && QUOTES[a.sym].live; }).length; },
    okSources: function () { return Object.keys(SRC).filter(function (id) { return SRC[id] && SRC[id].ok && id !== 'snapshot'; }).length; },
    sinceLastVisit: sinceLastVisit,
    history: function () { return HISTORY; },
    historyMeta: historyMeta, series: series, changeOver: changeOver, weekly: weekly, fetchHistory: fetchHistory,
    _setHistory: function (h) { HISTORY = h; emit('history', h); },
    isFastBusy: function () { return fastBusy; },
    isSlowBusy: function () { return slowBusy; },
    isBootDone: function () { return bootDone; },
    setBootDone: function () { bootDone = true; },
    _recompute: recompute,
    _ingest: ingest,
    _irDelay: function (ms) { IR_DELAY = ms; },
    _mirrorStagger: function (ms) { MIRROR_STAGGER = ms; },
    _rejects: REJECT,
    _clearRaw: function () { RAW = {}; }
  };
})();
