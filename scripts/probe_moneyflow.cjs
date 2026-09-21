/* ============================================================
   گرماسنج — پروبِ «روند پول» (scripts/probe_moneyflow.cjs)
   از GitHub Actions (IP خارجی) اجرا می‌شود تا دو چیز معلوم شود:
     ۱) چرا جریانِ پولِ بورس‌تریدر (منبعِ فعلی) دیگر استخراج نمی‌شود؟
     ۲) tablokhani.com چه داده‌ای و با چه ساختاری می‌دهد؟
   فقط می‌خواند و تنها خروجی‌اش یک فایلِ گزارش است؛ هیچ فایلِ
   داده‌ای (live.json / history.json) را تغییر نمی‌دهد.

   اجرا:  node scripts/probe_moneyflow.cjs [--out=reports/probe-moneyflow.md]
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const UA = 'garmasanj-probe/1.0 (+https://github.com/AliB11/Garmasanj-Eghtesad)';
const TIMEOUT = 20000;

const CANDIDATES = [
  { tag: 'tk.robots', url: 'https://tablokhani.com/robots.txt', want: 'مجوزِ واکشی (Disallow دارد؟)' },
  { tag: 'tk.home', url: 'https://tablokhani.com/', want: 'صفحه‌ی اصلی: شاخص‌ها، صف‌ها، سریِ روز' },
  { tag: 'tk.api.root', url: 'https://api.tablokhani.com/', want: 'زیردامنه‌ی api' },
  { tag: 'tk.hotmoney', url: 'https://tablokhani.com/stock-screener/hot-money', want: 'پول داغ (معاملاتِ درشتِ حقیقی)' },
  { tag: 'tk.marketgame', url: 'https://tablokhani.com/stock-screener/market-game', want: 'بازیِ بازار (خرد/متوسط/بزرگ)' },
  { tag: 'tk.bigmoves', url: 'https://tablokhani.com/stock-screener/big-moves', want: 'تحرکاتِ بزرگان (ورود/خروجِ ۱۰ دقیقه‌ای)' },
  { tag: 'tk.hall', url: 'https://tablokhani.com/trading-hall/stocks', want: 'تالارِ معاملات' },
  { tag: 'bt.api', url: 'https://bourse-trader.ir/api/?task=api', want: 'بورس‌تریدر — منبعِ فعلیِ جریانِ پول' },
];

/* برچسب‌هایی که در تابلوخوانی دنبالشان می‌گردیم (برای نوشتنِ پارسر) */
const TK_LABELS = [
  'شاخص کل', 'شاخص هم‌وزن', 'شاخص فرابورس', 'ارزش کل معاملات',
  'تعداد صف‌های خرید و فروش', 'ارزش صف‌های خرید و فروش', 'صف خرید', 'صف فروش',
  'پول هوشمند', 'اشخاص حقیقی', 'اشخاص حقوقی', 'عرضه و تقاضا',
  'سرانه خرید', 'سرانه فروش', 'ورود پول', 'خروج پول', 'حجم مشکوک',
  'power', 'money', 'flow', 'queue',
];

function clean(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').slice(0, n || 160); }
/** متن را برای چاپ در مارک‌داون ایمن کن */
function md(s, n) { return clean(s, n).replace(/`/g, "'").replace(/\|/g, '\\|'); }

async function grab(url, opts) {
  const o = opts || {};
  const ctl = new AbortController();
  const timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} }, o.timeout || TIMEOUT);
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      signal: ctl.signal, redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'fa,en;q=0.8' },
    });
    const txt = await r.text();
    return { ok: r.ok, status: r.status, bytes: txt.length, ms: Date.now() - t0, type: r.headers.get('content-type') || '?', text: txt };
  } catch (e) {
    return { ok: false, status: 'خطا', bytes: 0, ms: Date.now() - t0, type: '?', text: '', note: clean(String((e && e.message) || e), 70) };
  } finally { clearTimeout(timer); }
}

/** برشِ خام دورِ یک برچسب (برای نوشتنِ پارسر) */
function around(html, label, before, after) {
  const i = html.indexOf(label);
  if (i < 0) return null;
  const n = (html.split(label).length - 1);
  return { count: n, snippet: clean(html.slice(Math.max(0, i - (before || 150)), i + (after || 450)), (before || 150) + (after || 450)) };
}

/** نشانی‌های درونِ صفحه که به API می‌خورند */
function findApiUrls(html, cap) {
  const out = new Set();
  const pats = [
    /["'`]((?:https?:)?\/\/[^"'`\s)]{0,60}\/api\/[^"'`\s)]{0,60})["'`]/g,
    /["'`](\/api\/[A-Za-z0-9_\-/.?=&]{2,70})["'`]/g,
    /(?:fetch|axios\.(?:get|post)|ajax)\s*\(\s*["'`]([^"'`\s)]{4,120})["'`]/g,
    /url\s*:\s*["'`]([^"'`\s)]{4,120})["'`]/g,
  ];
  for (const re of pats) {
    let m;
    while ((m = re.exec(html)) && out.size < (cap || 40)) {
      const u = m[1];
      if (/^https?:\/\/(www\.)?(google|gstatic|facebook|twitter|aparat|cdn)\./i.test(u)) continue;
      out.add(u);
    }
  }
  return [...out];
}

/** بلوک‌های داده‌یِ توکار (JSONِ سمت‌سرور) */
function findInlineJson(html) {
  const out = [];
  const pats = [
    /window\.__([A-Z_]{2,20})__\s*=/g,
    /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]{0,400}?)<\/script>/g,
    /(?:const|let|var)\s+([A-Za-z_$][\w$]{2,40})\s*=\s*(\{|\[)/g,
    /data-(?:series|chart|json)\s*=\s*["']([^"']{20,600})["']/g,
  ];
  for (const re of pats) {
    let m;
    while ((m = re.exec(html)) && out.length < 25) {
      out.push(m[0].slice(0, 120) + (m[1] && m[1].length > 20 ? ' → ' + clean(m[1], 120) : ''));
    }
  }
  return out;
}

(async () => {
  const lines = [];
  const say = (s) => { lines.push(s); console.log(s); };

  say('# گزارش پروبِ «روند پول» — تابلوخوانی + بورس‌تریدر');
  say('');
  say('این فایل را **خودِ جریان کاری** بعد از اجرای `scripts/probe_moneyflow.cjs` روی یک رانرِ');
  say('GitHub Actions (IP خارجِ ایران) نوشته است. مبنای تصمیم برای نوشتن/اصلاحِ پارسرهاست؛');
  say('هیچ فایلِ داده‌ای را تغییر نمی‌دهد.');
  say('');
  say('- زمان (UTC): `' + new Date().toISOString() + '`');
  const geo = await grab('https://ipinfo.io/json', { timeout: 12000 });
  say('- مبدأ درخواست: `' + (geo.ok ? md(geo.text, 160) : 'نامشخص') + '`');
  say('');

  /* ---------- ۱) دسترسی‌پذیری ---------- */
  say('## ۱) دسترسی‌پذیری از رانر');
  say('');
  say('| منبع | وضعیت | بایت | زمان (ms) | نوع | یادداشت |');
  say('|---|---|---:|---:|---|---|');
  const got = {};
  for (const c of CANDIDATES) {
    const r = await grab(c.url);
    got[c.tag] = r;
    say(`| \`${c.tag}\` | ${r.ok ? '✅ ' + r.status : '❌ ' + r.status} | ${r.bytes} | ${r.ms} | \`${md(r.type, 40)}\` | ${md(r.note || c.want, 70)} |`);
  }
  say('');

  /* ---------- ۲) تابلوخوانی: ساختارِ خام ---------- */
  say('## ۲) تابلوخوانی — ساختارِ خامِ صفحه‌ی اصلی');
  say('');
  const home = got['tk.home'];
  if (!home || !home.ok || !home.text) {
    say('صفحه‌ی اصلی در دسترس نبود — ادامه‌ی بررسیِ تابلوخوانی ممکن نیست.');
  } else {
    const html = home.text;
    say('- حجم: ' + home.bytes + ' بایت · نوع: `' + md(home.type, 40) + '`');
    say('');
    const urls = findApiUrls(html, 40);
    say('### ۲٫۱) نشانی‌های API پیدا شده در صفحه');
    say('');
    say(urls.length ? urls.slice(0, 30).map((u) => '- `' + md(u, 120) + '`').join('\n') : '- هیچ نشانیِ API پیدا نشد (احتمالاً داده در خودِ HTML است).');
    say('');
    say('### ۲٫۲) بلوک‌های داده‌یِ توکار');
    say('');
    const ij = findInlineJson(html);
    say(ij.length ? ij.slice(0, 15).map((u) => '- `' + md(u, 160) + '`').join('\n') : '- بلوکِ JSON توکاری پیدا نشد.');
    say('');
    say('### ۲٫۳) برشِ خام دورِ برچسب‌های کلیدی');
    say('');
    for (const lb of TK_LABELS) {
      const a = around(html, lb, 200, 520);
      say('- **`' + lb + '`** — ' + (a ? a.count + ' بار:\n  ```html\n  ' + md(a.snippet, 700) + '\n  ```' : 'پیدا نشد'));
    }
    say('');
    say('### ۲٫۴) نمونه‌ی سریِ زمانی (صف‌های خرید/فروش)');
    say('');
    ['09:00', 'page-queue', 'chart', 'series', 'labels'].forEach((k) => {
      const a = around(html, k, 120, 420);
      say('- `' + k + '`: ' + (a ? a.count + ' بار → `' + md(a.snippet, 460) + '`' : 'پیدا نشد'));
    });
    say('');
    say('### ۲٫۵) جدول‌های صفحه (سطر/ستون)');
    say('');
    const tables = html.split(/<table/gi).length - 1;
    say('- تعداد `<table>`: ' + tables);
    const ths = [];
    const reTh = /<t[hd][^>]*>([\s\S]{0,80}?)<\/t[hd]>/gi;
    let m;
    while ((m = reTh.exec(html)) && ths.length < 60) {
      const t = m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (t) ths.push(t);
    }
    say('- سرستون‌ها/سلول‌های متنی (۶۰ تای اول): ' + ths.map((t) => '`' + md(t, 24) + '`').join(' '));
    say('');
  }

  /* ---------- ۳) زیردامنه و اندپوینت‌های حدسی ---------- */
  say('## ۳) اندپوینت‌های JSON (حدسی + استخراج‌شده)');
  say('');
  const guesses = [
    'https://api.tablokhani.com/api/market',
    'https://api.tablokhani.com/api/v1/market',
    'https://tablokhani.com/api/market',
    'https://tablokhani.com/api/v1/market/overview',
  ];
  const extracted = (home && home.ok) ? findApiUrls(home.text, 12).map((u) => (/^https?:/.test(u) ? u : 'https://tablokhani.com' + u)) : [];
  const tries = [...new Set([...guesses, ...extracted])].slice(0, 14);
  for (const u of tries) {
    const r = await grab(u, { timeout: 12000 });
    const isJson = /^\s*[[{]/.test(r.text || '');
    say('- `' + md(u, 90) + '` → ' + (r.ok ? r.status : '❌ ' + r.status) + ' · ' + r.bytes + ' بایت · ' +
      (isJson ? '**JSON**' : 'JSON نیست') + ' · `' + md(r.text.replace(/<[^>]*>/g, ' '), 150) + '`');
  }
  say('');

  /* ---------- ۴) صفحاتِ اسکرینرِ تابلوخوانی ---------- */
  say('## ۴) صفحاتِ پول‌محورِ تابلوخوانی');
  say('');
  for (const tag of ['tk.hotmoney', 'tk.marketgame', 'tk.bigmoves']) {
    const r = got[tag];
    if (!r || !r.ok) { say('- `' + tag + '`: در دسترس نبود (' + (r ? r.status : '?') + ')'); continue; }
    say('- **`' + tag + '`** — ' + r.bytes + ' بایت');
    ['ورود پول', 'خروج پول', 'پول داغ', 'حقیقی', 'حقوقی', 'سرانه', 'بزرگ', 'متوسط', 'خرد'].forEach((lb) => {
      const a = around(r.text, lb, 120, 320);
      if (a) say('  - `' + lb + '` (' + a.count + ' بار): `' + md(a.snippet, 380) + '`');
    });
    const us = findApiUrls(r.text, 8);
    if (us.length) say('  - API: ' + us.slice(0, 6).map((u) => '`' + md(u, 70) + '`').join(' '));
  }
  say('');

  /* ---------- ۵) بورس‌تریدر: چرا جریانِ پول استخراج نمی‌شود؟ ---------- */
  say('## ۵) بورس‌تریدر — کالبدشکافیِ پارسرِ فعلی');
  say('');
  const bt = got['bt.api'];
  if (!bt || !bt.ok) {
    say('صفحه در دسترس نبود: ' + (bt ? bt.status + ' ' + (bt.note || '') : '—'));
  } else {
    say('- حجم: ' + bt.bytes + ' بایت · نوع: `' + md(bt.type, 40) + '`');
    let P = null;
    try { P = require('./publish.cjs'); } catch (e) { say('- خطا در بارگذاریِ publish.cjs: ' + md(String((e && e.message) || e), 120)); }
    if (P) {
      let pr;
      try { pr = P.parseBourseTrader(bt.text); } catch (e) { pr = { ok: false, why: 'خطا: ' + ((e && e.message) || e) }; }
      say('- `parseBourseTrader.ok`: **' + pr.ok + '**' + (pr.why ? ' — ' + md(pr.why, 120) : ''));
      say('- بخش‌های استخراج‌شده: `' + md(Object.keys(pr).filter((k) => pr[k] && k !== 'ok' && k !== 'src' && k !== 'missing').join(', '), 200) + '`');
      if (pr.missing && pr.missing.length) say('- missing: `' + pr.missing.map((x) => md(x, 60)).join('، ') + '`');
      say('');
      say('```json');
      say(JSON.stringify(pr, null, 1).slice(0, 3000));
      say('```');
      say('');
      /* خروجیِ خامِ همان سلول‌هایی که پارسر دنبالشان می‌گردد */
      say('### ۵٫۱) ردیف‌های خامِ جدولِ پایش (همان‌هایی که پارسر می‌خواند)');
      say('');
      try {
        const pt = P.btTable(bt.text, 'payeshTable');
        say('- ستون‌ها (' + pt.ths.length + '): ' + pt.ths.map((t) => '`' + md(t, 20) + '`').join(' '));
        pt.rows.slice(0, 30).forEach((r) => {
          say('  - `' + md(r.t[0], 30) + '` → ' + r.t.slice(1).map((c) => '`' + md(c, 18) + '`').join(' '));
        });
      } catch (e) { say('- خطا در btTable: ' + md(String((e && e.message) || e), 120)); }
      say('');
      say('### ۵٫۲) برشِ خام دورِ «ورود پول حقیقی» و «ارزش معاملات»');
      say('');
      ['ورود پول حقیقی', 'ارزش معاملات', 'سرانه خرید حقیقی', 'صف خرید', 'نماد مثبت'].forEach((lb) => {
        const a = around(bt.text, lb, 200, 600);
        say('- `' + lb + '`: ' + (a ? a.count + ' بار → `' + md(a.snippet, 700) + '`' : 'پیدا نشد'));
      });
      say('');
      say('- جلسه‌ی تهران باز است؟ ' + (P.tseSessionOpen(Date.now()) ? 'بله' : 'خیر'));
    }
  }
  say('');
  say('## ۶) نشانی‌های امتحان‌شده');
  say('');
  CANDIDATES.forEach((c) => say('- `' + c.url + '` — ' + c.want));

  const arg = process.argv.slice(2).find((a) => a.startsWith('--out='));
  if (arg) {
    const p = path.resolve(process.cwd(), arg.slice(6));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, lines.join('\n') + '\n');
    console.log('\nگزارش نوشته شد: ' + p);
  }
})();
