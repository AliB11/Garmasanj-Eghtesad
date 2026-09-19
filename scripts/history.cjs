/* ============================================================
   گرماسنج — تاریخچه‌ی قیمت از انتشارهای زنده (history.cjs)
   هر بار که ناشر live.json را می‌سازد، یک نقطه به history.json
   افزوده می‌شود؛ پس تاریخچه بدون هیچ سرور یا دیتابیسی ساخته می‌شود.
   بازسازی کامل از تاریخچه‌ی گیت هم ممکن است (--backfill).

   ساختار assets/data/history.json:
   {
     version: 1, generated_at: ISO,
     recent: { SYM: [[epochSec, price], ...] }          // نقاط خام ۱۴ روز اخیر
     daily:  { SYM: [["YYYY-MM-DD", close, high, low], ...] } // خلاصه‌ی روزانه (به وقت تهران)
   }
   بدون هیچ وابستگی (فقط Node 18+).
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HIST = path.join(ROOT, 'assets', 'data', 'history.json');
const LIVE = path.join(ROOT, 'assets', 'data', 'live.json');
const KEEP_RECENT_DAYS = 14;
const KEEP_DAILY_DAYS = 240;
const TEHRAN_OFFSET_MS = 3.5 * 3600e3; // ایران از ۱۴۰۱ ساعت تابستانی ندارد

function empty() { return { version: 1, generated_at: null, recent: {}, daily: {} }; }

function load(file) {
  try {
    const j = JSON.parse(fs.readFileSync(file || HIST, 'utf8'));
    if (j && j.recent && j.daily) return j;
  } catch (e) {}
  return empty();
}

/** کلید روز به وقت تهران (تاریخ میلادی؛ فقط برای بازه‌بندی) */
function dayKey(ms) { return new Date(ms + TEHRAN_OFFSET_MS).toISOString().slice(0, 10); }

function addPoint(doc, sym, ms, p) {
  if (!(p > 0) || !isFinite(p) || !(ms > 0)) return false;
  const sec = Math.round(ms / 1000);
  const r = doc.recent[sym] || (doc.recent[sym] = []);
  const last = r[r.length - 1];
  if (last && last[0] >= sec) return false; // ترتیب زمانی و بدون تکرار
  r.push([sec, p]);
  const d = doc.daily[sym] || (doc.daily[sym] = []);
  const k = dayKey(ms);
  const ld = d[d.length - 1];
  if (ld && ld[0] === k) {
    ld[1] = p;
    if (p > ld[2]) ld[2] = p;
    if (p < ld[3]) ld[3] = p;
  } else if (!ld || ld[0] < k) {
    d.push([k, p, p, p]);
  }
  return true;
}

function prune(doc, nowMs) {
  const minSec = Math.round(nowMs / 1000) - KEEP_RECENT_DAYS * 86400;
  const minDay = dayKey(nowMs - KEEP_DAILY_DAYS * 86400e3);
  for (const s of Object.keys(doc.recent)) doc.recent[s] = doc.recent[s].filter((x) => x[0] >= minSec);
  for (const s of Object.keys(doc.daily)) doc.daily[s] = doc.daily[s].filter((x) => x[0] >= minDay);
}

/** افزودن یک سند live.json به تاریخچه (idempotent) */
function appendLive(doc, live) {
  const ms = Date.parse(live && live.generated_at);
  if (!ms || !live.quotes) return { doc, added: 0 };
  let added = 0;
  for (const s of Object.keys(live.quotes)) {
    const q = live.quotes[s];
    if (q && q.p > 0 && addPoint(doc, s, ms, +q.p)) added++;
  }
  if (added) {
    const prev = Date.parse(doc.generated_at) || 0;
    if (ms > prev) doc.generated_at = new Date(ms).toISOString();
    prune(doc, Math.max(ms, prev));
  }
  return { doc, added };
}

function save(doc, file) {
  fs.writeFileSync(file || HIST, JSON.stringify(doc) + '\n');
}

/** بازسازی کامل از همه‌ی کامیت‌های live.json (نیاز به کلون کامل: fetch-depth 0) */
function backfillFromGit(repoRoot, ref) {
  const cwd = repoRoot || ROOT;
  const doc = empty();
  const cmd = 'git log --reverse --format=%H ' + (ref ? ref + ' ' : '') + '-- assets/data/live.json';
  const shas = execSync(cmd, { cwd, maxBuffer: 32e6 }).toString().trim().split('\n').filter(Boolean);
  let commits = 0, points = 0;
  for (const sha of shas) {
    let j;
    try { j = JSON.parse(execSync('git show ' + sha + ':assets/data/live.json', { cwd, maxBuffer: 16e6 }).toString()); }
    catch (e) { continue; }
    const r = appendLive(doc, j);
    if (r.added) { commits++; points += r.added; }
  }
  return { doc, commits, points };
}

function stats(doc) {
  const syms = Object.keys(doc.daily);
  let days = 0, pts = 0;
  for (const s of syms) { days = Math.max(days, doc.daily[s].length); pts += (doc.recent[s] || []).length; }
  return { syms: syms.length, days, recentPoints: pts, from: syms.length ? doc.daily[syms[0]][0][0] : null, to: doc.generated_at };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--backfill')) {
    const refIdx = args.indexOf('--ref');
    const ref = refIdx >= 0 ? args[refIdx + 1] : '';
    const r = backfillFromGit(ROOT, ref);
    // نقاط جدیدتر از آخرین کامیت (مثلاً live.json محلی) هم اضافه شوند
    try { appendLive(r.doc, JSON.parse(fs.readFileSync(LIVE, 'utf8'))); } catch (e) {}
    save(r.doc);
    console.log('HISTORY BACKFILL: commits=' + r.commits + ' points=' + r.points + ' ' + JSON.stringify(stats(r.doc)));
  } else {
    const doc = load();
    let live;
    try { live = JSON.parse(fs.readFileSync(LIVE, 'utf8')); } catch (e) { console.error('HISTORY: live.json unreadable'); process.exitCode = 1; }
    if (live) {
      const r = appendLive(doc, live);
      save(r.doc);
      console.log('HISTORY APPEND: added=' + r.added + ' ' + JSON.stringify(stats(r.doc)));
    }
  }
}

module.exports = { load, save, appendLive, addPoint, backfillFromGit, prune, dayKey, stats, empty, HIST, KEEP_RECENT_DAYS, KEEP_DAILY_DAYS };
