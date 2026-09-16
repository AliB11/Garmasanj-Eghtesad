# تست‌های گرماسنج (jsdom — بدون نیاز به مرورگر)

```bash
# یک‌بار: نصب jsdom (بیرون از ریپو، تا ریپو تمیز بماند)
mkdir -p /tmp/smoke && cd /tmp/smoke && npm init -y && npm i jsdom

# اجرا از ریشه‌ی ریپو
NODE_PATH=/tmp/smoke/node_modules node tests/smoke.js   # بوت آفلاین + ساختار + تعامل‌ها
NODE_PATH=/tmp/smoke/node_modules node tests/live.js    # موتور کوت‌ها با ارائه‌دهنده‌های شبیه‌سازی‌شده
```

- `smoke.js`: بوت کامل با شبکه‌ی قطع، بررسی ۴۸ گزاره (ساختار ۲۰ کارت، تب‌ها، مودال‌ها، رادار، ترکیب‌ساز، حکم امروز، زنجیره، هیت‌مپ، ورود دستی) + صفر خطای پنجره.
- `live.js`: شبیه‌سازی ۱۳ مسیر (live.json انتشار + TGJU پنج‌آینه، نوبیتکس، والکس، بیت‌پین، CoinGecko، ‏Kraken، ‏Binance Vision، ‏Coinbase، ‏Frankfurter، ناواسان، …) و راستی‌آزمایی کوت‌ها، قانون dt، اجماع جهانی، مشتق‌ها، نبض، پول داغ، حکم، نگهبان جهش، پرچم تخمین و سناریوهای A تا E — ۷۵ گزاره + صفر خطای پنجره.
- `publish.js`: راستی‌آزمایی تجزیه‌گرهای خالص ناشر (`scripts/publish.cjs`) — ۱۷ گزاره.
