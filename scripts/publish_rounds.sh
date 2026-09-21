#!/usr/bin/env bash
# گرماسنج — چند دورِ انتشار با کامیتِ ایمن
# ---------------------------------------------------------------
# چرا یک اسکریپتِ جدا؟ چون دو جریان (ضربانِ ساعتی و نگهبانِ ساعتی) هر دو
# همین کار را می‌کنند؛ اگر منطقِ «همگام‌سازی + کامیت + تلاشِ دوباره» دوبار
# نوشته شود، دیر یا زود یکی از آن‌ها از دیگری جا می‌ماند.
#
# متغیرهای محیطی (همه اختیاری):
#   ROUNDS        تعدادِ دورهای انتشار در این اجرا
#   INTERVAL_MIN  فاصله‌ی بینِ دو دور (دقیقه)
#   MIN_GAP_MIN   اگر انتشارِ روی دیسک از این حد تازه‌تر باشد، این دور
#                 کاری نمی‌کند (جلوی انتشارِ دوبارهِ بی‌فایده وقتی دو جریان
#                 هم‌زمان بیدار می‌شوند)
set -u

ROUNDS="${ROUNDS:-2}"
INTERVAL_MIN="${INTERVAL_MIN:-45}"
MIN_GAP_MIN="${MIN_GAP_MIN:-20}"

git config user.name 'garmasanj-bot'
git config user.email 'garmasanj-bot@users.noreply.github.com'

# قبل از هر دور، شاخه را با بالادست هماهنگ کن: اگر جریانِ دیگری در همین
# فاصله منتشر کرده باشد، تغییراتش از دست نمی‌رود.
sync_repo() {
  git pull -q --rebase --autostash || {
    git rebase --abort || true
    git reset -q --hard @{upstream} || git reset -q --hard HEAD
  }
}

commit_and_push() {
  git add assets/data/live.json assets/data/history.json
  if git diff --staged --quiet; then echo "no changes"; return 0; fi
  TS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('assets/data/live.json','utf8')).generated_at)")
  # [skip ci] → کامیت‌های داده‌ای ربات، جریانِ تست‌ها را فعال نمی‌کنند
  git commit -q -m "chore(data): انتشار زنده قیمت‌ها ($TS) [skip ci]"
  for i in 1 2 3; do
    if git push -q; then return 0; fi
    echo "push failed (attempt $i) — rebasing onto latest upstream"
    # شاخه‌ی جاری را با بالادستِ خودش هماهنگ کن (وابسته به نامِ شاخه نباشد)
    if ! git pull -q --rebase --autostash; then
      git rebase --abort || true
      git reset -q --hard @{upstream} || git reset -q --hard HEAD
      node scripts/publish.cjs
      git add assets/data/live.json assets/data/history.json
      git commit -q -m "chore(data): انتشار زنده قیمت‌ها ($TS) [skip ci]" || true
    fi
    sleep 5
  done
  echo "::warning::push failed after 3 attempts — next round/run will retry"
  return 0
}

for r in $(seq 1 "$ROUNDS"); do
  echo "── round $r/$ROUNDS  $(date -u +%FT%TZ)"
  if [ "$r" -gt 1 ]; then sync_repo; fi
  node scripts/publish.cjs --min-gap="$MIN_GAP_MIN" || echo "::warning::publish round $r failed"
  commit_and_push
  if [ "$r" -lt "$ROUNDS" ]; then sleep $(( INTERVAL_MIN * 60 )); fi
done
