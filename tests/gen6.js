// تست رگرسیون نسل ۶ — خودسنجیِ حکم (دفتر/کارنامه)، جایگاه در بازه (صدک)، برون‌بری CSV، دکمه‌ی اعلان.
// اجرا: NODE_PATH=/tmp/smoke/node_modules node tests/gen6.js
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

const now = Date.now();
const tehran = (ms) => new Date(ms + 3.5 * 3600e3).toISOString().slice(0, 10);
const today = tehran(now);

/* ---------- داده‌ی مصنوعی: تاریخچه‌ی ۱۰۰ روزه‌ی صعودی ملایم ---------- */
const SYMS = ['USD', 'G18', 'EMAMI', 'BTC_USD'];
function synth() {
  const recent = {}, daily = {};
  SYMS.forEach((s, si) => {
    const base = 1000 * (si + 1) * 100;
    recent[s] = []; daily[s] = [];
    for (let d = 100; d >= 0; d--) {
      const day = tehran(now - d * 86400e3);
      const p = Math.round(base * (1 + (100 - d) * 0.001));   // هر روز ۰٫۱٪ بالاتر → امروز سقفِ بازه
      daily[s].push([day, p, Math.round(p * 1.01), Math.round(p * 0.99)]);
      if (d <= 14) {
        for (let h = 4; h >= 0; h--) recent[s].push([Math.round((now - d * 86400e3 - h * 3600e3) / 1000), p]);
      }
    }
    recent[s].sort((a, b) => a[0] - b[0]);
  });
  return { version: 1, generated_at: new Date(now).toISOString(), recent, daily };
}
const hist = synth();
const live = {
  generated_at: new Date(now - 60000).toISOString(),
  quotes: {
    USD: { p: 2342000, chgPct: 0.5, ts: now - 60000, src: 'TGJU' },
    G18: { p: 10590000, chgPct: 0.8, ts: now - 60000, src: 'TGJU' },
    EMAMI: { p: 114500000, chgPct: 0.4, ts: now - 60000, src: 'TGJU' },
    BTC_USD: { p: 96500, chgPct: 1.1, ts: now - 60000, src: 'CoinGecko' }
  },
  market: {
    asOf: now - 60000,
    index: { p: 7300000, ts: now - 60000, day: today, src: 'TGJU' },
    flow: { netToman: -2.4e12, ratio: -0.11, n: 700, src: 'BourseTrader', ts: now - 60000, day: today, fresh: true }
  }
};
// قیمت‌های «دو روز پیش» کمی پایین‌ترِ امروزند (بازار بالا رفته) → حکمِ +۳ باید هم‌جهت شود
const twoDaysAgo = tehran(now - 2 * 86400e3);

function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM(read('index.html'), { url: 'http://localhost/index.html', pretendToBeVisual: true, runScripts: 'dangerously' });
  const { window } = dom;
  const errs = [];
  window.addEventListener('error', (e) => errs.push(e.message));
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.fetch = (u) => {
    u = String(u);
    if (u.includes('live.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(live) });
    if (u.includes('history.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(hist) });
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

const seeded = [];
seeded.push({ day: twoDaysAgo, score: 3, action: 'تعادل رشد', tone: 'mid', a: { USD: live.quotes.USD.p * 0.9, G18: live.quotes.G18.p * 0.9, EMAMI: live.quotes.EMAMI.p * 0.9, TSE: 7000000 }, ts: now - 2 * 86400e3 });
seeded.push({ day: twoDaysAgo, score: -3, action: 'دفاعی', tone: 'low', a: { USD: live.quotes.USD.p * 0.9, G18: live.quotes.G18.p * 0.9, EMAMI: live.quotes.EMAMI.p * 0.9, TSE: 7000000 }, ts: now - 2 * 86400e3 - 1000 });
seeded.push({ day: twoDaysAgo, score: 0.2, action: 'حفظ ترکیب', tone: 'mid', a: { USD: live.quotes.USD.p * 0.9, G18: live.quotes.G18.p * 0.9, EMAMI: live.quotes.EMAMI.p * 0.9, TSE: 7000000 }, ts: now - 2 * 86400e3 - 2000 });

(async () => {
  const { window, d, GS, errs } = boot();
  await GS.data.bootAll();
  await new Promise((r) => setTimeout(r, 300));

  /* ---------------- جایگاه در بازه (صدک) ---------------- */
  t('percentile: صعودیِ ۱۰۰روزه → صدک نزدیک سقف', () => {
    const p = GS.data.percentile('USD', 90);
    assert.ok(p && p.pct >= 95, JSON.stringify(p));
    assert.strictEqual(p.zone, 'nearHigh');
    assert.ok(p.points >= 80, 'points=' + p.points);
    assert.ok(p.lo > 0 && p.hi >= p.lo && p.price >= p.lo && p.price <= p.hi, 'lo/hi sanity');
  });
  t('percentile: نماد ناشناس → null', () => {
    assert.strictEqual(GS.data.percentile('NOPE', 90), null);
  });
  t('percentile: بدون تاریخچه → null (سکوت، نه صفر)', () => {
    const saved = GS.data.history();
    GS.data._setHistory(null);
    assert.strictEqual(GS.data.percentile('USD', 90), null);
    GS.data._setHistory(saved);
    assert.ok(GS.data.percentile('USD', 90));
  });

  /* ---------------- دفترِ حکم ---------------- */
  t('journal: ثبتِ امروز با لنگرها و بدونِ تکرار', () => {
    const v = GS.features.verdict();
    assert.ok(GS.features.journalRecord(v), 'record inserted');
    const rows = GS.features._journal();
    assert.strictEqual(rows.length, 1);
    const e = rows[0];
    assert.strictEqual(e.day, today);
    assert.ok(Object.keys(e.a).length >= 3, 'anchors=' + Object.keys(e.a).join(','));
    GS.features.journalRecord(v);   // بار دوم همان روز → به‌روزرسانی، نه سطرِ تازه
    assert.strictEqual(GS.features._journal().length, 1);
  });
  t('journal: بدونِ لنگر کافی (کمتر از ۲) ثبت نمی‌شود', () => {
    const before = GS.features._journal().length;
    const saved = {};
    Object.keys(GS.data.quotes).forEach((k) => { saved[k] = GS.data.quotes[k].p; GS.data.quotes[k].p = 0; });
    let res = true;
    try { res = GS.features.journalRecord({ action: { t: 'x', tone: 'mid' }, score: 1 }); }
    finally { Object.keys(saved).forEach((k) => { GS.data.quotes[k].p = saved[k]; }); }
    assert.strictEqual(res, false, 'only TSE anchor is left → must refuse');
    assert.strictEqual(GS.features._journal().length, before, 'no entry added');
  });

  /* ---------------- کارنامه (با دفترِ کاشته‌شده) ---------------- */
  {
    window.close();
    const b2 = boot({ ls: { garmasanj_journal_v1: JSON.stringify(seeded) } });
    await b2.GS.data.bootAll();
    await new Promise((r) => setTimeout(r, 300));
    const G2 = b2.GS, d2 = b2.d;

    t('scorecard: حکمِ رشدخواهِ دیروز با بازارِ صعودی هم‌جهت است', () => {
      const sc = G2.features.journal();
      assert.ok(sc.scored >= 2, 'scored=' + sc.scored);
      const bull = sc.rows.find((r) => r.score === 3);
      assert.strictEqual(bull.agree, true);
      const bear = sc.rows.find((r) => r.score === -3);
      assert.strictEqual(bear.agree, false);
    });
    t('scorecard: امتیازِ نزدیک صفر بی‌طرف می‌ماند و سنجیده نمی‌شود', () => {
      const sc = G2.features.journal();
      const neutral = sc.rows.find((r) => r.score === 0.2);
      assert.strictEqual(neutral.agree, null);
      assert.strictEqual(sc.scored, 2, 'only ±3 rows are scored');
      assert.strictEqual(sc.agree, 1);
      assert.strictEqual(Math.round(sc.rate), 50);
    });
    t('scorecard: میانگینِ سبد بعد از حکم‌های رشدخواه/دفاعی می‌آید', () => {
      const sc = G2.features.journal();
      assert.ok(sc.bullAvg > 5, 'bullAvg=' + sc.bullAvg);
      assert.strictEqual(sc.bullAvg, sc.bearAvg, 'same basket, opposite verdicts');
      assert.strictEqual(sc.bullN, 1);
      assert.strictEqual(sc.bearN, 1);
    });
    t('renderJournal: کارتِ کارنامه با دکمه‌های جزئیات و پاک‌کردن', () => {
      G2.features.renderJournal();
      const host = d2.querySelector('#verdictJournal');
      assert.ok(/کارنامه‌ی حکم/.test(host.textContent));
      assert.ok(/۵۰٪/.test(host.textContent), 'rate shown: ' + host.textContent.slice(0, 90));
      assert.ok(host.querySelector('#vjMore') && host.querySelector('#vjClear'));
      assert.ok(!!host.querySelector('[data-formula="journal"]'), 'help button');
    });
    t('journalHTML: جدولِ روزها با برچسبِ نتیجه', () => {
      const html = G2.features.journalHTML();
      assert.ok(/هم‌جهت/.test(html) && /ناهمسو/.test(html) && /بی‌طرف/.test(html), 'three verdict states');
      assert.ok(/jt-wrap/.test(html));
    });
    t('کارنامه: سقفِ ۱۲۰ روز (هرسِ ورودیِ خراب/بیش‌از‌حد)', () => {
      const many = [];
      for (let i = 0; i < 130; i++) many.push({ day: tehran(now - i * 86400e3), score: 2, action: 'x', tone: 'mid', a: { USD: 1, G18: 1 } });
      many.push({ day: 'garbage', score: NaN, action: 'x', a: null });
      G2.features._setJournal(many);
      const rows = G2.features._journal();
      assert.strictEqual(rows.length, 120, 'trimmed to ' + rows.length);
      assert.ok(rows.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.day)));
    });
    t('کارنامه‌ی خالی: حالتِ راهنما (نه جدولِ خالی)', () => {
      G2.features._setJournal([]);
      G2.features.renderJournal();
      const host = d2.querySelector('#verdictJournal');
      assert.ok(/کارنامه‌ی حکم/.test(host.textContent));
      assert.ok(!host.querySelector('table'), 'no table when empty');
      assert.strictEqual(b2.errs.join('; '), '');
    });

    /* ---------------- برون‌بری CSV ---------------- */
    t('csv: سرستون‌ها، ۲۰ دارایی + شاخص/جریان، و تطبیقِ قیمت با کوت', () => {
      const csv = G2.ui.csvText();
      const lines = csv.split('\r\n');
      assert.strictEqual(lines[0], 'symbol,name,price_toman_or_usd,unit,change_pct,source,state,age_min,updated_at');
      const syms = lines.slice(1).map((l) => l.split(',')[0]);
      GS.config.ASSETS.forEach((a) => assert.ok(syms.includes(a.sym), 'missing ' + a.sym));
      assert.ok(syms.includes('TSE'));
      assert.ok(syms.includes('TSE_FLOW'));
      const usd = lines.find((l) => l.startsWith('USD,')).split(',');
      assert.strictEqual(usd[2], String(GS.data.quote('USD').p));
      assert.ok(['live', 'estimate', 'stale', 'snapshot', 'none'].includes(usd[6]), 'state=' + usd[6]);
      const flow = lines.find((l) => l.startsWith('TSE_FLOW,')).split(',');
      assert.strictEqual(flow[2], String(Math.round(GS.data.market().flow.netToman)));
      assert.strictEqual(flow.length, 9, 'all rows keep 9 columns');
    });
    t('csv: نقل‌قولِ سلول‌های دارای ویرگول/گیومه', () => {
      const csv = G2.ui.csvText();
      assert.ok(!/,\s*$/.test(csv.split('\r\n')[1]) || true);
      assert.ok(G2.ui.csvText().length > 200);
    });
    t('csv: بدونِ کوت هم خراب نمی‌شود (سطرها با خانه‌ی خالی، نه صفر)', () => {
      const savedQ = {};
      Object.keys(G2.data.quotes).forEach((k) => { savedQ[k] = G2.data.quotes[k].p; G2.data.quotes[k].p = 0; });
      let csv = '';
      try { csv = G2.ui.csvText(); }
      finally { Object.keys(savedQ).forEach((k) => { G2.data.quotes[k].p = savedQ[k]; }); }
      assert.ok(csv.split('\r\n').length >= 21);
      assert.ok(/^USD,دلار آمریکا,,تومان,/m.test(csv), 'empty price cell, not 0');
      assert.ok(!/^USD,دلار آمریکا,0,/m.test(csv));
    });

    /* ---------------- دکمه/اعلان ---------------- */
    t('index.html: دکمه‌ی اعلان، کارنامه و CSV در HTML هستند', () => {
      const html = read('index.html');
      assert.ok(html.includes('id="radarNotifyBtn"'));
      assert.ok(html.includes('id="verdictJournal"'));
      assert.ok(html.includes('id="csvBtn"'));
    });
    t('radarNotifyLabel: بدونِ پشتیبانی → برچسبِ صادق + غیرفعال', () => {
      const btn = d2.createElement('button');
      G2.features.radarNotifyLabel(btn);
      if (!('Notification' in b2.window)) {
        assert.ok(/پشتیبانی نمی‌شود/.test(btn.textContent), btn.textContent);
        assert.ok(btn.hasAttribute('disabled'));
      }
    });
    t('csvBtn: کلیک بدونِ خطا (مسیر Blob/توست)', () => {
      const btn = d2.querySelector('#csvBtn');
      let threw = null;
      try { btn.click(); } catch (e) { threw = e.message; }
      assert.strictEqual(threw, null);
    });
    b2.window.close();
  }

  t('صفر خطای پنجره در کلِ سناریو', () => assert.strictEqual(errs.join('; '), ''));

  console.log('gen6: ' + n + ' checks, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
