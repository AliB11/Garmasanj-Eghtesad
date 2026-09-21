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
  // شاخص کل بورس تهران (واحدِ شاخص، نه تومان): لنگرِ تطبیقی مثل بقیه عمل می‌کند
  TSE: [1e6, 5e7],
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

/**
 * شاخصِ کلِ بورس تهران در TGJU — تنها داده‌ی بورسی که از IP خارجی در دسترس است
 * (اندازه‌گیری: ۳ دور پروب روی رانرِ GitHub Actions؛ همه‌ی میزبان‌های TSETMC
 * و tse.ir از خارج timeout می‌شوند — ببینید reports/probe-bourse.md).
 * TGJU برای شاخص d/dp را صفر می‌فرستد، پس تغییرِ روزانه را اینجا نمی‌سازیم؛
 * سمتِ کلاینت از سریِ تاریخچه حساب می‌شود تا عددی ساخته نشود.
 */
const TGJU_MARKET_KEYS = ['bourse'];
const TEHRAN_OFFSET_MS = 3.5 * 3600e3;

/* ------------------------------------------------------------------
   مسیرهای کلیددارِ سمت‌سرور (اختیاری)
   کلیدها فقط از محیطِ اجرا (Secretsِ گیت‌هاب) خوانده می‌شوند و هرگز وارد
   کد یا فایلِ داده نمی‌شوند. اگر نباشند، این مسیرها کاملاً خاموش‌اند.
   ------------------------------------------------------------------ */
function envKey(name) {
  var v = (process.env && process.env[name]) ? String(process.env[name]).trim() : '';
  return v || null;
}
const NAVASAN_KEY = envKey('NAVASAN_KEY');
const BRS_KEY = envKey('BRS_API_KEY');
const BRS_MIN_GAP_MS = 3 * 3600e3; // جریانِ پول در هر جلسه یک‌بار کافی است

/* پنهان‌سازیِ کلید در پیام‌ها (کلید نباید واردِ لاگ یا فایل شود) */
function redact(url) { return String(url).replace(/([?&](?:api_key|key)=)[^&]+/i, '$1***'); }

/* قراردادِ BrsApi — همان قراردادِ کلاینت (assets/js/config.js → BRSAPI) */
const BRS = {
  base: 'https://BrsApi.ir/Api/Tsetmc',
  marketPath: 'MarketWatch.php',   // type=1: سهام بورس و فرابورس + ETF + حق‌تقدم
  type: 1,
  unit: 'rial',                    // TSETMC/BrsApi ریال می‌دهند
  fields: {
    buyRetail: ['Buy_I_Volume', 'BuyIVolume', 'buy_i_volume'],
    sellRetail: ['Sell_I_Volume', 'SellIVolume', 'sell_i_volume'],
    price: ['pl', 'pc', 'PClosing', 'PDrCotVal', 'close', 'Close', 'last'],
    value: ['tval', 'QTotCap', 'value', 'Value', 'TradeValue'],
    volume: ['tvol', 'QTotTran5J', 'volume', 'Volume']
  }
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
/** متنِ خام (برای منابعِ HTML مثل بورس‌تریدر) */
async function getText(url, opt) {
  opt = opt || {};
  const timeout = opt.timeout || 15000;
  const ctl = new AbortController();
  const timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} }, timeout);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'garmasanj-publisher/1.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const t = await r.text();
    return { t: t, ms: Date.now() - t0 };
  } finally { clearTimeout(timer); }
}

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
/** عدد با جداکننده برای پیامِ لاگ (فارسی اگر ممکن باشد) */
/** تاریخِ جلسه به شمسی برای پیامِ لاگ */
function faDay(ms) {
  try {
    return new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', timeZone: 'Asia/Tehran', day: 'numeric', month: 'long' }).format(new Date(ms));
  } catch (e) { return tehranDay(ms) || ''; }
}
function faNum(v) {
  try { return new Intl.NumberFormat('fa-IR').format(Math.round(v)); }
  catch (e) { return String(Math.round(v)); }
}

/** کلیدِ روز به وقت تهران (تاریخ میلادی؛ فقط برای بازه‌بندیِ جلسه) */
function tehranDay(ms) {
  try { return new Date(ms + TEHRAN_OFFSET_MS).toISOString().slice(0, 10); }
  catch (e) { return null; }
}

/**
 * شاخصِ کل از TGJU. نکته‌های صداقتِ داده:
 *  - مقدارِ شاخص رشته‌ی کامادار است ("7,448,839.4")؛ num() جداکننده‌ها را می‌برد.
 *  - dp برای کلیدهای شاخص همیشه صفر است؛ صفر را «بی‌داده» می‌گیریم نه «بدون تغییر».
 *  - دامنه‌ی روز فقط وقتی می‌ماند که قیمت را در بر بگیرد (همان saneDayRange).
 */
function tgjuIndex(current, anchor) {
  if (!current || typeof current !== 'object') return null;
  for (const k of TGJU_MARKET_KEYS) {
    const e = current[k];
    if (!e || typeof e !== 'object') continue;
    const p = num(e.p);
    if (!(p > 0) || !inRange('TSE', p, anchor)) continue;
    const hl = saneDayRange(p, num(e.h), num(e.l));
    const ts = tehranMs(e.ts) || Date.now();
    let chg = num(e.d), pct = sanePct(e.dp);
    // قانون جهت TGJU: dt=low یعنی منفی (مثل بقیه‌ی دارایی‌ها)
    if (e.dt === 'low') {
      if (chg != null && chg > 0) chg = -chg;
      if (pct != null && pct > 0) pct = -pct;
    }
    // TGJU برای شاخص در روزهای بسته d/dp را صفر و dt را خالی می‌فرستد؛ صفرِ بدون جهت «بی‌داده» است
    if ((pct === 0 || pct == null) && !e.dt) pct = null;
    if ((chg === 0 || chg == null) && !e.dt) chg = null;
    const pr = Math.round(p);
    const hi = (hl.high == null) ? null : Math.max(Math.round(hl.high), pr);
    const lo = (hl.low == null) ? null : Math.min(Math.round(hl.low), pr);
    return {
      p: pr,
      chg: chg != null ? Math.round(chg) : null,
      chgPct: pct,
      high: hi,
      low: lo,
      ts: ts,
      day: tehranDay(ts),
      src: 'TGJU',
    };
  }
  return null;
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

/** ناواسان (کلیددار) — نقشه‌ی فیلدها از پیاده‌سازیِ آزموده‌ی کلاینت آمده */
function parseNavasan(j) {
  if (!j || typeof j !== 'object') return null;
  function pick(keys, div) {
    for (const k of keys) {
      const o = j[k];
      if (!o) continue;
      const v = num(o.value != null ? o.value : o.price);
      if (!(v > 0)) continue;
      const p = v / div;
      const ch = num(o.change) || 0;
      return { p: p, chgPct: sanePct(v > 0 ? ch / v * 100 : null) };
    }
    return null;
  }
  const out = {
    USD: pick(['usd_sell', 'usd', 'dollar', 'usd_buy'], 10),
    G18: pick(['geram18', 'geram_18', 'gold18'], 10),
    EMAMI: pick(['sekke', 'sekee', 'emami'], 10),
    OUNCE_USD: pick(['ounce', 'ons', 'xau'], 1),
  };
  Object.keys(out).forEach((k) => {
    const q = out[k];
    if (!q || !inRange(k, q.p, 0)) delete out[k]; // فقط پنجره‌ی استاتیک (لنگر نداریم)
  });
  if (out.OUNCE_USD && !(out.OUNCE_USD.p > 200 && out.OUNCE_USD.p < 20000)) delete out.OUNCE_USD;
  return Object.keys(out).length ? out : null;
}

function pickField(o, names) {
  if (!o) return null;
  for (const n of names) {
    const v = o[n];
    if (v != null && v !== '') { const x = num(v); if (x != null && isFinite(x)) return x; }
  }
  return null;
}

/**
 * تجمیعِ جریانِ پولِ حقیقی از ردیف‌های نمادها.
 * خالص (تومان) = Σ (حجم خرید حقیقی − حجم فروش حقیقی) × میانگینِ قیمت
 * میانگین = ارزش ÷ حجم (وگرنه قیمتِ پایانی)؛ واحد از قرارداد، نه حدس.
 */
function aggregateFlow(rows) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const F = BRS.fields, U10 = (BRS.unit === 'toman') ? 1 : 10;
  let netToman = 0, valueToman = 0, n = 0, known = 0;
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const br = pickField(r, F.buyRetail), sr = pickField(r, F.sellRetail);
    if (br == null && sr == null) continue;
    known++;
    const vw = pickField(r, F.value), vv = pickField(r, F.volume), px = pickField(r, F.price);
    const avg = (vw != null && vv != null && vv > 0) ? vw / vv : (px != null && px > 0 ? px : null);
    if (avg == null || !(avg > 0)) continue;
    netToman += ((br || 0) - (sr || 0)) * (avg / U10);
    if (vw != null && vw > 0) valueToman += vw / U10;
    n++;
  }
  if (!n || !known) return null;
  return {
    netToman: Math.round(netToman),
    valueToman: valueToman > 0 ? Math.round(valueToman) : null,
    ratio: valueToman > 0 ? netToman / valueToman : null,
    n: n,
    known: known,
    src: 'BrsApi'
  };
}

/** خروجیِ BrsApi: آرایه در خودِ ریشه یا در data/result */
function parseBrsMarket(j) {
  if (!j) return { ok: false, why: 'بدون پاسخ' };
  // پیامِ خطای خودِ سرویس (مثلِ «Invalid API Key») زودتر از هر چیز بررسی می‌شود
  const msg = j.error || j.message || j.msg || j.ErrorMessage || j.Message;
  if (msg) return { ok: false, why: String(msg).slice(0, 90) };
  const rows = Array.isArray(j) ? j : (Array.isArray(j.data) ? j.data : (Array.isArray(j.result) ? j.result : null));
  if (!rows || !rows.length) return { ok: false, why: 'ردیفی نبود', keys: Object.keys(j || {}).slice(0, 12) };
  const agg = aggregateFlow(rows);
  if (!agg) return { ok: false, why: 'ساختارِ ناشناخته', keys: Object.keys(rows[0] || {}).slice(0, 14) };
  if (agg.valueToman != null && (agg.valueToman < 1e9 || agg.valueToman > 5e15)) return { ok: false, why: 'مقیاسِ ارزشِ معاملات غیرمعقول' };
  if (agg.ratio != null && Math.abs(agg.ratio) > 1) return { ok: false, why: 'نسبتِ جریان ناممکن' };
  return { ok: true, agg: agg };
}

/* ------------------------------------------------------------
   بورس‌تریدر (bourse-trader.ir) — منبعِ مکملِ بورس، بدون کلید
   ------------------------------------------------------------
   اندازه‌گیری‌شده روی رانرِ GitHub Actions (reports/probe-bourse.md):
    - robots.txt فقط User-agent: * و بدون هیچ Disallow → واکشی مجاز است
    - /api/?task=api → ۲۰۰، حدود ۲۹۰KB، text/html (نه JSON؛ هیچ اندپوینت
      JSON ندارد: همه‌ی ?task=ها همین صفحه را برمی‌گردانند)
    - مبالغ طبقِ توضیحِ خودِ صفحه به «تومان» اند: T=تریلیون، B=میلیارد،
      M=میلیون، K=هزار. واحد از قرارداد می‌آید، نه از حدس.
    نگهبان: هر بخش باید در بازه‌ی معقول باشد و نسبتِ جریان به ارزشِ معاملات
    حداکثر ۱؛ وگرنه همان بخش منتشر نمی‌شود (سکوت به‌جای عددِ غلط).
   ------------------------------------------------------------ */
const BT = {
  url: 'https://bourse-trader.ir/api/?task=api',
  marketTable: 'marketTable',   // گزارش بازار: شاخص‌ها و صندوق‌ها
  payeshTable: 'payeshTable',   // پایش معاملات: ستون‌های خرد/بورس/فرابورس/...
  cols: ['خرد', 'بورس', 'فرابورس', 'سهامی', 'درآمدثابت', 'آپشن', 'کالایی'],
  ranges: {
    equal: [5e4, 2e8],      // شاخص هم‌وزن
    fara: [5e2, 5e7],       // شاخص کل فرابورس
    value: [1e8, 1e16],     // ارزش معاملات (تومان)
    volume: [1e5, 1e13],    // حجم معاملات (برگه)
    cap: [1e14, 1e19],      // ارزش بازار (تومان)
    perCapita: [0.1, 1e7],  // سرانه (میلیون تومان)
    queueValue: [0, 1e15],  // ارزشِ صفِ خرید/فروش (تومان) — پولِ پشتِ صف
  },
};

/** ارقامِ فارسی/عربی، جداکننده‌ها و علامت‌های منهایِ غیرِASCII → ASCII */
function btDigits(s) {
  return String(s == null ? '' : s)
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[\u066A]/g, '%')
    .replace(/[\u066B\u066C]/g, '')
    .replace(/[\s\u00A0,،']/g, '');
}

/** «25,489T» / «-1.8T» / «56,577.0» → عدد (با ضریبِ K/M/B/T) */
function btNum(s) {
  const t = btDigits(s);
  if (!t) return null;
  const m = t.match(/(-?\d+(?:\.\d+)?)([KMBT])?/);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (!isFinite(v)) return null;
  if (m[2]) v *= { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[2]];
  return v;
}

/** نرمال‌سازیِ برچسب‌ها: نیم‌فاصله، کشیده، ی/ک عربی-فارسی */
function btNorm(s) {
  return String(s == null ? '' : s)
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0649\u06CC]/g, '\u064A')
    .replace(/\u0643/g, '\u06A9')
    .replace(/\s+/g, ' ')
    .trim();
}

/** متنِ یک سلول: تگ‌ها حذف و فاصله‌ها جمع می‌شوند */
function btText(h) { return btNorm(String(h == null ? '' : h).replace(/<[^>]*>/g, ' ')); }

/** ردیف‌های یک جدول (بر اساسِ کلاسِ CSS؛ اگر نبود، کلِ صفحه) */
function btTable(html, cls) {
  let scope = String(html || '');
  // اول تگِ <table> که خودش این کلاس را دارد (ممکن است نامِ کلاس در CSS/JS هم آمده باشد)
  let s = -1, e = -1;
  const re = new RegExp('<table[^>]*class=[^>]*' + cls + '[^>]*>', 'i');
  const tm = scope.match(re);
  if (tm) {
    s = tm.index;
    e = scope.indexOf('</table>', s + tm[0].length);
  } else {
    const i = scope.indexOf(cls);
    if (i >= 0) { s = scope.lastIndexOf('<table', i); e = scope.indexOf('</table>', i); }
  }
  if (s >= 0 && e > s) scope = scope.slice(s, e);
  else if (s < 0) { /* بی‌اثر: کلِ صفحه پویش می‌شود */ }
  const ths = [];
  let m;
  const thRe = /<th\b[^>]*>([\s\S]*?)<\/th>/gi;
  while ((m = thRe.exec(scope))) ths.push(btText(m[1]));
  const rows = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  while ((m = trRe.exec(scope))) {
    const row = m[1], t = [], h = [];
    const tdRe = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
    let x;
    while ((x = tdRe.exec(row))) { t.push(btText(x[1])); h.push(x[1]); }
    if (t.length) rows.push({ t: t, h: h, all: row });
  }
  return { ths: ths, rows: rows, cls: cls, scoped: (s >= 0 && e > s) };
}

function btFind(tb, label) {
  if (!tb) return null;
  const L = btNorm(label);
  for (const r of tb.rows) if (btNorm(r.t[0]) === L) return r;
  return null;
}

/** ردیفِ شاخص: «7,298,500 (-150,339) -2.0183%» → {p, chg, chgPct} */
function btIndexRow(row, range) {
  if (!row || row.t.length < 2) return null;
  // تگ‌های <span> تغییر را هم در خود دارند: اول تگ‌ها حذف می‌شود، بعد ارقام
  const t = btDigits(btText(row.h[1] || row.t[1] || ''));
  let p = null, chg = null, pct = null;
  const m = t.match(/(-?\d+(?:\.\d+)?)\s*\(\s*(-?[\d.]+)\s*\)\s*(-?[\d.]+)%/);
  if (m) { p = parseFloat(m[1]); chg = parseFloat(m[2]); pct = parseFloat(m[3]); }
  else p = btNum(row.t[1]);
  if (!(p > 0) || p < range[0] || p > range[1]) return null;
  return {
    p: p,
    chg: (chg != null && isFinite(chg)) ? chg : null,
    chgPct: (pct != null && isFinite(pct) && Math.abs(pct) <= 20) ? pct : null,
  };
}

/** ردیفِ دونرخی: «معاملات … ورود پول …» → {valueToman, netToman} */
function btPairRow(row) {
  if (!row) return null;
  const out = [];
  const re = /fw-bold[^>]*>\s*(?:<a\b[^>]*>\s*)?([^<]+)/gi;
  let m;
  while ((m = re.exec(row.all))) {
    const v = btNum(m[1]);
    if (v != null && isFinite(v)) out.push(v);
  }
  if (out.length < 2) return null;
  return { valueToman: out[0], netToman: out[1] };
}

/** «(14%) 126» → {pct, n}؛ «919» → {n} */
function btCount(s) {
  const t = btDigits(s);
  if (!t) return null;
  let m = t.match(/^\((\d+(?:\.\d+)?)%\)(-?\d+)$/);
  if (m) return { pct: parseFloat(m[1]), n: parseInt(m[2], 10) };
  m = t.match(/^(-?\d+)$/);
  if (m) return { pct: null, n: parseInt(m[1], 10) };
  return null;
}

/**
 * تجزیه‌ی صفحه‌ی بورس‌تریدر. هر بخش مستقل نگهبانی می‌شود: اگر ساختارِ صفحه
 * عوض شود یا عددی غیرمعقول بیاید، همان بخش null می‌شود و منتشر نمی‌گردد.
 */
function parseBourseTrader(html) {
  if (!html || html.length < 5000) return { ok: false, why: 'پاسخِ کوتاه/خالی' };
  if (!/شاخص/.test(html)) return { ok: false, why: 'شاخص در صفحه نبود' };
  const mt = btTable(html, BT.marketTable);
  const pt = btTable(html, BT.payeshTable);
  if (!mt.rows.length && !pt.rows.length) return { ok: false, why: 'جدولی پیدا نشد' };

  const out = { ok: false, src: 'BourseTrader', missing: [] };
  const inR = (v, r) => (v != null && isFinite(v) && v >= r[0] && v <= r[1]) ? v : null;

  /* --- شاخص‌ها --- */
  out.index = btIndexRow(btFind(mt, 'شاخص کل'), RANGES.TSE);
  out.equal = btIndexRow(btFind(mt, 'شاخص هم وزن'), BT.ranges.equal);
  out.fara = btIndexRow(btFind(mt, 'شاخص کل فرابورس'), BT.ranges.fara);
  out.cap = inR(btNum((btFind(mt, 'ارزش بازار') || { t: [] }).t[1]), BT.ranges.cap);

  /* --- جدولِ پایش: ستون‌ها با نام پیدا می‌شوند، نه با اندیسِ ثابت --- */
  const C = {};
  for (const c of BT.cols) {
    const L = btNorm(c);
    let idx = -1;
    for (let i = 1; i < pt.ths.length; i++) if (btNorm(pt.ths[i]) === L) { idx = i; break; }
    C[c] = idx;
  }
  const cell = (label, col) => {
    if (!C[col] || C[col] < 1) return null;
    const r = btFind(pt, label);
    return (r && r.t[C[col]] != null) ? r.t[C[col]] : null;
  };
  const numCell = (label, col) => btNum(cell(label, col));

  /* --- جریانِ پول و اندازه‌ی معاملاتِ خرد --- */
  const khVal = inR(numCell('ارزش معاملات', 'خرد'), BT.ranges.value);
  const khNet = btNum(cell('ورود پول حقیقی', 'خرد'));
  if (khNet != null && khVal != null && Math.abs(khNet) <= khVal) {
    out.flow = { netToman: Math.round(khNet), ratio: khNet / khVal };
  } else {
    if (khNet != null) out.missing.push('جریانِ خرد نامعقول');
    out.flow = null;
  }
  const khVol = inR(numCell('حجم معاملات', 'خرد'), BT.ranges.volume);
  out.trade = (khVal != null || khVol != null) ? { valueToman: khVal, volume: khVol } : null;

  /* --- منحنیِ درون‌جلسه‌ایِ جریانِ پول (از نمودارِ خودِ صفحه) ---
       چرا؟ جدول فقط «عددِ الان» را می‌دهد؛ این منحنی می‌گوید پول در طولِ
       جلسه «چه مسیری» آمده. واحد: میلیارد تومان (از زیرعنوانِ نمودار). */
  if (out.flow) out.flowCurve = btFlowCurve(html, out.flow.netToman);
  const qc = btQueueCurve(html);
  if (qc) out.queueCurve = qc;

  /* --- ارزشِ صف‌های خرید و فروش: «پولِ پشتِ صف» ---
     تعدادِ صف (که از قبل داشتیم) می‌گوید چند نماد صف است؛ ارزشِ صف می‌گوید
     چه مقدار پول پشتِ آن صف ایستاده — برای سنجشِ فشارِ تقاضا/عرضه دقیق‌تر است. */
  const qbV = inR(numCell('ارزش صف خرید', 'خرد'), BT.ranges.queueValue);
  const qsV = inR(numCell('ارزش صف فروش', 'خرد'), BT.ranges.queueValue);
  if (qbV != null || qsV != null) {
    out.queue = {
      buyToman: qbV,
      sellToman: qsV,
      netToman: (qbV != null && qsV != null) ? Math.round(qbV - qsV) : null,
    };
    // نسبتِ بدون‌بُعد: سهمِ صفِ خرید از کلِ پولِ پشتِ صف‌ها (۰ تا ۱)
    if (qbV != null && qsV != null && (qbV + qsV) > 0) out.queue.buyShare = qbV / (qbV + qsV);
  }

  /* --- تحرکاتِ صندوق‌ها (درآمد ثابت، سهامی، کالایی، آپشن) --- */
  const fund = (col, pair) => {
    let net = btNum(cell('ورود پول حقیقی', col));
    let val = inR(numCell('ارزش معاملات', col), BT.ranges.value);
    if (net == null && pair && pair.netToman != null) net = pair.netToman;
    if (val == null && pair && pair.valueToman != null) val = inR(pair.valueToman, BT.ranges.value);
    if (net == null || !isFinite(net)) return null;
    if (val != null && val > 0 && Math.abs(net) > val * 1.05) return null;   // خالص نمی‌تواند از کلِ معاملات بیشتر باشد
    if (Math.abs(net) > 1e16) return null;
    return { netToman: Math.round(net), valueToman: val };
  };
  const pairOf = (label) => btPairRow(btFind(mt, label));
  const funds = {
    equity: fund('سهامی', null),
    fixed: fund('درآمدثابت', pairOf('صندوق درآمدثابت')),
    commodity: fund('کالایی', pairOf('صندوق کالایی')),
    option: fund('آپشن', null),
  };
  out.funds = Object.keys(funds).some((k) => funds[k]) ? funds : null;

  /* --- پهنا و صف‌ها (فقط خرد) --- */
  const pos = btCount(cell('نماد مثبت', 'خرد'));
  const neg = btCount(cell('نماد منفی', 'خرد'));
  const tot = btCount(cell('نمادها', 'خرد'));
  const qb = btCount(cell('صف خرید', 'خرد'));
  const qs = btCount(cell('صف فروش', 'خرد'));
  if (pos && neg && pos.n >= 0 && neg.n >= 0 && (pos.n + neg.n) > 0) {
    const total = (tot && tot.n >= pos.n + neg.n) ? tot.n : pos.n + neg.n;
    out.breadth = {
      pos: pos.n, neg: neg.n, total: total,
      posPct: (pos.n + neg.n) > 0 ? (pos.n / (pos.n + neg.n)) * 100 : null,
      queueBuy: qb ? qb.n : null, queueSell: qs ? qs.n : null,
    };
  }

  /* --- سرانه (در هر دو جدول جست‌وجو می‌شود) --- */
  const pcB = btNum(((btFind(pt, 'سرانه خرید حقیقی') || btFind(mt, 'سرانه خرید حقیقی') || { t: [] }).t)[1]);
  const pcS = btNum(((btFind(pt, 'سرانه فروش حقیقی') || btFind(mt, 'سرانه فروش حقیقی') || { t: [] }).t)[1]);
  const pB = inR(pcB, BT.ranges.perCapita), pS = inR(pcS, BT.ranges.perCapita);
  out.perCapita = (pB != null || pS != null) ? { buy: pB, sell: pS } : null;

  out.ok = !!(out.index || out.equal || out.fara || out.flow || out.funds || out.breadth || out.trade || out.queue);
  if (!out.ok) out.why = 'هیچ بخشِ معتبری استخراج نشد';
  return out;
}

/**
 * یک نمودارِ توکارِ Highcharts را از صفحه بیرون می‌کشد (سری‌هایِ درون‌جلسه‌ای).
 * فقط «مقدارها» برمی‌گردند، نه زمان: این نمودارها محورِ زمان ندارند (فقط ترتیب)،
 * پس هیچ timestampای ساخته نمی‌شود — شکلِ منحنی واقعی است و محورش
 * «ترتیبِ نقاط در جلسه» است، نه ساعتِ دقیق.
 */
function btChart(html, id, cap) {
  const re = new RegExp('<div class="pre_chart[^"]*" id="' + id + '"');
  const m = re.exec(String(html || ''));
  if (!m) return null;
  let chunk = html.slice(m.index, m.index + (cap || 14000));
  // فقط تا نمودارِ بعدی: وگرنه سری‌هایِ دو نمودار با هم قاطی می‌شوند
  const next = chunk.slice(1).search(/<div class="pre_chart/);
  if (next > 0) chunk = chunk.slice(0, next + 1);
  const out = { id: id, title: null, sub: null, series: [] };
  const tm = chunk.match(/title\s*:\s*\{\s*text\s*:\s*['"]([^'"]{2,160})['"]/);
  if (tm) out.title = tm[1];
  const sm = chunk.match(/subtitle\s*:\s*\{\s*text\s*:\s*['"]([^'"]{0,160})['"]/);
  if (sm) out.sub = sm[1];
  const sre = /name\s*:\s*["']([^"']{1,60})["']\s*,\s*data\s*:\s*\[([^\]]{0,8000})\]/g;
  let s;
  while ((s = sre.exec(chunk)) && out.series.length < 6) {
    const vals = s[2].split(',').map(function (x) {
      const t = String(x).trim();
      if (t === 'null' || t === '' || t === 'undefined') return null;
      const v = parseFloat(t);
      return isFinite(v) ? v : null;
    });
    out.series.push({ name: s[1], data: vals });
  }
  return out.series.length ? out : null;
}

/** کوتاه‌کردنِ یک سری با نمونه‌برداریِ یکنواخت (همیشه آخرین نقطه می‌ماند) */
function btDownsample(arr, max) {
  if (!Array.isArray(arr) || arr.length <= max) return arr ? arr.slice() : [];
  const n = arr.length, out = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.round(i * (n - 1) / (max - 1))]);
  return out;
}

/**
 * منحنیِ خالصِ «ورود/خروجِ پولِ حقیقی» در طولِ جلسه، از نمودارِ `input_money`.
 * قراردادِ منبع (از روی پاسخِ زنده استخراج شد):
 *   • دو سری دارد: «ورود پول» (وقتی خالص مثبت است) و «خروج پول» (وقتی منفی؛
 *     مقدارهایش خودبه‌خود منفی‌اند). در هر نقطه دقیقاً یکی مقدار دارد.
 *   • واحد: میلیارد تومان (زیرعنوانِ خودِ نمودار می‌گوید «آخرین ۷۱۴ میلیارد تومان»).
 * نگهبان‌ها: تعدادِ نقاط، مقیاس، و **تطبیق با عددِ جدول** — اگر آخرین نقطه با
 * خالصِ جدول هم‌خوان نباشد یعنی نمودار چیزِ دیگری است و منحنی منتشر نمی‌شود.
 */
function btFlowCurve(html, netToman) {
  const ch = btChart(html, 'input_money');
  if (!ch || ch.series.length < 2) return null;
  // «ورود/خروج» با ی/کِ نرمال‌شده (هم عربی هم فارسی)
  const RE_IN = /\u0648\u0631\u0648\u062F/;   // ورود
  const RE_OUT = /\u062E\u0631\u0648\u062C/; // خروج
  let inflow = null, outflow = null;
  for (const s of ch.series) {
    const nm = btNorm(s.name);
    if (RE_IN.test(nm) && !inflow) inflow = s.data;
    else if (RE_OUT.test(nm) && !outflow) outflow = s.data;
  }
  if (!inflow || !outflow) return null;
  const n = Math.min(inflow.length, outflow.length);
  if (n < 10 || n > 1200) return null;
  const net = [];
  for (let i = 0; i < n; i++) {
    const a = inflow[i], b = outflow[i];
    if (a == null && b == null) continue;         // پیش از شروعِ جلسه
    const v = (a || 0) + (b || 0);
    if (!isFinite(v)) return null;
    if (Math.abs(v) > 5e6) return null;           // ‎۵۰۰۰ همت = غیرممکن
    net.push(Math.round(v));
  }
  if (net.length < 10) return null;
  const last = net[net.length - 1];
  // تطبیق با عددِ جدول (هر دو به میلیارد تومان): اختلافِ فاحش یعنی برداشتِ غلط
  if (netToman != null && isFinite(netToman)) {
    const tableMilliard = netToman / 1e9;
    if (Math.abs(tableMilliard) > 1 && Math.abs(last) > 1) {
      const ratio = Math.abs(last / tableMilliard);
      if (ratio < 0.4 || ratio > 2.5) return null;
    }
  }
  const v = btDownsample(net, 48);
  let lo = Infinity, hi = -Infinity;
  for (const x of v) { if (x < lo) lo = x; if (x > hi) hi = x; }
  return {
    v: v, n: v.length, raw: net.length,
    unit: 'milliard_toman', last: last, first: net[0],
    min: lo, max: hi, src: 'BourseTrader'
  };
}

/** منحنیِ تعدادِ صف‌های خرید و فروش در طولِ جلسه (نمودارِ buysellqty) */
function btQueueCurve(html) {
  const ch = btChart(html, 'buysellqty');
  if (!ch || ch.series.length < 2) return null;
  const RE_BUY = /\u062E\u0631\u064A\u062F/;  // خرید (ی عربی پس از نرمال‌سازی)
  const RE_SELL = /\u0641\u0631\u0648\u0634/; // فروش
  let buy = null, sell = null;
  for (const s of ch.series) {
    const nm = btNorm(s.name);
    if (RE_BUY.test(nm) && !buy) buy = s.data;
    else if (RE_SELL.test(nm) && !sell) sell = s.data;
  }
  if (!buy || !sell) return null;
  const n = Math.min(buy.length, sell.length);
  if (n < 10 || n > 1200) return null;
  const B = [], S = [];
  for (let i = 0; i < n; i++) {
    const a = buy[i], b = sell[i];
    if (a == null || b == null) continue;
    if (!isFinite(a) || !isFinite(b)) return null;
    if (a < 0 || b < 0 || a > 3000 || b > 3000) return null;
    B.push(Math.round(a)); S.push(Math.round(b));
  }
  if (B.length < 10) return null;
  return { buy: btDownsample(B, 40), sell: btDownsample(S, 40), n: B.length, raw: n };
}

/**
 * انتخابِ جریانِ پول برای انتشار — مهم‌ترین بخشِ «صداقتِ» این سامانه،
 * برای همین جدا و مستقلاً قابل‌تست نوشته شده (در main فقط صدا زده می‌شود).
 *
 * ترتیبِ اعتبار:
 *   ۱) عددِ تازه از بورس‌تریدر (در ساعتِ بازار)
 *   ۲) عددِ تازه از BrsApi (اگر کلید باشد)
 *   ۳) «حفظِ جلسه»: همان عدد از انتشارِ قبلی — اما فقط اگر متعلق به همان
 *      جلسه‌ای باشد که شاخص به آن تعلق دارد. چرا؟ جریانِ پول یک عددِ «روزانه»
 *      است؛ اگر بعد از بسته‌شدنِ بازار آن را دور بریزیم، هر کسی که عصر صفحه را
 *      باز کند چیزی نمی‌بیند — با آن‌که صبحِ همان روز واقعاً اندازه‌گیری شده بود.
 *      شرطِ صداقت: جلسه‌یِ قبل هرگز منتشر نمی‌شود تا «عددِ کهنه» لباسِ
 *      «امروز» نپوشد.
 *   ۴) سکوت — هرگز از روی شاخص ساخته نمی‌شود.
 *
 * @returns {{flow: object|null, why: string, how: string}}
 */
function pickMarketFlow(o) {
  const inp = o || {};
  const ixDay = inp.ixDay || null;
  const now = inp.now || Date.now();
  const dayOf = (ts) => (ts > 0 ? tehranDay(ts) : null);

  if (inp.fresh && isFinite(+inp.fresh.netToman)) {
    return {
      flow: {
        netToman: +inp.fresh.netToman,
        ratio: (inp.fresh.ratio != null && isFinite(+inp.fresh.ratio)) ? +inp.fresh.ratio : null,
        n: inp.fresh.n || null,
        src: inp.fresh.src || 'BourseTrader',
        ts: now, day: tehranDay(now), fresh: true,
      },
      how: 'fresh', why: 'تازه از ' + (inp.fresh.src || 'BourseTrader'),
    };
  }
  if (inp.brs && isFinite(+inp.brs.netToman)) {
    return {
      flow: {
        netToman: +inp.brs.netToman,
        ratio: (inp.brs.ratio != null && isFinite(+inp.brs.ratio)) ? +inp.brs.ratio : null,
        n: inp.brs.n || null,
        src: inp.brs.src || 'BrsApi',
        ts: now, day: tehranDay(now), fresh: true,
      },
      how: 'brs', why: 'از BrsApi',
    };
  }
  const pf = inp.prev;
  if (pf && pf.ts > 0 && isFinite(+pf.netToman) && ixDay && dayOf(pf.ts) === ixDay) {
    return {
      flow: {
        netToman: +pf.netToman,
        ratio: (pf.ratio != null && isFinite(+pf.ratio)) ? +pf.ratio : null,
        n: pf.n || null,
        src: pf.src || 'BourseTrader',
        ts: pf.ts, day: dayOf(pf.ts), fresh: false,
      },
      how: 'kept', why: 'جریانِ جلسه‌یِ امروز از انتشارِ قبلی',
    };
  }
  return {
    flow: null,
    how: 'silent',
    why: pf
      ? 'جریانِ موجود متعلق به جلسه‌یِ دیگری است — منتشر نمی‌شود (عددِ کهنه لباسِ امروز نمی‌پوشد)'
      : 'منبعی در دسترس نبود — جریانِ پول منتشر نمی‌شود',
  };
}

/**
 * سریِ درون‌جلسه‌ایِ جریانِ پول.
 * هر انتشارِ معتبر یک نقطه می‌افزاید؛ فقط نقاطِ همان روزِ تهران نگه داشته
 * می‌شوند (جلسه‌ی فردا یعنی سریِ تازه). چرا اینجا و نه در history.json؟
 * چون «روندِ پولِ امروز» باید همان لحظه دیده شود، نه فردا.
 * نگهبان: حداکثر ۲۴ نقطه (سقفِ حجمِ live.json) و بدون ترتیبِ زمانی نمی‌شود.
 */
function flowSeries(prev, ts, netToman) {
  if (!(ts > 0) || !isFinite(+netToman)) return [];
  const day = tehranDay(ts);
  const out = [];
  if (Array.isArray(prev)) {
    for (const p of prev) {
      if (!Array.isArray(p) || p.length < 2) continue;
      const t = +p[0], v = +p[1];
      if (!(t > 0) || !isFinite(v)) continue;
      if (tehranDay(t) !== day) continue;         // جلسه‌ی دیگر
      if (out.length && t <= out[out.length - 1][0]) continue; // فقط رو به جلو
      out.push([t, Math.round(v)]);
    }
  }
  const last = out[out.length - 1];
  if (!last) out.push([ts, Math.round(netToman)]);
  else if (ts - last[0] >= 5 * 60000) out.push([ts, Math.round(netToman)]);  // کمتر از ۵ دقیقه ادغام
  else out[out.length - 1] = [ts, Math.round(netToman)];
  while (out.length > 24) out.shift();
  return out;
}

/** جلسه‌ی بورسِ تهران باز است؟ (شنبه تا چهارشنبه، ۸:۵۰ تا ۱۳:۲۰ به وقت تهران) */
function tseSessionOpen(ms) {
  const d = new Date((ms || Date.now()) + TEHRAN_OFFSET_MS);
  const dow = (d.getUTCDay() + 1) % 7;          // ۰=شنبه … ۶=جمعه
  const min = d.getUTCHours() * 60 + d.getUTCMinutes();
  return (dow <= 4) && (min >= 8 * 60 + 50) && (min <= 13 * 60 + 20);
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

/**
 * مهارِ «دورِ بی‌فایده»: اگر انتشارِ روی دیسک از MIN_GAP_MIN دقیقه تازه‌تر باشد،
 * این اجرا هیچ کاری نمی‌کند (بدون واکشی، بدون کامیت).
 * چرا؟ چند جریان (ضربانِ ساعتی + نگهبانِ ساعتی) ممکن است هم‌زمان بیدار شوند؛
 * انتشارِ دوبارهِ پشتِ‌هم فقط ترافیکِ بی‌دلیل روی منابعِ عمومی است.
 *   node scripts/publish.cjs --min-gap=20
 */
function freshEnough(minutes) {
  const m = Math.max(0, +minutes || 0);
  if (!m) return 0;
  try {
    const j = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const age = (Date.now() - Date.parse(j && j.generated_at)) / 60000;
    return (isFinite(age) && age >= 0 && age < m) ? age : 0;
  } catch (e) { return 0; }
}

async function main() {
  const argGap = (process.argv.slice(2).find((a) => a.startsWith('--min-gap=')) || '').split('=')[1];
  const skipAge = freshEnough(argGap);
  if (skipAge) {
    console.log('PUBLISH SKIP: انتشارِ روی دیسک ' + skipAge.toFixed(1) + ' دقیقه پیش بوده' +
      ' (حداقل فاصله: ' + argGap + ' دقیقه) — منبعی واکشی نشد.');
    return;
  }

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

  /* ---- مسیرهای کلیددار (اختیاری؛ فقط وقتی Secrets تنظیم شده باشد) ----
     کلیدها از محیط می‌آیند و در هیچ لاگ یا فایلی نوشته نمی‌شوند. */
  let nv = null;
  if (NAVASAN_KEY) {
    const url = 'https://api.navasan.tech/latest/?api_key=' + encodeURIComponent(NAVASAN_KEY);
    try { const r = await getJSON(url, { timeout: 15000 }); nv = r.j; log('navasan', true, 'مسیر کلیددارِ سرور', r.ms); }
    catch (e) { log('navasan', false, String((e && e.message) || e).slice(0, 60)); }
  } else log('navasan', false, 'بدون کلید — مسیر خاموش');

  /* ---- لنگرِ تطبیقی: آخرین انتشار معتبر روی دیسک ----
     اگر سطح قیمت‌ها جابه‌جا شده باشد، پنجره‌ی استاتیک دیگر صادق نیست؛
     لنگر اجازه می‌دهد انتشار ادامه یابد (نه اینکه بی‌صدا متوقف شود). */
  const prevDoc = (() => {
    try { return JSON.parse(fs.readFileSync(OUT, 'utf8')) || {}; }
    catch (e) { return {}; }
  })();
  const prevQuotes = prevDoc.quotes || {};
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

  // ناواسان (کلیددار) فقط برای کوت‌هایی که از مسیرهای بالا نیامده‌اند
  if (nv) {
    const nvq = parseNavasan(nv);
    if (nvq) {
      Object.keys(nvq).forEach(function (sym) {
        if (!quotes[sym]) put(sym, { p: nvq[sym].p, chg: null, chgPct: nvq[sym].chgPct, ts: now }, 'ناواسان (سرور)');
      });
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

  /* ---- بورس: شاخص کل از TGJU + مکملِ بورس‌تریدر + جریانِ پول (اگر کلید باشد) ----
     جریانِ پولِ حقیقی/حقوقی از TSETMC در دسترس نیست چون TSETMC از IP خارجی پاسخ
     نمی‌دهد؛ بورس‌تریدر این خلاء را بدون کلید پر می‌کند. هر بخش که نیاید، همان
     بخش منتشر نمی‌شود (سکوتِ صادقانه به‌جای عددِ ساختگی). */

  /* بورس‌تریدر: صفحه‌ی عمومی است، پس مؤدبانه رفتار می‌کنیم — فقط در ساعتِ
     بازار و هر BT_MIN_GAP_MS یک‌بار؛ بیرون از آن، همان مقدارِ قبلی می‌ماند. */
  // فاصله‌ی واکشیِ صفحه‌ی عمومیِ بورس‌تریدر (ادب): پیش‌فرض هر نیم‌ساعت.
  // با متغیرِ محیطی BT_MIN_GAP_MIN می‌توان کم/زیاد کرد؛ کمتر از ۱۵ دقیقه
  // پذیرفته نمی‌شود چون صفحه برای مصرفِ ماشینیِ پرتکرار ساخته نشده.
  const BT_MIN_GAP_MS = Math.max(15, Math.min(360, +(process.env.BT_MIN_GAP_MIN || 30) || 30)) * 60e3;
  const prevBt = (prevDoc.market && prevDoc.market.bt) || null;
  let btDoc = null, btFresh = false;
  if (!tseSessionOpen(now)) {
    log('btrader', !!prevBt, prevBt ? 'بیرون از ساعتِ بازار — از انتشارِ قبلی' : 'بیرون از ساعتِ بازار و مقدارِ قبلی نداریم');
  } else if (prevBt && prevBt.ts && (now - prevBt.ts) < BT_MIN_GAP_MS) {
    log('btrader', true, 'مقدارِ قبلی هنوز تازه است (' + Math.round((now - prevBt.ts) / 60000) + ' دقیقه)');
  } else {
    try {
      const r = await getText(BT.url, { timeout: 20000 });
      const pr = parseBourseTrader(r.t);
      if (pr.ok) {
        btDoc = pr; btFresh = true;
        const bits = [];
        if (pr.index) bits.push('شاخص ' + faNum(pr.index.p));
        if (pr.flow) bits.push('جریان ' + (pr.flow.netToman < 0 ? 'خروج ' : 'ورود ') + faNum(Math.abs(pr.flow.netToman) / 1e12) + ' همت');
        if (pr.breadth) bits.push('پهنا ' + faNum(pr.breadth.posPct) + '٪ مثبت');
        log('btrader', true, bits.join(' · ') || 'صفحه آمد', r.ms);
      } else log('btrader', false, pr.why || 'ساختارِ ناشناخته', r.ms);
    } catch (e) { log('btrader', false, String((e && e.message) || e).slice(0, 70)); }
  }
  if (!btDoc && prevBt) btDoc = prevBt;

  let marketOut = null;
  if (!tgju) log('tse', false, 'TGJU بی‌پاسخ — شاخص بورس هم نرسید');
  else {
    const pm = prevDoc.market && prevDoc.market.index;
    const ix = tgjuIndex(tgju, (pm && pm.p > 0) ? pm.p : 0);
    if (ix) {
      marketOut = { index: ix, day: ix.day, asOf: ix.ts, src: 'TGJU' };
      log('tse', true, 'شاخص کل ' + faNum(ix.p) + (ix.ts ? ' · جلسه ' + faDay(ix.ts) : ''));
    } else log('tse', false, 'کلید bourse در TGJU نبود یا از بازه بیرون بود');
  }
  // تطبیقِ دو منبعِ شاخص: اگر هر دو آمدند و بیش از ۱٪ اختلاف داشتند، می‌گوییم
  if (marketOut && btDoc && btDoc.index && btDoc.index.p > 0) {
    const d = Math.abs(btDoc.index.p - marketOut.index.p) / marketOut.index.p;
    if (d > 0.01) {
      const pn = (SRC.btrader && SRC.btrader.note) ? SRC.btrader.note + '؛ ' : '';
      log('btrader', true, pn + 'تطبیقِ شاخص با TGJU: ' + (d * 100).toFixed(1) +
        '٪ اختلاف (یکی زنده است و دیگری آخرین جلسه)');
    }
  }
  // اگر TGJU نیامد، شاخصِ بورس‌تریدر جایگزین می‌شود (با برچسبِ منبعِ خودش)
  if (!marketOut && btDoc && btDoc.index && btDoc.index.p > 0) {
    marketOut = {
      index: { p: Math.round(btDoc.index.p), chgPct: btDoc.index.chgPct, high: null, low: null, ts: btDoc.ts || now, day: tehranDay(btDoc.ts || now), src: 'BourseTrader' },
      day: tehranDay(btDoc.ts || now), asOf: btDoc.ts || now, src: 'BourseTrader',
    };
    log('tse', true, 'شاخص کل از بورس‌تریدر (TGJU نیامد) ' + faNum(btDoc.index.p));
  }

  /* جریانِ پولِ حقیقیِ خرد، به ترتیبِ اعتبار:
     ۱) بورس‌تریدر — بدون کلید و کلِ بازار (اگر همین الان گرفته شده باشد)
     ۲) BrsApi — اگر Secret تنظیم شده باشد (حداکثر هر ۳ ساعت)
     ۳) «حفظِ جلسه»: همان مقدار از انتشارِ قبلی، اگر متعلق به همان جلسه‌ای باشد
        که شاخص به آن تعلق دارد. چرا این بند حیاتی است؟ جریانِ پول یک عددِ
        «روزانه» است، نه لحظه‌ای؛ اگر بعد از بسته‌شدنِ بازار آن را دور بریزیم،
        هر کسی که عصر صفحه را باز کند چیزی نمی‌بیند — در حالی که صبحِ همان روز
        واقعاً اندازه‌گیری شده بود. شرطِ صداقت: فقط همان جلسه؛ جلسه‌یِ قبل
        منتشر نمی‌شود تا «عددِ کهنه» لباسِ «امروز» نپوشد.
     ۴) سکوت — هرگز از روی شاخص ساخته نمی‌شود */
  const ixDay = marketOut ? tehranDay((marketOut.index && marketOut.index.ts) || now) : null;
  const prevFlow = prevDoc.market && prevDoc.market.flow;

  /* ورودی‌هایِ pickMarketFlow: اول منبعِ تازه، وگرنه همان جلسه از قبل */
  const btFreshFlow = (btFresh && btDoc && btDoc.flow) ? {
    netToman: btDoc.flow.netToman, ratio: btDoc.flow.ratio,
    n: (btDoc.breadth && btDoc.breadth.total) || null, src: 'BourseTrader',
  } : null;
  let brsFresh = null;
  if (!marketOut) log('tsetmc', false, 'شاخص نیامد؛ جریان هم منتشر نمی‌شود');
  else {
    // BrsApi فقط وقتی صدا زده می‌شود که منبعِ بی‌کلید چیزی نداده باشد و
    // جریانِ قبلی هم یا نداریم یا از مهارِ زمانی گذشته است.
    const needBrs = !!BRS_KEY && !btFreshFlow &&
      !(prevFlow && prevFlow.ts && (Date.now() - prevFlow.ts < BRS_MIN_GAP_MS) && ixDay && tehranDay(prevFlow.ts) === ixDay);
    if (needBrs) {
      const url = BRS.base + '/' + BRS.marketPath + '?key=' + encodeURIComponent(BRS_KEY) + '&type=' + encodeURIComponent(BRS.type);
      try {
        const r = await getJSON(url, { timeout: 20000 });
        const pr = parseBrsMarket(r.j);
        if (pr.ok) { brsFresh = { netToman: pr.agg.netToman, ratio: pr.agg.ratio, n: pr.agg.n, src: 'BrsApi' }; log('tsetmc', true, 'جریانِ پولِ ' + pr.agg.n + ' نماد از BrsApi', r.ms); }
        else log('tsetmc', false, pr.why + (pr.keys ? ' — کلیدها: ' + pr.keys.join(', ') : '') + ' · ' + redact(url));
      } catch (e) { log('tsetmc', false, String((e && e.message) || e).slice(0, 70) + ' · ' + redact(url)); }
    } else if (BRS_KEY && !btFreshFlow) log('tsetmc', true, 'از انتشارِ قبلی (هنوز تازه است)');

    const picked = pickMarketFlow({ fresh: btFreshFlow, brs: brsFresh, prev: prevFlow, ixDay: ixDay, now: now });
    marketOut.flow = picked.flow;
    if (picked.flow) {
      if (picked.how === 'fresh') {
        log('tsetmc', true, 'جریانِ خرد از بورس‌تریدر: ' + (picked.flow.netToman < 0 ? 'خروج ' : 'ورود ') +
          faNum(Math.abs(picked.flow.netToman) / 1e12) + ' همت');
      } else if (picked.how === 'brs') {
        log('tsetmc', true, 'جریانِ پولِ ' + picked.flow.n + ' نماد از BrsApi');
      } else {
        log('tsetmc', true, 'جریانِ جلسه‌یِ امروز از انتشارِ قبلی (' +
          Math.round((now - picked.flow.ts) / 3600e3) + ' ساعت پیش اندازه‌گیری شده)');
      }
    } else if (picked.how === 'silent') {
      log('tsetmc', false, picked.why);
    }
  }

  /* سریِ درون‌جلسه‌ایِ «روندِ پولِ امروز»: هر انتشار یک نقطه.
     با یک نقطه نمی‌شود روند کشید، پس فقط از دو نقطه به بالا منتشر می‌شود. */
  if (marketOut && marketOut.flow && isFinite(+marketOut.flow.netToman)) {
    const s = flowSeries(prevDoc.market && prevDoc.market.flowSeries, marketOut.flow.ts || now, +marketOut.flow.netToman);
    if (s.length >= 2) marketOut.flowSeries = s;
  }

  // مکملِ بورس‌تریدر: شاخص‌های هم‌وزن/فرابورس، تحرکاتِ صندوق‌ها، پهنا، سرانه
  if (marketOut && btDoc) {
    const bt = { ts: btDoc.ts || now, src: 'BourseTrader', fresh: btFresh };
    if (btDoc.index) bt.index = { p: Math.round(btDoc.index.p), chgPct: btDoc.index.chgPct };
    if (btDoc.equal) bt.equal = { p: btDoc.equal.p, chgPct: btDoc.equal.chgPct };
    if (btDoc.fara) bt.fara = { p: btDoc.fara.p, chgPct: btDoc.fara.chgPct };
    if (btDoc.cap) bt.cap = Math.round(btDoc.cap);
    if (btDoc.trade) bt.trade = btDoc.trade;
    if (btDoc.funds) bt.funds = btDoc.funds;
    if (btDoc.breadth) bt.breadth = btDoc.breadth;
    if (btDoc.perCapita) bt.perCapita = btDoc.perCapita;
    if (btDoc.queue) bt.queue = btDoc.queue;
    if (btDoc.flowCurve) bt.flowCurve = btDoc.flowCurve;
    if (btDoc.queueCurve) bt.queueCurve = btDoc.queueCurve;
    if (Object.keys(bt).length > 3) marketOut.bt = bt;
  }

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
  // فقط وقتی شاخص واقعاً معتبر است اضافه می‌شود؛ در غیر این صورت کلید وجود ندارد
  if (marketOut) doc.market = marketOut;
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

module.exports = { num, tehranMs, tehranDay, faDay, faNum, redact, envKey, parseNavasan, aggregateFlow, parseBrsMarket, inRange, saneDayRange, sanePct, tgjuRow, tgjuIndex, pickTGJU, TGJU_MARKET_KEYS, parseNobitex, parseWallex, parseBitpin, fitUnit, consensus, krakenChg, RANGES, TGJU_KEYS, btNum, btCount, btNorm, btTable, btFind, btIndexRow, btPairRow, parseBourseTrader, tseSessionOpen, BT, flowSeries, pickMarketFlow, btChart, btDownsample, btFlowCurve, btQueueCurve };
