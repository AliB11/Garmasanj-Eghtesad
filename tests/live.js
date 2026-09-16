// Live-engine test: mocked providers -> run real tickFast/tickSlow -> assert quotes.
// Run: NODE_PATH=/tmp/smoke/node_modules node tests/live.js   (needs: npm i jsdom)
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const REPO = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

const M = {
  snapshot: { generated_at: '2026-09-16T16:35:00Z', generated_fa: 'تست', quotes: {} },
  live: { generated_at: new Date(Date.now() - 600000).toISOString(), generated_fa: 'تست', quotes: {
    USD: { p: 800000, chg: 1000, chgPct: 0.5, ts: Date.now() - 600000 },
    EUR: { p: 880000, chgPct: 0.4, ts: Date.now() - 600000 },
    G18: { p: 50000000, chgPct: 0.9, ts: Date.now() - 600000 },
    OUNCE_USD: { p: 2600, chgPct: 0.3, ts: Date.now() - 600000 },
    EMAMI: { p: 600000000, chgPct: 1.0, ts: Date.now() - 600000 },
    USDT: { p: 799000, chgPct: 0.4, ts: Date.now() - 600000 },
    BTC_USD: { p: 90000, chgPct: 1.0, ts: Date.now() - 600000, agree: 3 },
    BTC_TM: { p: 8e10, chgPct: 1.1, ts: Date.now() - 600000 },
  } },
  tgju: { current: {
    price_dollar_rl: { p: '9050000', d: '90000', dp: 1.0, dt: 'high', h: '9080000', l: '9010000', ts: '2026-09-16 19:59:59' },
    price_eur: { p: '9855000', d: '100000', dp: 1.1, dt: 'high', ts: '2026-09-16 19:59:59' },
    price_gbp: { p: '11405000', dp: 0.1, dt: 'low', ts: '2026-09-16 19:59:59' },
    price_aed: { p: '2465000', dp: 0.9, dt: 'high', ts: '2026-09-16 19:59:59' },
    price_try: { p: '283000', dp: 0.5, dt: 'high', ts: '2026-09-16 19:59:59' },
    price_chf: { p: '10280000', dp: 0.8, dt: 'high', ts: '2026-09-16 19:59:59' },
    price_cny: { p: '1253000', dp: 0.7, dt: 'high', ts: '2026-09-16 19:59:59' },
    geram18: { p: '575000000', dp: 0.9, dt: 'high', ts: '2026-09-16 19:59:59' },
    geram24: { p: '766666700', dp: 0.9, dt: 'high', ts: '2026-09-16 19:59:59' },
    mesghal: { p: '2502400000', dp: 1.0, dt: 'high', ts: '2026-09-16 19:59:59' },
    ons: { p: '2650', dp: 0.3, dt: 'high', ts: '2026-09-16 19:59:59' },
    sekee: { p: '6800000000', dp: 1.4, dt: 'high', ts: '2026-09-16 19:59:59' },
    sekeb: { p: '6720000000', dp: 1.3, dt: 'high', ts: '2026-09-16 19:59:59' },
    nim: { p: '3520000000', dp: 1.2, dt: 'high', ts: '2026-09-16 19:59:59' },
    rob: { p: '1980000000', dp: 1.1, dt: 'high', ts: '2026-09-16 19:59:59' },
    gerami: { p: '980000000', dp: 0.8, dt: 'high', ts: '2026-09-16 19:59:59' },
    'crypto-tether-irr': { p: '9005000', dp: 1.0, dt: 'high', ts: '2026-09-16 19:59:59' },
  } },
  nbUsdt: { status: 'ok', stats: { 'usdt-rls': { latest: '9000000', dayChange: '1.5', dayHigh: '9050000', dayLow: '8950000' } } },
  nbBtc: { status: 'ok', stats: { 'btc-rls': { latest: '900000000000', dayChange: '2.2' } } },
  wallex: { result: { symbols: {
    USDTTMN: { stats: { lastPrice: '900500', '24h_ch': 1.2 } },
    BTCTMN: { stats: { lastPrice: '90100000000', '24h_ch': 2.0 } },
  } } },
  bitpin: { results: [
    { code: 'USDT_IRT', price: '9008000', price_info: { change: 1.1 } },
    { code: 'BTC_IRT', price: '901500000000', price_info: { change: 2.1 } },
  ] },
  cg: {
    bitcoin: { usd: 100000, usd_24h_change: 2.0 },
    'pax-gold': { usd: 2640, usd_24h_change: 0.4 },
    tether: { usd: 1 },
  },
  kraken: { error: [], result: {
    XXBTZUSD: { c: ['100200', '0.5'], o: '99000' },
    PAXGUSD: { c: ['2645', '1'], o: '2630' },
  } },
  binance: { symbol: 'BTCUSDT', lastPrice: '100500', priceChangePercent: '2.5' },
  coinbase: { data: { amount: '100100', base: 'BTC', currency: 'USD' } },
  frank: { rates: { EUR: 0.92, GBP: 0.79, CHF: 0.88, CNY: 7.2, TRY: 32.5 }, date: '2026-09-16' },
  erapi: { result: 'success', rates: { EUR: 0.92 } },
  navasan: {
    usd_sell: { value: '904000', change: '9000' },
    eur: { value: '986000', change: '5000' },
    geram18: { value: '57550000', change: '400000' },
    sekke: { value: '681000000', change: '5000000' },
    ounce: { value: '2651', change: '5' },
  },
  cgHist: { prices: Array.from({ length: 12 }, (_, i) => [Date.now() - (12 - i) * 3600000, 98000 + i * 200]) },
};

// mock TGJU timestamps = right now (Tehran), so the full "live" path is exercised
const TSNOW = (() => { const d = new Date(Date.now() + 12600000); const p = (n) => String(n).padStart(2, '0'); return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds); })();
M.tgju = JSON.parse(JSON.stringify(M.tgju).split('2026-09-16 19:59:59').join(TSNOW));

function route(url) {
  const u = String(url);
  if (u.includes('snapshot.json')) return { json: M.snapshot };
  if (u.includes('live.json')) return { json: M.live };
  if (u.includes('tgju.org') && u.includes('ajax.json')) return { json: M.tgju };
  if (u.includes('nobitex.ir') && u.includes('usdt')) return { json: M.nbUsdt };
  if (u.includes('nobitex.ir') && u.includes('btc')) return { json: M.nbBtc };
  if (u.includes('wallex.ir')) return { json: M.wallex };
  if (u.includes('bitpin.ir')) return { json: M.bitpin };
  if (u.includes('simple/price')) return { json: M.cg };
  if (u.includes('kraken.com')) return { json: M.kraken };
  if (u.includes('binance.vision')) return { json: M.binance };
  if (u.includes('coinbase.com')) return { json: M.coinbase };
  if (u.includes('frankfurter.dev') || u.includes('frankfurter.app')) return { json: M.frank };
  if (u.includes('er-api.com')) return { json: M.erapi };
  if (u.includes('navasan.tech')) return { json: M.navasan };
  if (u.includes('market_chart')) return { json: M.cgHist };
  throw new Error('unmocked: ' + u.slice(0, 90));
}

const dom = new JSDOM(html, { url: 'http://localhost/index.html', pretendToBeVisual: true, runScripts: 'dangerously' });
const { window } = dom;
const errors = [];
window.addEventListener('error', (e) => errors.push('window.onerror: ' + e.message));
window.fetch = (url) => {
  try {
    const r = route(String(url));
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(r.json),
      text: () => Promise.resolve(JSON.stringify(r.json)),
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });

for (const s of ['config.js', 'utils.js', 'data.js', 'charts.js', 'ui.js', 'features.js', 'app.js']) {
  const el = window.document.createElement('script');
  el.textContent = fs.readFileSync(path.join(REPO, 'assets/js', s), 'utf8');
  window.document.body.appendChild(el);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const GS = window.GS;
  for (let i = 0; i < 40 && !(GS.data.quote('USD') && GS.data.quote('USD').live); i++) await wait(500);
  await GS.data.tickFast().catch(() => {});
  await GS.data.tickSlow().catch(() => {});
  await wait(300);

  const checks = [];
  const ok = (n, c, x) => checks.push({ n, p: !!c, x: x || '' });
  const Q = (s) => GS.data.quote(s);
  const near = (v, e, tol) => v != null && Math.abs(v - e) / e <= tol;

  ok('usd=TGJu 905000', near(Q('USD').p, 905000, 0.001), 'got=' + Q('USD').p);
  ok('usd live', Q('USD').live === true);
  ok('usd feed has TGJU', (window.document.querySelector('.qcard[data-sym="USD"] [data-f="src"]').textContent || '').includes('TGJU'));
  ok('usdt=nobitex 900000', near(Q('USDT').p, 900000, 0.001), 'got=' + Q('USDT').p);
  ok('eur=985500', near(Q('EUR').p, 985500, 0.001), 'got=' + Q('EUR').p);
  ok('gbp dt=low negates', Q('GBP').chgPct < 0, 'got=' + Q('GBP').chgPct);
  ok('g18=57.5M', near(Q('G18').p, 57500000, 0.001), 'got=' + Q('G18').p);
  ok('ounce=2650 no-div', near(Q('OUNCE_USD').p, 2650, 0.001), 'got=' + Q('OUNCE_USD').p);
  ok('emami=680M', near(Q('EMAMI').p, 680000000, 0.001), 'got=' + Q('EMAMI').p);
  ok('nim/rob/gerami', near(Q('NIM').p, 352000000, 0.001) && near(Q('ROB').p, 198000000, 0.001) && near(Q('GERAMI').p, 98000000, 0.001));
  ok('btc_usd=binance 100500', near(Q('BTC_USD').p, 100500, 0.005), 'got=' + Q('BTC_USD').p);
  ok('btc_tm=nobitex 9e10', near(Q('BTC_TM').p, 9e10, 0.001), 'got=' + Q('BTC_TM').p);
  ok('ounce_tm=2650*905000', near(Q('OUNCE_TM').p, 2650 * 905000, 0.001), 'got=' + Q('OUNCE_TM').p);
  ok('all 20 have prices', GS.config.ASSETS.every((a) => Q(a.sym).p > 0));
  const dv = GS.data.derived();
  ok('usdt premium<0', dv.usdtPrem != null && dv.usdtPrem < 0.5, 'got=' + dv.usdtPrem);
  ok('bubble~21%', dv.bubble != null && dv.bubble > 15 && dv.bubble < 28, 'got=' + dv.bubble);
  ok('goldPrem small', dv.goldPrem != null && Math.abs(dv.goldPrem) < 6, 'got=' + dv.goldPrem);
  ok('mesghalDev small', dv.mesghalDev != null && Math.abs(dv.mesghalDev) < 2, 'got=' + dv.mesghalDev);
  const mo = GS.data.mood();
  ok('mood positive', mo.score > 0 && mo.n >= 15, 'got=' + mo.score + '/' + mo.n);
  const hot = GS.features.hotScores();
  ok('hotScores=19', hot.length === 19, 'got=' + hot.length);
  ok('hot top positive', hot[0].score > 0, 'got=' + hot[0].score.toFixed(1));
  ok('sorted desc', hot.every((r, i) => i === 0 || hot[i - 1].score >= r.score));
  ok('flow rows=10', window.document.querySelectorAll('#flowBars .flow-row').length === 10);
  ok('ticker usd filled', window.document.querySelector('[data-tp="USD"]').textContent.trim() !== '—');
  ok('cache saved', (window.localStorage.getItem('garmasanj_quotes_v7') || '').includes('USD'));
  ok('hist buffer', GS.data.hist('USD').length >= 1);
  ok('btc hist injected', GS.data.hist('BTC_USD').length >= 10, 'got=' + GS.data.hist('BTC_USD').length);
  ok('health ok>=8', GS.config.SOURCES.filter((s) => GS.data.src[s.id] && GS.data.src[s.id].ok).length >= 8,
    'got=' + GS.config.SOURCES.filter((s) => GS.data.src[s.id] && GS.data.src[s.id].ok).length);
  ok('tgju ok', GS.data.src.tgju && GS.data.src.tgju.ok === true);
  ok('live src ok', GS.data.src.live && GS.data.src.live.ok === true);
  ok('nobitex ok', GS.data.src.nobitex && GS.data.src.nobitex.ok === true);
  ok('wallex ok', GS.data.src.wallex && GS.data.src.wallex.ok === true);
  ok('coingecko ok', GS.data.src.coingecko && GS.data.src.coingecko.ok === true);
  ok('kraken ok', GS.data.src.kraken && GS.data.src.kraken.ok === true);
  ok('binance ok', GS.data.src.binance && GS.data.src.binance.ok === true);
  ok('coinbase ok', GS.data.src.coinbase && GS.data.src.coinbase.ok === true);
  ok('frankfurter ok', GS.data.src.frankfurter && GS.data.src.frankfurter.ok === true);
  ok('bitpin idle (covered)', GS.data.src.bitpin && GS.data.src.bitpin.ok !== true);
  ok('erapi idle (covered)', GS.data.src.erapi && GS.data.src.erapi.ok !== true);
  ok('navasan idle w/o key', GS.data.src.navasan && GS.data.src.navasan.ok !== true);
  ok('chain complete', (() => { const c = GS.data.chain(); return c.usd && c.g18 && c.emami && c.signal.length > 5; })());
  ok('verdict action+conf', (() => { const v = GS.features.verdict(); return v && v.action && v.action.t.length > 2 && v.conf > 0; })());
  ok('chain cards=6 dom', window.document.querySelectorAll('#chainFlow .ch-card').length === 6);
  ok('heat tiles=19 dom', window.document.querySelectorAll('#heatGrid .heat-tile').length === 19);
  ok('qcard badges live', window.document.querySelector('.qcard[data-sym="USD"] [data-f="badge"]').textContent.includes('زنده'));

  // jump-guard: absurd provider move must be rejected -> falls back to live tether proxy
  GS.data._ingest('tgju', { current: { price_dollar_rl: { p: '90500000', dp: 5, dt: 'high', ts: '2026-09-16 20:00:00' } }, via: 'test', ms: 1 });
  await wait(100);
  ok('jump-guard rejects 10x, usdt fallback', Q('USD').p === 900000 && (Q('USD').srcFa || '').includes('معادل تتر'), 'got=' + Q('USD').p + '/' + Q('USD').srcFa);

  // navasan key flow (slow lane)
  window.localStorage.setItem('garmasanj_navasan_v6', JSON.stringify('TESTKEY'));
  await GS.data.tickSlow().catch(() => {});
  ok('navasan ok with key', GS.data.src.navasan && GS.data.src.navasan.ok === true);
  GS.data.clearNavasanKey();
  ok('navasan key cleared', GS.data.getNavasanKey() == null);

  // radar
  const sel = window.document.querySelector('#radarMarket');
  sel.value = 'USD';
  window.document.querySelector('#radarTarget').value = String(Q('USD').p + 1000);
  window.document.querySelector('#radarAdd').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  GS.features.checkRadars();
  ok('radar up-alert stays watch (above)', window.document.querySelector('#radarItems .r-item') != null);

  // manual-only fallback (last: clears RAW)
  GS.data._clearRaw();
  GS.data.setManualUsd(950000);
  await wait(200);
  ok('manual-only usd', Q('USD').p === 950000, 'got=' + Q('USD').p);
  ok('manual-only labeled', (window.document.querySelector('.qcard[data-sym="USD"] [data-f="src"]').textContent || '').includes('دستی'));

  // ---------- scenario boots: no-clobber / live-only / proxy / stale-fill ----------
  function bootScenario(fetchFn) {
    const dom2 = new JSDOM(html, { url: 'http://localhost/s.html', pretendToBeVisual: true, runScripts: 'dangerously' });
    const w = dom2.window;
    w.addEventListener('error', (e) => errors.push('scenario: ' + e.message));
    w.fetch = fetchFn;
    if (!w.matchMedia) w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    for (const s of ['config.js', 'utils.js', 'data.js']) {
      const el = w.document.createElement('script');
      el.textContent = fs.readFileSync(path.join(REPO, 'assets/js', s), 'utf8');
      w.document.body.appendChild(el);
    }
    return { dom: dom2, GS: w.GS };
  }
  const REAL_SNAP = JSON.parse(fs.readFileSync(path.join(REPO, 'assets', 'data', 'snapshot.json'), 'utf8'));
  const jres = (j) => Promise.resolve({ ok: true, json: () => Promise.resolve(j) });
  const jrej = () => Promise.reject(new Error('mock-offline'));

  // A: snapshot-only (real file) -> untouched, all non-live
  {
    const { dom: d2, GS: G2 } = bootScenario((url) => (String(url).includes('snapshot.json') ? jres(REAL_SNAP) : jrej()));
    await G2.data.bootAll();
    const Q2 = (s) => G2.data.quote(s);
    ok('A: usd untouched', Q2('USD').p === REAL_SNAP.quotes.USD.p && Q2('USD').live === false);
    ok('A: g18 untouched', Q2('G18').p === REAL_SNAP.quotes.G18.p && Q2('G18').live === false);
    ok('A: btc not corrupted', Q2('BTC_USD').p === REAL_SNAP.quotes.BTC_USD.p && Q2('BTC_TM').p === REAL_SNAP.quotes.BTC_TM.p);
    ok('A: coins untouched', Q2('EMAMI').p === REAL_SNAP.quotes.EMAMI.p && Q2('NIM').p === REAL_SNAP.quotes.NIM.p);
    ok('A: nothing live', G2.config.ASSETS.every((a) => Q2(a.sym).live !== true));
    ok('A: ounce_tm stale fill', Q2('OUNCE_TM').p === Math.round(REAL_SNAP.quotes.OUNCE_USD.p * REAL_SNAP.quotes.USD.p) && Q2('OUNCE_TM').live === false);
    d2.window.close();
  }

  // B: live-only (empty snapshot) -> fills live with preserved ts
  {
    const LVM = { generated_at: new Date().toISOString(), generated_fa: 'B', quotes: {
      USD: { p: 810000, chg: 800, chgPct: 0.4, high: 812000, low: 808000, ts: 1789500000000 },
      OUNCE_USD: { p: 2610, chgPct: 0.2, ts: 1789500000000 },
      BTC_USD: { p: 90500, chgPct: 1.0, ts: 1789500000000, agree: 3 },
    } };
    const { dom: d2, GS: G2 } = bootScenario((url) => {
      const u = String(url);
      if (u.includes('live.json')) return jres(LVM);
      if (u.includes('snapshot.json')) return jres({ generated_at: '', quotes: {} });
      return jrej();
    });
    await G2.data.bootAll();
    const Q2 = (s) => G2.data.quote(s);
    ok('B: usd from live', Q2('USD').p === 810000 && Q2('USD').live === true);
    ok('B: ts preserved', Q2('USD').ts === 1789500000000);
    ok('B: btc agree kept', Q2('BTC_USD').p === 90500 && Q2('BTC_USD').agree === 3);
    ok('B: ounce_tm live derived', Q2('OUNCE_TM').p === 2610 * 810000 && Q2('OUNCE_TM').live === true);
    ok('B: g18 live formula', Q2('G18').live === true && Q2('G18').p > 4e7 && Q2('G18').p < 6e7, 'got=' + Q2('G18').p);
    ok('B: g18 marked est', Q2('G18').est === true);
    ok('B: src.live ok', G2.data.src.live && G2.data.src.live.ok === true);
    d2.window.close();
  }

  // C: proxy saves TGJU when direct is blocked
  {
    const { dom: d2, GS: G2 } = bootScenario((url) => {
      const u = String(url);
      if (u.includes('isomorphic-git') || u.includes('allorigins')) return jres(M.tgju);
      if (u.includes('snapshot.json')) return jres({ generated_at: '', quotes: {} });
      return jrej();
    });
    G2.data._irDelay(30);
    await G2.data.tickFast();
    const Q2 = (s) => G2.data.quote(s);
    ok('C: tgju via proxy ok', G2.data.src.tgju && G2.data.src.tgju.ok === true);
    ok('C: usd live 905000', near(Q2('USD').p, 905000, 0.001) && Q2('USD').live === true, 'got=' + Q2('USD').p);
    ok('C: via marked proxy', (G2.data.src.tgju.note || '').includes('⟂'), 'got=' + G2.data.src.tgju.note);
    d2.window.close();
  }

  // D: stale inputs -> fill-only-empty with estimate semantics (live=false)
  {
    const S2 = { generated_at: '', quotes: {
      USD: { p: 230500, chgPct: 0.05, ts: Date.now() - 3600000 },
      OUNCE_USD: { p: 4248.8, chgPct: -1.0, ts: Date.now() - 3600000 },
    } };
    const { dom: d2, GS: G2 } = bootScenario((url) => (String(url).includes('snapshot.json') ? jres(S2) : jrej()));
    await G2.data.bootAll();
    const Q2 = (s) => G2.data.quote(s);
    ok('D: g18 stale estimate', Q2('G18').p > 0 && Q2('G18').live === false && Q2('G18').src === 'formula');
    ok('D: existing kept', Q2('USD').p === 230500 && Q2('USD').live === false);
    ok('D: eur stays empty', Q2('EUR').p == null);
    ok('D: btc stays empty', Q2('BTC_USD').p == null && Q2('BTC_TM').p == null);
    ok('D: ounce_tm stale', Q2('OUNCE_TM').p > 0 && Q2('OUNCE_TM').live === false);
    d2.window.close();
  }

  // E: live LV inputs -> live formulas
  {
    const LVM = { generated_at: new Date().toISOString(), quotes: {
      USD: { p: 800000, chgPct: 0.5, ts: Date.now() },
      OUNCE_USD: { p: 2600, chgPct: 0.3, ts: Date.now() },
    } };
    const { dom: d2, GS: G2 } = bootScenario((url) => {
      const u = String(url);
      if (u.includes('live.json')) return jres(LVM);
      if (u.includes('snapshot.json')) return jres({ generated_at: '', quotes: {} });
      return jrej();
    });
    await G2.data.bootAll();
    const Q2 = (s) => G2.data.quote(s);
    ok('E: g18 live formula', Q2('G18').live === true && Q2('G18').p > 4e7 && Q2('G18').p < 6e7, 'got=' + Q2('G18').p);
    ok('E: ounce_tm exact not est', Q2('OUNCE_TM').live === true && Q2('OUNCE_TM').est !== true, 'got=' + Q2('OUNCE_TM').p);
    ok('E: eur stays empty (no fx)', Q2('EUR').p == null);
    d2.window.close();
  }

  let fail = 0;
  for (const c of checks) {
    console.log((c.p ? 'PASS' : 'FAIL') + '  ' + c.n + (c.x ? '  [' + c.x + ']' : ''));
    if (!c.p) fail++;
  }
  console.log('window errors: ' + errors.length);
  errors.slice(0, 10).forEach((e) => console.log('  ERR: ' + e));
  window.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
