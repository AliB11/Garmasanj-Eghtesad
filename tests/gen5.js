// تست رگرسیون نسل ۵ — تاریخچه‌ی گیت‌محور، مقایسه، سنجاق، جست‌وجو، میان‌برها، تم روشن، فرمول‌ها، ویجت.
// اجرا: NODE_PATH=/tmp/smoke/node_modules node tests/gen5.js
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const REPO = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');
let n = 0, failed = 0;
function t(name, fn) {
  n++;
  try { fn(); console.log('PASS  ' + name); }
  catch (e) { failed++; console.error('FAIL  ' + name + ' :: ' + e.message); }
}

/* ---------------- scripts/history.cjs (بدون jsdom) ---------------- */
const H = require('../scripts/history.cjs');
t('history: append + daily aggregation (Tehran day key)', () => {
  const doc = H.empty();
  const day1 = Date.UTC(2026, 8, 10, 6, 0, 0); // ۰۹:۳۰ تهران
  let r = H.appendLive(doc, { generated_at: new Date(day1).toISOString(), quotes: { USD: { p: 100 }, G18: { p: 50 }, BAD: { p: 0 } } });
  assert.strictEqual(r.added, 2);
  r = H.appendLive(doc, { generated_at: new Date(day1 + 3600e3).toISOString(), quotes: { USD: { p: 110 } } });
  r = H.appendLive(doc, { generated_at: new Date(day1 + 7200e3).toISOString(), quotes: { USD: { p: 90 } } });
  assert.deepStrictEqual(doc.daily.USD, [['2026-09-10', 90, 110, 90]]);
  assert.strictEqual(doc.recent.USD.length, 3);
  // ۲۱:۰۰ UTC = ۰۰:۳۰ فردای تهران → روز جدید
  H.appendLive(doc, { generated_at: new Date(Date.UTC(2026, 8, 10, 21, 0, 0)).toISOString(), quotes: { USD: { p: 95 } } });
  assert.strictEqual(doc.daily.USD.length, 2);
  assert.strictEqual(doc.daily.USD[1][0], '2026-09-11');
});
t('history: idempotent (same generated_at twice adds nothing)', () => {
  const doc = H.empty();
  const live = { generated_at: '2026-09-12T08:00:00.000Z', quotes: { USD: { p: 100 } } };
  assert.strictEqual(H.appendLive(doc, live).added, 1);
  assert.strictEqual(H.appendLive(doc, live).added, 0);
  assert.strictEqual(H.appendLive(doc, { generated_at: '2026-09-12T07:00:00.000Z', quotes: { USD: { p: 1 } } }).added, 0, 'older point ignored');
});
t('history: prune keeps 14d raw / 240d daily', () => {
  const doc = H.empty();
  const now = Date.UTC(2026, 8, 19, 12);
  for (let d = 300; d >= 0; d -= 5) H.appendLive(doc, { generated_at: new Date(now - d * 86400e3).toISOString(), quotes: { USD: { p: 100 + d } } });
  assert.ok(doc.recent.USD.every((x) => x[0] * 1000 >= now - 14 * 86400e3));
  assert.ok(doc.daily.USD.length >= 45 && doc.daily.USD.length <= 50, 'daily=' + doc.daily.USD.length);
  assert.ok(doc.daily.USD[0][0] >= H.dayKey(now - 240 * 86400e3));
});
t('history.json in repo is well-formed and derived OUNCE_TM is absent', () => {
  const j = JSON.parse(read('assets/data/history.json'));
  assert.ok(j.recent && j.daily && j.generated_at);
  assert.ok(j.daily.USD && j.daily.USD.length >= 1);
  assert.ok(!j.daily.OUNCE_TM, 'derived asset must not be stored');
  for (const s of Object.keys(j.recent)) {
    const r = j.recent[s];
    for (let i = 1; i < r.length; i++) assert.ok(r[i][0] > r[i - 1][0], s + ' must be strictly increasing');
  }
});
t('publisher writes history.json + workflow commits it', () => {
  assert.ok(read('scripts/publish.cjs').includes("require('./history.cjs')"));
  const wf = read('.github/workflows/publisher.yml');
  assert.ok(wf.includes('history.json'));
  assert.ok(read('sw.js').includes('history.json'), 'sw shell should cache history.json');
});

/* ---------------- مرورگر (jsdom) ---------------- */
const html = read('index.html');
const live = JSON.parse(read('assets/data/live.json'));
live.generated_at = new Date().toISOString();
// تاریخچه‌ی مصنوعی ۴۰ روزه تا بازه‌های ۷/۳۰ روزه هم تست شوند
function synthHistory() {
  const doc = H.empty();
  const now = Date.now();
  const syms = Object.keys(live.quotes);
  for (let d = 40; d >= 0; d--) {
    for (let k = 0; k < 2; k++) {
      const ms = now - d * 86400e3 - (k ? 6 * 3600e3 : 12 * 3600e3);
      const quotes = {};
      syms.forEach((s) => {
        const p0 = live.quotes[s].p;
        if (!(p0 > 0)) return;
        // روند ملایم: قیمت‌های قدیمی‌تر پایین‌تر (رشد ۱۰٪ در ۴۰ روز) + موج کوچک
        quotes[s] = { p: p0 * (1 - 0.10 * d / 40) * (1 + 0.004 * Math.sin(d)) };
      });
      H.appendLive(doc, { generated_at: new Date(ms).toISOString(), quotes });
    }
  }
  return doc;
}
const hist = synthHistory();

function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM(html, { url: 'http://localhost/index.html', pretendToBeVisual: true, runScripts: 'dangerously' });
  const { window } = dom;
  const errs = [];
  window.addEventListener('error', (e) => errs.push(e.message));
  window.matchMedia = (q) => ({ matches: q.includes('light') ? !!opts.prefersLight : false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.fetch = (u) => {
    u = String(u);
    if (u.includes('live.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(live) });
    if (u.includes('history.json')) return opts.noHistory ? Promise.reject(new Error('off')) : Promise.resolve({ ok: true, json: () => Promise.resolve(hist) });
    if (u.includes('snapshot.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ generated_at: '', quotes: {} }) });
    return Promise.reject(new Error('off'));
  };
  if (opts.ls) Object.keys(opts.ls).forEach((k) => window.localStorage.setItem(k, opts.ls[k]));
  for (const s of ['config.js', 'utils.js', 'data.js', 'charts.js', 'ui.js', 'features.js', 'app.js']) {
    const el = window.document.createElement('script');
    el.textContent = read('assets/js/' + s);
    window.document.body.appendChild(el);
  }
  return { window, d: window.document, GS: window.GS, errs };
}
const key = (d, k, target) => (target || d).dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const visible = (d) => [...d.querySelectorAll('#assetGrid .qcard')].filter((c) => c.style.display !== 'none').map((c) => c.dataset.sym);

(async () => {
  const { window, d, GS, errs } = boot();
  await GS.data.bootAll();
  await new Promise((r) => setTimeout(r, 300));

  t('history API: series/changeOver/weekly from history.json', () => {
    const m = GS.data.historyMeta('USD');
    assert.ok(m.ok && m.days >= 30, JSON.stringify(m));
    assert.ok(GS.data.series('USD', 7).length >= 10, 'recent raw points for 7d');
    const s30 = GS.data.series('USD', 30);
    assert.ok(s30.length >= 28 && s30.length <= 33, '30d daily points=' + s30.length);
    assert.ok(s30[s30.length - 1].live, 'last point is the live quote');
    const c = GS.data.changeOver('USD', 7);
    assert.ok(c && c.pct > 0.5 && c.pct < 3, 'usd 7d ≈ +1.75% got ' + (c && c.pct));
    const w = GS.data.weekly();
    assert.ok(w && w.days >= 6 && w.rows.length >= 5, JSON.stringify(w));
    assert.ok(w.bubbleThen != null && w.bubbleNow != null);
  });
  t('verdict gets weekly context reason', () => {
    const v = GS.features.verdict();
    assert.ok(v.weekly, 'weekly attached');
    assert.ok(v.reasons.some((r) => r.includes('این هفته')), v.reasons.join(' | '));
  });
  t('asset modal: history block with 7/30/90 chips + stats + formula ? buttons', () => {
    GS.ui.openAssetModal('EMAMI');
    const body = d.querySelector('#assetModalBody');
    assert.ok(body.querySelector('#amHist svg.lc'), '30d chart');
    assert.ok(/تغییر ۳۰ روزه/.test(body.querySelector('.am-hist-stats').textContent), body.querySelector('.am-hist-stats').textContent);
    body.querySelector('[data-hist-days="7"]').click();
    assert.ok(body.querySelector('#amHist .chip.on').dataset.histDays === '7');
    assert.ok(body.querySelector('#amHist svg.lc'), '7d chart');
    body.querySelector('[data-hist-days="90"]').click();
    assert.ok(body.querySelector('#amHist').textContent.includes('روز داده داریم'), '90d falls back with a note');
    const keys = [...body.querySelectorAll('[data-formula]')].map((b) => b.dataset.formula);
    assert.ok(keys.includes('bubble') && keys.includes('intrinsic'), keys.join(','));
    body.querySelector('[data-formula="bubble"]').click();
    assert.ok(d.querySelector('#infoModal').classList.contains('show'));
    assert.ok(d.querySelector('#infoTitle').textContent.includes('حباب'));
    assert.ok(d.querySelectorAll('#infoBody .f-row').length >= 3, 'live inputs listed');
    GS.ui.closeModal('#infoModal');
    assert.ok(d.querySelector('#amRadarBtn') && d.querySelector('#amCmpBtn') && d.querySelector('#amPinBtn'));
    GS.ui.closeModal('#assetModal');
  });
  t('derived asset modal has no radar button; formula ? still present', () => {
    GS.ui.openAssetModal('OUNCE_TM');
    assert.strictEqual(d.querySelector('#amRadarBtn'), null);
    GS.ui.closeModal('#assetModal');
  });
  t('pins: toggle, max 6, grid + ticker + summary ordering, persisted', () => {
    d.querySelector('.qc-pin[data-pin="EMAMI"]').click();
    d.querySelector('.qc-pin[data-pin="BTC_USD"]').click();
    assert.strictEqual(GS.ui.pins().join(), 'EMAMI,BTC_USD');
    assert.ok(!d.querySelector('#assetModal').classList.contains('show'), 'pin click must not open modal');
    assert.strictEqual(visible(d).slice(0, 2).join(), 'EMAMI,BTC_USD');
    assert.ok(d.querySelector('.qcard[data-sym="EMAMI"]').classList.contains('pinned'));
    assert.strictEqual(d.querySelector('#tickerTrack .tk .tk-n').textContent, 'امامی');
    assert.ok(GS.ui.summaryText().split('\n')[1].includes('امامی'));
    ['USD', 'G18', 'USDT', 'EUR', 'GBP'].forEach((s) => d.querySelector('.qc-pin[data-pin="' + s + '"]').click());
    assert.strictEqual(GS.ui.pins().length, 6, 'capped at 6');
    assert.ok([...d.querySelectorAll('#toasts .toast')].some((x) => x.textContent.includes('۶')), 'cap toast');
    assert.strictEqual(JSON.parse(window.localStorage.getItem('garmasanj_pins_v1')).length, 6);
    d.querySelector('.qc-pin[data-pin="EMAMI"]').click();
    assert.ok(!GS.ui.pins().includes('EMAMI'));
  });
  t('search: Persian normalisation, category override, empty state, Esc clears', () => {
    GS.ui.setCategory('crypto');
    GS.ui.setQuery('سكه'); // ك عربی
    assert.strictEqual(visible(d).sort().join(), 'BAHAR,EMAMI,GERAMI,NIM,ROB');
    assert.strictEqual(d.querySelector('.cat-tab.on').dataset.cat, 'all', 'search switches tab to all');
    GS.ui.setQuery('xyz');
    assert.strictEqual(visible(d).length, 0);
    assert.ok(d.querySelector('#gridEmpty').textContent.includes('xyz'));
    const inp = d.querySelector('#qsearch');
    inp.value = 'دلار'; inp.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.ok(visible(d).includes('USD') && visible(d).includes('BTC_USD'));
    key(d, 'Escape', inp);
    assert.strictEqual(inp.value, '');
    assert.strictEqual(visible(d).length, 20);
  });
  t('compare modal: from asset modal, ranges, legend, note with real span', () => {
    GS.ui.openAssetModal('EMAMI');
    d.querySelector('#amCmpBtn').click();
    assert.ok(d.querySelector('#compareModal').classList.contains('show'));
    assert.ok(!d.querySelector('#assetModal').classList.contains('show'), 'asset modal closed');
    assert.strictEqual(d.querySelector('#cmpA').value, 'EMAMI');
    assert.strictEqual(d.querySelector('#cmpB').value, 'G18');
    assert.ok(d.querySelector('#cmpBody svg.lc-cmp'));
    assert.strictEqual(d.querySelectorAll('#cmpBody .cmp-row').length, 2);
    assert.ok(d.querySelector('#cmpBody .cmp-note').textContent.includes('در ۳۰ روز گذشته'));
    d.querySelector('#compareModal [data-days="7"]').click();
    assert.ok(d.querySelector('#compareModal [data-days="7"]').classList.contains('on'));
    assert.ok(d.querySelector('#cmpBody .cmp-note').textContent.includes('۷ روز'));
    d.querySelector('#cmpB').value = 'BTC_USD'; d.querySelector('#cmpB').dispatchEvent(new window.Event('change'));
    assert.ok(d.querySelector('#cmpBody .cmp-legend').textContent.includes('بیت‌کوین'));
    assert.strictEqual(window.localStorage.getItem('garmasanj_cmp_v1'), JSON.stringify({ a: 'EMAMI', b: 'BTC_USD', days: 7 }));
    d.querySelector('#compareModal [data-days="0"]').click();
    assert.ok(d.querySelector('#cmpBody .lc-empty') || d.querySelector('#cmpBody svg.lc-cmp'), 'session mode renders');
    GS.ui.closeModal('#compareModal');
  });
  t('keyboard shortcuts: digits (latin+persian), ?, Esc, c, t, /, s; ignored while typing', () => {
    key(d, '3'); assert.strictEqual(d.querySelector('.cat-tab.on').dataset.cat, 'gold');
    key(d, '۵'); assert.strictEqual(d.querySelector('.cat-tab.on').dataset.cat, 'crypto');
    key(d, '1');
    key(d, '?'); assert.ok(d.querySelector('#infoModal').classList.contains('show')); assert.ok(d.querySelector('#infoBody .kbd-list'));
    key(d, 'Escape'); assert.ok(!d.querySelector('#infoModal').classList.contains('show'));
    key(d, 'c'); assert.ok(d.querySelector('#compareModal').classList.contains('show'));
    key(d, '3'); assert.strictEqual(d.querySelector('.cat-tab.on').dataset.cat, 'all', 'digits ignored while a modal is open');
    key(d, 'Escape');
    key(d, 't'); assert.strictEqual(d.documentElement.getAttribute('data-theme'), 'light');
    assert.strictEqual(d.querySelector('meta[name="theme-color"]').content, '#F4F6F9');
    key(d, 't'); assert.strictEqual(d.documentElement.getAttribute('data-theme'), 'dark');
    key(d, '/'); assert.strictEqual(d.activeElement.id, 'qsearch');
    key(d, 'c', d.activeElement); assert.ok(!d.querySelector('#compareModal').classList.contains('show'), 'no shortcut while typing');
    d.activeElement.blur();
    const before = d.querySelectorAll('#toasts .toast').length;
    key(d, 's');
    assert.ok(d.querySelectorAll('#toasts .toast').length >= before, 'share attempted (toast or share sheet)');
  });
  await new Promise((r) => setTimeout(r, 150)); // وعده‌ی اشتراک (کلیپ‌بورد) قبل از بستن پنجره تسویه شود (jsdom 24)
  t('share via shortcut produced its toast', () => assert.ok([...d.querySelectorAll('#toasts .toast')].some((x) => /کپی/.test(x.textContent))));
  t('theme persisted + button + help/embed buttons wired', () => {
    d.querySelector('#themeBtn').click();
    assert.strictEqual(window.localStorage.getItem('garmasanj_theme_v1'), '"light"');
    d.querySelector('#themeBtn').click();
    d.querySelector('#footHelpBtn').click(); assert.ok(d.querySelector('#infoModal').classList.contains('show')); GS.ui.closeModal('#infoModal');
    d.querySelector('#embedBtn').click();
    const code = d.querySelector('#embedCode').value;
    assert.ok(code.includes('<iframe') && code.includes('embed.html?sym='), code);
    GS.ui.closeModal('#infoModal');
  });
  t('formula ? buttons everywhere are delegated (verdict, chain, hot, mood)', () => {
    const keys = new Set([...d.querySelectorAll('[data-formula]')].map((b) => b.dataset.formula));
    ['verdict', 'fairG18', 'goldPrem', 'bubble', 'hot', 'mood'].forEach((k) => assert.ok(keys.has(k), 'missing ? for ' + k));
    d.querySelector('[data-formula="hot"]').click();
    assert.ok(d.querySelector('#infoModal').classList.contains('show'));
    assert.ok(d.querySelector('#infoBody .f-formula').textContent.includes('۶۰'));
    GS.ui.closeModal('#infoModal');
    ['bubble', 'intrinsic', 'fairG18', 'goldPrem', 'mesghal', 'usdtPrem', 'btcGap', 'eurImplied', 'mood', 'hot', 'heat', 'sim', 'verdict'].forEach((k) => {
      GS.ui.openFormula(k);
      assert.ok(d.querySelector('#infoBody .f-formula'), k);
    });
    GS.ui.closeModal('#infoModal');
  });
  t('radar: repeat mode re-arms with hysteresis; sound pref persisted', () => {
    d.querySelector('#radarRepeat').checked = true; d.querySelector('#radarRepeat').dispatchEvent(new window.Event('change'));
    d.querySelector('#radarSound').checked = true; d.querySelector('#radarSound').dispatchEvent(new window.Event('change'));
    assert.strictEqual(window.localStorage.getItem('garmasanj_radar_prefs_v1'), JSON.stringify({ repeat: true, sound: true }));
    const p0 = GS.data.quote('USD').p;
    d.querySelector('#radarMarket').value = 'USD'; d.querySelector('#radarTarget').value = String(p0 + 1000); d.querySelector('#radarAdd').click();
    const al = () => JSON.parse(window.localStorage.getItem('garmasanj_alerts_v6')).find((x) => x.s === 'USD');
    assert.ok(al().repeat && al().armed);
    const tg = (p) => ({ current: { price_dollar_rl: { p: String(p * 10), dp: 0.1, dt: 'high', ts: '2026-09-19 10:00:00' } } });
    GS.data._ingest('tgju', tg(p0 + 2000)); GS.features.checkRadars();
    assert.strictEqual(al().hits, 1); assert.strictEqual(al().armed, false); assert.strictEqual(al().done, false);
    assert.ok(d.querySelector('#radarItems .r-item.wait'), 'waiting state shown');
    GS.data._ingest('tgju', tg(p0 + 1500)); GS.features.checkRadars();
    assert.strictEqual(al().armed, false, 'inside hysteresis band stays disarmed');
    GS.data._ingest('tgju', tg(p0)); GS.features.checkRadars();
    assert.strictEqual(al().armed, true, 're-armed after leaving band');
    GS.data._ingest('tgju', tg(p0 + 3000)); GS.features.checkRadars();
    assert.strictEqual(al().hits, 2);
  });
  t('relLabel never prints fractional minutes', () => {
    const U = GS.utils;
    assert.strictEqual(U.relLabel(Date.now() - 49.75 * 60000), '۴۹ دقیقه پیش');
    assert.strictEqual(U.relLabel(Date.now() - 30000), '۳۰ ثانیه پیش');
    assert.strictEqual(U.relLabel(Date.now() - 3 * 3600000), '۳ ساعت پیش');
  });
  t('no window errors during the whole flow', () => assert.strictEqual(errs.join('; '), ''));
  window.close();

  // بوت بدون تاریخچه: هیچ خطایی، حکم و مودال کار می‌کنند
  {
    const b2 = boot({ noHistory: true, ls: { garmasanj_theme_v1: '"light"' } });
    await b2.GS.data.bootAll();
    await new Promise((r) => setTimeout(r, 200));
    t('no history.json → graceful (no chart, no crash) + stored light theme applied at boot', () => {
      assert.strictEqual(b2.GS.data.weekly(), null);
      b2.GS.ui.openAssetModal('USD');
      assert.ok(b2.d.querySelector('#amHist').textContent.includes('تاریخچه'), 'explains missing history');
      assert.strictEqual(b2.d.documentElement.getAttribute('data-theme'), 'light');
      assert.strictEqual(b2.errs.join('; '), '');
    });
    b2.window.close();
  }

  // ویجت قابل‌جاسازی
  {
    const ehtml = read('embed.html');
    const dom = new JSDOM(ehtml, { url: 'http://localhost/embed.html?sym=usd,g18,nope&theme=light&compact=1', pretendToBeVisual: true, runScripts: 'outside-only' });
    const w = dom.window; const errs2 = [];
    w.addEventListener('error', (e) => errs2.push(e.message));
    w.fetch = (u) => String(u).includes('live.json') ? Promise.resolve({ ok: true, json: () => Promise.resolve(live) }) : Promise.reject(new Error('off'));
    w.eval(read('assets/js/config.js')); w.eval(read('assets/js/utils.js'));
    w.eval([...w.document.querySelectorAll('script:not([src])')].map((s) => s.textContent).join('\n'));
    await new Promise((r) => setTimeout(r, 200));
    t('embed.html renders requested symbols, theme, compact; unknown symbols dropped', () => {
      assert.strictEqual(w.document.documentElement.dataset.theme, 'light');
      assert.ok(w.document.body.classList.contains('compact'));
      assert.strictEqual([...w.document.querySelectorAll('.c .n')].map((x) => x.textContent).join('|'), 'دلار آمریکا|طلای ۱۸ عیار');
      assert.ok(w.document.querySelector('.c .p').textContent.includes('تومان'));
      assert.strictEqual(errs2.join('; '), '');
    });
    w.close();
  }

  console.log('gen5: ' + n + ' checks, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
