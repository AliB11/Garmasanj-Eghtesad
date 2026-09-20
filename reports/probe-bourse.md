# گزارش پروبِ امکان‌سنجیِ بورس

این فایل را **خودِ جریان کاری** بعد از اجرای `scripts/probe_bourse.cjs` از روی یک رانرِ
GitHub Actions (IP خارجِ ایران) نوشته است. فقط برای تصمیم‌گیریِ فنی است و
هیچ فایلِ داده‌ای (`live.json` / `history.json`) را تغییر نمی‌دهد.

- زمان (UTC): `2026-09-20T04:01:05.845Z`
- مبدأ درخواست: `{. "ip": "20.109.86.224",. "city": "Boydton",. "region": "Virginia",. "country": "US",. "loc": "36.6676,-78.3875",. "org`

## نتیجه‌ی هر نامزد

| منبع | وضعیت | بایت | زمان (ms) | یادداشت | نمونه‌ی پاسخ |
|---|---|---:|---:|---|---|
| `clientTypeAll` | ✅ 200 | 824 | 2038 | پاسخ HTML، نه داده | `<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="/favicon.ico?v=2" type="image/x-icon"/><link rel="shortcut icon" href="/favicon.ico?v=2` |
| `clientTypeAll.tls` | ✅ 200 | 824 | 1269 | پاسخ HTML، نه داده | `<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="/favicon.ico?v=2" type="image/x-icon"/><link rel="shortcut icon" href="/favicon.ico?v=2` |
| `closingPriceAll` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `marketWatchInit` | ✅ 200 | 824 | 2167 | پاسخ HTML، نه داده | `<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="/favicon.ico?v=2" type="image/x-icon"/><link rel="shortcut icon" href="/favicon.ico?v=2` |
| `marketWatchPlus` | ✅ 200 | 824 | 1082 | پاسخ HTML، نه داده | `<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="/favicon.ico?v=2" type="image/x-icon"/><link rel="shortcut icon" href="/favicon.ico?v=2` |
| `indexChart` | ✅ 200 | 824 | 930 | پاسخ HTML، نه داده | `<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="/favicon.ico?v=2" type="image/x-icon"/><link rel="shortcut icon" href="/favicon.ico?v=2` |
| `cdn.tsetmc` | ❌ 500 | 0 | 1399 | رد/بلاک؟ | `` |
| `tgju.ajax` | ✅ 200 | 176404 | 60 | — | `{"current":{"zinc":{"p":"2575.6","h":"2575.6","l":"2575.6","d":"0","dp":0,"dt":"","t":".. ......","t_en":"28 Jun","t-g":".. ......","ts":"2021-06-28 14:00:00"},"yemen@kwd` |
| `brsapi.nokey` | ✅ 200 | 1686 | 1022 | پاسخ HTML، نه داده | `<!DOCTYPE html>.<html>.<head>. <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">. <meta http-equiv="X-UA-Compatible" content="IE=edge` |
| `egress.geo` | ✅ 200 | 261 | 111 | — | `{. "ip": "20.109.86.224",. "city": "Boydton",. "region": "Virginia",. "country": "US",. "loc": "36.6676,-78.3875",. "org": "AS8075 Microsoft Corporation",. "postal": "239` |

## کلیدهای بورسیِ TGJU

| کلید | مقدار | نام |
|---|---|---|
| `bourse_stoxx-600` | 634 | — |
| `bourse_singapore` | 2,259 | — |
| `bourse_nikkei-225` | 35,081 | — |
| `bourse_globaldow` | 2,434 | — |
| `bourse_asia-dow` | 6,312 | — |
| `bourse` | 7,448,839.4 | — |

## URLهای امتحان‌شده

- `http://tsetmc.com/tsev2/data/ClientTypeAll.aspx` — جریان پول حقیقی/حقوقیِ همه‌ی نمادها
- `https://tsetmc.com/tsev2/data/ClientTypeAll.aspx` — همان، روی https
- `http://tsetmc.com/tsev2/data/ClosingPriceAll.aspx` — قیمت پایانیِ همه‌ی نمادها
- `http://tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0` — دیده‌بان (قیمت/حجم/ارزش)
- `http://tsetmc.com/tsev2/data/MarketWatchPlus.aspx?h=0&r=0` — دیده‌بانِ پیشرفته
- `http://tsetmc.com/tsev2/chart/data/Index.aspx?i=32097828799138957&t=value` — نمودار شاخص کل
- `https://cdn.tsetmc.com/api/Instrument/GetInstrumentSearch/%D9%81%D9%85%D9%84%DB%8C` — API جدید روی CDN
- `https://call5.tgju.org/ajax.json` — کلیدهای بورسیِ TGJU
- `https://BrsApi.ir/api/Market/GetMarketOverview` — BrsApi بدون کلید (انتظار ۴۰۱)
- `https://ipinfo.io/json` — کشورِ IP خروجیِ اکشن

