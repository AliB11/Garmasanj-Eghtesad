# گزارش پروبِ امکان‌سنجیِ بورس

این فایل را **خودِ جریان کاری** بعد از اجرای `scripts/probe_bourse.cjs` از روی یک رانرِ
GitHub Actions (IP خارجِ ایران) نوشته است. فقط برای تصمیم‌گیریِ فنی است و
هیچ فایلِ داده‌ای (`live.json` / `history.json`) را تغییر نمی‌دهد.

- زمان (UTC): `2026-09-20T05:32:37.629Z`
- مبدأ درخواست: `{. "ip": "68.220.61.161",. "city": "San Jose",. "region": "California",. "country": "US",. "loc": "37.3394,-121.8950",. `

## نتیجه‌ی هر نامزد

| منبع | وضعیت | بایت | زمان (ms) | یادداشت | نمونه‌ی پاسخ |
|---|---|---:|---:|---|---|
| `clientTypeAll` | ❌ خطا | 0 | 10536 | خطا: fetch failed | `` |
| `clientTypeAll.tls` | ❌ خطا | 0 | 10499 | خطا: fetch failed | `` |
| `closingPriceAll` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `marketWatchInit` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `marketWatchPlus` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `indexChart` | ❌ خطا | 0 | 10491 | خطا: fetch failed | `` |
| `cdn.tsetmc` | ❌ خطا | 0 | 10495 | خطا: fetch failed | `` |
| `tgju.ajax` | ✅ 200 | 176485 | 204 | — | `{"current":{"zinc":{"p":"2575.6","h":"2575.6","l":"2575.6","d":"0","dp":0,"dt":"","t":".. ......","t_en":"28 Jun","t-g":".. ......","ts":"2021-06-28 14:00:00"},"yemen@kwd` |
| `brsapi.nokey` | ✅ 200 | 1686 | 1091 | پاسخ HTML، نه داده | `<!DOCTYPE html>.<html>.<head>. <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">. <meta http-equiv="X-UA-Compatible" content="IE=edge` |
| `egress.geo` | ✅ 200 | 268 | 159 | — | `{. "ip": "68.220.61.161",. "city": "San Jose",. "region": "California",. "country": "US",. "loc": "37.3394,-121.8950",. "org": "AS8075 Microsoft Corporation",. "postal": ` |
| `www.tsetmc` | ❌ خطا | 0 | 10018 | خطا: fetch failed | `` |
| `cdn.marketOverview` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `cdn.clientType` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `tse.ir` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `service.tsetmc` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `bourse-trader` | ✅ 200 | 292033 | 1401 | پاسخ HTML، نه داده | `....<!doctype html>.<html lang="en">.<head>. <meta charset="utf-8">. <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">-->. <meta ` |
| `yahoo.tedpix` | ❌ 404 | 108 | 99 | رد/بلاک؟ | `{"chart":{"result":null,"error":{"code":"Not Found","description":"No data found, symbol may be delisted"}}}` |
| `yahoo.search` | ✅ 200 | 442 | 83 | — | `{"explains":[],"count":0,"quotes":[],"news":[],"nav":[],"lists":[],"researchReports":[],"screenerFieldResults":[],"totalTime":29,"timeTakenForQuotes":409,"timeTakenForNew` |
| `stooq.tedpix` | ✅ 200 | 796 | 661 | پاسخ HTML، نه داده | `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"></head><body><noscript>This site requires JavaScript to verify your browse` |
| `stooq.tse` | ✅ 200 | 796 | 643 | پاسخ HTML، نه داده | `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"></head><body><noscript>This site requires JavaScript to verify your browse` |

## کلیدهای بورسیِ TGJU

| کلید | مقدار | نام |
|---|---|---|
| `bourse_stoxx-600` | 634 | — |
| `bourse_singapore` | 2,259 | — |
| `bourse_nikkei-225` | 35,081 | — |
| `bourse_globaldow` | 2,434 | — |
| `bourse_asia-dow` | 6,312 | — |
| `bourse` | 7,448,839.4 | — |

## شکلِ دقیقِ ورودیِ بورس در TGJU

```json
bourse: {
 "p": "7,448,839.4",
 "h": "7,619,210.5",
 "l": "7,448,839.3",
 "d": "0",
 "dp": 0,
 "dt": "",
 "t": "۲۸ شهریور",
 "t_en": "19 Sep",
 "t-g": "۲۸ شهریور",
 "ts": "2026-09-19 00:00:00"
}
bourse_nikkei-225: {
 "p": "35,081",
 "h": "35,081",
 "l": "35,081",
 "d": "0",
 "dp": 0,
 "dt": "",
 "t": "۲۱ مرداد",
 "t_en": "20:29:33",
 "t-g": "۲۱ مرداد",
 "ts": "2024-08-11 20:29:33"
}
bourse_asia-dow: {
 "p": "6,312",
 "h": "6,312",
 "l": "6,312",
 "d": "0",
 "dp": 0,
 "dt": "",
 "t": "۲۹ اردیبهشت",
 "t_en": "19 May",
 "t-g": "۲۹ اردیبهشت",
 "ts": "2026-05-19 00:00:00"
}

```

## واکاویِ متنِ فارسی در TGJU (جست‌وجوی «شاخص/ارزش معاملات/حقیقی/ورود پول/فرابورس/هم‌وزن»)

هیچ کلیدی با این واژه‌ها پیدا نشد.

## مسیرهای کلیددار (بدون نمایشِ کلید)

هیچ کلیدی در محیط نبود (Secrets تنظیم نشده).

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
- `https://query1.finance.yahoo.com/v8/finance/chart/%5ETEDPIX?range=1mo&interval=1d` — تاریخچه‌ی شاخص از یاهو
- `https://query1.finance.yahoo.com/v1/finance/search?q=tehran&quotesCount=10` — جست‌وجوی نمادِ تهران در یاهو
- `https://stooq.com/q/d/l/?s=%5Etedpix&i=d` — تاریخچه‌ی شاخص از استوک
- `https://stooq.com/q/?s=%5Etedpix` — صفحه‌ی شاخص در استوک

