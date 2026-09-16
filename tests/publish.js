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

// --- consensus / kraken ---
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
t('live.json on disk valid core', () => {
  const fs = require('fs'), path = require('path');
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'data', 'live.json'), 'utf8'));
  assert.ok(doc.quotes.USD.p === 230500, 'usd');
  assert.ok(doc.quotes.BTC_TM.p === 17378114100, 'btc_tm scale');
  assert.ok(Object.keys(doc.quotes).length >= 18, 'count');
  assert.ok(doc.fx && doc.fx.rates.EUR > 0.5, 'fx');
});
t('snapshot.json btc scale fixed', () => {
  const fs = require('fs'), path = require('path');
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'data', 'snapshot.json'), 'utf8'));
  assert.ok(doc.quotes.BTC_TM.p > 1e10, 'got=' + doc.quotes.BTC_TM.p);
});

console.log('publish.js: ' + n + ' tests, exit=' + (process.exitCode || 0));
