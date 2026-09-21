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


/* ============================================================
   روندِ پول — پارسرهایی که «ورود و خروجِ پول» را عمیق‌تر می‌کنند
   منبعِ شواهد: reports/probe-moneyflow.md (پروب روی رانر) و
   tests/fixtures/bourse-trader.html (برش‌های واقعیِ صفحه)
   ============================================================ */
const BT_HTML = require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'bourse-trader.html'), 'utf8');

t('parseBourseTrader: ارزشِ صف‌های خرید/فروش (پولِ پشتِ صف)', () => {
  const r = P.parseBourseTrader(BT_HTML);
  assert.strictEqual(r.ok, true);
  assert.ok(r.queue, 'بخشِ صف‌ها باید استخراج شود');
  // فیکسچر (اعدادِ واقعیِ صفحه): ارزش صف خرید 5.5T و صف فروش 21.7T تومان
  assert.strictEqual(r.queue.buyToman, 5.5e12);
  assert.strictEqual(r.queue.sellToman, 21.7e12);
  assert.strictEqual(r.queue.netToman, -16.2e12);
  assert.ok(Math.abs(r.queue.buyShare - 5.5 / 27.2) < 1e-9, 'سهمِ صفِ خرید');
});

t('parseBourseTrader: ارزشِ صفِ نامعقول رد می‌شود (سکوت نه عددِ غلط)', () => {
  const bad = BT_HTML.replace('5.5T', '900000T');   // ‎9e17 تومان = غیرممکن
  const r = P.parseBourseTrader(bad);
  assert.ok(!r.queue || r.queue.buyToman == null, JSON.stringify(r.queue));
  // بقیه‌ی بخش‌ها باید سالم بمانند (یک بخشِ خراب بقیه را حذف نمی‌کند)
  assert.strictEqual(r.ok, true);
  assert.ok(r.flow && r.flow.netToman === -1.8e12);
});

t('parseBourseTrader: بدون ردیفِ صف، کلیدِ queue ساخته نمی‌شود', () => {
  const none = BT_HTML
    .replace(/<tr class='dir_left bl-colu'> <td class='text-right'>ارزش صف خرید[\s\S]*?<\/tr>/, '')
    .replace(/<tr class='dir_left text-danger'> <td class='text-right'>ارزش صف فروش[\s\S]*?<\/tr>/, '');
  const r = P.parseBourseTrader(none);
  assert.ok(!r.queue, JSON.stringify(r.queue));
});

t('flowSeries: نقاطِ همان جلسه نگه داشته می‌شوند و مرتب می‌مانند', () => {
  const now = Date.now();
  const a = P.flowSeries([], now - 3 * 3600e3, 1e12);
  const b = P.flowSeries(a, now - 2 * 3600e3, -2e12);
  const c = P.flowSeries(b, now, -3.5e12);
  assert.strictEqual(c.length, 3);
  assert.deepStrictEqual(c.map((p) => p[1]), [1e12, -2e12, -3.5e12]);
  assert.ok(c[0][0] < c[1][0] && c[1][0] < c[2][0], 'ترتیبِ زمانی');
});

t('flowSeries: ادغامِ زیرِ ۵ دقیقه، حذفِ نقطه‌یِ عقب‌گرد، سقفِ ۲۴', () => {
  const now = Date.now();
  const base = P.flowSeries([], now - 3600e3, 1e12);
  // کمتر از ۵ دقیقه: آخرین نقطه به‌روزرسانی می‌شود نه اینکه نقطه‌ای اضافه شود
  const merged = P.flowSeries(base, now - 3600e3 + 60000, 1.4e12);
  assert.strictEqual(merged.length, 1);
  assert.strictEqual(merged[0][1], 1.4e12);
  // نقطه‌ی عقب‌گرد نادیده گرفته می‌شود
  const back = P.flowSeries(base, now - 7200e3, 9e12);
  assert.strictEqual(back.length, 1, 'زمان باید رو‌به‌جلو باشد');
  // سقفِ تعداد
  const many = Array.from({ length: 40 }, (_, i) => [now - (40 - i) * 600000, i * 1e12]);
  assert.strictEqual(P.flowSeries(many, now, 1e12).length, 24);
});

t('flowSeries: جلسه‌ی دیگر = سریِ تازه (عددِ دیروز لباسِ امروز نمی‌پوشد)', () => {
  const now = Date.now();
  const today = P.flowSeries([], now, 1e12);
  const tomorrow = P.flowSeries(today, now + 26 * 3600e3, 7e12);
  assert.strictEqual(tomorrow.length, 1, 'فقط نقطه‌ی جلسه‌ی جدید می‌ماند');
  assert.strictEqual(tomorrow[0][1], 7e12);
});

t('flowSeries: ورودیِ بی‌ربط خروجیِ بی‌ربط نمی‌سازد', () => {
  assert.deepStrictEqual(P.flowSeries('x', NaN, NaN), []);
  assert.deepStrictEqual(P.flowSeries(null, 0, 1e12), []);
  assert.deepStrictEqual(P.flowSeries([[1, 2]], Date.now(), 'آشغال'), []);
});

t('history: جریانِ پولِ جلسه (منفی هم مجاز است) + به‌روزرسانیِ درجا', () => {
  const Hh = require('../scripts/history.cjs');
  const d = Hh.empty();
  const base = { generated_at: '2026-09-21T06:00:00Z', quotes: { USD: { p: 230000 } }, market: { index: { p: 7280289, ts: Date.parse('2026-09-21T06:00:00Z'), day: '2026-09-21' } } };
  Hh.appendLive(d, Object.assign({}, base, { market: Object.assign({}, base.market, { flow: { netToman: -3.2e12, ts: Date.parse('2026-09-21T06:00:00Z'), src: 'BourseTrader' } }) }));
  assert.deepStrictEqual(d.daily.TSEFLOW, [['2026-09-21', -3.2e12]]);
  // در همان جلسه، مقدارِ آخر جایگزین می‌شود (جریان انباشتی است)
  Hh.appendLive(d, Object.assign({}, base, { generated_at: '2026-09-21T08:00:00Z', market: Object.assign({}, base.market, { flow: { netToman: -4.8e12, ts: Date.parse('2026-09-21T08:00:00Z'), src: 'BourseTrader' } }) }));
  assert.deepStrictEqual(d.daily.TSEFLOW, [['2026-09-21', -4.8e12]]);
  // جلسه‌ی بعد ردیفِ خودش را می‌گیرد
  Hh.appendLive(d, Object.assign({}, base, { generated_at: '2026-09-22T08:00:00Z', market: Object.assign({}, base.market, { index: { p: 7300000, ts: Date.parse('2026-09-22T08:00:00Z'), day: '2026-09-22' }, flow: { netToman: 1.1e12, ts: Date.parse('2026-09-22T08:00:00Z') } }) }));
  assert.deepStrictEqual(d.daily.TSEFLOW, [['2026-09-21', -4.8e12], ['2026-09-22', 1.1e12]]);
});

t('pickMarketFlow: عددِ تازه مقدم است (بورس‌تریدر در ساعتِ بازار)', () => {
  const r = P.pickMarketFlow({ fresh: { netToman: -3.2e12, ratio: -0.12, n: 900, src: 'BourseTrader' }, prev: { netToman: 1e12, ts: Date.now() }, ixDay: P.tehranDay(Date.now()), now: Date.now() });
  assert.strictEqual(r.how, 'fresh');
  assert.strictEqual(r.flow.netToman, -3.2e12);
  assert.strictEqual(r.flow.src, 'BourseTrader');
  assert.strictEqual(r.flow.fresh, true);
  assert.strictEqual(r.flow.day, P.tehranDay(Date.now()));
});

t('pickMarketFlow: «حفظِ جلسه» — عددِ امروز بعد از بسته‌شدنِ بازار نمی‌پرد', () => {
  // سناریوی واقعیِ ایراد: ساعت ۱۲:۳۰ بازار بسته می‌شود؛ انتشارِ عصر نباید
  // جریانی را که صبح اندازه‌گیری شده دور بریزد.
  const morning = Date.now() - 5 * 3600e3;
  const ixDay = P.tehranDay(morning);
  const r = P.pickMarketFlow({ fresh: null, brs: null, prev: { netToman: -3.2e12, ratio: -0.12, n: 900, src: 'BourseTrader', ts: morning, day: ixDay }, ixDay: ixDay, now: Date.now() });
  assert.strictEqual(r.how, 'kept', JSON.stringify(r));
  assert.ok(r.flow, 'جریان باید حفظ شود');
  assert.strictEqual(r.flow.netToman, -3.2e12);
  assert.strictEqual(r.flow.fresh, false, 'برچسبِ «تازه نیست» باید باشد');
  assert.strictEqual(r.flow.ts, morning, 'زمانِ اندازه‌گیریِ اصلی حفظ می‌شود');
});

t('pickMarketFlow: جلسه‌یِ دیروز را منتشر نمی‌کند (عددِ کهنه لباسِ امروز نمی‌پوشد)', () => {
  const yesterday = Date.now() - 26 * 3600e3;
  const r = P.pickMarketFlow({ fresh: null, brs: null, prev: { netToman: -9e12, ts: yesterday, src: 'BourseTrader' }, ixDay: P.tehranDay(Date.now()), now: Date.now() });
  assert.strictEqual(r.flow, null, 'جریانِ جلسه‌ی قبل باید سکوت کند');
  assert.strictEqual(r.how, 'silent');
  assert.ok(r.why.indexOf('جلسه‌یِ دیگری') >= 0, r.why);
});

t('pickMarketFlow: بدون هیچ منبع، سکوت — و هرگز عددی از روی شاخص نمی‌سازد', () => {
  const r = P.pickMarketFlow({ ixDay: P.tehranDay(Date.now()), now: Date.now() });
  assert.strictEqual(r.flow, null);
  assert.strictEqual(r.how, 'silent');
  // حتی اگر شاخص باشد (ixDay داده شده)، جریان «ساخته» نمی‌شود
  assert.strictEqual(r.flow, null);
});

t('pickMarketFlow: BrsApi وقتی منبعِ بی‌کلید ندارد', () => {
  const r = P.pickMarketFlow({ fresh: null, brs: { netToman: 2e12, ratio: 0.08, n: 640, src: 'BrsApi' }, ixDay: P.tehranDay(Date.now()), now: Date.now() });
  assert.strictEqual(r.how, 'brs');
  assert.strictEqual(r.flow.src, 'BrsApi');
  assert.strictEqual(r.flow.n, 640);
});

t('pickMarketFlow: ورودیِ نیمه‌کاره هم سکوت می‌سازد نه عددِ بد', () => {
  assert.strictEqual(P.pickMarketFlow({ fresh: { netToman: 'آشغال' }, ixDay: 'x' }).flow, null);
  assert.strictEqual(P.pickMarketFlow({ prev: { netToman: 1e12 }, ixDay: null }).flow, null, 'بدون روزِ جلسه ملاکی نداریم');
  assert.strictEqual(P.pickMarketFlow({ prev: { netToman: 1e12, ts: 0 }, ixDay: '2026-09-21' }).flow, null);
});

t('btChart: نمودارِ توکار و سری‌هایش استخراج می‌شوند', () => {
  const ch = P.btChart(BT_HTML, 'input_money');
  assert.ok(ch, 'نمودار باید پیدا شود');
  assert.ok(/ورود پول حقيقي/.test(ch.title || ''), ch.title);
  assert.strictEqual(ch.series.length, 2, JSON.stringify(ch.series.map((s) => s.name)));
  assert.strictEqual(ch.series[0].data.length, 60);
  // سریِ نمودارِ دیگر نباید وارد این یکی شود
  assert.ok(ch.series.every((s) => !/خريد|فروش/.test(s.name)), JSON.stringify(ch.series.map((s) => s.name)));
  const q = P.btChart(BT_HTML, 'buysellqty');
  assert.ok(q && q.series.length === 2, 'نمودارِ صف‌ها');
  assert.strictEqual(P.btChart(BT_HTML, 'نموداری_که_نیست'), null);
});

t('btFlowCurve: منحنیِ خالص با واحدِ میلیارد تومان و نمونه‌برداری', () => {
  const c = P.btFlowCurve(BT_HTML, -1.8e12);   // عددِ جدول: 1.8T- تومان
  assert.ok(c, 'منحنی باید ساخته شود');
  assert.strictEqual(c.unit, 'milliard_toman');
  assert.strictEqual(c.raw, 60, 'تعدادِ نقاطِ خام');
  assert.ok(c.n <= 48, 'نمونه‌برداری تا ۴۸ نقطه: ' + c.n);
  assert.strictEqual(c.last, -1800, 'آخرین نقطه باید با جدول هم‌خوان باشد');
  assert.strictEqual(c.min, -1800);
  assert.strictEqual(c.max, -107);
});

t('btFlowCurve: نگهبانِ تطبیق — اگر آخرین نقطه با جدول نمی‌خواند، منحنی رد می‌شود', () => {
  // جدول می‌گوید ‎۵۰۰- میلیارد؛ منحنی به ‎۱۸۰۰- ختم می‌شود → برداشت اشتباه است
  assert.strictEqual(P.btFlowCurve(BT_HTML, -5e11), null);
  // با عددِ هم‌خوان دوباره قبول می‌شود
  assert.ok(P.btFlowCurve(BT_HTML, -1.9e12));
  // بدون عددِ جدول هم باید کار کند (فقط نگهبانِ تطبیق اجرا نمی‌شود)
  assert.ok(P.btFlowCurve(BT_HTML, null));
});

t('btFlowCurve: مقیاسِ غیرممکن و نبودِ سری رد می‌شود', () => {
  const huge = BT_HTML.replace(/data: \[(-?\d+),(-?\d+),(-?\d+),(-?\d+),(-?\d+)/, 'data: [99999999,99999999,99999999,99999999,99999999');
  assert.strictEqual(P.btFlowCurve(huge, null), null, 'مقیاسِ غیرممکن');
  const noSeries = BT_HTML.replace(/id="input_money"[\s\S]*?<\/script>/, '');
  assert.strictEqual(P.btFlowCurve(noSeries, -1.8e12), null, 'بی‌نمودار');
});

t('btQueueCurve: دو منحنیِ صفِ خرید/فروش با نگهبانِ تعداد', () => {
  const q = P.btQueueCurve(BT_HTML);
  assert.ok(q, 'منحنیِ صف‌ها باید ساخته شود');
  assert.strictEqual(q.buy.length, q.sell.length);
  assert.ok(q.buy[q.buy.length - 1] > 0 && q.sell[q.sell.length - 1] > 0);
  assert.ok(q.buy.every((v) => v >= 0 && v <= 3000));
  // تعدادِ صف نمی‌تواند ۳۰۰۰ تا باشد
  const bad = BT_HTML.replace(/id="buysellqty"[\s\S]*?<\/script>/, '');
  assert.strictEqual(P.btQueueCurve(bad), null);
});

t('parseBourseTrader: منحنی‌ها در خروجی می‌آیند و بقیه را خراب نمی‌کنند', () => {
  const r = P.parseBourseTrader(BT_HTML);
  assert.strictEqual(r.ok, true);
  assert.ok(r.flowCurve && r.flowCurve.n > 5, 'منحنیِ جریان');
  assert.ok(r.queueCurve && r.queueCurve.buy.length > 5, 'منحنیِ صف‌ها');
  assert.strictEqual(r.flow.netToman, -1.8e12, 'جدول دست‌نخورده');
  assert.ok(r.queue && r.queue.buyToman === 5.5e12, 'پولِ پشتِ صف دست‌نخورده');
});

console.log('publish.js: ' + n + ' tests, exit=' + (process.exitCode || 0));
