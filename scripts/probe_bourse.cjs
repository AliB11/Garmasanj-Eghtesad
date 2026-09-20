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
];

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
      const hit = keys.filter((k) => /shakhes|index|bourse|tedpix|tedix|tefix|tepi|farabourse/i.test(k));
      say(`\n--- کلیدهای بورسیِ TGJU: ${hit.length} از ${keys.length} کلید ---`);
      hit.slice(0, 30).forEach((k) => {
        const e = cur[k] || {};
        tgjuKeys.push({ k, p: e.p, name: clean(e.name || '', 30), ts: e.ts || '' });
        say(`   ${k}  p=${e.p}  name=${clean(e.name || '', 30)}  ts=${e.ts || ''}`);
      });
      if (!hit.length) say('   هیچ کلیدِ بورسی در ajax.json نبود.');
    } catch (e) {
      say('\n--- parse نشد: ' + clean(String((e && e.message) || e), 80));
    }
  }

  /* ---- گزارش مارک‌داون ---- */
  const md = [];
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
