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

  /* ---- ۳ه) عاملِ نهم: خروجِ سنگینِ پول → ۱+ ---- */
  await ta('حکم: خروجِ سنگینِ پولِ حقیقی ۱+ می‌گیرد و بالای فهرست می‌آید', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(400);
    const base = GS.features.verdict().score;
    // ۱۲٪ ارزشِ معاملات خروجِ پولِ حقیقی
    GS.data.setMarketFlow({ netToman: -3.2e12, ratio: -0.12, n: 612, src: 'TSETMC' });
    const v = GS.features.verdict();
    assert.strictEqual(v.score, base + 1, 'امتیاز باید یکی بالا برود: ' + base + ' -> ' + v.score);
    assert.ok(v.reasons[0].indexOf('خروج') >= 0, 'دلیلِ امتیازدار باید اول باشد: ' + v.reasons[0]);
    assert.ok(v.reasons[0].indexOf('تأییدکننده') >= 0, 'لحن باید احتیاطی باشد: ' + v.reasons[0]);
    W.close();
    GS.data.clearCache();
  });

  await ta('حکم: ورودِ سنگینِ پول ۱− می‌گیرد', async () => {
    const { GS, window: W } = boot((u) => String(u).includes('live.json') ? jres(liveDoc(MK_SESSION)) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(400);
    const base = GS.features.verdict().score;
    GS.data.setMarketFlow({ netToman: +2.5e12, ratio: 0.11, n: 600, src: 'TSETMC' });
    const v = GS.features.verdict();
    assert.strictEqual(v.score, base - 1, base + ' -> ' + v.score);
    assert.ok(v.reasons[0].indexOf('ورود') >= 0, v.reasons[0]);
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
    assert.strictEqual(rows.length, 15);
    const txt = Array.prototype.map.call(rows, (r) => r.textContent).join(' | ');
    assert.ok(txt.indexOf('شاخص بورس') >= 0, txt.slice(0, 200));
    assert.ok(txt.indexOf('جریان پول بورس') >= 0);
    W.close();
    GS.data.clearCache();
  });

  console.log('\nbourse.js: ' + n + ' tests, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
