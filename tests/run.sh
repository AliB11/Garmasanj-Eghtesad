#!/usr/bin/env bash
# گرماسنج — اجرای همه‌ی تست‌ها (محلی و CI)
#   پیش‌نیاز: jsdom در NODE_PATH (پیش‌فرض: /tmp/smoke/node_modules)
#   اجرا:     bash tests/run.sh
set -u
cd "$(dirname "$0")/.."
export NODE_PATH="${NODE_PATH:-/tmp/smoke/node_modules}"

fail=0
step() { echo; echo "── $1"; }

step "بررسی نحوی"
for f in assets/js/*.js sw.js scripts/publish.cjs scripts/history.cjs; do
  if node --check "$f"; then echo "  ok  $f"; else echo "  ERR $f"; fail=1; fi
done

step "publish.js (تجزیه‌گرهای ناشر — بدون jsdom)"
node tests/publish.js || fail=1

if [ ! -d "$NODE_PATH/jsdom" ]; then
  echo
  echo "!! jsdom پیدا نشد در $NODE_PATH — تست‌های مرورگری رد شدند."
  echo "   نصب: mkdir -p /tmp/smoke && cd /tmp/smoke && npm init -y && npm i jsdom"
  exit 1
fi

step "smoke.js (بوت آفلاین)"
node tests/smoke.js | tail -n 3 || fail=1
[ "${PIPESTATUS[0]}" -eq 0 ] || fail=1

step "live.js (موتور کوت‌ها با ماک)"
node tests/live.js | tail -n 3 || fail=1
[ "${PIPESTATUS[0]}" -eq 0 ] || fail=1

step "deep_review.js"
node tests/deep_review.js | tail -n 2 || fail=1
[ "${PIPESTATUS[0]}" -eq 0 ] || fail=1

step "review360.js (رگرسیون بازبینی ۳۶۰ درجه)"
node tests/review360.js | tail -n 3 || fail=1
[ "${PIPESTATUS[0]}" -eq 0 ] || fail=1

step "gen5.js (تاریخچه، مقایسه، سنجاق، جست‌وجو، میان‌برها، تم، ویجت)"
node tests/gen5.js | tail -n 3 || fail=1
[ "${PIPESTATUS[0]}" -eq 0 ] || fail=1

echo
if [ "$fail" -eq 0 ]; then echo "✔ همه‌ی تست‌ها سبز"; else echo "✘ شکست در تست‌ها"; fi
exit $fail
