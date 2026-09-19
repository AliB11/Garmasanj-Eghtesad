// بازبینی ۳۶۰ درجه — تست‌های رگرسیون برای ایرادهای پیداشده و رفع‌شده.
// Run: NODE_PATH=/tmp/smoke/node_modules node tests/review360.js   (needs: npm i jsdom)
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const REPO = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const SCRIPTS = ['config.js', 'utils.js', 'data.js', 'charts.js', 'ui.js', 'features.js', 'app.js'];

const checks = [];
const ok = (name, cond, extra) => checks.push({ name, pass: !!cond, extra: extra || '' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const jres = (j) => Promise.resolve({ ok: true, json: () => Promise.resolve(j), text: () => Promise.resolve(JSON.stringify(j)) });
const jrej = () => Promise.reject(new Error('mock-offline'));

/** «بازار بسته»: همه‌ی کوت‌های تهران بی‌تغییر، فقط رمزارز متحرک (وضعیت واقعی جمعه‌ها) */
function closedMarketLive() {
  const now = Date.now();
  const flat = (p) => ({ p, chg: 0, chgPct: 0, high: p * 1.01, low: p * 0.99, ts: now - 2 * 3600e3, src: 'TGJU' });
  return {
    generated_at: new Date().toISOString(), generated_fa: 'تست',
    quotes: {
      USD: flat(227900), EUR: flat(262290), GBP: flat(304910), AED: flat(62355), CHF: flat(277130), CNY: flat(34240), TRY: flat(4745),
      G18: flat(23363000), G24: flat(31150400), MESGHAL: flat(101198000), OUNCE_USD: { p: 4383, chg: 2, chgPct: 0.05, ts: now, src: 'TGJU' },
      EMAMI: flat(231985000), BAHAR: flat(228105000), NIM: flat(119000000), ROB: flat(63000000), GERAMI: flat(33000000),
      USDT: { p: 227229, chgPct: -0.42, ts: now, src: 'والکس' },
      BTC_TM: { p: 18274928851, chgPct: 4.61, ts: now, src: 'والکس' },
      BTC_USD: { p: 81130, chgPct: 5.87, ts: now, src: 'اجماع جهانی', agree: 4 },
    },
    fx: { date: '2026-09-18', rates: { EUR: 0.8726, GBP: 0.749, CHF: 0.826, CNY: 6.7, TRY: 48.8 } },
  };
}

function boot(fetchFn, opts) {
  opts = opts || {};
  const dom = new JSDOM(html, { url: 'http://localhost/index.html', pretendToBeVisual: true, runScripts: 'dangerously' });
  const { window } = dom;
  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  if (opts.beforeScripts) opts.beforeScripts(window);
  window.fetch = fetchFn;
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  for (const s of (opts.scripts || SCRIPTS)) {
    const el = window.document.createElement('script');
    el.textContent = fs.readFileSync(path.join(REPO, 'assets/js', s), 'utf8');
    window.document.body.appendChild(el);
  }
  return { dom, window, d: window.document, GS: window.GS, errors };
}

(async () => {
  /* ============ ۱) بازار بسته/بی‌تغییر دیگر «منفی» خوانده نمی‌شود ============ */
  {
    const LV = closedMarketLive();
    const { window, d, GS, errors } = boot((u) => String(u).includes('live.json') ? jres(LV) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);
    const m = GS.data.mood();
    ok('1a mood excludes derived (n=19)', m.n === 19, 'n=' + m.n);
    ok('1b flat majority detected (quiet)', m.quiet === true && m.flat >= 80, 'flat=' + m.flat + '%');
    ok('1c score not negative on flat market (was −36)', m.score >= 0, 'score=' + m.score);
    ok('1d breadth among movers only', m.breadth >= 60, 'breadth=' + m.breadth);
    ok('1e ups/downs/flat sum ≈ 100', Math.abs(m.ups + m.downs + m.flat - 100) <= 2, [m.ups, m.downs, m.flat].join('/'));
    const v = GS.features.verdict();
    ok('1f verdict not defensive on flat market', v.action.tone !== 'cold' && v.action.tone !== 'ice', 'tone=' + v.action.tone + ' / ' + v.action.t);
    ok('1g verdict explains flat market', v.reasons.some((r) => r.includes('بی‌تغییر')), v.reasons.join(' | '));
    ok('1h no "اکثر دارایی‌ها منفی‌اند" lie', !v.reasons.concat(v.warns).some((r) => r.includes('اکثر دارایی‌ها منفی')));
    const reg = GS.features.regimeOf();
    ok('1i regime = کم‌تحرک (not risk-off)', reg.key === 'neutral' && reg.label.includes('کم‌تحرک'), reg.label);
    const moodMsg = d.querySelector('#moodMsg').textContent;
    ok('1j gauge message mentions flat share', moodMsg.includes('بی‌تغییر'), moodMsg);
    // پول داغ: آخرین ردیف بی‌تغییر نباید «خروج / سرد» برچسب بخورد
    const rows = [...d.querySelectorAll('#flowBars .flow-row')];
    const lastTag = rows[rows.length - 1].querySelector('.fl-val small').textContent;
    ok('1k hot-money flat row not labeled "خروج / سرد"', !lastTag.includes('خروج'), lastTag);
    ok('1l breadth meter shows up/down/flat', (d.querySelector('#breadthMeter').textContent || '').includes('بی‌تغییر'));
    ok('1m no window errors', errors.length === 0, errors.join(';'));
    window.close();
  }

  /* ============ ۲) خودترمیمی نگهبان جهش ============ */
  {
    const LV = closedMarketLive();
    const { window, GS } = boot((u) => String(u).includes('live.json') ? jres(LV) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(200);
    const p0 = GS.data.quote('USD').p;
    const tg = (p) => ({ current: { price_dollar_rl: { p: String(p * 10), dp: 1, dt: 'high', ts: '2026-09-19 10:00:00' } } });
    GS.data._ingest('tgju', tg(Math.round(p0 * 1.4)));
    ok('2a first +40% rejected', GS.data.quote('USD').p === p0, 'p=' + GS.data.quote('USD').p);
    GS.data._ingest('tgju', tg(Math.round(p0 * 1.41)));
    ok('2b second (same band) still rejected', GS.data.quote('USD').p === p0);
    GS.data._ingest('tgju', tg(Math.round(p0 * 1.4)));
    ok('2c third consecutive confirmation accepted', Math.abs(GS.data.quote('USD').p / (p0 * 1.4) - 1) < 0.01, 'p=' + GS.data.quote('USD').p);
    // جهش‌های پراکنده (مقادیر مختلف) هرگز پذیرفته نمی‌شوند
    const p1 = GS.data.quote('USD').p;
    GS.data._ingest('tgju', tg(Math.round(p1 * 2)));
    GS.data._ingest('tgju', tg(Math.round(p1 * 3)));
    GS.data._ingest('tgju', tg(Math.round(p1 * 4)));
    ok('2d scattered outliers never accepted', GS.data.quote('USD').p === p1, 'p=' + GS.data.quote('USD').p);
    // مقدار طبیعی، شمارنده را صفر می‌کند
    GS.data._ingest('tgju', tg(Math.round(p1 * 1.01)));
    ok('2e normal move accepted + resets counter', Math.abs(GS.data.quote('USD').p / (p1 * 1.01) - 1) < 0.01 && !GS.data._rejects.USD);
    window.close();
  }

  /* ============ ۳) حریم خصوصی: کلید ناواسان هرگز از پراکسی عبور نمی‌کند ============ */
  {
    const urls = [];
    const { window, GS } = boot((u) => { urls.push(String(u)); return jrej(); }, { scripts: ['config.js', 'utils.js', 'data.js'] });
    GS.data._irDelay(20);
    window.localStorage.setItem('garmasanj_navasan_v6', JSON.stringify('SECRET-KEY-123'));
    await GS.data.tickSlow(); await wait(400);
    const navUrls = urls.filter((u) => u.includes('SECRET-KEY-123'));
    ok('3a navasan called directly', navUrls.some((u) => u.startsWith('https://api.navasan.tech/')), navUrls.join(' , '));
    ok('3b key never sent to a proxy', !navUrls.some((u) => /isomorphic-git|allorigins/.test(u)), navUrls.join(' , '));
    ok('3c navasan marked failed (not idle) after direct failure', GS.data.src.navasan.ok === false, GS.data.src.navasan.note);
    window.close();
  }

  /* ============ ۴) آینه‌ی چسبان TGJU ============ */
  {
    const urls = [];
    const { window, GS } = boot((u) => {
      u = String(u); urls.push(u);
      if (u.startsWith('https://call2.tgju.org')) return jres({ current: { price_dollar_rl: { p: '2279000', dp: 0.1, dt: 'high', ts: '2026-09-19 10:00:00' } } });
      return jrej();
    }, { scripts: ['config.js', 'utils.js', 'data.js'] });
    GS.data._irDelay(20); GS.data._mirrorStagger(5);
    await GS.data.tickFast();
    ok('4a winner remembered', window.localStorage.getItem('garmasanj_tgju_mirror_v1') === JSON.stringify('https://call2.tgju.org'), window.localStorage.getItem('garmasanj_tgju_mirror_v1'));
    urls.length = 0;
    await GS.data.tickFast();
    const firstTgju = urls.find((u) => u.includes('tgju.org'));
    ok('4b next cycle tries winner first', firstTgju && firstTgju.startsWith('https://call2.tgju.org'), firstTgju);
    window.close();
  }

  /* ============ ۵) اسنپ‌شات تازه‌تر بر کش قدیمی‌تر مقدم است ============ */
  {
    const SNAP = { generated_at: new Date(Date.now() - 3600e3).toISOString(), generated_fa: 'x', quotes: { USD: { p: 250000, chgPct: 0.1, ts: Date.now() - 3600e3 } } };
    const { window, GS } = boot((u) => String(u).includes('snapshot.json') ? jres(SNAP) : jrej(), {
      scripts: ['config.js', 'utils.js', 'data.js'],
      beforeScripts: (w) => w.localStorage.setItem('garmasanj_quotes_v7', JSON.stringify({ ts: Date.now() - 5 * 86400e3, q: { USD: { p: 200000, src: 'tgju', srcFa: 'TGJU', ts: Date.now() - 5 * 86400e3 } } })),
    });
    await GS.data.bootAll();
    ok('5a newer snapshot replaces 5-day-old cache', GS.data.quote('USD').p === 250000 && GS.data.quote('USD').src === 'snapshot', 'p=' + GS.data.quote('USD').p + ' src=' + GS.data.quote('USD').src);
    window.close();
  }
  {
    const SNAP = { generated_at: new Date(Date.now() - 5 * 86400e3).toISOString(), generated_fa: 'x', quotes: { USD: { p: 250000, chgPct: 0.1, ts: Date.now() - 5 * 86400e3 } } };
    const { window, GS } = boot((u) => String(u).includes('snapshot.json') ? jres(SNAP) : jrej(), {
      scripts: ['config.js', 'utils.js', 'data.js'],
      beforeScripts: (w) => w.localStorage.setItem('garmasanj_quotes_v7', JSON.stringify({ ts: Date.now() - 3600e3, q: { USD: { p: 200000, src: 'tgju', srcFa: 'TGJU', ts: Date.now() - 3600e3 } } })),
    });
    await GS.data.bootAll();
    ok('5b newer cache kept over old snapshot', GS.data.quote('USD').p === 200000, 'p=' + GS.data.quote('USD').p);
    window.close();
  }

  /* ============ ۶) «از آخرین بازدیدت» ============ */
  {
    const LV = closedMarketLive();
    let since = null;
    const { window, GS } = boot((u) => String(u).includes('live.json') ? jres(LV) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej(), {
      scripts: ['config.js', 'utils.js', 'data.js'],
      beforeScripts: (w) => w.localStorage.setItem('garmasanj_quotes_v7', JSON.stringify({ ts: Date.now() - 2 * 3600e3, q: {
        USD: { p: 220000, ts: Date.now() - 2 * 3600e3 }, G18: { p: 23000000, ts: Date.now() - 2 * 3600e3 }, EMAMI: { p: 230000000, ts: Date.now() - 2 * 3600e3 },
      } })),
    });
    GS.data.on('since', (x) => { since = x; });
    await GS.data.bootAll();
    GS.data._irDelay(20); GS.data._mirrorStagger(5);
    await GS.data.tickFast();
    ok('6a since-visit emitted once', !!since && since.rows.length >= 2, since ? since.rows.map((r) => r.sym + ':' + r.pct.toFixed(1)).join(',') : 'none');
    ok('6b usd delta ≈ +3.6%', since && Math.abs(since.rows.find((r) => r.sym === 'USD').pct - 3.59) < 0.1);
    const again = GS.data.sinceLastVisit();
    ok('6c does not fire twice', again == null);
    window.close();
  }

  /* ============ ۷) تعامل‌های UI ============ */
  {
    const LV = closedMarketLive();
    const { window, d, GS, errors } = boot((u) => String(u).includes('live.json') ? jres(LV) : String(u).includes('snapshot.json') ? jres({ generated_at: '', quotes: {} }) : jrej());
    await GS.data.bootAll(); await wait(300);

    // ۷الف) رادار: مشتق‌ها دکمه‌ی رادار ندارند؛ انتخاب خالی کرش نمی‌کند
    GS.ui.openAssetModal('OUNCE_TM');
    ok('7a derived asset has no radar button', !d.querySelector('#amRadarBtn'));
    GS.ui.closeModal('#assetModal');
    GS.ui.openAssetModal('USD');
    ok('7b modal shows buying-power row', (d.querySelector('#assetModalBody').textContent || '').includes('چقدر می‌خری'));
    d.querySelector('#amRadarBtn').click();
    ok('7c radar prefilled + focused', d.querySelector('#radarMarket').value === 'USD' && d.activeElement === d.querySelector('#radarTarget'));
    d.querySelector('#radarMarket').value = '';
    d.querySelector('#radarTarget').value = '123456';
    d.querySelector('#radarAdd').click();
    ok('7d empty asset → toast, no crash', errors.length === 0 && d.querySelectorAll('#radarItems .r-item').length === 0);
    d.querySelector('#radarMarket').value = 'USD';
    d.querySelector('#radarTarget').value = String(GS.data.quote('USD').p);
    d.querySelector('#radarAdd').click();
    ok('7e target == current price rejected', d.querySelectorAll('#radarItems .r-item').length === 0);
    d.querySelector('#radarTarget').value = String(GS.data.quote('USD').p + 5000);
    d.querySelector('#radarAdd').click();
    d.querySelector('#radarTarget').value = String(GS.data.quote('USD').p + 5000);
    d.querySelector('#radarAdd').click();
    ok('7f duplicate radar rejected', d.querySelectorAll('#radarItems .r-item').length === 1);
    ok('7g radar shows direction', (d.querySelector('#radarItems .r-item small').textContent || '').includes('صعود'));

    // ۷ب) جهت رادار بدون قیمت، با اولین داده تعیین می‌شود
    const saved = JSON.parse(window.localStorage.getItem('garmasanj_alerts_v6'));
    saved.push({ s: 'EUR', target: GS.data.quote('EUR').p - 1000, dir: null, done: false });
    window.localStorage.setItem('garmasanj_alerts_v6', JSON.stringify(saved));
    GS.features.initRadar(); GS.features.checkRadars();
    const eurAl = JSON.parse(window.localStorage.getItem('garmasanj_alerts_v6')).find((x) => x.s === 'EUR');
    ok('7h null direction resolved to "down" on first price', eurAl && eurAl.dir === 'down' && !eurAl.done, JSON.stringify(eurAl));

    // ۷ج) هیت‌مپ: کلیک روی کاشی زیر تبِ دیگر، تب را به «همه» برمی‌گرداند
    d.querySelector('.cat-tab[data-cat="crypto"]').click();
    d.querySelector('[data-heat="G18"]').click();
    const g18 = d.querySelector('.qcard[data-sym="G18"]');
    ok('7i heat click makes hidden card visible', g18.style.display !== 'none' && g18.classList.contains('flash'));
    ok('7j tabs carry aria-selected', d.querySelector('.cat-tab[data-cat="all"]').getAttribute('aria-selected') === 'true');

    // ۷د) شبیه‌ساز: برچسب نرخ با تغییر حالت/تورم به‌روز می‌شود و ردیف‌ها رتبه‌ای می‌مانند
    const lbl = () => d.querySelector('#simBars .bar-row[data-id="USD"] .bar-name small').textContent;
    const onLbl = lbl();
    d.querySelector('#simSync').click();
    ok('7k sim rate label updates on sync toggle', lbl() !== onLbl && lbl().includes('۶۰٪'), onLbl + ' → ' + lbl());
    ok('7l sim toggle aria-pressed', d.querySelector('#simSync').getAttribute('aria-pressed') === 'false');
    const vals = [...d.querySelectorAll('#simBars .bar-row')].map((r) => +r.querySelector('.js-v').dataset.v);
    ok('7m sim rows stay ranked after re-render', vals.every((v, i) => i === 0 || vals[i - 1] >= v), vals.map((v) => Math.round(v / 1e6)).join(','));

    // ۷ه) مودال: بازگشت فوکوس به بازکننده
    const card = d.querySelector('.qcard[data-sym="EUR"]');
    card.focus(); card.click();
    ok('7n modal opens from card', d.querySelector('#assetModal').classList.contains('show'));
    GS.ui.closeModal('#assetModal');
    ok('7o focus restored to opener', d.activeElement === card);

    // ۷و) خلاصه‌ی اشتراک
    window.navigator.clipboard = { writeText: (t) => { window.__copied = t; return Promise.resolve(); } };
    const res = await GS.ui.shareSummary();
    ok('7p share summary copied', res === 'copied' && /دلار/.test(window.__copied) && /حکم امروز/.test(window.__copied) && /alib11\.github\.io/.test(window.__copied));

    // ۷ز) پیل شبکه صادقانه
    GS.ui.renderNetPill(false);
    ok('7q net pill reflects live count', /زنده|محدود|بی‌پاسخ/.test(d.querySelector('#netStatus').textContent));

    // ۷ح) قیمت‌های سکه/مثقال با ارقام کامل (نه «۲۳۲.۰م»)
    const emamiTxt = d.querySelector('.qcard[data-sym="EMAMI"] [data-f="price"]').textContent;
    ok('7r coin price shown in full digits', emamiTxt.includes(',') && !emamiTxt.includes('م'), emamiTxt);
    const btcTxt = d.querySelector('.qcard[data-sym="BTC_TM"] [data-f="price"]').textContent;
    ok('7s BTC toman still compact', btcTxt.includes('میلیارد'), btcTxt);

    // ۷ط) شمارنده‌های هیرو از تنظیمات
    ok('7t hero counters from config', d.querySelector('[data-stat="sources"]').dataset.cnt === String(GS.config.SOURCES.length));

    // ۷ی) live.json برچسب منبع اصلی را نگه می‌دارد
    ok('7u live.json keeps original source name', (GS.data.quote('USDT').srcFa || '').includes('والکس'), GS.data.quote('USDT').srcFa);

    ok('7v no window errors', errors.length === 0, errors.join(';'));
    window.close();
  }

  /* ============ ۸) ایستایی‌ها: HTML/CSS/SW ============ */
  {
    const css = fs.readFileSync(path.join(REPO, 'assets/css/main.css'), 'utf8');
    const sw = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');
    const utils = fs.readFileSync(path.join(REPO, 'assets/js/utils.js'), 'utf8');
    ok('8a anchors have scroll-margin-top', /scroll-margin-top/.test(css));
    ok('8b reduced-motion stops ticker loop', /\.tk-track\{animation:none/.test(css));
    ok('8c reveal delays defined', /\.rv\[data-d="2"\]/.test(css));
    ok('8d session badge style', /\.qc-badge\.session/.test(css));
    ok('8e no empty <label></label>', !/<label><\/label>/.test(html));
    ok('8f canonical is absolute', /rel="canonical" href="https:\/\//.test(html));
    ok('8g theme-color matches manifest', /theme-color" content="#0B0F14"/.test(html));
    ok('8h sw cache bumped', /garmasanj-shell-v1\d/.test(sw));
    ok('8i dead proxy layer removed from utils', !/PROXIES|raceFetch|tsetmc/i.test(utils));
    const dimHex = (css.match(/--dim:(#[0-9A-Fa-f]{6})/) || [])[1];
    const lum = (hex) => { const c = hex.slice(1).match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const cr = (lum(dimHex) + 0.05) / (lum('#131A23') + 0.05);
    ok('8j --dim contrast ≥ 4.5:1 on card', cr >= 4.5, dimHex + ' → ' + cr.toFixed(2));
  }

  let fail = 0;
  for (const c of checks) {
    console.log((c.pass ? 'PASS' : 'FAIL') + '  ' + c.name + (c.extra ? '  [' + c.extra + ']' : ''));
    if (!c.pass) fail++;
  }
  console.log('review360: ' + checks.length + ' checks, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
