# گزارش پروبِ امکان‌سنجیِ بورس

این فایل را **خودِ جریان کاری** بعد از اجرای `scripts/probe_bourse.cjs` از روی یک رانرِ
GitHub Actions (IP خارجِ ایران) نوشته است. فقط برای تصمیم‌گیریِ فنی است و
هیچ فایلِ داده‌ای (`live.json` / `history.json`) را تغییر نمی‌دهد.

- زمان (UTC): `2026-09-20T04:04:53.214Z`
- مبدأ درخواست: `{. "ip": "135.232.201.35",. "city": "Chicago",. "region": "Illinois",. "country": "US",. "loc": "41.8500,-87.6500",. "or`

## نتیجه‌ی هر نامزد

| منبع | وضعیت | بایت | زمان (ms) | یادداشت | نمونه‌ی پاسخ |
|---|---|---:|---:|---|---|
| `clientTypeAll` | ❌ خطا | 0 | 10540 | خطا: fetch failed | `` |
| `clientTypeAll.tls` | ❌ خطا | 0 | 10498 | خطا: fetch failed | `` |
| `closingPriceAll` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `marketWatchInit` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `marketWatchPlus` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `indexChart` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `cdn.tsetmc` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `tgju.ajax` | ✅ 200 | 176404 | 308 | — | `{"current":{"zinc":{"p":"2575.6","h":"2575.6","l":"2575.6","d":"0","dp":0,"dt":"","t":".. ......","t_en":"28 Jun","t-g":".. ......","ts":"2021-06-28 14:00:00"},"yemen@kwd` |
| `brsapi.nokey` | ✅ 200 | 1686 | 948 | پاسخ HTML، نه داده | `<!DOCTYPE html>.<html>.<head>. <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">. <meta http-equiv="X-UA-Compatible" content="IE=edge` |
| `egress.geo` | ✅ 200 | 261 | 108 | — | `{. "ip": "135.232.201.35",. "city": "Chicago",. "region": "Illinois",. "country": "US",. "loc": "41.8500,-87.6500",. "org": "AS8075 Microsoft Corporation",. "postal": "60` |
| `www.tsetmc` | ❌ خطا | 0 | 10111 | خطا: fetch failed | `` |
| `cdn.marketOverview` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `cdn.clientType` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `tse.ir` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `service.tsetmc` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `bourse-trader` | ✅ 200 | 347142 | 999 | پاسخ HTML، نه داده | `....<!doctype html>.<html lang="en">.<head>. <meta charset="utf-8">. <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">-->. <meta ` |

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
- `https://www.tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0` — TSETMC روی www
- `https://cdn.tsetmc.com/api/MarketData/GetMarketOverview/1` — خلاصه‌ی بازار روی CDN
- `https://cdn.tsetmc.com/api/ClientType/GetClientTypeAll/1` — حقیقی/حقوقی روی CDN
- `https://tse.ir/` — سایت رسمیِ بورس تهران
- `https://service.tsetmc.com/WebService/TsePublicV2.asmx` — وب‌سرویس رسمی (نیازمند اشتراک)
- `https://bourse-trader.ir/api/?task=api` — وب‌سرویسِ ثالث

