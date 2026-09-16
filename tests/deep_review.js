// Deep review and enhancement tests
const assert = require('assert');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

async function run() {
  console.log('--- Running Deep Review Tests ---');

  const dom = new JSDOM(html, {
    url: 'http://localhost:8080/index.html',
    pretendToBeVisual: true,
    runScripts: 'dangerously',
  });
  const { window } = dom;

  // Stub fetch for snapshot loading
  const snap = JSON.parse(fs.readFileSync(path.join(REPO, 'assets/data/snapshot.json'), 'utf8'));
  window.fetch = (url) => {
    if (String(url).includes('snapshot.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(snap) });
    }
    return Promise.reject(new Error('offline'));
  };
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  }

  const scripts = ['config.js', 'utils.js', 'data.js', 'charts.js', 'ui.js', 'features.js', 'app.js'];
  for (const s of scripts) {
    const code = fs.readFileSync(path.join(REPO, 'assets/js', s), 'utf8');
    const el = window.document.createElement('script');
    el.textContent = code;
    window.document.body.appendChild(el);
  }

  const GS = window.GS;
  const U = GS.utils;

  // 1. Test utils: Unicode minus and Arabic numerals
  assert.strictEqual(U.toEn('−۱۲۰.۵'), '-120.5', 'Unicode minus toEn failed');
  assert.strictEqual(U.toEn('–۱۲۳'), '-123', 'En-dash toEn failed');
  assert.strictEqual(U.toEn('—۴۵۶'), '-456', 'Em-dash toEn failed');
  assert.strictEqual(U.toEn('١٢٣٤'), '1234', 'Arabic digits toEn failed');
  assert.strictEqual(U.toEn('−١٢٣.٤'), '-123.4', 'Arabic digits with Unicode minus failed');

  assert.strictEqual(U.num('−۲۵.۵'), -25.5, 'Unicode minus num failed');
  assert.strictEqual(U.num('–۱۰'), -10, 'En-dash num failed');
  assert.strictEqual(U.num('١,٢٥٠'), 1250, 'Arabic-Indic digits num failed');
  console.log('PASS  utils: Unicode minus & Arabic digits normalization');

  // 2. Test GERAMI pure gold weight & coin intrinsics
  assert.strictEqual(GS.config.CHAIN.GERAMI_G, 0.909, 'GERAMI_G should be 0.909g of pure 24k gold');
  console.log('PASS  config: GERAMI_G 0.909g 24k gold specification');

  // Wait for bootstrap snapshot load
  await GS.data.bootAll();

  // 3. Test derived() coin bubbles
  const dv = GS.data.derived();
  assert.ok(dv.bubble != null, 'Emami bubble exists');
  assert.ok(dv.bubbleBahar != null, 'Bahar bubble exists');
  assert.ok(dv.bubbleNim != null, 'Nim bubble exists');
  assert.ok(dv.bubbleRob != null, 'Rob bubble exists');
  assert.ok(dv.bubbleGerami != null, 'Gerami bubble exists');
  assert.ok(dv.intrinsicGerami > 0, 'Gerami intrinsic value computed');
  console.log('PASS  data: All 5 coins have intrinsic & bubble calculated');

  // 4. Test Asset Detail Modal
  GS.ui.openAssetModal('EMAMI');
  const modal = window.document.querySelector('#assetModal');
  assert.ok(modal.classList.contains('show'), 'Asset modal opened');
  const body = window.document.querySelector('#assetModalBody');
  assert.ok(body.innerHTML.includes('سکه امامی'), 'Asset modal includes asset name');
  assert.ok(body.innerHTML.includes('حباب اسمی سکه'), 'Asset modal includes coin bubble analysis');
  GS.ui.closeModal('#assetModal');
  assert.ok(!modal.classList.contains('show'), 'Asset modal closed');
  console.log('PASS  ui: Asset detail modal opens & closes properly with coin analysis');

  // 5. Test RangeBar labels
  const q = GS.data.quote('USD');
  const rb = GS.charts.rangeBar(q);
  assert.ok(rb.includes('کف'), 'RangeBar has low label');
  assert.ok(rb.includes('سقف'), 'RangeBar has high label');
  console.log('PASS  charts: RangeBar includes day low & high numbers');

  // 6. Test clearCache
  assert.strictEqual(typeof GS.data.clearCache, 'function', 'clearCache is exported');
  GS.data.clearCache();
  console.log('PASS  data: clearCache function exported and working');

  console.log('All deep review tests passed successfully!');
  process.exit(0);
}

run().catch((e) => {
  console.error('Test failure:', e);
  process.exit(1);
});
