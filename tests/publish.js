// Publisher unit tests: pure parsers on captured REAL response shapes (zero-dep).
// Run: node tests/publish.js
const assert = require('assert');
const P = require('../scripts/publish.cjs');

let n = 0;
function t(name, fn) {
  n++;
  try { fn(); console.log('PASS  ' + name); }
  catch (e) { console.error('FAIL  ' + name + ' :: ' + e.message); process.exitCode = 1; }
}

// --- tgjuRow: ریال→تومان، قانون dt، رشته‌ی کامادار ---
t('tgju usd rial->toman', () => {
  const q = P.tgjuRow('USD', { p: '2,305,000', d: '1,050', dp: 0.05, dt: 'high', h: '2,311,200', l: '2,293,600', ts: '2026-09-16 19:59:59' });
  assert.strictEqual(q.p, 230500);
  assert.strictEqual(q.chg, 105);
  assert.strictEqual(q.chgPct, 0.05);
  assert.ok(q.ts > Date.UTC(2026, 8, 16));
});
t('tgju dt=low negates', () => {
  const q = P.tgjuRow('GBP', { p: '3,100,700', d: '3,100', dp: 0.1, dt: 'low', ts: '2026-09-16 19:59:58' });
  assert.strictEqual(q.p, 310070);
  assert.strictEqual(q.chg, -310);
  assert.strictEqual(q.chgPct, -0.1);
});
t('tgju ounce no-div + tehran ts', () => {
  const q = P.tgjuRow('OUNCE_USD', { p: '4,248.80', d: '46.09', dp: 1.08, dt: 'low', ts: '2026-09-16 23:00:07' });
  assert.strictEqual(q.p, 4248.8);
  assert.strictEqual(q.chgPct, -1.08);
  assert.strictEqual(q.ts, Date.UTC(2026, 8, 16, 23, 0, 7) - 12600000);
});
t('tgju btc-irr scale', () => {
  const q = P.tgjuRow('BTC_TM', { p: '173,781,141,000', d: '2,053,655,000', dp: 1.18, dt: 'low', ts: '2026-09-16 23:00:56' });
  assert.strictEqual(q.p, 17378114100);
  assert.strictEqual(q.chg, -205365500);
});
t('tgju rejects out-of-range garbage', () => {
  assert.strictEqual(P.tgjuRow('BTC_TM', { p: '100', dp: 0, ts: '2026-09-16 23:00:56' }), null);
  assert.strictEqual(P.tgjuRow('USD', { p: '0', ts: '2026-09-16 19:59:59' }), null);
});
t('tgju insane dp nulled (doge-guard)', () => {
  const q = P.tgjuRow('USD', { p: '2,305,000', dp: 185800, dt: 'low', ts: '2026-09-16 19:59:59' });
  assert.strictEqual(q.chgPct, null);
});
t('pickTGJU first-hit + fallback key', () => {
  const cur = { price_dollar_dt: { p: '2,305,000', dp: 0.04, dt: 'high', ts: '2026-09-16 19:59:59' } };
  assert.strictEqual(P.pickTGJU(cur, 'USD').p, 230500);
  assert.strictEqual(P.pickTGJU({}, 'USD'), null);
});

// --- nobitex / wallex / bitpin ---
t('nobitex rls->toman', () => {
  const q = P.parseNobitex({ stats: { 'usdt-rls': { latest: '9000000', dayChange: '1.5' } } }, 'usdt');
  assert.deepStrictEqual([q.p, q.chgPct], [900000, 1.5]);
});
t('wallex symbols path (toman)', () => {
  const j = { result: { symbols: { USDTTMN: { stats: { lastPrice: '900500', '24h_ch': 1.2 } } } } };
  assert.deepStrictEqual([P.parseWallex(j, 'USDTTMN').p, P.parseWallex(j, 'XXX')], [900500, null]);
});
t('bitpin fitUnit picks anchor-near (rial raw)', () => {
  const j = { results: [{ code: 'USDT_IRT', price: '2302510', price_info: { change: -0.5 } }] };
  assert.strictEqual(P.parseBitpin(j, 'USDT_IRT', 230500, 8e4, 2e6).p, 230251);
});
t('bitpin fitUnit picks anchor-near (toman raw)', () => {
  const j = { results: [{ code: 'USDT_IRT', price: '229568', price_info: { change: -0.6 } }] };
  assert.strictEqual(P.parseBitpin(j, 'USDT_IRT', 230500, 8e4, 2e6).p, 229568);
});
t('bitpin rejects far-from-anchor', () => {
  const j = { results: [{ code: 'USDT_IRT', price: '999', price_info: {} }] };
  assert.strictEqual(P.parseBitpin(j, 'USDT_IRT', 230500, 8e4, 2e6), null);
});

// --- بهداشتِ دامنه‌ی روز (سقف/کف باید قیمت را در بر بگیرند) ---
t('day range kept when it brackets price', () => {
  const q = P.tgjuRow('USD', { p: '2,305,000', dp: 0.05, dt: 'high', h: '2,311,200', l: '2,293,600', ts: '2026-09-16 19:59:59' });
  assert.strictEqual(q.high, 231120);
  assert.strictEqual(q.low, 229360);
});
t('day range dropped when high < low (TGJU coin glitch)', () => {
  // نیم‌سکه در یک انتشار واقعی: سقف ۹۳۰٬۰۰۰٬۰۰۰ ریال کمتر از کف ۱٬۱۹۰٬۰۰۰٬۰۰۰ و کمتر از خودِ قیمت
  const q = P.tgjuRow('NIM', { p: '1,210,000,000', dp: 0, dt: 'high', h: '930,000,000', l: '1,190,000,000', ts: '2026-09-20 00:48:06' });
  assert.ok(q, 'price itself is valid');
  assert.strictEqual(q.high, null);
  assert.strictEqual(q.low, null);
});
t('day range dropped when it does not contain price', () => {
  const q = P.tgjuRow('USD', { p: '2,305,000', dp: 0, dt: 'high', h: '2,300,000', l: '2,290,000', ts: '2026-09-16 19:59:59' });
  assert.strictEqual(q.high, null);
  assert.strictEqual(q.low, null);
});
t('day range dropped when absurdly wide', () => {
  const q = P.tgjuRow('USD', { p: '2,305,000', dp: 0, dt: 'high', h: '2,900,000', l: '1,000,000', ts: '2026-09-16 19:59:59' });
  assert.strictEqual(q.high, null);
  assert.strictEqual(q.low, null);
});
t('saneDayRange is exported and symmetric', () => {
  assert.deepStrictEqual(P.saneDayRange(100, 110, 90), { high: 110, low: 90 });  // دامنه‌ی ۲۰٪: سالم
  assert.deepStrictEqual(P.saneDayRange(100, 120, 80), { high: null, low: null }); // دامنه‌ی ۴۰٪: رد
  assert.deepStrictEqual(P.saneDayRange(100, 80, 120), { high: null, low: null }); // وارونه
  assert.deepStrictEqual(P.saneDayRange(100, null, 80), { high: null, low: null }); // ناقص
});

// --- پنجره‌ی تطبیقی: با جابه‌جاییِ سطح قیمت‌ها انتشار متوقف نشود ---
t('static window still authoritative', () => {
  assert.ok(P.inRange('USD', 230275), 'inside static window');
  assert.ok(!P.inRange('USD', 100), 'garbage below');
  assert.ok(!P.inRange('USD', 1e12), 'garbage above (no anchor)');
});
t('adaptive window follows price drift', () => {
  const anchor = 5.5e6; // دلارِ ۵٫۵ میلیون تومان: بیرون از پنجره‌ی استاتیکِ فعلی
  assert.ok(P.inRange('USD', 5.9e6, anchor), 'moderate drift accepted');
  assert.ok(!P.inRange('USD', 5.9e6, 0), 'but rejected without anchor');
  assert.ok(!P.inRange('USD', 5.9e7, anchor), '10x jump rejected (unit error)');
  assert.ok(!P.inRange('USD', 1e3, anchor), 'far below rejected');
});
t('adaptive window never exceeds hard envelope', () => {
  // لنگرِ مسموم نباید هر عددی را مجاز کند: سقف سخت ۱۰ برابر پنجره‌ی استاتیک است
  assert.ok(P.inRange('USD', 5e6, 5e7), 'exactly at the hard cap (10x static)');
  assert.ok(!P.inRange('USD', 6e7, 5e7), 'above hard cap rejected');
  assert.ok(!P.inRange('USD', 4e3, 5e7), 'below hard floor rejected');
});

// --- consistency / kraken ---
t('consensus picks highest-weight in cluster', () => {
  const c = P.consensus([
    { p: 75970, chgPct: 0.12, w: 9 }, { p: 76023.6, chgPct: 0.58, w: 9 },
    { p: 76100.8, chgPct: 0.221, w: 10 }, { p: 76010.985, chgPct: null, w: 8 },
  ]);
  assert.strictEqual(c.p, 76101);
  assert.strictEqual(c.agree, 4);
});
t('consensus drops outlier cluster', () => {
  const c = P.consensus([{ p: 76000, w: 9 }, { p: 76100, w: 9 }, { p: 50000, w: 10 }]);
  assert.ok(c.p >= 76000 && c.agree === 2);
});
t('kraken last+open -> chgPct', () => {
  const k = P.krakenChg({ c: ['76023.6', '0.1'], o: '75585.1' });
  assert.ok(Math.abs(k.chgPct - 0.58) < 0.01);
});

// --- ranges / live.json on disk ---
t('live.json on disk valid core (structural — file is republished every 15 min)', () => {
  const fs = require('fs'), path = require('path');
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'data', 'live.json'), 'utf8'));
  assert.ok(Date.parse(doc.generated_at) > Date.UTC(2026, 0, 1), 'generated_at');
  assert.ok(P.inRange('USD', doc.quotes.USD.p), 'usd in range: ' + doc.quotes.USD.p);
  assert.ok(P.inRange('BTC_USD', doc.quotes.BTC_USD.p), 'btc_usd in range');
  assert.ok(P.inRange('BTC_TM', doc.quotes.BTC_TM.p) && doc.quotes.BTC_TM.p > 1e9, 'btc_tm toman scale: ' + doc.quotes.BTC_TM.p);
  // سازگاری داخلی: بیت‌کوین تومانی ÷ دلاری باید نزدیک دلار/تتر باشد (خطای واحد ریال/تومان را می‌گیرد)
  const implied = doc.quotes.BTC_TM.p / doc.quotes.BTC_USD.p;
  assert.ok(Math.abs(implied / doc.quotes.USD.p - 1) < 0.15, 'btc implied usd ' + Math.round(implied) + ' vs usd ' + doc.quotes.USD.p);
  for (const sym of Object.keys(doc.quotes)) {
    assert.ok(P.inRange(sym, doc.quotes[sym].p), sym + ' out of range: ' + doc.quotes[sym].p);
    const pct = doc.quotes[sym].chgPct;
    assert.ok(pct == null || Math.abs(pct) <= 25, sym + ' insane chgPct');
  }
  assert.ok(Object.keys(doc.quotes).length >= 12, 'count');
  assert.ok(doc.fx && doc.fx.rates.EUR > 0.5 && doc.fx.rates.EUR < 2, 'fx');
});
t('snapshot.json btc scale fixed', () => {
  const fs = require('fs'), path = require('path');
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'data', 'snapshot.json'), 'utf8'));
  assert.ok(doc.quotes.BTC_TM.p > 1e10, 'got=' + doc.quotes.BTC_TM.p);
});


// --- مسیرهای کلیددارِ سمت‌سرور (اختیاری؛ فقط با Secrets) ---
t('redact: کلید در پیام‌ها پنهان می‌شود', () => {
  assert.strictEqual(
    P.redact('https://x.y/api?key=SECRET123&type=1'),
    'https://x.y/api?key=***&type=1'
  );
  assert.strictEqual(
    P.redact('https://x.y/latest/?api_key=abc&d=1'),
    'https://x.y/latest/?api_key=***&d=1'
  );
  assert.strictEqual(P.redact('https://x.y/plain'), 'https://x.y/plain');
});

t('بدون کلید در محیط، مسیرهای کلیددار خاموش‌اند', () => {
  // ماژول در این فرایند بدون NAVASAN_KEY/BRS_API_KEY بارگذاری شده
  assert.strictEqual(P.envKey('NAVASAN_KEY'), null);
  assert.strictEqual(P.envKey('BRS_API_KEY'), null);
});

t('parseNavasan: ریال→تومان و بازه‌ی معتبر', () => {
  const q = P.parseNavasan({
    usd_sell: { value: '2,306,000', change: '1500' },
    geram18: { value: '238,900,000', change: '1200000' },
    sekke: { value: '2,376,000,000', change: '0' },
    ons: { value: '4385.20', change: '12.4' },
  });
  assert.strictEqual(q.USD.p, 230600);
  assert.strictEqual(q.G18.p, 23890000);
  assert.strictEqual(q.EMAMI.p, 237600000);
  assert.strictEqual(q.OUNCE_USD.p, 4385.2);
  assert.ok(Math.abs(q.USD.chgPct - 0.065) < 0.01, 'chgPct=' + q.USD.chgPct);
});

t('parseNavasan: مقادیرِ خارج از بازه رد می‌شوند', () => {
  assert.strictEqual(P.parseNavasan(null), null);
  assert.strictEqual(P.parseNavasan({ usd_sell: { value: '12' } }), null, 'دلار ۱۲ تومانی');
  // فقط اونسِ غیرمعقول بود ⇒ بعد از حذف، هیچ کوتِ معتبری نمی‌ماند ⇒ null
  assert.strictEqual(P.parseNavasan({ ons: { value: '999999' } }), null, 'اونسِ غیرمعقول');
  assert.strictEqual(P.parseNavasan({ foo: { value: '1' } }), null);
});

t('aggregateFlow: خالصِ پولِ حقیقی (ریال→تومان، بدون حدسِ واحد)', () => {
  const rows = [
    { l18: 'فملی', pl: 45200, tvol: 10000000, tval: 452000000000, Buy_I_Volume: 6000000, Sell_I_Volume: 8000000 },
    { l18: 'وبملت', pl: 31000, tvol: 20000000, tval: 620000000000, Buy_I_Volume: 9000000, Sell_I_Volume: 11000000 },
  ];
  const a = P.aggregateFlow(rows);
  assert.strictEqual(a.netToman, Math.round(-2e6 * 4520 + -2e6 * 3100));
  assert.strictEqual(a.valueToman, Math.round(45.2e9 + 62e9));
  assert.ok(Math.abs(a.ratio - (-15.24e9 / 107.2e9)) < 1e-9);
  assert.strictEqual(a.n, 2);
});

t('aggregateFlow: ساختارِ ناشناخته عدد نمی‌سازد', () => {
  assert.strictEqual(P.aggregateFlow([{ alpha: 1, beta: 2 }]), null);
  assert.strictEqual(P.aggregateFlow([]), null);
  assert.strictEqual(P.aggregateFlow(null), null);
});

t('parseBrsMarket: پاسخِ سالم پذیرفته می‌شود', () => {
  const pr = P.parseBrsMarket({
    data: [
      { l18: 'فملی', pl: 45200, tvol: 10000000, tval: 452000000000, Buy_I_Volume: 6e6, Sell_I_Volume: 8e6 },
      { l18: 'وبملت', pl: 31000, tvol: 20000000, tval: 620000000000, Buy_I_Volume: 9e6, Sell_I_Volume: 11e6 },
    ],
  });
  assert.strictEqual(pr.ok, true);
  assert.strictEqual(pr.agg.n, 2);
});

t('parseBrsMarket: نگهبان‌های مقیاس و ساختار', () => {
  const tiny = P.parseBrsMarket({ data: [{ l18: 'x', pl: 10, tvol: 100, tval: 1000, Buy_I_Volume: 60, Sell_I_Volume: 40 }] });
  assert.strictEqual(tiny.ok, false);
  assert.ok(tiny.why.indexOf('مقیاس') >= 0, tiny.why);

  const weird = P.parseBrsMarket({ data: [{ alpha: 1, beta: 2 }] });
  assert.strictEqual(weird.ok, false);
  assert.ok(weird.why.indexOf('ناشناخته') >= 0, weird.why);
  assert.ok(weird.keys && weird.keys.indexOf('alpha') >= 0, 'کلیدهای واقعی گزارش شوند');

  const err = P.parseBrsMarket({ ErrorMessage: 'Invalid API Key' });
  assert.strictEqual(err.ok, false);
  assert.ok(err.why.indexOf('Invalid') >= 0, err.why);
});

// --- Tablokhani (tablokhani.com) — پارسرِ برچسبیِ ناشر، با نگهبانِ بخش‌به‌بخش ---
const TBL_PAD = '<!-- ' + 'x'.repeat(6000) + ' -->';
function tblHtml(body) { return '<html><body>' + body + TBL_PAD + '</body></html>'; }

t('parseTablokhani: صفحه‌ی سالم (شاخص‌ها/ارزش/صف/پهنا/جریان)', () => {
  const html = tblHtml(`
    <div><small>شاخص کل</small><b>۷,۲۹۵,۰۱۳.۵۶</b><em>▲ ۰.۰٪</em></div>
    <div><small>شاخص هم‌وزن</small><b>۱,۹۳۹,۲۸۳.۶۳</b><em>▼ ۰.۴٪</em></div>
    <div><small>شاخص فرابورس</small><b>۵۶,۷۸۰.۸۷</b><em>▲ ۰.۳٪</em></div>
    <div><small>ارزش کل معاملات</small><b>328148.9B</b></div>
    <h3>تعداد صف‌های خرید و فروش</h3>
    <table><tr><td>صف خرید</td><td>۱۳۴</td></tr><tr><td>صف فروش</td><td>۲۱۹</td></tr></table>
    <h3>ارزش صف‌های خرید و فروش (میلیارد تومان)</h3>
    <table><tr><td>صف خرید</td><td>۸۷۰۵۷.۲</td></tr><tr><td>صف فروش</td><td>۴۱۷۶۹.۱</td></tr></table>
    <h3>تغییرات وضعیت بازار</h3>
    <ul><li>بیشتر از ۲% + <b>۱۲</b></li><li>۰.۵ تا ۲% + <b>۱۴۵</b></li>
      <li>۰.۵% - تا ۰.۵% + <b>۲۱۰</b></li><li>۰.۵ تا ۲% - <b>۲۶۸</b></li><li>بیشتر از ۲% - <b>۱۸۴</b></li></ul>
    <h3>اشخاص حقیقی</h3>
    <table><tr><td>ورود پول حقیقی</td><td>5.1T</td><td>خروج پول حقیقی</td><td>9.3T</td></tr>
      <tr><td>خالص</td><td>-4.2T</td></tr></table>
    <h3>اشخاص حقوقی</h3>
    <table><tr><td>خالص</td><td>1.1T</td></tr></table>
  `);
  const r = P.parseTablokhani(html);
  assert.strictEqual(r.ok, true);
  assert.ok(Math.abs(r.index.p - 7295013.56) < 1e-6, 'شاخص کل');
  assert.strictEqual(r.index.chgPct, 0);
  assert.ok(Math.abs(r.equal.p - 1939283.63) < 1e-6, 'هم‌وزن (نیم‌فاصله)');
  assert.strictEqual(r.equal.chgPct, -0.4);
  assert.ok(Math.abs(r.fara.p - 56780.87) < 1e-6, 'فرابورس');
  assert.strictEqual(r.fara.chgPct, 0.3);
  assert.strictEqual(r.value, Math.round(328148.9e9), 'ارزش کل (B=میلیارد)');
  assert.deepStrictEqual([r.queues.buyN, r.queues.sellN], [134, 219], 'تعداد صف‌ها');
  assert.strictEqual(r.queues.buyT, Math.round(87057.2e9), 'ارزش صف (میلیارد→تومان)');
  assert.strictEqual(r.queues.sellT, Math.round(41769.1e9));
  assert.strictEqual(r.breadth.up, 157);
  assert.strictEqual(r.breadth.down, 452);
  assert.strictEqual(r.breadth.flat, 210);
  assert.strictEqual(r.flow.retail.netToman, -4200000000000, 'خالصِ حقیقی (ردیفِ «خالص» اولویت دارد)');
  assert.strictEqual(r.flow.corporate.netToman, 1100000000000);
});

t('parseTablokhani: کوتاه/آشغال → ok=false', () => {
  assert.strictEqual(P.parseTablokhani('شاخص').ok, false);
  const r = P.parseTablokhani('<html><body><p>شاخص کل ۱۲۳</p>' + TBL_PAD + '</body></html>');
  assert.strictEqual(r.ok, false, 'عددِ بی‌بازه نمی‌سازد');
});

t('parseTablokhani: نگهبانِ نسبت (خالص > کلِ ارزش → سکوت)', () => {
  const html = tblHtml(`
    <div><small>ارزش کل معاملات</small><b>5T</b></div>
    <h3>اشخاص حقیقی</h3>
    <table><tr><td>خالص</td><td>-9T</td></tr></table>
  `);
  const r = P.parseTablokhani(html);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value, 5e12);
  assert.strictEqual(r.flow, null, 'خالصِ بزرگ‌تر از کل نمی‌تواند بیاید');
});

t('parseTablokhani: جریانِ بدونِ ردیفِ «خالص» (ردیفِ پولیِ بخش)', () => {
  const html = tblHtml(`
    <h3>اشخاص حقیقی</h3>
    <table><tr><td>حقیقی</td><td>2.4T</td></tr></table>
  `);
  const r = P.parseTablokhani(html);
  assert.ok(r.ok);
  assert.strictEqual(r.flow.retail.netToman, 2400000000000);
});

// --- history: روندِ پول در سریِ TSE (عنصرِ پنجم، سازگار به عقب) ---
t('history: addMarketPoint با/بدونِ جریان + به‌روزرسانی درجا', () => {
  const H = require('../scripts/history.cjs');
  const doc = H.empty();
  const ms = Date.UTC(2026, 8, 20, 5, 0);
  H.addMarketPoint(doc, ms, 7290000, 7300000, 7250000, -4.2e12);
  assert.deepStrictEqual(doc.daily.TSE[0], ['2026-09-20', 7290000, 7300000, 7250000, -4200000000000]);
  H.addMarketPoint(doc, ms + 3600e3, 7285000, 7300000, 7250000, -3.8e12);
  assert.strictEqual(doc.daily.TSE.length, 1, 'در طولِ جلسه یک ردیف باقی می‌ماند');
  assert.strictEqual(doc.daily.TSE[0][4], -3800000000000, 'جریانِ تازه‌تر جایگزین می‌شود');
  H.addMarketPoint(doc, ms + 2 * 86400e3, 7270000, 7280000, 7260000);
  assert.strictEqual(doc.daily.TSE[1][4], null, 'بدونِ جریان: سازگاریِ قدیم (null در JSON)');
});

t('history: appendLive جریانِ live.json را به TSE می‌رساند', () => {
  const H = require('../scripts/history.cjs');
  const doc = H.empty();
  const live = {
    generated_at: '2026-09-20T09:00:00.000Z',
    quotes: { USD: { p: 230500 } },
    market: { index: { p: 7290000, ts: Date.UTC(2026, 8, 20, 9, 0), day: '2026-09-20' }, flow: { netToman: -3100000000000, src: 'BourseTrader' } },
  };
  const r = H.appendLive(doc, live);
  assert.ok(r.added >= 1);
  assert.strictEqual(doc.daily.TSE[0][4], -3100000000000);
});

console.log('publish.js: ' + n + ' tests, exit=' + (process.exitCode || 0));
