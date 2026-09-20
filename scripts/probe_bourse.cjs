/* ============================================================
   گرماسنج — پروبِ امکان‌سنجیِ بورس (scripts/probe_bourse.cjs)
   یک‌بار (یا هر وقت خواستی) به‌صورت دستی از GitHub Actions اجرا می‌شود تا
   معلوم شود کدام منبعِ بورس از IPِ خارجی در دسترس است و هر کدام چه شکلی
   پاسخ می‌دهد. هیچ فایلِ داده‌ای را تغییر نمی‌دهد؛ فقط گزارش می‌نویسد.

   اجرا:  node scripts/probe_bourse.cjs
   ============================================================ */
'use strict';

const UA = 'garmasanj-probe/1.0 (+https://github.com/AliB11/Garmasanj-Eghtesad)';

/* نامزدها: هر چه پروژه‌های متن‌باز و خودِ سایتِ TSETMC استفاده می‌کنند */
const CANDIDATES = [
  /* ---- جریان پول (حقیقی/حقوقی) — چیزی که واقعاً می‌خواهیم ---- */
  { tag: 'tsetmc.clientTypeAll', url: 'http://tsetmc.com/tsev2/data/ClientTypeAll.aspx', want: 'client type همه‌ی نمادها' },
  { tag: 'tsetmc.clientTypeAll.tls', url: 'https://tsetmc.com/tsev2/data/ClientTypeAll.aspx', want: 'همان، روی https' },
  { tag: 'tsetmc.clientTypeOne', url: 'http://tsetmc.com/tsev2/data/ClientType.aspx?i=NNN', want: 'client type تک‌نماد (الگو)' },
  /* ---- قیمت/ارزش معاملات برای تبدیل حجم به ریال ---- */
  { tag: 'tsetmc.closingPriceAll', url: 'http://tsetmc.com/tsev2/data/ClosingPriceAll.aspx', want: 'قیمت پایانی همه‌ی نمادها' },
  { tag: 'tsetmc.marketWatchInit', url: 'http://tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0', want: 'دیده‌بان (قیمت/حجم/ارزش)' },
  { tag: 'tsetmc.marketWatchPlus', url: 'http://tsetmc.com/tsev2/data/MarketWatchPlus.aspx?h=0&r=0', want: 'دیده‌بانِ پیشرفته' },
  /* ---- شاخص‌ها ---- */
  { tag: 'tsetmc.indexB2', url: 'http://tsetmc.com/tsev2/data/IndexB2Last.aspx', want: 'شاخص‌ها (الگو)' },
  { tag: 'tsetmc.indexChart', url: 'http://tsetmc.com/tsev2/chart/data/Index.aspx?i=32097828799138957&t=value', want: 'نمودار شاخص کل' },
  /* ---- میزبان‌های جایگزین ---- */
  { tag: 'cdn.tsetmc', url: 'https://cdn.tsetmc.com/api/Instrument/GetInstrumentSearch/%D9%81%D9%85%D9%84%DB%8C', want: 'API جدید روی CDN' },
  { tag: 'tgju.ajax', url: 'https://call5.tgju.org/ajax.json', want: 'کلیدهای بورسیِ TGJU' },
  { tag: 'brsapi.nokey', url: 'https://BrsApi.ir/api/Market/GetMarketOverview', want: 'BrsApi بدون کلید (انتظار ۴۰۱)' },
  /* ---- زمینه: از کجا داریم فراخوانی می‌کنیم؟ ---- */
  { tag: 'egress.ip', url: 'https://api.ipify.org?format=json', want: 'IP خروجیِ اکشن' },
  { tag: 'egress.geo', url: 'https://ipinfo.io/json', want: 'کشورِ IP خروجی' },
];

async function probe(c) {
  const out = { tag: c.tag, url: c.url, want: c.want, ok: false, status: null, bytes: 0, type: null, ms: null, note: '', sample: '' };
  const ctl = new AbortController();
  const timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} }, 12000);
  const t0 = Date.now();
  try {
    const r = await fetch(c.url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': UA, Accept: '*/*' } });
    out.status = r.status; out.ok = r.ok; out.ms = Date.now() - t0;
    out.type = (r.headers.get('content-type') || '').slice(0, 60);
    const buf = Buffer.from(await r.arrayBuffer());
    out.bytes = buf.length;
    const txt = buf.toString('utf8');
    const printable = buf.toString('latin1').replace(/[^\x09\x0a\x20-\x7e]/g, '.');
    out.sample = printable.slice(0, 260).replace(/\s+/g, ' ');
    if (/invalid|not found|error|forbidden|access denied|captcha|blocked/i.test(txt.slice(0, 400)) && !r.ok) out.note = 'رد شدن/بلاک؟';
    if (/<html|<!doctype/i.test(txt.slice(0, 40))) out.note = (out.note + ' پاسخ HTML (نه داده)').trim();
  } catch (e) {
    out.note = 'خطا: ' + String((e && e.message) || e).slice(0, 80);
    out.ms = Date.now() - t0;
  } finally {
    clearTimeout(timer);
  }
  return out;
}

(async () => {
  console.log('=== گرماسنج — پروب امکان‌سنجیِ بورس ===');
  console.log('زمان (UTC): ' + new Date().toISOString());
  const results = [];
  for (const c of CANDIDATES) {
    const r = await probe(c);
    results.push(r);
    console.log(`\n[${r.ok ? 'OK ' : 'NO '}] ${r.tag}  status=${r.status} bytes=${r.bytes} ms=${r.ms} ${r.note}`);
    console.log(`      ${r.url}`);
    if (r.sample) console.log(`      نمونه: ${r.sample}`);
  }

  /* اگر TGJU در دسترس بود، کلیدهای بورسی‌اش را بگرد */
  const tgju = results.find((r) => r.tag === 'tgju.ajax');
  if (tgju && tgju.ok) {
    try {
      const r = await fetch('https://call5.tgju.org/ajax.json', { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': UA } });
      const j = await r.json();
      const cur = j.current || {};
      const keys = Object.keys(cur);
      const hit = keys.filter((k) => /shakhes|index|bourse|tedpix|tedix|tefix|tepi|farabourse/i.test(k));
      console.log('\n--- کلیدهای بورسیِ TGJU (' + hit.length + ' از ' + keys.length + ' کلید) ---');
      hit.slice(0, 40).forEach((k) => {
        const e = cur[k] || {};
        console.log(`   ${k}  p=${e.p} name=${(e.name || '').toString().slice(0, 40)} ts=${e.ts || ''}`);
      });
      if (!hit.length) console.log('   هیچ کلیدِ بورسی در ajax.json نبود.');
    } catch (e) {
      console.log('\n--- نتوانستیم ajax.json را parse کنیم: ' + ((e && e.message) || e));
    }
  }

  console.log('\n=== خلاصه ===');
  const reach = results.filter((r) => r.ok && r.bytes > 0);
  const dead = results.filter((r) => !r.ok || !r.bytes);
  console.log('در دسترس: ' + reach.map((r) => r.tag).join(', '));
  console.log('بی‌پاسخ : ' + dead.map((r) => r.tag).join(', '));
  console.log('\n(این پروب فقط می‌خواند؛ هیچ فایل داده‌ای را تغییر نمی‌دهد.)');
})();
