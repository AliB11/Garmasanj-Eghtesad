/* ============================================================
   گرماسنج — پروبِ امکان‌سنجیِ بورس (scripts/probe_bourse.cjs)
   از GitHub Actions (IP خارجی) اجرا می‌شود تا معلوم شود کدام منبعِ بورس
   در دسترس است و هر کدام چه شکلی پاسخ می‌دهد. فقط می‌خواند؛
   تنها خروجی‌اش یک فایلِ گزارش است (هیچ فایلِ داده‌ای را تغییر نمی‌دهد).

   اجرا:  node scripts/probe_bourse.cjs [--out=reports/probe-bourse.md]
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const UA = 'garmasanj-probe/1.0 (+https://github.com/AliB11/Garmasanj-Eghtesad)';
const TIMEOUT = 12000;

/* نامزدها: هر چه خودِ سایتِ TSETMC و پروژه‌های متن‌باز استفاده می‌کنند */
const CANDIDATES = [
  { tag: 'clientTypeAll', url: 'http://tsetmc.com/tsev2/data/ClientTypeAll.aspx', want: 'جریان پول حقیقی/حقوقیِ همه‌ی نمادها' },
  { tag: 'clientTypeAll.tls', url: 'https://tsetmc.com/tsev2/data/ClientTypeAll.aspx', want: 'همان، روی https' },
  { tag: 'closingPriceAll', url: 'http://tsetmc.com/tsev2/data/ClosingPriceAll.aspx', want: 'قیمت پایانیِ همه‌ی نمادها' },
  { tag: 'marketWatchInit', url: 'http://tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0', want: 'دیده‌بان (قیمت/حجم/ارزش)' },
  { tag: 'marketWatchPlus', url: 'http://tsetmc.com/tsev2/data/MarketWatchPlus.aspx?h=0&r=0', want: 'دیده‌بانِ پیشرفته' },
  { tag: 'indexChart', url: 'http://tsetmc.com/tsev2/chart/data/Index.aspx?i=32097828799138957&t=value', want: 'نمودار شاخص کل' },
  { tag: 'cdn.tsetmc', url: 'https://cdn.tsetmc.com/api/Instrument/GetInstrumentSearch/%D9%81%D9%85%D9%84%DB%8C', want: 'API جدید روی CDN' },
  { tag: 'tgju.ajax', url: 'https://call5.tgju.org/ajax.json', want: 'کلیدهای بورسیِ TGJU' },
  { tag: 'brsapi.nokey', url: 'https://BrsApi.ir/api/Market/GetMarketOverview', want: 'BrsApi بدون کلید (انتظار ۴۰۱)' },
  { tag: 'egress.geo', url: 'https://ipinfo.io/json', want: 'کشورِ IP خروجیِ اکشن' },
  /* ---- دورِ دوم: میزبان‌ها/مسیرهای دیگر ---- */
  { tag: 'www.tsetmc', url: 'https://www.tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0', want: 'TSETMC روی www' },
  { tag: 'cdn.marketOverview', url: 'https://cdn.tsetmc.com/api/MarketData/GetMarketOverview/1', want: 'خلاصه‌ی بازار روی CDN' },
  { tag: 'cdn.clientType', url: 'https://cdn.tsetmc.com/api/ClientType/GetClientTypeAll/1', want: 'حقیقی/حقوقی روی CDN' },
  { tag: 'tse.ir', url: 'https://tse.ir/', want: 'سایت رسمیِ بورس تهران' },
  { tag: 'service.tsetmc', url: 'https://service.tsetmc.com/WebService/TsePublicV2.asmx', want: 'وب‌سرویس رسمی (نیازمند اشتراک)' },
  { tag: 'bourse-trader', url: 'https://bourse-trader.ir/api/?task=api', want: 'وب‌سرویسِ ثالث' },
  /* ---- دورِ سوم: تاریخچه‌ی شاخص (برای منطقِ «این هفته») ---- */
  { tag: 'yahoo.tedpix', url: 'https://query1.finance.yahoo.com/v8/finance/chart/%5ETEDPIX?range=1mo&interval=1d', want: 'تاریخچه‌ی شاخص از یاهو' },
  { tag: 'yahoo.search', url: 'https://query1.finance.yahoo.com/v1/finance/search?q=tehran&quotesCount=10', want: 'جست‌وجوی نمادِ تهران در یاهو' },
  { tag: 'stooq.tedpix', url: 'https://stooq.com/q/d/l/?s=%5Etedpix&i=d', want: 'تاریخچه‌ی شاخص از استوک' },
  { tag: 'stooq.tse', url: 'https://stooq.com/q/?s=%5Etedpix', want: 'صفحه‌ی شاخص در استوک' },
];

/** کلید در هیچ خروجی‌ای نباید بیاید */
function redact(url) { return String(url).replace(/([?&](?:api_key|key)=)[^&]+/i, '$1***'); }

function clean(s, n) {
  return String(s).replace(/\s+/g, ' ').replace(/[|`]/g, ' ').slice(0, n || 150);
}

async function probe(c) {
  const out = { tag: c.tag, url: c.url, want: c.want, ok: false, status: null, bytes: 0, ms: null, note: '', sample: '' };
  const ctl = new AbortController();
  const timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} }, TIMEOUT);
  const t0 = Date.now();
  try {
    const r = await fetch(c.url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': UA, Accept: '*/*' } });
    out.status = r.status; out.ok = r.ok; out.ms = Date.now() - t0;
    const buf = Buffer.from(await r.arrayBuffer());
    out.bytes = buf.length;
    const txt = buf.toString('utf8');
    out.sample = clean(buf.toString('latin1').replace(/[^\x09\x20-\x7e]/g, '.'), 170);
    if (!r.ok) out.note = 'رد/بلاک؟';
    if (/^\s*<(!doctype|html)/i.test(txt)) out.note = (out.note + ' پاسخ HTML، نه داده').trim();
    if (out.ok && out.bytes < 40) out.note = (out.note + ' پاسخِ تقریباً خالی').trim();
  } catch (e) {
    out.note = 'خطا: ' + clean(String((e && e.message) || e), 60);
    out.ms = Date.now() - t0;
  } finally {
    clearTimeout(timer);
  }
  return out;
}

(async () => {
  const lines = [];
  const say = (s) => { lines.push(s); console.log(s); };
  let tgjuRowDump = '';

  say('=== گرماسنج — پروب امکان‌سنجیِ بورس ===');
  say('زمان (UTC): ' + new Date().toISOString());

  const results = [];
  for (const c of CANDIDATES) {
    const r = await probe(c);
    results.push(r);
    say(`[${r.ok ? 'OK ' : 'NO '}] ${r.tag}  status=${r.status} bytes=${r.bytes} ms=${r.ms} ${r.note}`);
    if (r.sample) say(`      نمونه: ${r.sample}`);
  }

  /* کلیدهای بورسیِ TGJU */
  const tgjuKeys = [];
  const tgju = results.find((r) => r.tag === 'tgju.ajax');
  if (tgju && tgju.ok) {
    try {
      const r = await fetch('https://call5.tgju.org/ajax.json', { signal: AbortSignal.timeout(TIMEOUT), headers: { 'User-Agent': UA } });
      const j = await r.json();
      const cur = j.current || {};
      const keys = Object.keys(cur);
      const re = /shakhes|index|bourse|tedpix|tedix|tefix|tepi|farabourse|ارزش|حقیقی|پول/i;
      const hit = keys.filter((k) => {
        const e = cur[k] || {};
        const blob = [k, e.name, e.title, e.name_fa, e.ts].filter(Boolean).join(' ');
        return re.test(blob);
      });
      say(`\n--- کلیدهای بورسیِ TGJU: ${hit.length} از ${keys.length} کلید ---`);
      hit.slice(0, 40).forEach((k) => {
        const e = cur[k] || {};
        const nm = clean(e.name || e.title || e.name_fa || '', 40);
        tgjuKeys.push({ k, p: e.p, name: nm, ts: e.ts || '' });
        say(`   ${k}  p=${e.p}  name=${nm}  ts=${e.ts || ''}`);
      });
      if (!hit.length) say('   هیچ کلیدِ بورسی در ajax.json نبود.');
      ['bourse', 'bourse_nikkei-225', 'bourse_asia-dow'].forEach((k) => {
        if (cur[k]) {
          tgjuRowDump += k + ': ' + JSON.stringify(cur[k], null, 1) + '\n';
          say(`   شیء کاملِ ${k}: ` + JSON.stringify(cur[k]).slice(0, 500));
        }
      });
      // جست‌وجوی سراسری: هر کلیدی که در مقدار یا نامش واژه‌ی بورسی دارد
      const persian = /شاخص|ارزش معاملات|حقیقی|ورود پول|فرابورس|هم.?وزن/;
      const deep = keys.filter((k) => persian.test(JSON.stringify(cur[k] || {})) || persian.test(k));
      say(`\n--- کلیدهایی که متنِ بورسیِ فارسی دارند: ${deep.length} ---`);
      deep.slice(0, 25).forEach((k) => {
        const line = `${k} = ` + JSON.stringify(cur[k]).slice(0, 160);
        deepLines.push(line);
        say('   ' + line);
      });
      // نمونه‌ی شکلِ کلیِ آبجکت (برای اینکه بدانیم name/title کجاست)
      const some = keys.slice(0, 3);
      some.forEach((k) => say(`   نمونه-ساختار ${k}: ` + JSON.stringify(cur[k]).slice(0, 300)));
    } catch (e) {
      say('\n--- parse نشد: ' + clean(String((e && e.message) || e), 80));
    }
  }

  /* ---- بورس‌تریدر: HTML است یا JSON؟ ساختارِ خام را بیاور ---- */
  const btLines = [];
  const BT = 'https://bourse-trader.ir/api/?task=api';
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} }, 20000);
    const r = await fetch(BT, { signal: ctl.signal, headers: { 'User-Agent': UA } });
    clearTimeout(timer);
    const raw = await r.text();
    btLines.push('- وضعیت: ' + r.status + ' · بایت: ' + raw.length + ' · نوع: ' + (r.headers.get('content-type') || '?'));
    say('\n--- بورس‌تریدر: ' + r.status + ' · ' + raw.length + ' بایت ---');

    // ۱) آیا اندپوینتِ JSON در صفحه هست؟
    const urls = new Set();
    const pats = [/["'`](\/api\/[^"'`\s)]{2,80})["'`]/g, /["'`](https?:\/\/[^"'`\s)]*\/api\/[^"'`\s)]{0,60})["'`]/g, /\?task=([a-zA-Z0-9_\-]{2,30})/g];
    pats.forEach((re) => { let m; while ((m = re.exec(raw)) && urls.size < 25) urls.add(m[0].replace(/["'`]/g, '')); });
    btLines.push('- نشانی‌های پیدا شده: ' + (urls.size ? [...urls].slice(0, 20).join(' | ') : 'هیچ'));
    say('   نشانی‌ها: ' + (urls.size ? [...urls].slice(0, 12).join(' | ') : 'هیچ'));

    // ۲) برشِ خام دورِ برچسب‌های کلیدی (برای نوشتنِ پارسرِ دقیق)
    const labels = ['شاخص کل', 'شاخص هم وزن', 'شاخص کل فرابورس', 'ارزش بازار',
      'ورود پول حقیقی', 'ارزش معاملات', 'صندوق درآمدثابت', 'تعداد نماد مثبت', 'سرانه خرید حقیقی'];
    for (const lb of labels) {
      const i = raw.indexOf(lb);
      if (i < 0) { btLines.push('- `' + lb + '`: پیدا نشد'); continue; }
      const count = raw.split(lb).length - 1;
      const snip = clean(raw.slice(Math.max(0, i - 120), i + 320), 380);
      btLines.push('- `' + lb + '` (' + count + ' بار): `' + snip.replace(/`/g, "'") + '`');
      say('   ' + lb + ' (' + count + '): ' + snip.slice(0, 160));
    }
  } catch (e) {
    btLines.push('- خطا: ' + clean(String((e && e.message) || e), 80));
    say('   خطا: ' + clean(String((e && e.message) || e), 80));
  }

  /* ---- مسیرهای کلیددار: فقط وقتی کلید در محیط باشد ----
     هدف: پیدا کردنِ مسیرِ درستِ اندپوینت و نامِ واقعیِ فیلدها،
     بدونِ چاپِ خودِ کلید. */
  const keyLines = [];
  const BRS_KEY = (process.env.BRS_API_KEY || '').trim();
  const NAV_KEY = (process.env.NAVASAN_KEY || '').trim();
  const BASE = 'https://BrsApi.ir/Api/Tsetmc';
  const PATHS = ['MarketWatch.php', 'Market.php', 'All.php', 'Tse.php', 'Bourse.php',
    'Overview.php', 'MarketOverview.php', 'ClientType.php', 'Symbol.php', 'Index.php'];

  async function keyProbe(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} }, TIMEOUT);
    const t0 = Date.now();
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': UA, Accept: 'application/json' } });
      const txt = await r.text();
      const out = { status: r.status, bytes: txt.length, ms: Date.now() - t0, note: '', keys: [], fields: [], rows: 0 };
      try {
        const j = JSON.parse(txt);
        const msg = j && (j.error || j.message || j.msg || j.ErrorMessage || j.Message);
        if (msg) { out.note = 'پیامِ سرویس: ' + clean(msg, 90); return out; }
        const rows = Array.isArray(j) ? j : (Array.isArray(j.data) ? j.data : (Array.isArray(j.result) ? j.result : null));
        out.keys = Object.keys(j || {}).slice(0, 12);
        if (rows && rows.length) {
          out.rows = rows.length;
          out.fields = Object.keys(rows[0] || {}).slice(0, 30);
        } else out.note = 'ردیفی نبود';
      } catch (e) { out.note = 'پاسخ JSON نبود: ' + clean(txt, 90); }
      return out;
    } catch (e) {
      return { status: 'خطا', bytes: 0, ms: Date.now() - t0, note: clean(String((e && e.message) || e), 60), keys: [], fields: [], rows: 0 };
    } finally { clearTimeout(timer); }
  }

  if (BRS_KEY) {
    say('\n--- BrsApi با کلید: جست‌وجوی مسیر و نقشه‌ی فیلدها ---');
    for (const p of PATHS) {
      const url = BASE + '/' + p + '?key=' + encodeURIComponent(BRS_KEY) + '&type=1';
      const r = await keyProbe(url);
      const line = p + ' → status=' + r.status + ' bytes=' + r.bytes + ' ردیف=' + r.rows +
        (r.note ? ' · ' + r.note : '') +
        (r.fields.length ? ' · فیلدها: ' + r.fields.join(', ') : '') +
        (r.rows ? '' : (r.keys.length ? ' · کلیدهای ریشه: ' + r.keys.join(', ') : ''));
      keyLines.push('- `' + clean(redact(url), 70) + '` → ' + line);
      say('   ' + line);
    }
  } else say('\n--- BRS_API_KEY در محیط نبود (مسیرِ کلیددارِ بورس تست نشد) ---');

  if (NAV_KEY) {
    say('\n--- ناواسان با کلید ---');
    const url = 'https://api.navasan.tech/latest/?api_key=' + encodeURIComponent(NAV_KEY);
    const r = await keyProbe(url);
    const line = 'status=' + r.status + ' bytes=' + r.bytes + ' ms=' + r.ms +
      (r.note ? ' · ' + r.note : '') + ' · کلیدها: ' + r.keys.join(', ') +
      (r.fields.length ? ' · فیلدهای اولین: ' + r.fields.join(', ') : '');
    keyLines.push('- `' + clean(redact(url), 70) + '` → ' + line);
    say('   ' + line);
  } else say('--- NAVASAN_KEY در محیط نبود (مسیرِ کلیددارِ ناواسان تست نشد) ---');

  /* ---- گزارش مارک‌داون ---- */
  const md = [];
  const deepLines = [];
  md.push('# گزارش پروبِ امکان‌سنجیِ بورس');
  md.push('');
  md.push('این فایل را **خودِ جریان کاری** بعد از اجرای `scripts/probe_bourse.cjs` از روی یک رانرِ');
  md.push('GitHub Actions (IP خارجِ ایران) نوشته است. فقط برای تصمیم‌گیریِ فنی است و');
  md.push('هیچ فایلِ داده‌ای (`live.json` / `history.json`) را تغییر نمی‌دهد.');
  md.push('');
  md.push('- زمان (UTC): `' + new Date().toISOString() + '`');
  const geo = results.find((r) => r.tag === 'egress.geo' && r.ok && r.sample);
  md.push('- مبدأ درخواست: ' + (geo ? '`' + geo.sample.slice(0, 120) + '`' : 'نامشخص'));
  md.push('');
  md.push('## نتیجه‌ی هر نامزد');
  md.push('');
  md.push('| منبع | وضعیت | بایت | زمان (ms) | یادداشت | نمونه‌ی پاسخ |');
  md.push('|---|---|---:|---:|---|---|');
  results.forEach((r) => {
    md.push(`| \`${r.tag}\` | ${r.ok ? '✅ ' + r.status : '❌ ' + (r.status || 'خطا')} | ${r.bytes} | ${r.ms} | ${r.note || '—'} | \`${r.sample.replace(/`/g, "'")}\` |`);
  });
  md.push('');
  md.push('## کلیدهای بورسیِ TGJU');
  md.push('');
  if (tgjuKeys.length) {
    md.push('| کلید | مقدار | نام |');
    md.push('|---|---|---|');
    tgjuKeys.forEach((x) => md.push(`| \`${x.k}\` | ${x.p} | ${x.name || '—'} |`));
  } else {
    md.push('هیچ کلیدِ بورسی در `ajax.json` پیدا نشد.');
  }
  md.push('');
  md.push('## شکلِ دقیقِ ورودیِ بورس در TGJU');
  md.push('');
  md.push('```json');
  md.push(tgjuRowDump || '(در دسترس نبود)');
  md.push('```');
  md.push('');
  md.push('## واکاویِ متنِ فارسی در TGJU (جست‌وجوی «شاخص/ارزش معاملات/حقیقی/ورود پول/فرابورس/هم‌وزن»)');
  md.push('');
  md.push((deepLines.length ? deepLines.map((l) => '- `' + l.replace(/`/g, "'") + '`').join('\n') : 'هیچ کلیدی با این واژه‌ها پیدا نشد.'));
  md.push('');
  md.push('## بورس‌تریدر (bourse-trader.ir) — ساختارِ خام');
  md.push('');
  md.push(btLines.length ? btLines.join('\n') : 'بررسی نشد.');
  md.push('');
  md.push('## مسیرهای کلیددار (بدون نمایشِ کلید)');
  md.push('');
  md.push(keyLines.length ? keyLines.join('\n') : 'هیچ کلیدی در محیط نبود (Secrets تنظیم نشده).');
  md.push('');
  md.push('## URLهای امتحان‌شده');
  md.push('');
  results.forEach((r) => md.push(`- \`${r.url}\` — ${r.want}`));
  md.push('');

  const arg = process.argv.slice(2).find((a) => a.startsWith('--out='));
  if (arg) {
    const p = path.resolve(process.cwd(), arg.slice(6));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, md.join('\n') + '\n');
    console.log('\nگزارش نوشته شد: ' + p);
  }

  const reach = results.filter((r) => r.ok && r.bytes > 0).map((r) => r.tag);
  const dead = results.filter((r) => !r.ok || !r.bytes).map((r) => r.tag);
  console.log('\nدر دسترس: ' + reach.join(', '));
  console.log('بی‌پاسخ : ' + dead.join(', '));
})();
