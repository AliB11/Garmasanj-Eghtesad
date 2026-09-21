// Smoke test: boot the app in jsdom (no network) and assert structure + no fatal errors.
// Run: NODE_PATH=/tmp/smoke/node_modules node tests/smoke.js   (needs: npm i jsdom)
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const REPO = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  url: 'http://localhost:8080/index.html',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
});

const { window } = dom;
window.addEventListener('error', (e) => errors.push('window.onerror: ' + e.message));

// stub fetch: fail fast (offline simulation)
window.fetch = () => Promise.reject(new Error('offline-sim'));
if (!window.matchMedia) {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
}

const scripts = ['config.js', 'utils.js', 'data.js', 'charts.js', 'ui.js', 'features.js', 'app.js'];
for (const s of scripts) {
  const code = fs.readFileSync(path.join(REPO, 'assets/js', s), 'utf8');
  try {
    const el = window.document.createElement('script');
    el.textContent = code;
    window.document.body.appendChild(el);
  } catch (e) {
    console.error('EVAL FAIL in ' + s + ': ' + (e.stack || e));
    process.exit(1);
  }
}

setTimeout(() => {
  const d = window.document;
  const GS = window.GS;
  const checks = [];
  const ok = (name, cond, extra) => {
    checks.push({ name, pass: !!cond, extra: extra || '' });
  };

  ok('GS namespace', !!GS);
  ok('assets=20', GS && GS.config && GS.config.ASSETS.length === 20, 'got=' + (GS.config.ASSETS.length));
  // ۱۳ منبع قدیم + «شاخص بورس (TGJU)» + «جریان پول بورس» + «بورس‌تریدر» + «تابلوخوانی» = ۱۷
  ok('sources=17', GS.config.SOURCES.length === 17, 'got=' + GS.config.SOURCES.length);
  ok('qcards=20', d.querySelectorAll('#assetGrid .qcard').length === 20, 'got=' + d.querySelectorAll('#assetGrid .qcard').length);
  ok('cat tabs=5', d.querySelectorAll('.cat-tab').length === 5);
  ok('ticker items=26 (dup)', d.querySelectorAll('#tickerTrack .tk').length === 26, 'got=' + d.querySelectorAll('#tickerTrack .tk').length);
  ok('mood svg', !!d.querySelector('#moodSvg svg'));
  ok('mood needle', !!d.querySelector('#moodNeedle'));
  // چهار کارت قدیم + کارتِ «شاخص کل بورس»
  ok('macro cards=5', d.querySelectorAll('#macroStrip .mc').length === 5, 'got=' + d.querySelectorAll('#macroStrip .mc').length);
  ok('sim bars=8', d.querySelectorAll('#simBars .bar-row').length === 8, 'got=' + d.querySelectorAll('#simBars .bar-row').length);
  ok('sim report=3', d.querySelectorAll('#simReport .rp').length === 3);
  ok('donut segments=7', d.querySelectorAll('#mixDonut .seg-c').length === 7);
  ok('mix legend=7', d.querySelectorAll('#mixLegend .lg-row').length === 7);
  ok('radar options=19', d.querySelectorAll('#radarMarket option').length === 19, 'got=' + d.querySelectorAll('#radarMarket option').length);
  ok('health rows=17', d.querySelectorAll('#healthTable .h-row').length === 17, 'got=' + d.querySelectorAll('#healthTable .h-row').length);
  ok('health note', (d.querySelector('#healthNote').textContent || '').length > 20);
  ok('flowBars rendered', (d.querySelector('#flowBars').textContent || '').length > 5);
  ok('regime badge', !!d.querySelector('#regimeBadge b'));
  ok('sessions strip', (d.querySelector('#sessStrip').textContent || '').includes('رمزارز'));
  ok('status strip=4', d.querySelectorAll('#srcStrip .src').length === 4);
  ok('todayFa set', (d.querySelector('#todayFa').textContent || '').length > 5);
  ok('inflNote mentions ۴۲', (d.querySelector('#inflNote').textContent || '').includes('۴۲'));
  ok('pulse rendered', (d.querySelector('#pulseCards').textContent || '').length > 3);
  ok('verdict renders', !!d.querySelector('#verdictBody .verdict h3'));
  ok('verdict dial', !!d.querySelector('#verdictBody .v-dial'));
  ok('verdict steps=3', d.querySelectorAll('#verdictBody .v-cols ol li').length === 3);
  ok('chain cards=6', d.querySelectorAll('#chainFlow .ch-card').length === 6);
  ok('chain signal', (d.querySelector('#chainSignal').textContent || '').length > 5);
  ok('heat tiles=19', d.querySelectorAll('#heatGrid .heat-tile').length === 19);

  // tab filter
  const goldTab = d.querySelector('.cat-tab[data-cat="gold"]');
  goldTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const visGold = Array.from(d.querySelectorAll('#assetGrid .qcard')).filter((c) => c.style.display !== 'none');
  ok('tab filters gold=5', visGold.length === 5 && visGold.every((c) => c.dataset.cat === 'gold'), 'got=' + visGold.length);
  d.querySelector('.cat-tab[data-cat="all"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  // radar add flow
  const target = d.querySelector('#radarTarget');
  target.value = '1000000';
  d.querySelector('#radarAdd').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  ok('radar added', d.querySelectorAll('#radarItems .r-item').length === 1);
  ok('radar persisted', (window.localStorage.getItem('garmasanj_alerts_v6') || '').includes('1000000'));

  // mix change
  const radio = d.querySelector('input[name=rk][value="3"]');
  radio.checked = true;
  radio.dispatchEvent(new window.Event('change', { bubbles: true }));
  ok('mix name جسور', (d.querySelector('#mixName').textContent || '').includes('جسور'));

  // sim input
  const amt = d.querySelector('#simAmount');
  amt.value = '50000000';
  amt.dispatchEvent(new window.Event('input', { bubbles: true }));
  ok('sim title ۵۰ میلیون', (d.querySelector('#simTitleAmt').textContent || '').includes('۵۰'));

  // toast from engine event
  GS.data.emit('toast', { kind: 'ok', title: 'تست', msg: 'پیام آزمایشی' });
  ok('toast renders', d.querySelectorAll('#toasts .toast').length >= 1);

  // diag modal
  d.querySelector('#diagBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  ok('diag modal builds', (d.querySelector('#diagBody').textContent || '').length > 20);
  d.querySelector('#diagModal [data-dg-close]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  // settings modal + manual usd
  d.querySelector('#srcSettingsBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  ok('settings modal opens', d.querySelector('#settingsModal').classList.contains('show'));
  d.querySelector('#manUsd').value = '950000';
  d.querySelector('#manSave').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  ok('manual usd sets quote', GS.data.quote('USD').p === 950000, 'got=' + GS.data.quote('USD').p);
  ok('manual labeled دستی', (d.querySelector('.qcard[data-sym="USD"] [data-f="src"]').textContent || '').includes('دستی'));
  d.querySelector('#srcSettingsBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  d.querySelector('#manClear').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  ok('manual cleared', GS.data.getManualUsd() == null);

  // header settings button
  d.querySelector('#headSettingsBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  ok('header settings opens', d.querySelector('#settingsModal').classList.contains('show'));
  d.querySelector('#settingsModal [data-st-close]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  // heat tile click flashes card
  const tile = d.querySelector('[data-heat="G18"]');
  tile.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  ok('heat click flashes card', d.querySelector('.qcard[data-sym="G18"]').classList.contains('flash'));

  // engine primitives
  ok('mood obj', typeof GS.data.mood() === 'object' && isFinite(GS.data.mood().score));
  ok('derived obj', typeof GS.data.derived() === 'object');
  ok('chain obj', typeof GS.data.chain() === 'object');
  ok('verdict obj', typeof GS.features.verdict() === 'object' && !!GS.features.verdict().action);
  ok('heatOf finite all', GS.config.ASSETS.every((a) => isFinite(GS.features.heatOf(a.sym))));
  ok('no NaN slopes', GS.config.ASSETS.every((a) => isFinite(GS.data.slope(a.sym))));

  let fail = 0;
  for (const c of checks) {
    console.log((c.pass ? 'PASS' : 'FAIL') + '  ' + c.name + (c.extra ? '  [' + c.extra + ']' : ''));
    if (!c.pass) fail++;
  }
  console.log('window errors: ' + errors.length);
  errors.slice(0, 10).forEach((e) => console.log('  ERR: ' + e));
  window.close();
  process.exit(fail || errors.length ? 1 : 0);
}, 1500);
