// لایه‌ی بورس (نسل ۷) — شاخص کل از TGJU، جریانِ پولِ حقیقی با نگهبان،
// و عاملِ نهمِ حکم. منبعِ شواهد: reports/probe-bourse.md (پروب روی GitHub Actions).
// Run: NODE_PATH=/tmp/smoke/node_modules node tests/bourse.js   (needs: npm i jsdom)
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const REPO = path.join(__dirname, '..');
const P = require('../scripts/publish.cjs');
const H = require('../scripts/history.cjs');

let n = 0, failed = 0;
function t(name, fn) {
  n++;
  try { fn(); console.log('PASS  ' + name); }
  catch (e) { failed++; console.error('FAIL  ' + name + ' :: ' + e.message); }
}
async function ta(name, fn) {
  n++;
  try { await fn(); console.log('PASS  ' + name); }
  catch (e) { failed++; console.error('FAIL  ' + name + ' :: ' + e.message); }
}

/* ============================================================
   ۱) ناشر: پارسرِ شاخص روی شکلِ واقعیِ TGJU (اندازه‌گیری‌شده)
   ============================================================ */
const REAL_TGJU_BOURSE = {
  p: '7,448,839.4', h: '7,619,210.5', l: '7,448,839.3',
  d: '0', dp: 0, dt: '', t: '۲۸ شهریور', t_en: '19 Sep', ts: '2026-09-19 00:00:00'
};

t('tgjuIndex: پاسخِ واقعیِ TGJU درست تجزیه می‌شود', () => {
  const ix = P.tgjuIndex({ bourse: REAL_TGJU_BOURSE }, 0);
  assert.ok(ix, 'باید پذیرفته شود');
  assert.strictEqual(ix.p, 7448839);
  // سقف/کف هم‌تراز با قیمتِ گرد شده‌اند؛ وگرنه price<low می‌شد و کلِ دامنه
  // سمتِ کلاینت به‌عنوانِ «غیرواقعی» دور ریخته می‌شد (ایرادِ واقعیِ پیداشده)
  assert.strictEqual(ix.high, 7619211);
  assert.strictEqual(ix.low, 7448839);
  assert.ok(ix.p >= ix.low && ix.p <= ix.high, 'قیمت باید داخلِ دامنه باشد');
  assert.strictEqual(ix.day, '2026-09-19');
  assert.strictEqual(ix.src, 'TGJU');
  assert.strictEqual(ix.ts, 1789763400000);
});

t('tgjuIndex: dp=0 را «بی‌داده» می‌گیرد، نه «بدون تغییر»', () => {
  // TGJU برای شاخص همیشه d/dp را صفر می‌فرستد؛ ساختنِ «تغییرِ صفر» دروغ است.
  const ix = P.tgjuIndex({ bourse: REAL_TGJU_BOURSE }, 0);
  assert.strictEqual(ix.chgPct, null);
  // اما اگر روزی dp واقعی آمد، استفاده شود
  const ix2 = P.tgjuIndex({ bourse: Object.assign({}, REAL_TGJU_BOURSE, { dp: -1.44, dt: 'low' }) }, 0);
  assert.strictEqual(ix2.chgPct, -1.44);
});

t('tgjuIndex: آشغال و خارج‌از‌بازه رد می‌شود', () => {
  assert.strictEqual(P.tgjuIndex({ bourse: { p: '12' } }, 0), null, 'شاخص ۱۲ واحدی');
  assert.strictEqual(P.tgjuIndex({ bourse: { p: '0' } }, 0), null);
  assert.strictEqual(P.tgjuIndex({ price_dollar_rl: { p: '2,305,000' } }, 0), null, 'کلیدِ بورس نیست');
  assert.strictEqual(P.tgjuIndex(null, 0), null);
});

t('tgjuIndex: لنگرِ تطبیقی جلوی توقفِ انتشار را می‌گیرد (تورمِ شاخص)', () => {
  // پنجره‌ی استاتیک 1e6..5e7 است؛ شاخصِ ۳ برابر از لنگر پذیرفته می‌شود
  assert.ok(P.tgjuIndex({ bourse: { p: '20,000,000', ts: '2026-09-19 00:00:00' } }, 7448839));
  // اما ۱۰۰ برابر، آشغال است حتی با لنگر
  assert.strictEqual(P.tgjuIndex({ bourse: { p: '700,000,000' } }, 7448839), null);
});

t('tehranDay: تاریخِ جلسه از ts ساخته می‌شود', () => {
  assert.strictEqual(P.tehranDay(P.tehranMs('2026-09-19 00:00:00')), '2026-09-19');
});

/* ============================================================
   ۲) تاریخچه: سریِ روزانه‌ی شاخص
   ============================================================ */
t('history: شاخص یک ردیفِ روزانه می‌سازد (بدون سریِ خام)', () => {
  const d = H.empty();
  H.appendLive(d, { generated_at: '2026-09-19T10:00:00Z', quotes: { USD: { p: 230000 } }, market: { index: { p: 7448839, ts: 1789763400000, day: '2026-09-19' } } });
  assert.deepStrictEqual(d.daily.TSE, [['2026-09-19', 7448839, 7448839, 7448839]]);
  assert.strictEqual(d.recent.TSE, undefined, 'شاخص ماهیتاً روزانه است، recent ندارد');
});

t('history: در طولِ یک جلسه همان ردیف به‌روز می‌شود (آخرین مقدار، نه اولین)', () => {
  const d = H.empty();
  const m1 = { index: { p: 7448839, high: 7619210, low: 7448839, ts: 1789763400000 } };
  const m2 = { index: { p: 7450000, high: 7620000, low: 7440000, ts: 1789763400000 } };
  H.appendLive(d, { generated_at: '2026-09-19T10:00:00Z', quotes: {}, market: m1 });
  H.appendLive(d, { generated_at: '2026-09-19T14:00:00Z', quotes: {}, market: m2 });
  assert.strictEqual(d.daily.TSE.length, 1, 'دو ردیف برای یک جلسه نسازد');
  assert.strictEqual(d.daily.TSE[0][1], 7450000, 'بستنِ روز آخرین مقدار باشد');
  assert.strictEqual(d.daily.TSE[0][2], 7620000, 'سقفِ روز گسترش یابد');
});

t('history: جلسه‌ی بعد ردیفِ جدید; بدونِ market چیزی اضافه نمی‌شود', () => {
  const d = H.empty();
  H.appendLive(d, { generated_at: '2026-09-19T10:00:00Z', quotes: {}, market: { index: { p: 7448839, ts: 1789763400000 } } });
  H.appendLive(d, { generated_at: '2026-09-20T10:00:00Z', quotes: {}, market: { index: { p: 7300000, ts: 1789849800000 } } });
  assert.strictEqual(d.daily.TSE.length, 2);
  const r = H.appendLive(d, { generated_at: '2026-09-21T10:00:00Z', quotes: {}, market: null });
  assert.strictEqual(r.added, 0);
});

/* ============================================================
   ۳) کلاینت: جلسه، کارت، و عاملِ نهمِ حکم
   ============================================================ */
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const SCRIPTS = ['config.js', 'utils.js', 'data.js', 'charts.js', 'ui.js', 'features.js', 'app.js'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const jres = (j) => Promise.resolve({ ok: true, json: () => Promise.resolve(j), text: () => Promise.resolve(JSON.stringify(j)) });
const jrej = () => Promise.reject(new Error('mock-offline'));

function liveDoc(market) {
  const now = Date.now();
  const flat = (p) => ({ p, chg: 0, chgPct: 0.4, high: p * 1.01, low: p * 0.99, ts: now - 600000, src: 'TGJU' });
  const doc = {
    generated_at: new Date().toISOString(), generated_fa: 'تست',
    quotes: {
      USD: flat(230275), EUR: flat(264710), GBP: flat(308650), AED: flat(62708), CHF: flat(280400), CNY: flat(34380), TRY: flat(4795),
      G18: flat(23878100), G24: flat(31837100), MESGHAL: flat(103431000), OUNCE_USD: { p: 4383, chgPct: 0.2, ts: now, src: 'TGJU' },
      EMAMI: flat(237480000), BAHAR: flat(233070000), NIM: flat(121000000), ROB: flat(64500000), GERAMI: flat(33000000),
      USDT: { p: 228670, chgPct: 0.94, ts: now, src: 'والکس' },
      BTC_TM: { p: 18560426602, chgPct: 1.56, ts: now, src: 'والکس' },
      BTC_USD: { p: 81295, chgPct: 0.03, ts: now, src: 'اجماع جهانی', agree: 4 },
    },
    fx: { date: '2026-09-18', rates: { EUR: 0.8726, GBP: 0.749, CHF: 0.826, CNY: 6.7, TRY: 48.8 } },
  };
  if (market) doc.market = market;
  return doc;
}

function boot(fetchFn, opts) {
  opts = opts || {};
  const dom = new JSDOM(html, { url: 'http://localhost/index.html', pretendToBeVisual: true, runScripts: 'dangerously' });
  const { window } = dom;
  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  window.fetch = fetchFn;
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  for (const s of (opts.scripts || SCRIPTS)) {
    const el = window.document.createElement('script');
    el.textContent = fs.readFileSync(path.join(REPO, 'assets/js', s), 'utf8');
    window.document.body.appendChild(el);
  }
  return { dom, window, d: window.document, GS: window.GS, errors };
}

/* ============================================================
   ۲ونیم) بورس‌تریدر: پارسرِ HTML و نگهبان‌هایش
   منبعِ شواهد: reports/probe-bourse.md (خروجیِ پارسر روی صفحه‌ی زنده،
   که با مقدارِ چاپ‌شده در خودِ صفحه تطبیق داده شد).
   ============================================================ */
const BT_HTML = fs.readFileSync(path.join(__dirname, 'fixtures', 'bourse-trader.html'), 'utf8');

t('btNum: T/B/M/K و ارقامِ فارسی و پرانتزِ درصد', () => {
  assert.strictEqual(P.btNum('25,489T'), 25489e12);
  assert.strictEqual(P.btNum('-1.8T'), -1.8e12);
  assert.strictEqual(P.btNum('-745.6B'), -745.6e9);
  assert.strictEqual(P.btNum('56.9M'), 56.9e6);
  assert.strictEqual(P.btNum('-654.6K'), -654600);
  assert.strictEqual(P.btNum('56,577.0'), 56577);
  assert.strictEqual(P.btNum('0'), 0);
  assert.strictEqual(P.btNum('\u06F7,\u06F2\u06F9\u06F8,\u06F5\u06F0\u06F0'), 7298500, 'ارقام فارسی');
  assert.strictEqual(P.btNum('110.6B $'), 110.6e9);
  assert.strictEqual(P.btNum(''), null);
  assert.strictEqual(P.btNum('نامشخص'), null);
});

t('btCount: «(14%) 126» و «919»', () => {
  assert.deepStrictEqual(P.btCount('(14%) 126'), { pct: 14, n: 126 });
  assert.deepStrictEqual(P.btCount('919'), { pct: null, n: 919 });
  assert.strictEqual(P.btCount('-'), null);
});

t('parseBourseTrader: خروجیِ کامل روی شکلِ واقعیِ صفحه', () => {
  const r = P.parseBourseTrader(BT_HTML);
  assert.strictEqual(r.ok, true, JSON.stringify(r).slice(0, 200));
  assert.strictEqual(r.index.p, 7298500);
  assert.strictEqual(r.index.chg, -150339);
  assert.strictEqual(r.index.chgPct, -2.0183);
  assert.strictEqual(r.equal.p, 1950840);
  assert.strictEqual(r.fara.p, 56577);
  assert.strictEqual(r.cap, 25489e12);
  assert.strictEqual(r.flow.netToman, -1.8e12, 'خروجِ ۱.۸ همت پولِ حقیقی از خرد');
  assert.ok(Math.abs(r.flow.ratio + 0.2337) < 0.001, 'ratio=' + r.flow.ratio);
  assert.strictEqual(r.trade.valueToman, 7.7e12);
  assert.strictEqual(r.trade.volume, 13.1e9);
  assert.strictEqual(r.funds.fixed.netToman, -745.6e9, 'صندوق‌های درآمد ثابت');
  assert.strictEqual(r.funds.equity.netToman, -425e9, 'صندوق‌های سهامی');
  assert.deepStrictEqual(r.funds.commodity, { netToman: 0, valueToman: null }, 'کالایی معامله نداشت');
  assert.strictEqual(r.breadth.pos, 126);
  assert.strictEqual(r.breadth.neg, 793);
  assert.strictEqual(r.breadth.total, 919);
  assert.ok(Math.abs(r.breadth.posPct - 13.71) < 0.05, 'posPct=' + r.breadth.posPct);
  assert.strictEqual(r.breadth.queueBuy, 64);
  assert.strictEqual(r.breadth.queueSell, 509);
  assert.strictEqual(r.perCapita.buy, 51.8);
  assert.strictEqual(r.perCapita.sell, 135.6);
  assert.deepStrictEqual(r.missing, []);
});

t('parseBourseTrader: آشغال پذیرفته نمی‌شود', () => {
  assert.strictEqual(P.parseBourseTrader('').ok, false);
  assert.strictEqual(P.parseBourseTrader('<html>هیچ</html>').ok, false);
  assert.strictEqual(P.parseBourseTrader('<html><body>شاخص کل</body></html>').ok, false, 'بدون جدول');
});

t('parseBourseTrader: نسبتِ غیرممکنِ جریان رد می‌شود (عددِ غلط از عددِ نیست بهتر است)', () => {
  // خالصِ ۹ همت با ارزشِ معاملاتِ ۱ همت ناممکن است — ساختار عوض شده یا مقیاس غلط
  const bad = BT_HTML.replace("<td class='text-danger payeshKhord'>-1.8T</td>", "<td class='text-danger payeshKhord'>-9T</td>");
  const r = P.parseBourseTrader(bad);
  assert.strictEqual(r.flow, null, 'جریان باید رد شود');
  assert.ok(r.missing.indexOf('جریانِ خرد نامعقول') >= 0, JSON.stringify(r.missing));
  // اما بقیه‌ی بخش‌ها که سالم‌اند حذف نمی‌شوند
  assert.strictEqual(r.index.p, 7298500);
  assert.strictEqual(r.breadth.pos, 126);
});

t('parseBourseTrader: شاخصِ خارج از بازه رد می‌شود، بقیه می‌ماند', () => {
  const bad = BT_HTML.replace('7,298,500', '12');
  const r = P.parseBourseTrader(bad);
  assert.strictEqual(r.index, null, 'شاخص ۱۲ واحدی آشغال است');
  assert.strictEqual(r.ok, true, 'بقیه‌ی بخش‌ها معتبرند');
  assert.strictEqual(r.equal.p, 1950840);
});

t('parseBourseTrader: صندوقی که خالصش از کلِ معاملاتش بیشتر باشد رد می‌شود', () => {
  const bad = BT_HTML.replace("<td class='text-danger'>-745.6B</td>", "<td class='text-danger'>-99T</td>");
  const r = P.parseBourseTrader(bad);
  assert.strictEqual(r.funds.fixed, null, 'نگهبانِ صندوق');
  assert.strictEqual(r.funds.equity.netToman, -425e9, 'صندوقِ سهامی سالم است');
});

t('tseSessionOpen: فقط شنبه تا چهارشنبه در ساعتِ بازار', () => {
  // ۲۰۲۶-۰۹-۲۰ یکشنبه (۰۹:۰۰ و ۱۲:۰۰ تهران) و ۲۰۲۶-۰۹-۲۵ جمعه
  const tehran = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h - 3, mi - 30);
  assert.strictEqual(P.tseSessionOpen(tehran(2026, 9, 20, 9, 0)), true, 'یکشنبه ۹ صبح');
  assert.strictEqual(P.tseSessionOpen(tehran(2026, 9, 20, 12, 0)), true, 'یکشنبه ظهر');
  assert.strictEqual(P.tseSessionOpen(tehran(2026, 9, 19, 10, 0)), true, 'شنبه');
  assert.strictEqual(P.tseSessionOpen(tehran(2026, 9, 23, 10, 0)), true, 'سه‌شنبه');
  assert.strictEqual(P.tseSessionOpen(tehran(2026, 9, 24, 10, 0)), false, 'پنجشنبه تعطیل');
  assert.strictEqual(P.tseSessionOpen(tehran(2026, 9, 25, 10, 0)), false, 'جمعه تعطیل');
  assert.strictEqual(P.tseSessionOpen(tehran(2026, 9, 20, 17, 0)), false, 'بعد از بسته‌شدن');
  assert.strictEqual(P.tseSessionOpen(tehran(2026, 9, 20, 6, 0)), false, 'قبل از بازگشایی');
});

const MK_SESSION = { index: { p: 7448839, high: 7619210, low: 7448839, ts: Date.now() - 3600000, day: '2026-09-19', src: 'TGJU' }, day: '2026-09-19', src: 'TGJU' };

(async () => {

  /* ---- ۳الف) جلسه‌ی بورس ---- */
  await ta('tseSession: شنبه تا چهارشنبه باز، پنجشنبه/جمعه بسته', async () => {
    const { GS, d, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(50);
    const U = GS.utils;
    const S = GS.config.TSE_SESSION;
    assert.ok(S, 'TSE_SESSION باید در تنظیمات باشد');
    // ۰=شنبه … ۴=چهارشنبه باز؛ ۵=پنجشنبه و ۶=جمعه تعطیل
    assert.deepStrictEqual(Object.keys(S.days).sort(), ['0', '1', '2', '3', '4']);
    assert.strictEqual(S.days[5], undefined, 'پنجشنبه نباید جلسه داشته باشد');
    assert.strictEqual(S.days[6], undefined, 'جمعه نباید جلسه داشته باشد');
    // تابع با ساعتِ واقعیِ تهران کار می‌کند (اینجا فقط ساختار را می‌سنجیم)
    const s = U.tseSession();
    assert.ok(s && typeof s.open === 'boolean' && s.label, JSON.stringify(s));
    W.close();
    GS.data.clearCache();
  });

  /* ---- ۳ب) شاخص و کارت ---- */
  await ta('market(): شاخص می‌رسد و کارت «جریان در دسترس نیست» را نشان می‌دهد', async () => {
    const { GS, d, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const mk = GS.data.market();
    assert.ok(mk && mk.p === 7448839, 'شاخص باید از انتشار خوانده شود: ' + JSON.stringify(mk));
    assert.strictEqual(mk.src, 'TGJU');
    assert.strictEqual(mk.flow, null, 'بدون منبع، جریان باید نباشد (نه صفرِ ساختگی)');
    assert.strictEqual(mk.chgPct, null, 'بدون تاریخچه، تغییر ساخته نشود');
    const cards = d.querySelectorAll('#macroStrip .mc');
    assert.strictEqual(cards.length, 5, 'چهار کارت + کارتِ بورس');
    const txt = cards[4].textContent;
    assert.ok(txt.indexOf('شاخص کل بورس') >= 0, txt);
    assert.ok(txt.indexOf('در دسترس نیست') >= 0, 'باید شفاف بگوید جریانِ پول ندارد: ' + txt);
    assert.ok(GS.data.src.tse && GS.data.src.tse.ok === true, 'منبعِ شاخص باید «سالم» علامت بخورد');
    assert.strictEqual(GS.data.src.tsetmc.ok, null, 'جریانِ پول باید «در دسترس نیست» بماند، نه «سالم»');
    W.close();
    GS.data.clearCache();
  });

  /* ---- ۳ج) تغییرِ شاخص از تاریخچه ---- */
  await ta('market(): تغییرِ جلسه از سریِ تاریخچه حساب می‌شود', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(50);
    GS.data._setHistory({
      version: 1, generated_at: new Date().toISOString(), recent: {},
      daily: { TSE: [['2026-09-17', 7500000, 7500000, 7500000], ['2026-09-19', 7448839, 7619210, 7448839]] },
    });
    const mk = GS.data.market();
    const pct = (7448839 / 7500000 - 1) * 100;
    assert.ok(Math.abs(mk.chgPct - pct) < 0.001, 'chgPct=' + mk.chgPct + ' انتظار ' + pct);
    assert.strictEqual(mk.prevDay, '2026-09-17');
    W.close();
    GS.data.clearCache();
  });

  /* ---- ۳د) عاملِ نهم: بدونِ جریان، فقط زمینه و بدون امتیاز ---- */
  await ta('حکم: بدون جریانِ پول، بورس فقط «زمینه» است و امتیاز نمی‌گیرد', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(400);
    const v = GS.features.verdict();
    const before = v.score;
    const withIdx = v.reasons.filter((r) => r.indexOf('شاخص کلِ بورس') >= 0);
    assert.strictEqual(withIdx.length, 1, 'یک سطرِ زمینه: ' + JSON.stringify(v.reasons));
    assert.ok(withIdx[0].indexOf('در دسترس نیست') >= 0, withIdx[0]);
    // تأثیر نداشتن = امتیازِ پیش و پس یکی است
    const v2 = GS.features.verdict();
    assert.strictEqual(v2.score, before);
    W.close();
    GS.data.clearCache();
  });

  /* ---- ۳ه) عاملِ نهم: خروجِ سنگینِ پول → ۱+ (نسل ۹: رادار ۶ بعدی) ---- */
  await ta('حکم: خروجِ سنگینِ پولِ حقیقی ۱+ می‌گیرد و بالای فهرست می‌آید', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(400);
    const base = GS.features.verdict().score;
    GS.data.setMarketFlow({ netToman: -3.2e12, ratio: -0.12, n: 612, src: 'TSETMC' });
    const v = GS.features.verdict();
    assert.ok(v.score >= base + 0.9 && v.score <= base + 1.5, 'امتیاز باید ~۱ بالا برود: ' + base + ' -> ' + v.score);
    assert.ok(v.reasons[0].indexOf('خروج') >= 0, 'دلیلِ امتیازدار باید اول باشد: ' + v.reasons[0]);
    assert.ok(v.reasons[0].indexOf('بورس') >= 0 || v.reasons[0].indexOf('تأییدکننده') >= 0, 'لحن باید بورسی باشد: ' + v.reasons[0]);
    W.close();
    GS.data.clearCache();
  });

  await ta('حکم: ورودِ سنگینِ پول ۱− می‌گیرد', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(400);
    const base = GS.features.verdict().score;
    GS.data.setMarketFlow({ netToman: +2.5e12, ratio: 0.11, n: 600, src: 'TSETMC' });
    const v = GS.features.verdict();
    assert.ok(v.score <= base - 0.7 && v.score >= base - 1.5, base + ' -> ' + v.score + ' (باید ~۱ کم شود)');
    assert.ok(v.reasons[0].indexOf('ورود') >= 0 || v.reasons[0].indexOf('بورس') >= 0, v.reasons[0]);
    W.close();
    GS.data.clearCache();
  });

  await ta('حکم: جریانِ خفیفِ ناهم‌جهت با شاخص امتیاز نمی‌گیرد', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(50);
    // شاخص منفی است (از تاریخچه)، پس خروجِ خفیف هم‌جهت است → امتیاز می‌گیرد؛
    // ورودِ خفیف ناهم‌جهت → فقط زمینه
    GS.data._setHistory({
      version: 1, generated_at: new Date().toISOString(), recent: {},
      daily: { TSE: [['2026-09-17', 7500000, 7500000, 7500000], ['2026-09-19', 7448839, 7619210, 7448839]] },
    });
    const base = GS.features.verdict().score;
    GS.data.setMarketFlow({ netToman: +0.4e12, ratio: 0.05, n: 600, src: 'TSETMC' });
    const v = GS.features.verdict();
    assert.strictEqual(v.score, base, 'جریانِ خفیفِ ناهم‌جهت نباید امتیاز بگیرد: ' + base + ' -> ' + v.score);
    W.close();
    GS.data.clearCache();
  });

  await ta('حکم: پاک کردنِ جریان، امتیاز را برمی‌گرداند', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(400);
    const base = GS.features.verdict().score;
    GS.data.setMarketFlow({ netToman: -3.2e12, ratio: -0.12, src: 'TSETMC' });
    assert.strictEqual(GS.features.verdict().score, base + 1);
    GS.data.setMarketFlow(null);
    assert.strictEqual(GS.features.verdict().score, base, 'بدون جریان، امتیازِ پایه برگردد');
    W.close();
    GS.data.clearCache();
  });

  /* ---- ۳و) هفتگی ---- */
  await ta('weekly(): شاخصِ بورس هم در «این هفته» می‌آید', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(50);
    const day = (k) => new Date(Date.now() - k * 86400000).toISOString().slice(0, 10);
    GS.data._setHistory({
      version: 1, generated_at: new Date().toISOString(), recent: {},
      daily: { TSE: [[day(6), 7100000, 7100000, 7100000], [day(1), 7448839, 7619210, 7448839]] },
    });
    const wk = GS.data.weekly();
    assert.ok(wk, 'weekly باید وجود داشته باشد');
    const row = wk.rows.filter((r) => r.sym === 'TSE')[0];
    assert.ok(row, 'ردیفِ شاخص باید باشد: ' + JSON.stringify(wk.rows.map((r) => r.sym)));
    assert.ok(row.pct > 4 && row.pct < 6, 'pct=' + row.pct);
    W.close();
    GS.data.clearCache();
  });

  /* ---- ۳ز) سلامت داده ---- */
  await ta('سلامت داده: دو ردیفِ بورسی با وضعیتِ درست', async () => {
    const { GS, d, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    GS.features.renderHealth();
    const rows = d.querySelectorAll('#healthTable .h-row');
    assert.strictEqual(rows.length, 17, '۱۵ منبع + بورس‌تریدر + تابلوخوانی');
    const txt = Array.prototype.map.call(rows, (r) => r.textContent).join(' | ');
    assert.ok(txt.indexOf('شاخص بورس') >= 0, txt.slice(0, 200));
    assert.ok(txt.indexOf('جریان پول بورس') >= 0);
    assert.ok(txt.indexOf('بورس‌تریدر') >= 0, 'ردیفِ منبعِ مکمل باید باشد');
    assert.ok(txt.indexOf('تابلوخوانی') >= 0, 'ردیفِ تابلوخوانی باید باشد');
    W.close();
    GS.data.clearCache();
  });

  /* ============================================================
     ۴) مسیرِ کلیددار (BrsApi): تجمیع، نگهبانِ مقیاس، و اثر در حکم
     ============================================================ */

  // شکلِ فرضی بر پایه‌ی قراردادِ TSETMC (I = حقیقی، N = حقوقی؛ واحد ریال)
  function brsPayload() {
    const row = (name, pl, tvol, tval, bi, si) => ({
      l18: name, pl, pc: pl, tvol, tval,
      Buy_I_Volume: bi, Sell_I_Volume: si,
      Buy_N_Volume: tvol - bi, Sell_N_Volume: tvol - si,
    });
    return {
      data: [
        row('فملی', 45200, 10000000, 452000000000, 6000000, 8000000),
        row('وبملت', 31000, 20000000, 620000000000, 9000000, 11000000),
      ],
    };
  }

  await ta('aggregateFlow: خالصِ پولِ حقیقی از حجم و میانگینِ قیمت (ریال→تومان)', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(50);
    const cfg = GS.config.BRSAPI;
    assert.strictEqual(cfg.unit, 'rial', 'قراردادِ واحد باید صریح باشد');
    const a = GS.data.aggregateFlow(brsPayload().data, cfg);
    assert.ok(a, 'باید تجمیع شود');
    // نماد ۱: (6M-8M) × 4520 تومان = 9.04- میلیارد تومان
    // نماد ۲: (9M-11M) × 3100 تومان = 6.20- میلیارد تومان
    assert.strictEqual(a.netToman, Math.round(-2e6 * 4520 + -2e6 * 3100), 'net=' + a.netToman);
    assert.strictEqual(a.valueToman, Math.round(45.2e9 + 62e9), 'value=' + a.valueToman);
    assert.ok(Math.abs(a.ratio - (-15.24e9 / 107.2e9)) < 1e-9, 'ratio=' + a.ratio);
    assert.strictEqual(a.n, 2);
    W.close(); GS.data.clearCache();
  });

  await ta('aggregateFlow: ساختارِ ناشناخته عدد نمی‌سازد', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(50);
    const cfg = GS.config.BRSAPI;
    assert.strictEqual(GS.data.aggregateFlow([{ foo: 1 }, { bar: 2 }], cfg), null);
    assert.strictEqual(GS.data.aggregateFlow([], cfg), null);
    assert.strictEqual(GS.data.aggregateFlow(null, cfg), null);
    W.close(); GS.data.clearCache();
  });

  await ta('مسیرِ کلیددار end-to-end: جریان می‌رسد و حکم ۱+ می‌گیرد (کلید مستقیم، بی‌واسطه)', async () => {
    const seen = [];
    const { GS, window: W } = boot((u) => {
      const url = String(u);
      seen.push(url);
      if (url.includes('live.json')) return jres(liveDoc(MK_SESSION));
      if (url.includes('snapshot.json')) return jres({ generated_at: '', quotes: {} });
      if (url.includes('BrsApi.ir')) return jres(brsPayload());
      return jrej();
    });
    await GS.data.bootAll(); await wait(300);
    const base = GS.features.verdict().score;
    GS.data.setBrsKey('TEST-KEY-123');
    const agg = await GS.data.fetchBrsFlow(true);
    assert.ok(agg && agg.n === 2, 'تجمیع برنگشت: ' + JSON.stringify(agg));
    // حریم خصوصی: کلید باید مستقیماً رفته باشد، نه از پراکسی عمومی
    const withKey = seen.filter((u) => u.indexOf('TEST-KEY-123') >= 0);
    assert.ok(withKey.length >= 1, 'کلید باید در URL باشد');
    assert.ok(!withKey.some((u) => u.indexOf('allorigins') >= 0 || u.indexOf('isomorphic-git') >= 0),
      'کلید هرگز نباید از پراکسی عبور کند: ' + withKey.join(' '));
    const v = GS.features.verdict();
    assert.strictEqual(v.score, base + 1, base + ' -> ' + v.score);
    assert.ok(v.reasons[0].indexOf('خروج') >= 0, v.reasons[0]);
    assert.strictEqual(GS.data.src.tsetmc.ok, true, JSON.stringify(GS.data.src.tsetmc));
    W.close(); GS.data.clearCache();
  });

  await ta('نگهبانِ مقیاس: ارزشِ معاملاتِ غیرمعقول رد می‌شود و واردِ حکم نمی‌گردد', async () => {
    // پاسخی که ساختارش درست است اما مقیاسش غلط (اشتباهِ واحدِ ریال/تومان)
    const tiny = { data: [{ l18: 'x', pl: 10, tvol: 100, tval: 1000, Buy_I_Volume: 60, Sell_I_Volume: 40 }] };
    const { GS, window: W } = boot((u) => {
      const url = String(u);
      if (url.includes('live.json')) return jres(liveDoc(MK_SESSION));
      if (url.includes('snapshot.json')) return jres({ generated_at: '', quotes: {} });
      if (url.includes('BrsApi.ir')) return jres(tiny);
      return jrej();
    });
    await GS.data.bootAll(); await wait(300);
    const base = GS.features.verdict().score;
    GS.data.setBrsKey('K');
    const r = await GS.data.fetchBrsFlow(true);
    assert.strictEqual(r, null, 'باید رد شود: ' + JSON.stringify(r));
    assert.strictEqual(GS.features.verdict().score, base, 'امتیاز نباید عوض شود');
    assert.strictEqual(GS.data.src.tsetmc.ok, false, JSON.stringify(GS.data.src.tsetmc));
    assert.ok((GS.data.src.tsetmc.note || '').indexOf('مقیاس') >= 0, GS.data.src.tsetmc.note);
    assert.strictEqual(GS.data.market().flow, null, 'هیچ جریانی ثبت نشود');
    W.close(); GS.data.clearCache();
  });

  await ta('نگهبانِ ساختار: پاسخِ ناشناخته «کلیدهای واقعی» را گزارش می‌دهد', async () => {
    const weird = { data: [{ alpha: 1, beta: 2, gamma: 3 }] };
    const { GS, window: W } = boot((u) => {
      const url = String(u);
      if (url.includes('live.json')) return jres(liveDoc(MK_SESSION));
      if (url.includes('snapshot.json')) return jres({ generated_at: '', quotes: {} });
      if (url.includes('BrsApi.ir')) return jres(weird);
      return jrej();
    });
    await GS.data.bootAll(); await wait(300);
    GS.data.setBrsKey('K');
    const r = await GS.data.fetchBrsFlow(true);
    assert.strictEqual(r, null);
    assert.strictEqual(GS.data.src.tsetmc.ok, false);
    assert.ok((GS.data.src.tsetmc.note || '').indexOf('alpha') >= 0,
      'باید کلیدهای واقعی را بگوید تا بتوان نقشه‌ی فیلدها را اصلاح کرد: ' + GS.data.src.tsetmc.note);
    W.close(); GS.data.clearCache();
  });

  await ta('بدون کلید: مسیرِ کلیددار خاموش و صادق است', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(50);
    GS.data.clearBrsKey();
    const r = await GS.data.fetchBrsFlow(true);
    assert.strictEqual(r, null);
    assert.strictEqual(GS.data.src.tsetmc.ok, null, 'نباید «سالم» نشان داده شود');
    assert.ok((GS.data.src.tsetmc.note || '').indexOf('نیاز به کلید') >= 0, GS.data.src.tsetmc.note);
    W.close(); GS.data.clearCache();
  });

  await ta('جریانِ تازه‌تر برنده است (کلیدِ شخصی vs انتشارِ سرور)', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    // جریانِ قدیمی از «انتشارِ سرور»
    const withFlow = liveDoc(MK_SESSION);
    withFlow.market = Object.assign({}, MK_SESSION, { flow: { netToman: -1e12, ratio: -0.05, src: 'BrsApi', ts: Date.now() - 3600e3 } });
    GS.data._ingest('live', { quotes: withFlow.quotes, market: withFlow.market, at: Date.now() });
    assert.ok(GS.data.market().flow, 'جریانِ سرور باید بیاید');
    // جریانِ تازه‌تر از کلیدِ شخصی
    GS.data.setMarketFlow({ netToman: -5e12, ratio: -0.15, src: 'BrsApi', ts: Date.now() });
    const mk = GS.data.market();
    assert.strictEqual(mk.flow.netToman, -5e12, 'تازه‌تر باید برنده شود: ' + JSON.stringify(mk.flow));
    // انتشارِ قدیمی‌تر بعدی نباید آن را عوض کند
    GS.data._ingest('live', { quotes: withFlow.quotes, market: withFlow.market, at: Date.now() });
    assert.strictEqual(GS.data.market().flow.netToman, -5e12, 'انتشارِ قدیمی نباید جریانِ تازه را بپوشاند');
    W.close(); GS.data.clearCache();
  });

  /* ---- ۳ط) مکملِ بورس‌تریدر روی کلاینت ---- */
  const MK_BT = Object.assign({}, MK_SESSION, {
    flow: { netToman: -1.8e12, ratio: -0.2337, src: 'BourseTrader', ts: Date.now() - 600000 },
    bt: {
      ts: Date.now() - 600000, src: 'BourseTrader', fresh: true,
      index: { p: 7298500, chgPct: -2.0183 },
      equal: { p: 1950840, chgPct: -1.8083 },
      fara: { p: 56577, chgPct: -1.7196 },
      cap: 25489e12,
      trade: { valueToman: 7.7e12, volume: 13.1e9 },
      funds: { equity: { netToman: -425e9, valueToman: 1e12 }, fixed: { netToman: -745.6e9, valueToman: 3.1e12 }, commodity: { netToman: 0, valueToman: null }, option: { netToman: -654600, valueToman: 213.6e9 } },
      breadth: { pos: 126, neg: 793, total: 919, posPct: 13.71, queueBuy: 64, queueSell: 509 },
      perCapita: { buy: 51.8, sell: 135.6 }
    }
  });

  await ta('مکملِ بورس‌تریدر: کارت‌های هم‌وزن/فرابورس/صندوق‌ها/پهنا رندر می‌شوند', async () => {
    const { GS, d, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_BT)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const mk = GS.data.market();
    assert.ok(mk.bt, 'مکمل باید به مدل راه یافته باشد');
    assert.strictEqual(mk.bt.equal.p, 1950840);
    assert.strictEqual(mk.bt.funds.fixed.netToman, -745.6e9);
    GS.ui.renderMacro();
    const cards = d.querySelectorAll('#bourseStrip .mc');
    assert.ok(cards.length >= 6, 'حداقل ۶ کارتِ مکمل: ' + cards.length);
    const txt = Array.prototype.map.call(cards, (c) => c.textContent).join(' | ');
    assert.ok(txt.indexOf('شاخص هم‌وزن') >= 0, txt);
    assert.ok(txt.indexOf('شاخص کل فرابورس') >= 0, txt);
    assert.ok(txt.indexOf('صندوق‌های درآمد ثابت') >= 0, txt);
    assert.ok(txt.indexOf('خروج') >= 0, txt);
    assert.ok(txt.indexOf('پهنای بازار') >= 0, txt);
    assert.ok(txt.indexOf('ارزشِ معاملاتِ خرد') >= 0, txt);
    assert.strictEqual(d.querySelector('#bourseStrip').style.display, '', 'ردیف باید دیده شود');
    W.close(); GS.data.clearCache();
  });

  await ta('مکملِ بورس‌تریدر: اگر نیامده باشد هیچ کارتی ساخته نمی‌شود', async () => {
    const { GS, d, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    assert.strictEqual(GS.data.market().bt, null);
    GS.ui.renderMacro();
    assert.strictEqual(d.querySelectorAll('#bourseStrip .mc').length, 0, 'کارتِ خالی ممنوع');
    assert.strictEqual(d.querySelector('#bourseStrip').style.display, 'none', 'ردیف باید پنهان بماند');
    W.close(); GS.data.clearCache();
  });

  await ta('مکملِ بورس‌تریدر: مکملِ نامعتبر (مقیاسِ غلط) دور ریخته می‌شود', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const bad = liveDoc(Object.assign({}, MK_SESSION, { bt: { ts: Date.now(), src: 'BourseTrader', index: { p: 12 }, equal: { p: -5 }, funds: { fixed: { netToman: 9e30 } }, breadth: { pos: -3, neg: -4 } } }));
    GS.data._ingest('live', { quotes: bad.quotes, market: bad.market, at: Date.now() });
    assert.strictEqual(GS.data.market().bt, null, 'هیچ بخشِ معتبری نمانده بود');
    W.close(); GS.data.clearCache();
  });


  /* ============================================================
     ۵) روندِ پول — عمیق‌تر شدنِ «ورود و خروجِ پول»
     ============================================================ */

  /* تاریخچه‌ی مصنوعی برای زمینه‌ی «این هفته» (بدون وابستگی به فایلِ واقعیِ مخزن) */
  const HIST_DOC = (() => {
    const now = Date.now(), OFF = 3.5 * 3600e3, daily = {};
    const base = { USD: 230000, G18: 23800000, EMAMI: 237000000 };
    const step = { USD: 100, G18: 10000, EMAMI: 500000 };
    Object.keys(base).forEach((s) => {
      const arr = [];
      for (let i = 13; i >= 0; i--) {
        const t = now - i * 86400e3;
        const day = new Date(t + OFF).toISOString().slice(0, 10);
        const p = base[s] - i * step[s];
        arr.push([day, p, Math.round(p * 1.01), Math.round(p * 0.99)]);
      }
      daily[s] = arr;
    });
    return { version: 1, generated_at: new Date().toISOString(), recent: {}, daily: daily };
  })();

  /* ---- ۵الف) ارزشِ صف‌ها (پولِ پشتِ صف) با نگهبان ---- */
  await ta('پولِ پشتِ صف: پذیرش و نگهبانِ سهمِ ناممکن', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const okDoc = liveDoc(Object.assign({}, MK_SESSION, { bt: { ts: Date.now(), src: 'BourseTrader', queue: { buyToman: 5.5e12, sellToman: 21.7e12, netToman: -16.2e12, buyShare: 5.5 / 27.2 } } }));
    GS.data._ingest('live', { quotes: okDoc.quotes, market: okDoc.market, at: Date.now() });
    let mk = GS.data.market();
    assert.ok(mk.bt && mk.bt.queue, 'بخشِ صف‌ها باید به مدل راه یابد');
    assert.strictEqual(mk.bt.queue.buyToman, 5.5e12);
    assert.strictEqual(mk.bt.queue.netToman, -16.2e12);
    assert.ok(Math.abs(mk.bt.queue.buyShare - 5.5 / 27.2) < 1e-9);

    // سهمِ ناممکن (بزرگ‌تر از ۱) باید دور ریخته و دوباره حساب شود
    const badDoc = liveDoc(Object.assign({}, MK_SESSION, { bt: { ts: Date.now(), src: 'BourseTrader', queue: { buyToman: 1e12, sellToman: 2e12, netToman: -1e12, buyShare: 4.5 } } }));
    GS.data._ingest('live', { quotes: badDoc.quotes, market: badDoc.market, at: Date.now() });
    mk = GS.data.market();
    assert.ok(mk.bt.queue, 'صف‌ها هنوز معتبرند');
    assert.ok(Math.abs(mk.bt.queue.buyShare - 1 / 3) < 1e-9, 'سهمِ ناممکن باید اصلاح شود: ' + mk.bt.queue.buyShare);

    // ارزشِ غیرمعقول فقط همان مقدار را حذف می‌کند، نه کلِ بخش را
    // (فلسفه‌ی پروژه: یک بخشِ خراب بقیه را حذف نمی‌کند)
    const junk = liveDoc(Object.assign({}, MK_SESSION, { bt: { ts: Date.now(), src: 'BourseTrader', queue: { buyToman: 9e30, sellToman: 2e12 } } }));
    GS.data._ingest('live', { quotes: junk.quotes, market: junk.market, at: Date.now() });
    const jm = GS.data.market();
    assert.ok(jm.bt && jm.bt.queue, 'بخشِ سالم باید بماند');
    assert.strictEqual(jm.bt.queue.buyToman, null, 'مقدارِ نامعقول باید حذف شود');
    assert.strictEqual(jm.bt.queue.sellToman, 2e12, 'مقدارِ سالم باید بماند');
    W.close(); GS.data.clearCache();
  });

  /* ---- ۵ب) سریِ درون‌جلسه‌ای → روند و شیب ---- */
  await ta('روندِ پول: شیبِ جلسه، شتاب و برگشت درست حساب می‌شوند', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const now = Date.now();
    const OFF = 3.5 * 3600e3;
    // نقاط را داخلِ روزِ جاریِ تهران می‌سازیم تا تست در نیمه‌شبِ تهران هم سبز بماند
    const dayStart = Math.floor((now + OFF) / 86400e3) * 86400e3 - OFF;
    const el = Math.max(now - dayStart, 60000);
    const t1 = dayStart + Math.round(el * 0.1), t2 = dayStart + Math.round(el * 0.5), t3 = dayStart + Math.round(el * 0.9);
    const doc = liveDoc(Object.assign({}, MK_SESSION, {
      flow: { netToman: -3e12, ratio: -0.2, src: 'BourseTrader', ts: t3, day: new Date(t3 + OFF).toISOString().slice(0, 10), fresh: true },
      flowSeries: [[t1, 1e12], [t2, -1e12], [t3, -3e12]]
    }));
    GS.data._ingest('live', { quotes: doc.quotes, market: doc.market, at: Date.now() });
    const mk = GS.data.market();
    assert.ok(mk.flowSeries && mk.flowSeries.length === 3, 'سری باید منتقل شود: ' + JSON.stringify(mk.flowSeries));
    assert.ok(mk.flowTrend, 'روند باید حساب شود');
    assert.strictEqual(mk.flowTrend.points, 3);
    assert.strictEqual(mk.flowTrend.from, 1e12);
    assert.strictEqual(mk.flowTrend.to, -3e12);
    assert.ok(mk.flowTrend.perHour < 0, 'شیب باید منفی باشد: ' + mk.flowTrend.perHour);
    assert.strictEqual(mk.flowTrend.accelerating, true, 'خروج و شیبِ منفی = شتاب‌دار');
    assert.strictEqual(mk.flowTrend.reversing, true, 'از ورود به خروج برگشته');
    // یک نقطه روند نمی‌سازد
    const one = liveDoc(Object.assign({}, MK_SESSION, { flowSeries: [[t3, -3e12]] }));
    GS.data._ingest('live', { quotes: one.quotes, market: one.market, at: Date.now() });
    assert.strictEqual(GS.data.market().flowSeries, null, 'با یک نقطه روندی وجود ندارد');
    W.close(); GS.data.clearCache();
  });

  /* ---- ۵ج) نمودارهایِ روند ---- */
  await ta('نمودارهای روندِ پول: رندر می‌شوند و با نبودِ داده پیام می‌دهند', async () => {
    const { GS, d, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_BT)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const C = GS.charts;
    assert.ok(C.moneyFlowChart && C.queueMoneyChart && C.flowSessionsChart, 'توابع باید صادر شده باشند');
    // بدون داده: پیام، نه نمودارِ خالی
    assert.ok(C.moneyFlowChart(null).indexOf('lc-empty') >= 0);
    assert.ok(C.moneyFlowChart([[1, 1]]).indexOf('lc-empty') >= 0, 'یک نقطه کافی نیست');
    assert.ok(C.queueMoneyChart(null).indexOf('lc-empty') >= 0);
    assert.ok(C.flowSessionsChart(null).indexOf('lc-empty') >= 0);
    // با داده: نمودار
    const now = Date.now();
    const svg = C.moneyFlowChart([[now - 3600e3, 1e12], [now - 1800e3, -1e12], [now, -3e12]]);
    assert.ok(svg.indexOf('<svg') >= 0 && svg.indexOf('همت') >= 0, svg.slice(0, 120));
    const qm = C.queueMoneyChart({ buyToman: 5.5e12, sellToman: 21.7e12, netToman: -16.2e12, buyShare: 0.2, buy: 64, sell: 509 });
    assert.ok(qm.indexOf('صف خرید') >= 0 && qm.indexOf('صف فروش') >= 0, qm.slice(0, 200));
    assert.ok(qm.indexOf('همت') >= 0 && qm.indexOf('خالصِ پولِ پشتِ صف') >= 0, qm.slice(0, 300));
    const fs = C.flowSessionsChart({ rows: [{ day: '2026-09-20', netToman: -2e12 }, { day: '2026-09-21', netToman: -3e12 }], n: 2, sum: -5e12, pos: 0, neg: 2, streak: 'out' });
    assert.ok(fs.indexOf('خروجِ پیاپی') >= 0, fs.slice(0, 200));
    W.close(); GS.data.clearCache();
  });

  /* ---- ۵د) تابلوخوانی: پارسرِ سمتِ کلاینت (منبعِ فقط‌داخل‌ایران) ---- */
  const TK_HTML = fs.readFileSync(path.join(__dirname, 'fixtures', 'tablokhani.html'), 'utf8');

  await ta('تابلوخوانی: شاخص‌ها و ارزشِ صف‌ها با واحدِ «میلیارد تومان»', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const r = GS.data.parseTablokhani(TK_HTML);
    assert.strictEqual(r.ok, true, JSON.stringify(r).slice(0, 300));
    assert.ok(r.index && Math.round(r.index.p) === 7280430, 'شاخص کل: ' + JSON.stringify(r.index));
    assert.ok(r.index.chgPct < 0, '▼ باید منفی خوانده شود: ' + r.index.chgPct);
    assert.ok(r.fara && r.fara.chgPct > 0, '▲ باید مثبت خوانده شود: ' + JSON.stringify(r.fara));
    // واحد از عنوانِ خودِ صفحه: میلیارد تومان
    assert.strictEqual(r.queue.buyToman, 48964.1e9);
    assert.strictEqual(r.queue.sellToman, 20387.6e9);
    assert.strictEqual(r.queue.buy, 221);
    assert.strictEqual(r.queue.sell, 180);
    assert.ok(r.symbols && r.symbols.length >= 2, 'نمادها برای پیوندِ عمیق: ' + JSON.stringify(r.symbols));
    assert.ok(r.symbols.indexOf('ذوب') >= 0, JSON.stringify(r.symbols));
    assert.ok(r.symbols.indexOf('آتیه ملت') >= 0, JSON.stringify(r.symbols));
    assert.ok(r.symbols.length <= 8, 'سقفِ تعدادِ نمادها: ' + r.symbols.length);
    W.close(); GS.data.clearCache();
  });

  await ta('تابلوخوانی: پاسخِ بی‌ربط و اعدادِ نامعقول رد می‌شوند', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    assert.strictEqual(GS.data.parseTablokhani('').ok, false, 'خالی');
    assert.strictEqual(GS.data.parseTablokhani('<html><body>hi</body></html>').ok, false, 'کوتاه');
    assert.strictEqual(GS.data.parseTablokhani('<html><body>' + 'x'.repeat(9000) + '</body></html>').ok, false, 'بی‌ربط');
    // شاخصِ خارج از بازه (مثلاً ۱۲ واحد) رد می‌شود
    const junk = TK_HTML.replace('۷,۲۸۰,۴۲۹.۵۵', '۱۲');
    const r = GS.data.parseTablokhani(junk);
    assert.ok(!r.index, 'شاخصِ نامعقول باید رد شود: ' + JSON.stringify(r.index));
    assert.strictEqual(r.ok, true, 'بقیه‌ی بخش‌ها باید سالم بمانند');
    W.close(); GS.data.clearCache();
  });

  /* ---- ۵ه) رگرسیون: «این هفته» قربانیِ عاملِ بورس نمی‌شود ---- */
  await ta('حکم: زمینه‌ی «این هفته» با آمدنِ رادارِ بورس حذف نمی‌شود', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_BT)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : String(u).includes('history.json') ? jres(HIST_DOC) : jrej());
    await GS.data.bootAll(); await wait(300);
    await GS.data.fetchHistory(); await wait(100);
    const v = GS.features.verdict();
    assert.ok(v.weekly, 'زمینه‌ی هفتگی باید وصل باشد');
    const weeklyLine = v.reasons.filter((x) => /^(این هفته|در .+روز گذشته)/.test(x))[0];
    assert.ok(weeklyLine, 'سطرِ این هفته باید همیشه باشد: ' + v.reasons.join(' | '));
    // و سطرِ بورس هم (وقتی امتیاز آورده) هست
    const bourseLine = v.reasons.filter((x) => x.indexOf('بورس:') === 0)[0];
    assert.ok(bourseLine || v.reasons.some((x) => x.indexOf('شاخص کلِ بورس') >= 0), 'زمینه یا امتیازِ بورس باید باشد: ' + v.reasons.join(' | '));
    W.close(); GS.data.clearCache();
  });

  /* ---- ۵و) پنلِ «روندِ پول» در صفحه‌ی بورس رندر می‌شود ---- */
  await ta('پنلِ روندِ پول: سه نمودار + پیوندهایِ تابلوخوانی در صفحه می‌آیند', async () => {
    const { GS, d, window: W, errors } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const now = Date.now(), OFF = 3.5 * 3600e3;
    const dayStart = Math.floor((now + OFF) / 86400e3) * 86400e3 - OFF;
    // زمانِ سندِ تزریقی باید از سندِ پیش‌فرض (now − ۱ ساعت) تازه‌تر باشد؛ وگرنه
    // نگهبانِ «انتشارِ قدیمی‌تر» آن را رد می‌کند. ساختنِ نقاط از ابتدایِ روزِ تهران
    // باعث می‌شد این تست فقط بعد از حدود ۲۰:۰۰ تهران بشکند — ساعتِ اجرا نباید
    // روی نتیجه اثر بگذارد؛ پس آخرین نقطه «همین الان» و بقیه عقب‌تر از آن‌اند.
    const span = Math.min(Math.max(now - dayStart, 3600e3), 6 * 3600e3);
    const t3 = now, t2 = t3 - Math.round(span * 0.5), t1 = t3 - Math.round(span * 0.95);
    const day = new Date(t3 + OFF).toISOString().slice(0, 10);
    const btWithQueue = Object.assign({}, MK_BT.bt, { queue: { buyToman: 5.1e12, sellToman: 2.1e12, netToman: 3.0e12, buyShare: 0.708 } });
    const market = Object.assign({}, MK_BT, {
      bt: btWithQueue,
      index: { p: 7280289, high: 7345567, low: 7279864, ts: t3, day: day, src: 'TGJU' },
      day: day, asOf: t3,
      flow: { netToman: -3.2e12, ratio: -0.12, n: 900, src: 'BourseTrader', ts: t3, day: day, fresh: true },
      flowSeries: [[t1, 1e12], [t2, -1e12], [t3, -3.2e12]]
    });
    GS.data._ingest('live', { quotes: liveDoc(MK_BT).quotes, market: market, at: now });
    GS.data._setHistory({ version: 1, generated_at: new Date().toISOString(), recent: {}, daily: { TSEFLOW: [['2026-09-20', -2e12], ['2026-09-21', -3.2e12]] } });
    GS.ui.renderBoursePro();
    const sec = d.querySelector('#boursePro');
    assert.strictEqual(sec.hidden, false, 'بخش باید دیده شود');
    const trend = d.querySelector('#bourseMoneyTrend');
    assert.ok(trend && /همت/.test(trend.textContent), 'نمودارِ روند باید مبلغ نشان دهد: ' + (trend && trend.textContent));
    assert.ok(trend.querySelector('svg'), 'نمودارِ روند باید SVG داشته باشد');
    const qm = d.querySelector('#bourseQueueMoney');
    assert.ok(qm && qm.textContent.indexOf('صف خرید') >= 0 && qm.textContent.indexOf('خالص') >= 0, 'پولِ پشتِ صف: ' + (qm && qm.textContent));
    const fs = d.querySelector('#bourseFlowSessions');
    assert.ok(fs && fs.textContent.indexOf('خروجِ پیاپی') >= 0, 'چند جلسه‌ی اخیر: ' + (fs && fs.textContent));
    const links = d.querySelector('#bourseTkLinks');
    assert.ok(links && links.querySelectorAll('a.tk-link').length >= 3, 'پیوندهایِ تابلوخوانی');
    // پیوندها باید در تبِ جدید و بدون ارجاعِ مبدأ باز شوند
    const a0 = links.querySelector('a.tk-link');
    assert.strictEqual(a0.getAttribute('target'), '_blank');
    assert.ok((a0.getAttribute('rel') || '').indexOf('noopener') >= 0);
    assert.strictEqual(errors.length, 0, 'خطای پنجره: ' + errors.join(' | '));
    W.close(); GS.data.clearCache();
  });

  /* ---- ۵ز) منحنیِ درون‌جلسه‌ای (از نمودارِ خودِ منبع) ---- */
  await ta('منحنیِ درون‌جلسه‌ای: پذیرش، نگهبان و نمودار', async () => {
    const { GS, d, window: W, errors } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const mk0 = { ts: Date.now(), src: 'BourseTrader' };
    const good = liveDoc(Object.assign({}, MK_SESSION, { bt: Object.assign({}, mk0, { flowCurve: { v: [-107, -400, -900, -1400, -1800], raw: 210, unit: 'milliard_toman' }, queueCurve: { buy: [128, 160, 190, 210, 225], sell: [129, 140, 160, 170, 174] } }) }));
    GS.data._ingest('live', { quotes: good.quotes, market: good.market, at: Date.now() });
    let mk = GS.data.market();
    assert.ok(mk.bt.flowCurve, 'منحنی باید به مدل راه یابد');
    assert.strictEqual(mk.bt.flowCurve.n, 5);
    assert.strictEqual(mk.bt.flowCurve.last, -1800);
    assert.strictEqual(mk.bt.flowCurve.min, -1800);
    assert.strictEqual(mk.bt.flowCurve.max, -107);
    assert.ok(mk.bt.queueCurve && mk.bt.queueCurve.buy.length === 5, 'منحنیِ صف‌ها');

    // نمودار: منحنی به نقاطِ انتشار ترجیح دارد
    GS.ui.renderBoursePro();
    const host = d.querySelector('#bourseMoneyTrend');
    assert.ok(host.querySelector('svg'), 'نمودار باید رسم شود');
    assert.ok(host.textContent.indexOf('شروع جلسه') >= 0, 'برچسبِ شروع: ' + host.textContent);
    assert.ok(host.textContent.indexOf('همت') >= 0, 'مبلغ باید دیده شود: ' + host.textContent);

    // نگهبان: مقدارِ غیرممکن پذیرفته نمی‌شود — و داده‌ی معتبرِ قبلی هم پاک نمی‌شود
    // (فلسفه‌ی پروژه: یک بخشِ خراب، بخشِ سالمِ قبلی را حذف نمی‌کند)
    const bad = liveDoc(Object.assign({}, MK_SESSION, { bt: Object.assign({}, mk0, { flowCurve: { v: [1, 2, 9e9, 4, 5], raw: 5 } }) }));
    GS.data._ingest('live', { quotes: bad.quotes, market: bad.market, at: Date.now() });
    const afterBad = GS.data.market().bt;
    assert.ok(afterBad && afterBad.flowCurve, 'داده‌ی معتبرِ قبلی باید بماند');
    assert.strictEqual(afterBad.flowCurve.last, -1800, 'منحنیِ بد نباید جایگزین شود');

    // نگهبان: کمتر از ۵ نقطه منحنی نمی‌سازد
    const few = liveDoc(Object.assign({}, MK_SESSION, { bt: Object.assign({}, mk0, { flowCurve: { v: [1, 2, 3], raw: 3 } }) }));
    GS.data._ingest('live', { quotes: few.quotes, market: few.market, at: Date.now() });
    assert.strictEqual(GS.data.market().bt.flowCurve.last, -1800, 'سه نقطه کافی نیست و جایگزین نشده');
    assert.strictEqual(errors.length, 0, 'خطای پنجره: ' + errors.join(' | '));
    W.close(); GS.data.clearCache();
  });

  console.log('\nbourse.js: ' + n + ' tests, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
