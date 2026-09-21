# گزارش پروبِ امکان‌سنجیِ بورس

این فایل را **خودِ جریان کاری** بعد از اجرای `scripts/probe_bourse.cjs` از روی یک رانرِ
GitHub Actions (IP خارجِ ایران) نوشته است. فقط برای تصمیم‌گیریِ فنی است و
هیچ فایلِ داده‌ای (`live.json` / `history.json`) را تغییر نمی‌دهد.

- زمان (UTC): `2026-09-21T07:11:03.023Z`
- مبدأ درخواست: `{. "ip": "51.57.83.197",. "city": "Phoenix",. "region": "Arizona",. "country": "US",. "loc": "33.4484,-112.0740",. "org"`

## نتیجه‌ی هر نامزد

| منبع | وضعیت | بایت | زمان (ms) | یادداشت | نمونه‌ی پاسخ |
|---|---|---:|---:|---|---|
| `clientTypeAll` | ❌ خطا | 0 | 10578 | خطا: fetch failed | `` |
| `clientTypeAll.tls` | ❌ خطا | 0 | 10497 | خطا: fetch failed | `` |
| `closingPriceAll` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `marketWatchInit` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `marketWatchPlus` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `indexChart` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `cdn.tsetmc` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `tgju.ajax` | ✅ 200 | 177552 | 395 | — | `{"current":{"zinc":{"p":"2575.6","h":"2575.6","l":"2575.6","d":"0","dp":0,"dt":"","t":".. ......","t_en":"28 Jun","t-g":".. ......","ts":"2021-06-28 14:00:00"},"yemen@kwd` |
| `brsapi.nokey` | ✅ 200 | 1686 | 3759 | پاسخ HTML، نه داده | `<!DOCTYPE html>.<html>.<head>. <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">. <meta http-equiv="X-UA-Compatible" content="IE=edge` |
| `egress.geo` | ✅ 200 | 259 | 89 | — | `{. "ip": "51.57.83.197",. "city": "Phoenix",. "region": "Arizona",. "country": "US",. "loc": "33.4484,-112.0740",. "org": "AS8075 Microsoft Corporation",. "postal": "8500` |
| `www.tsetmc` | ❌ خطا | 0 | 10404 | خطا: fetch failed | `` |
| `cdn.marketOverview` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `cdn.clientType` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `tse.ir` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `service.tsetmc` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `bourse-trader` | ✅ 200 | 333051 | 3293 | پاسخ HTML، نه داده | `....<!doctype html>.<html lang="en">.<head>. <meta charset="utf-8">. <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">-->. <meta ` |
| `tablokhani.home` | ❌ خطا | 0 | 10484 | خطا: fetch failed | `` |
| `tablokhani.robots` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `yahoo.tedpix` | ❌ 404 | 108 | 117 | رد/بلاک؟ | `{"chart":{"result":null,"error":{"code":"Not Found","description":"No data found, symbol may be delisted"}}}` |
| `yahoo.search` | ✅ 200 | 442 | 136 | — | `{"explains":[],"count":0,"quotes":[],"news":[],"nav":[],"lists":[],"researchReports":[],"screenerFieldResults":[],"totalTime":31,"timeTakenForQuotes":410,"timeTakenForNew` |
| `stooq.tedpix` | ✅ 200 | 796 | 642 | پاسخ HTML، نه داده | `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"></head><body><noscript>This site requires JavaScript to verify your browse` |
| `stooq.tse` | ✅ 200 | 796 | 592 | پاسخ HTML، نه داده | `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"></head><body><noscript>This site requires JavaScript to verify your browse` |

## کلیدهای بورسیِ TGJU

| کلید | مقدار | نام |
|---|---|---|
| `bourse_stoxx-600` | 634 | — |
| `bourse_singapore` | 2,259 | — |
| `bourse_nikkei-225` | 35,081 | — |
| `bourse_globaldow` | 2,434 | — |
| `bourse_asia-dow` | 6,312 | — |
| `bourse` | 7,288,881.6 | — |

## شکلِ دقیقِ ورودیِ بورس در TGJU

```json
bourse: {
 "p": "7,288,881.6",
 "h": "7,345,566.6",
 "l": "7,288,881.6",
 "d": "2,943.4",
 "dp": 0.04,
 "dt": "low",
 "t": "۱۰:۳۰:۱۶",
 "t_en": "10:30:16",
 "t-g": "۱۰:۳۰:۱۶",
 "ts": "2026-09-21 10:30:16"
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

## بورس‌تریدر (bourse-trader.ir) — ساختارِ خام

- وضعیت: 200 · بایت: 318756 · نوع: text/html; charset=UTF-8
- نشانی‌های پیدا شده: ?task=shareholders | ?task=option-board | ?task=financial_statement | ?task=financial_ratio | ?task=fundamental_topsis | ?task=codal-reports | ?task=board | ?task=marketwatch | ?task=stats-heartbeat
- `?task=stats-heartbeat` → 200 · text/html; charset=UTF-8 · 318756 بایت · JSON نیست ·  <!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">--> <m
- `?task=marketwatch` → 200 · text/html; charset=UTF-8 · 318756 بایت · JSON نیست ·  <!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">--> <m
- `?task=board` → 200 · text/html; charset=UTF-8 · 318756 بایت · JSON نیست ·  <!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">--> <m
- جدول «گزارش بازار بورس»: `گزارش بازار بورس <a target="_blank" href="#" class="q_in_h top"> <i class="q_i_in_h fa fa-question-circle" title="گزارش بازار (مبالغ به تومان)"></i> </a> </div> </div> <div class="cardbox__body p-0"> <div class="border_inner responsive-table height600"> <table class="table marketTable mb-0"> <tbody> <!-- شاخص ها --> <tr> <td class='text-right'>شاخص کل</td> <td dir='ltr' class='bl-colu text-nowrap'> 7,288,890 <span class='text-danger'>(-2,934) -0.0402%</span> </td> </tr> <tr> <td class='text-right'>شاخص هم وزن</td> <td dir='ltr' class='bl-colu text-nowrap'> 1,938,050 <span class='text-danger'>(-8,311) -0.427%</span> </td> </tr> <tr> <td class='text-right'>شاخص کل فرابورس</td> <td dir='ltr' class='bl-colu text-nowrap'> 56,744.0 <span class='text-success'>(109) 0.193%</span> </td> </tr> <tr> <td class='text-right'>ارزش بازار</td> <td dir='ltr' class='bl-colu'> 24,910.8T (108.2B $) </td> </tr> <!-- 🔹 خرد --> <tr> <td class='text-right text-nowrap'>معاملات خرد</td> <td class='bl-colu'> <div class='d-flex justify-content-between align-items-center'> <div class='text-center'> <div class='fw-bold'><a target='_blank' href='charts#trade-value' class='text-dark'>33.6T</a></div> <small class='text-muted'>معاملات</small> </div> <div class='text-center'> <div class='fw-bold'><a target='_blank' href='charts#money-inflow' class='text-danger'>-349.3B</a></div> <small class='text-muted'>ورود پول</small> </div> </div> </td> </tr> <!-- 🔹 درآمد ثابت --> <tr> <td class='text-right text-nowrap'>صندوق درآمدثابت</td> <td class='bl-colu'> <div class='d-flex justify-content-between align-items-center'> <div class='text-center'> <div class='fw-bold'>11.4T</div> <small class='text-muted'>معاملات</small> </div> <div class='text-center'> <div class='fw-bold text-danger'>-1.9T</div> <small class='text-muted'>ورود پول</small> </div> </div> </td> </tr> <!-- 🔹 کالایی --> <tr> <td class='text-right text-nowrap'>صندوق کالایی</td> <td class='bl-colu'> <div class='d-flex justify-content-between align-items-center'> <div class='text-center'> <div class='fw-bold'>0</div> <small class='text-muted'>معاملات</small> </div> <div class='text-center'> <div class='fw-bold text-danger'>0</div> <small class='text-muted'>ورود پول</small> </div> </div> </td> </tr> <!-- سایر موارد --> <tr> <td class='text-right'>معاملات آپشن</td> <td class='bl-colu'>1.8T</td> </tr> <tr> <td class='text-right'>معاملات بلوک سهام</td> <td class='bl-colu'>85.3B</td> </tr> <tr> <td class='text-right'>معاملات بلوک صندوق</td> <td class='bl-colu'>8.5T</td> </tr> <tr> <td class='text-right'>معاملات پایانی TAL</td> <td class='bl-c`
- جدول «پایش معاملات»: `پایش معاملات --> <div class="col-xl-5 col-lg-12 col-md-12 col-sm-12 my-2"> <div class="cardbox h-100"> <div class="cardbox__head"> <div class="cardbox__title"> پایش معاملات بازار بورس <a href="#" class="q_in_h top"> <i data-toggle="tooltip" data-placement="bottom" title="معاملات خرد (سهام,حق تقدم,صندوق های سهامی و اهرمی و بخشی) بجز (بلوکی ها,صندوق های درآمد ثابت,آپشن ها,صندوق های طلا و زعفران) قیمت ها به تومان" class="q_i_in_h fa fa-question-circle"></i> </a> </div> </div> <div class="cardbox__body p-0"> <div class="border_inner responsive-table fixTableHead height600"> <table class="table payeshTable mb-0"> <thead> <tr> <th>#</th> <th class='bl-colu'>خرد</th> <th>بورس</th> <th>فرابورس</th> <th>سهامی</th> <th>درآمدثابت</th> <th>آپشن</th> <th>کالایی</th> </tr> </thead> <tbody> <!-- نمادها --> <tr> <td class='text-right'>نمادها</td> <td class='payeshKhord'>933</td> <td>362</td> <td>383</td> <td>188</td> <td>93</td> <td>1494</td> <td>35</td> </tr> <!-- مثبت --> <tr class='bl-colu'> <td class='text-right'>نماد مثبت</td> <td class='payeshKhord text-success'>(42%) 392</td> <td>(38%) 136</td> <td>(48%) 182</td> <td>74</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- منفی --> <tr class='text-danger'> <td class='text-right'>نماد منفی</td> <td class='payeshKhord'>(58%) 541</td> <td>(62%) 226</td> <td>(52%) 201</td> <td>114</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- صف خرید --> <tr class='bl-colu'> <td class='text-right'>صف خرید</td> <td class='payeshKhord'>(17%) 161</td> <td>(18%) 64</td> <td>(25%) 96</td> <td>1</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- صف فروش --> <tr class='text-danger'> <td class='text-right'>صف فروش</td> <td class='payeshKhord'>(22%) 204</td> <td>(27%) 99</td> <td>(24%) 90</td> <td>15</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- ارزش صف خرید --> <tr class='dir_left bl-colu'> <td class='text-right'>ارزش صف خرید</td> <td class='payeshKhord'>8.8T</td> <td>5T</td> <td>3.8T</td> <td>22.3B</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- ارزش صف فروش --> <tr class='dir_left text-danger'> <td class='text-right'>ارزش صف فروش</td> <td class='payeshKhord'>4.7T</td> <td>1.7T</td> <td>1.4T</td> <td>1.5T</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- ورود پول --> <tr class='dir_left bl-colu'> <td class='text-right'>ورود پول حقیقی</td> <td class='text-danger payeshKhord'>-349.3B</td> <td class='text-success'>57.2B</td> <td class='text-danger'>-232.6B</td> <td class='text-danger'>-173.9B</td> <td class='text-danger'>-1.9T</td> <td class='text-success'>69.3M</td> <td class='text-danger'>0</td> </tr> <!-- ارزش معاملات --> <tr class='dir_left text-primary'> <td class='text-right'>ارزش معاملات</td> <td class='payeshKhord'>33.6T</td> <td>18T</td> <td>5.2T</td> <td>10.4T</td> <td>11.4T</td> <td>1.8T</td> <td>0</td> </tr> <!-- حجم معاملات --> <tr class='dir_left text-primary'> <td class='text-right'>حجم معاملات</td> <td class='payeshKhord'>62.7B</td> <td>51.9B</td> <td>8.9B</td> <td>1.9B</td> <td>4.2B</td> <td>61.9M</td> <td>0</td> </tr> <!-- تعداد م`
- `شاخص کل` (2 بار): ` <!-- شاخص ها --> <tr> <td class='text-right'>شاخص کل</td> <td dir='ltr' class='bl-colu text-nowrap'> 7,288,890 <span class='text-danger'>(-2,934) -0.0402%</span> </td> </tr> <tr> <td class='text-r`
- `شاخص هم وزن` (1 بار): ` </td> </tr> <tr> <td class='text-right'>شاخص هم وزن</td> <td dir='ltr' class='bl-colu text-nowrap'> 1,938,050 <span class='text-danger'>(-8,311) -0.427%</span> </td> </tr> <tr> <td class='tex`
- `شاخص کل فرابورس` (1 بار): ` </td> </tr> <tr> <td class='text-right'>شاخص کل فرابورس</td> <td dir='ltr' class='bl-colu text-nowrap'> 56,744.0 <span class='text-success'>(109) 0.193%</span> </td> </tr> <tr> <td class='tex`
- `ارزش بازار` (3 بار): ` <li><a href="ps">فیلتر و نمودار P/S</a></li>--> <li><a href="marketcap">فیلترهای ارزش بازار</a></li> <li><a href="stock-float">فیلترهای شناوری سهام</a></li> <li><a href="tal-filter">فیلتر معاملات پایانی TAL</a></li> <li><a href="block-trade">معاملات بلوکی</a></li> <!--<`
- `ورود پول حقیقی` (11 بار): `_money_sf"></div> <a href="#" class="q_in_h_ch"><i data-toggle="tooltip" data-placement="bottom" title="ورود پول حقیقی به صندوق های درآمد ثابت" class="q_i_in_h fa fa-question-circle"></i></a> <script> var options = { title:{ text:'ورود پول حقیقی به صندوق درآمد ثابت', align:'center' }, subtitle:{ text:'آخرین 194`
- `ارزش معاملات` (11 بار): `n_h_ch"> <i data-toggle="tooltip" data-placement="bottom" title="نمودار درصد ارزش معاملات بازار (همت)" class="q_i_in_h fa fa-question-circle"></i> </a> <script> (function () { const el = document.querySelector("#trans_value_pie"); if (!el) return; `
- `صندوق درآمدثابت` (2 بار): `003552713678800500929355621337890625,0]; const labels = ["بورس","فرابورس","آپشن","صندوق سهامی","صندوق درآمدثابت","صندوق کالایی"]; const hasData = true; const safeSeries = hasData ? series : [1]; const safeLabels = hasData ? labels : ["داده‌ای موجود نیست"]; const options = { title: { `
- `تعداد نماد مثبت` (3 بار): `posnegqty"></div> <a href="#" class="q_in_h_ch"><i data-toggle="tooltip" data-placement="bottom" title="تعداد نماد مثبت و منفی بازار" class="q_i_in_h fa fa-question-circle"></i></a> <script> var options = { title:{ text:'تعداد نمادهای مثبت و منفی', align:'center' }, subtitle:{ text:'مثبت 393   منفی 540', `
- `سرانه خرید حقیقی` (1 بار): `nger'>(58%) 541</td> </tr> <tr> <td class='text-right'>سرانه خرید حقیقی</td> <td class='bl-colu text-success'>96.6</td> </tr> <tr> <td class='text-right'>سرانه فروش حقیقی</td> <td class='bl-colu text-danger'>124.5</td> </tr> `
- خروجیِ `parseBourseTrader` (کدِ پروژه روی صفحه‌ی زنده):
  ```json
{
 "ok": true,
 "src": "BourseTrader",
 "missing": [],
 "index": {
  "p": 7288890,
  "chg": -2934,
  "chgPct": -0.0402
 },
 "equal": {
  "p": 1938050,
  "chg": -8311,
  "chgPct": -0.427
 },
 "fara": {
  "p": 56744,
  "chg": 109,
  "chgPct": 0.193
 },
 "cap": 24910800000000000,
 "flow": {
  "netToman": -349300000000,
  "ratio": -0.010395833333333333
 },
 "trade": {
  "valueToman": 33600000000000,
  "volume": 62700000000
 },
 "funds": {
  "equity": {
   "netToman": -173900000000,
   "valueToman": 10400000000000
  },
  "fixed": {
   "netToman": -1900000000000,
   "valueToman": 11400000000000
  },
  "commodity": {
   "netToman": 0,
   "valueToman": null
  },
  "option": {
   "netToman": 69300000,
   "valueToman": 1800000000000
  }
 },
 "breadth": {
  "pos": 392,
  "neg": 541,
  "total": 933,
  "posPct": 42.01500535905681,
  "queueBuy": 161,
  "queueSell": 204
 },
 "perCapita": {
  "buy": 96.6,
  "sell": 124.5
 }
}
  ```
- جلسه‌ی تهران باز است؟ بله (اگر خیر، ناشر همان مقدارِ قبلی را نگه می‌دارد)

## تابلوخوانی (tablokhani.com) — ساختارِ خام و روندِ پول

- خطا: fetch failed — آیا tablokhani.com از این رانر در دسترس است؟

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
- `https://tablokhani.com/` — خانه: شاخص‌ها، صف‌ها، حقیقی/حقوقی
- `https://tablokhani.com/robots.txt` — سیاستِ واکشی
- `https://query1.finance.yahoo.com/v8/finance/chart/%5ETEDPIX?range=1mo&interval=1d` — تاریخچه‌ی شاخص از یاهو
- `https://query1.finance.yahoo.com/v1/finance/search?q=tehran&quotesCount=10` — جست‌وجوی نمادِ تهران در یاهو
- `https://stooq.com/q/d/l/?s=%5Etedpix&i=d` — تاریخچه‌ی شاخص از استوک
- `https://stooq.com/q/?s=%5Etedpix` — صفحه‌ی شاخص در استوک

