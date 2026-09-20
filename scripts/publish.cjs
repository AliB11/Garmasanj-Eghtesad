/* ============================================================
   گرماسنج — ناشر زنده (publish.cjs)
   اجرا در GitHub Actions هر ۱۵ دقیقه: همه‌ی منابع را سمت‌سرور
   (جایی که CORS اعمال نمی‌شود) می‌خواند و assets/data/live.json
   را می‌سازد. سایت همین فایل را هم‌مبدأ و بدون واسطه می‌خواند.
   بدون هیچ وابستگی (فقط Node 18+).
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'data', 'live.json');

const TGJU_MIRRORS = [
  'https://call5.tgju.org',
  'https://call4.tgju.org',
  'https://call2.tgju.org',
  'https://call1.tgju.org',
  'https://call.tgju.org',
];

/* محدوده‌های اعتبارسنجی (واحد نهایی: تومان، جز OUNCE_USD دلاری)
   این پنجره‌ها فقط برای ردِ «آشغال» (اشتباهِ مقیاس ریال/تومان، صفر، نویز) اند؛
   سطح قیمت‌ها در اقتصاد ایران مدام بالا می‌رود، برای همین یک پنجره‌ی تطبیقی هم
   داریم که نسبت به آخرین انتشار معتبر سنجیده می‌شود تا انتشار با جابه‌جاییِ
   تدریجیِ قیمت‌ها متوقف نشود (ببینید: DRIFT / HARD_K در inRange). */
const RANGES = {
  USD: [3e4, 5e6], EUR: [3e4, 5e6], GBP: [3e4, 5e6], CHF: [3e4, 5e6],
  AED: [5e3, 1.5e6], CNY: [3e3, 6e5], TRY: [5e2, 2e5],
  G18: [5e6, 1e8], G24: [7e6, 1.3e8], MESGHAL: [2e7, 5e8], OUNCE_USD: [1e3, 2e4],
  EMAMI: [5e7, 1e9], BAHAR: [5e7, 1e9], NIM: [2e7, 6e8], ROB: [1e7, 3e8], GERAMI: [5e6, 1.5e8],
  USDT: [8e4, 2e6], BTC_USD: [1e3, 1e7], BTC_TM: [5e8, 5e11],
};

/* نگاشت TGJU: sym -> [کلیدها] + تقسیم ریال */
const TGJU_KEYS = {
  USD: [['price_dollar_rl', 'price_dollar_dt'], 10],
  EUR: [['price_eur'], 10], GBP: [['price_gbp'], 10], AED: [['price_aed'], 10],
  CHF: [['price_chf'], 10], CNY: [['price_cny'], 10], TRY: [['price_try'], 10],
  G18: [['geram18'], 10], G24: [['geram24'], 10], MESGHAL: [['mesghal'], 10],
  OUNCE_USD: [['ons', 'once', 'ounce'], 1],
  EMAMI: [['sekee'], 10], BAHAR: [['sekeb'], 10],
  NIM: [['nim', 'retail_nim'], 10], ROB: [['rob', 'retail_rob'], 10], GERAMI: [['gerami', 'retail_gerami'], 10],
  // فقط تترِ واقعی: کلید usd-coin مربوط به USDC است و نباید با برچسب «تتر» منتشر شود
  USDT: [['crypto-tether-irr'], 10],
  BTC_TM: [['crypto-bitcoin-irr'], 10],
};

/* نگهبانِ دامنه‌ی روز */
const RANGE_MAX_SPAN = 0.35; // سقف−کفِ بیش از ۳۵٪ قیمت در یک روز، غیرقابل‌اتکاست
/* تطبیق با جابه‌جایی سطح قیمت‌ها: نسبت به آخرین انتشار معتبر */
const DRIFT = 6;    // حداکثر ۶ برابر کوچک/بزرگ شدن نسبت به آخرین مقدار منتشرشده
const HARD_K = 10;  // اما هرگز بیش از ۱۰ برابرِ پنجره‌ی استاتیک (جلوی مسموم‌شدنِ لنگر را می‌گیرد)

/* ---------------- ابزار ---------------- */
function num(x) {
  if (x == null) return null;
  if (typeof x === 'number') return isFinite(x) ? x : null;
  const s = String(x).replace(/<[^>]*>/g, '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  const v = parseFloat(s.replace(/[٬،,\s]/g, ''));
  return isFinite(v) ? v : null;
}
function tehranMs(s) {
  const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - 12600000;
  if (!isFinite(t) || t < Date.UTC(2024, 0, 1) || t > Date.now() + 3600000) return null;
  return t;
}
/**
 * اعتبارسنجی بازه. دو مرحله:
 *  ۱) پنجره‌ی استاتیکِ همان نماد (حالت عادی)
 *  ۲) اگر سطح قیمت‌ها از آن پنجره بیرون زده (تورم/جهش ارزی)، پنجره‌ی تطبیقی
 *     نسبت به آخرین مقدار منتشرشده — با سقف/کفِ سختِ ۱۰ برابر پنجره‌ی استاتیک.
 * پارامترِ سوم (anchor) اختیاری است؛ صفر/خالی یعنی فقط پنجره‌ی استاتیک.
 */
function inRange(sym, v, anchor) {
  const r = RANGES[sym];
  if (v == null || typeof v !== 'number' || !isFinite(v) || !(v > 0)) return false;
  if (r && v >= r[0] && v <= r[1]) return true;
  const a = (typeof anchor === 'number' && isFinite(anchor) && anchor > 0) ? anchor : 0;
  if (!a || !r) return false;
  return v >= Math.max(a / DRIFT, r[0] / HARD_K) && v <= Math.min(a * DRIFT, r[1] * HARD_K);
}

/** دامنه‌ی روز فقط وقتی معتبر است که قیمت را در بر بگیرد و وارونه/غیرواقعی نباشد */
function saneDayRange(price, high, low) {
  if (!(price > 0) || high == null || low == null) return { high: null, low: null };
  if (!(high > 0) || !(low > 0)) return { high: null, low: null };
  if (high < low) return { high: null, low: null };
  if (price < low || price > high) return { high: null, low: null };
  if ((high - low) / price > RANGE_MAX_SPAN) return { high: null, low: null };
  return { high, low };
}
function sanePct(v) {
  v = num(v);
  return v != null && isFinite(v) && Math.abs(v) <= 25 ? v : null;
}

async function getJSON(url, opt) {
  opt = opt || {};
  const timeout = opt.timeout || 15000;
  const ctl = new AbortController();
  const timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} }, timeout);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'garmasanj-publisher/1.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    return { j, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- پارسرهای خالص (تست‌پذیر) ---------------- */

/** یک سطر TGJU: قانون dt (جهت) + تبدیل ریال + اعتبارسنجی بازه */
function tgjuRow(sym, entry, anchor) {
  if (!entry || typeof entry !== 'object') return null;
  const keys = TGJU_KEYS[sym];
  if (!keys) return null;
  const div = keys[1];
  const p = num(entry.p);
  if (!(p > 0)) return null;
  let chg = num(entry.d), pct = sanePct(entry.dp);
  if (entry.dt === 'low') {
    if (chg != null && chg > 0) chg = -chg;
    if (pct != null && pct > 0) pct = -pct;
  }
  const price = p / div;
  if (!inRange(sym, price, anchor)) return null;
  const hl = saneDayRange(price, num(entry.h) / div, num(entry.l) / div);
  return {
    p: sym === 'OUNCE_USD' ? Math.round(price * 100) / 100 : Math.round(price),
    chg: chg == null ? null : Math.round(chg / div),
    chgPct: pct,
    high: hl.high,
    low: hl.low,
    ts: tehranMs(entry.ts) || Date.now(),
  };
}
function pickTGJU(current, sym, anchor) {
  if (!current || typeof current !== 'object') return null;
  const keys = (TGJU_KEYS[sym] || [])[0] || [];
  for (const k of keys) {
    const q = tgjuRow(sym, current[k], anchor);
    if (q) return q;
  }
  return null;
}

/** نوبیتکس: /market/stats -> latest ریالی، dayChange درصدی */
function parseNobitex(j, src) {
  try {
    const st = j && j.stats && (j.stats[src + '-rls'] || j.stats[src + '-rlt']);
    if (!st) return null;
    const p = num(st.latest) / 10;
    if (!(p > 0)) return null;
    return { p: Math.round(p), chgPct: sanePct(st.dayChange) };
  } catch (e) { return null; }
}

/** والکس: result.symbols.X.stats.lastPrice (تومان) */
function parseWallex(j, key) {
  try {
    const s = j && j.result && j.result.symbols && j.result.symbols[key];
    const st = s && (s.stats || s);
    const p = num(st && st.lastPrice);
    if (!(p > 0)) return null;
    return { p: Math.round(p), chgPct: sanePct(st['24h_ch']) };
  } catch (e) { return null; }
}

/** بیت‌پین: واحد نامطمئن — نزدیک‌ترین به لنگر (میانه‌ی بقیه) انتخاب می‌شود */
function fitUnit(v, anchor, lo, hi) {
  if (!(v > 0)) return null;
  const c = [v, v / 10, v * 10];
  if (anchor > 0) {
    for (const x of c) if (Math.abs(x - anchor) / anchor <= 0.12) return x;
    return null;
  }
  for (const x of c) if (x >= lo && x <= hi) return x;
  return null;
}
function parseBitpin(j, code, anchor, lo, hi) {
  try {
    if (!j || !Array.isArray(j.results)) return null;
    for (const o of j.results) {
      if (!o || o.code !== code) continue;
      const f = fitUnit(num(o.price), anchor, lo, hi);
      if (f) return { p: Math.round(f), chgPct: sanePct(o.price_info && o.price_info.change) };
    }
    return null;
  } catch (e) { return null; }
}

/** اجماع خوشه‌ای BTC دلاری */
function consensus(cands, tol, anchor) {
  tol = tol || 0.02;
  const v = (cands || []).filter((c) => c && c.p > 0 && isFinite(c.p) && inRange('BTC_USD', c.p, anchor));
  if (!v.length) return null;
  let best = null, bestScore = -1;
  for (const c of v) {
    const cl = v.filter((o) => Math.abs(o.p - c.p) / c.p <= tol);
    const score = cl.length * 10 + cl.reduce((s, o) => s + (o.w || 0), 0);
    if (score > bestScore) { bestScore = score; best = cl; }
  }
  let rep = best[0];
  for (const c of best) if ((c.w || 0) > (rep.w || 0)) rep = c;
  return { p: Math.round(rep.p), chgPct: sanePct(rep.chgPct), agree: best.length };
}
function krakenChg(t) {
  const last = num(t.c && t.c[0]), open = num(t.o);
  if (!(last > 0)) return null;
  return { p: last, chgPct: open > 0 ? (last / open - 1) * 100 : null };
}

/* ---------------- واکشی منابع ---------------- */
async function fetchTGJU(log) {
  const jobs = TGJU_MIRRORS.map((host) => (async () => {
    try {
      const r = await getJSON(host + '/ajax.json', { timeout: 15000 });
      if (r.j && r.j.current && r.j.current.price_dollar_rl) return { current: r.j.current, ms: r.ms, via: host };
      return null;
    } catch (e) { return null; }
  })());
  const all = await Promise.all(jobs);
  const win = all.find((x) => x);
  if (win) log('tgju', true, Object.keys(win.current).length + ' کلید از ' + win.via, win.ms);
  else log('tgju', false, 'هر ۵ آینه بی‌پاسخ');
  return win ? win.current : null;
}

async function main() {
  const SRC = {};
  const log = (id, ok, note, ms) => { SRC[id] = { ok: !!ok, ms: ms || null, note: note || '' }; };
  const now = Date.now();

  const [tgju, nbU, nbB, wx, bp, cg, rk, bn, cb, fx] = await Promise.all([
    fetchTGJU(log),
    getJSON('https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls', { timeout: 15000 })
      .then((r) => { log('nobitex', true, 'stats', r.ms); return r.j; })
      .catch((e) => { log('nobitex', false, String((e && e.message) || e).slice(0, 60)); return null; }),
    getJSON('https://api.nobitex.ir/market/stats?srcCurrency=btc&dstCurrency=rls', { timeout: 15000 })
      .then((r) => r.j).catch(() => null),
    getJSON('https://api.wallex.ir/v1/markets', { timeout: 20000 })
      .then((r) => { log('wallex', true, 'markets', r.ms); return r.j; })
      .catch((e) => { log('wallex', false, String((e && e.message) || e).slice(0, 60)); return null; }),
    getJSON('https://api.bitpin.ir/v1/mkt/markets/', { timeout: 20000 })
      .then((r) => { log('bitpin', true, 'markets', r.ms); return r.j; })
      .catch((e) => { log('bitpin', false, String((e && e.message) || e).slice(0, 60)); return null; }),
    getJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', { timeout: 15000 })
      .then((r) => { log('coingecko', true, 'simple/price', r.ms); return r.j; })
      .catch((e) => { log('coingecko', false, String((e && e.message) || e).slice(0, 60)); return null; }),
    getJSON('https://api.kraken.com/0/public/Ticker?pair=XBTUSD', { timeout: 15000 })
      .then((r) => { log('kraken', true, 'ticker', r.ms); return r.j; })
      .catch((e) => { log('kraken', false, String((e && e.message) || e).slice(0, 60)); return null; }),
    getJSON('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT', { timeout: 15000 })
      .then((r) => { log('binance', true, '24hr', r.ms); return r.j; })
      .catch((e) => { log('binance', false, String((e && e.message) || e).slice(0, 60)); return null; }),
    getJSON('https://api.coinbase.com/v2/prices/BTC-USD/spot', { timeout: 15000 })
      .then((r) => { log('coinbase', true, 'spot', r.ms); return r.j; })
      .catch((e) => { log('coinbase', false, String((e && e.message) || e).slice(0, 60)); return null; }),
    getJSON('https://api.frankfurter.dev/v1/latest?from=USD', { timeout: 15000 })
      .then((r) => { log('frankfurter', true, 'latest', r.ms); return r.j; })
      .catch(() => getJSON('https://open.er-api.com/v6/latest/USD', { timeout: 15000 })
        .then((r) => { log('frankfurter', false, 'افتاد روی er-api'); log('erapi', true, 'latest', r.ms); return r.j; })
        .catch((e) => { log('erapi', false, String((e && e.message) || e).slice(0, 60)); return null; })),
  ]);

  /* ---- لنگرِ تطبیقی: آخرین انتشار معتبر روی دیسک ----
     اگر سطح قیمت‌ها جابه‌جا شده باشد، پنجره‌ی استاتیک دیگر صادق نیست؛
     لنگر اجازه می‌دهد انتشار ادامه یابد (نه اینکه بی‌صدا متوقف شود). */
  const prevQuotes = (() => {
    try { return JSON.parse(fs.readFileSync(OUT, 'utf8')).quotes || {}; }
    catch (e) { return {}; }
  })();
  const anchorOf = (sym) => {
    const q = prevQuotes[sym];
    return q && q.p > 0 && isFinite(q.p) ? q.p : 0;
  };

  /* ---- ساخت کوت‌ها ---- */
  const quotes = {};
  const put = (sym, q, srcFa) => {
    if (!q || !inRange(sym, q.p, anchorOf(sym))) return false;
    const hl = saneDayRange(q.p, q.high, q.low);
    quotes[sym] = {
      p: q.p,
      chg: q.chg != null && isFinite(q.chg) ? q.chg : null,
      chgPct: sanePct(q.chgPct),
      high: hl.high,
      low: hl.low,
      ts: q.ts || now,
      src: srcFa,
    };
    if (q.agree) quotes[sym].agree = q.agree;
    return true;
  };

  // TGJU: همه‌ی مستقیم‌ها
  if (tgju) {
    for (const sym of Object.keys(TGJU_KEYS)) {
      if (sym === 'USDT' || sym === 'BTC_TM') continue; // این دو: صرافی اول، TGJU پشتیبان
      const q = pickTGJU(tgju, sym, anchorOf(sym));
      if (q) put(sym, q, 'TGJU');
    }
  }

  // تتر و بیت‌کوین تومانی: نوبیتکس ← والکس ← بیت‌پین (با لنگر) ← TGJU
  const nbUsdt = parseNobitex(nbU, 'usdt'), wxUsdt = parseWallex(wx, 'USDTTMN');
  const tgUsdt = tgju ? pickTGJU(tgju, 'USDT', anchorOf('USDT')) : null;
  const usdtOK = (q) => !!q && inRange('USDT', q.p, anchorOf('USDT')) && q.p;
  const usdtAnchor = usdtOK(nbUsdt) || usdtOK(wxUsdt) || (tgUsdt && tgUsdt.p) || 0;
  const bpUsdt = parseBitpin(bp, 'USDT_IRT', usdtAnchor, 8e4, 2e6);
  if (usdtOK(nbUsdt)) put('USDT', { ...nbUsdt, ts: now }, 'نوبیتکس');
  else if (usdtOK(wxUsdt)) put('USDT', { ...wxUsdt, ts: now }, 'والکس');
  else if (bpUsdt) put('USDT', { ...bpUsdt, ts: now }, 'بیت‌پین');
  else if (tgUsdt) put('USDT', tgUsdt, 'TGJU');

  const nbBtc = parseNobitex(nbB, 'btc'), wxBtc = parseWallex(wx, 'BTCTMN');
  const tgBtc = tgju ? pickTGJU(tgju, 'BTC_TM', anchorOf('BTC_TM')) : null;
  const btcOK = (q) => !!q && inRange('BTC_TM', q.p, anchorOf('BTC_TM')) && q.p;
  const btcAnchor = btcOK(nbBtc) || btcOK(wxBtc) || (tgBtc && tgBtc.p) || 0;
  const bpBtc = parseBitpin(bp, 'BTC_IRT', btcAnchor, 5e8, 5e11);
  if (btcOK(nbBtc)) put('BTC_TM', { ...nbBtc, ts: now }, 'نوبیتکس');
  else if (btcOK(wxBtc)) put('BTC_TM', { ...wxBtc, ts: now }, 'والکس');
  else if (bpBtc) put('BTC_TM', { ...bpBtc, ts: now }, 'بیت‌پین');
  else if (tgBtc) put('BTC_TM', tgBtc, 'TGJU');

  // بیت‌کوین دلاری: اجماع ۴ منبع جهانی
  const cands = [];
  if (cg && cg.bitcoin && num(cg.bitcoin.usd) > 0)
    cands.push({ p: num(cg.bitcoin.usd), chgPct: sanePct(cg.bitcoin.usd_24h_change), w: 9 });
  try {
    const t = rk && rk.result && (rk.result.XXBTZUSD || rk.result.XBTUSD);
    if (t) { const k = krakenChg(t); if (k) cands.push({ ...k, w: 9 }); }
  } catch (e) {}
  if (bn && num(bn.lastPrice) > 0)
    cands.push({ p: num(bn.lastPrice), chgPct: sanePct(bn.priceChangePercent), w: 10 });
  if (cb && cb.data && num(cb.data.amount) > 0)
    cands.push({ p: num(cb.data.amount), chgPct: null, w: 8 });
  const bc = consensus(cands, 0.02, anchorOf('BTC_USD'));
  if (bc) put('BTC_USD', { ...bc, ts: now }, 'اجماع جهانی');

  // برابری‌های جهانی
  let fxOut = null;
  if (fx && fx.rates && num(fx.rates.EUR) > 0.5 && num(fx.rates.EUR) < 2) {
    const R = fx.rates;
    fxOut = {
      date: fx.date || fx.time_last_update_utc || null,
      rates: { EUR: num(R.EUR), GBP: num(R.GBP), CHF: num(R.CHF), CNY: num(R.CNY), TRY: num(R.TRY) },
    };
  }

  /* ---- اعتبارسنجی نهایی: بدون هسته، چیزی منتشر نکن ---- */
  const n = Object.keys(quotes).length;
  const coreOk = quotes.USD && quotes.BTC_USD && (quotes.G18 || quotes.OUNCE_USD) && n >= 12;
  if (!coreOk) {
    console.error('PUBLISH ABORT: core incomplete (n=' + n +
      ' usd=' + !!quotes.USD + ' btc=' + !!quotes.BTC_USD + ')');
    console.error('sources: ' + JSON.stringify(SRC));
    process.exitCode = 2;
    return;
  }

  let fa = '';
  try {
    fa = new Intl.DateTimeFormat('fa-IR', {
      calendar: 'persian', timeZone: 'Asia/Tehran',
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(new Date());
  } catch (e) { fa = String(Date.now()); }

  const doc = {
    generated_at: new Date().toISOString(),
    generated_fa: fa + ' به وقت تهران',
    quotes,
    fx: fxOut,
    meta: { sources: SRC },
  };
  fs.writeFileSync(OUT, JSON.stringify(doc) + '\n');
  console.log('PUBLISH OK: n=' + n + ' usd=' + quotes.USD.p + ' btc=' + quotes.BTC_USD.p +
    ' -> ' + path.relative(process.cwd(), OUT));

  /* ---- تاریخچه: هر انتشار یک نقطه به history.json می‌افزاید (بدون سرور) ---- */
  try {
    const H = require('./history.cjs');
    const r = H.appendLive(H.load(), doc);
    H.save(r.doc);
    console.log('HISTORY OK: +' + r.added + ' ' + JSON.stringify(H.stats(r.doc)));
  } catch (e) {
    console.error('HISTORY WARN: ' + ((e && e.message) || e));
  }
}

if (require.main === module) {
  main().catch((e) => { console.error('PUBLISH FATAL: ' + ((e && e.stack) || e)); process.exitCode = 1; });
}

module.exports = { num, tehranMs, inRange, saneDayRange, sanePct, tgjuRow, pickTGJU, parseNobitex, parseWallex, parseBitpin, fitUnit, consensus, krakenChg, RANGES, TGJU_KEYS };
