# گزارش پروبِ امکان‌سنجیِ بورس

این فایل را **خودِ جریان کاری** بعد از اجرای `scripts/probe_bourse.cjs` از روی یک رانرِ
GitHub Actions (IP خارجِ ایران) نوشته است. فقط برای تصمیم‌گیریِ فنی است و
هیچ فایلِ داده‌ای (`live.json` / `history.json`) را تغییر نمی‌دهد.

- زمان (UTC): `2026-09-20T05:59:08.222Z`
- مبدأ درخواست: `{. "ip": "20.116.79.49",. "city": "Toronto",. "region": "Ontario",. "country": "CA",. "loc": "43.7064,-79.3986",. "org":`

## نتیجه‌ی هر نامزد

| منبع | وضعیت | بایت | زمان (ms) | یادداشت | نمونه‌ی پاسخ |
|---|---|---:|---:|---|---|
| `clientTypeAll` | ❌ خطا | 0 | 10537 | خطا: fetch failed | `` |
| `clientTypeAll.tls` | ❌ خطا | 0 | 10499 | خطا: fetch failed | `` |
| `closingPriceAll` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `marketWatchInit` | ❌ خطا | 0 | 10495 | خطا: fetch failed | `` |
| `marketWatchPlus` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `indexChart` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `cdn.tsetmc` | ❌ خطا | 0 | 10495 | خطا: fetch failed | `` |
| `tgju.ajax` | ✅ 200 | 176682 | 292 | — | `{"current":{"zinc":{"p":"2575.6","h":"2575.6","l":"2575.6","d":"0","dp":0,"dt":"","t":".. ......","t_en":"28 Jun","t-g":".. ......","ts":"2021-06-28 14:00:00"},"yemen@kwd` |
| `brsapi.nokey` | ✅ 200 | 1686 | 1080 | پاسخ HTML، نه داده | `<!DOCTYPE html>.<html>.<head>. <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">. <meta http-equiv="X-UA-Compatible" content="IE=edge` |
| `egress.geo` | ✅ 200 | 256 | 97 | — | `{. "ip": "20.116.79.49",. "city": "Toronto",. "region": "Ontario",. "country": "CA",. "loc": "43.7064,-79.3986",. "org": "AS8075 Microsoft Corporation",. "postal": "M5A",` |
| `www.tsetmc` | ❌ خطا | 0 | 10005 | خطا: fetch failed | `` |
| `cdn.marketOverview` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `cdn.clientType` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `tse.ir` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `service.tsetmc` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `bourse-trader` | ✅ 200 | 315899 | 1265 | پاسخ HTML، نه داده | `....<!doctype html>.<html lang="en">.<head>. <meta charset="utf-8">. <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">-->. <meta ` |
| `yahoo.tedpix` | ❌ 404 | 108 | 80 | رد/بلاک؟ | `{"chart":{"result":null,"error":{"code":"Not Found","description":"No data found, symbol may be delisted"}}}` |
| `yahoo.search` | ✅ 200 | 442 | 118 | — | `{"explains":[],"count":0,"quotes":[],"news":[],"nav":[],"lists":[],"researchReports":[],"screenerFieldResults":[],"totalTime":34,"timeTakenForQuotes":412,"timeTakenForNew` |
| `stooq.tedpix` | ✅ 200 | 796 | 546 | پاسخ HTML، نه داده | `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"></head><body><noscript>This site requires JavaScript to verify your browse` |
| `stooq.tse` | ✅ 200 | 796 | 303 | پاسخ HTML، نه داده | `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"></head><body><noscript>This site requires JavaScript to verify your browse` |

## کلیدهای بورسیِ TGJU

| کلید | مقدار | نام |
|---|---|---|
| `bourse_stoxx-600` | 634 | — |
| `bourse_singapore` | 2,259 | — |
| `bourse_nikkei-225` | 35,081 | — |
| `bourse_globaldow` | 2,434 | — |
| `bourse_asia-dow` | 6,312 | — |
| `bourse` | 7,284,855.3 | — |

## شکلِ دقیقِ ورودیِ بورس در TGJU

```json
bourse: {
 "p": "7,284,855.3",
 "h": "7,298,500.8",
 "l": "7,284,855.3",
 "d": "163,984.1",
 "dp": 2.25,
 "dt": "low",
 "t": "۰۹:۲۴:۰۹",
 "t_en": "09:24:09",
 "t-g": "۰۹:۲۴:۰۹",
 "ts": "2026-09-20 09:24:09"
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

- وضعیت: 200 · بایت: 301909 · نوع: text/html; charset=UTF-8
- نشانی‌های پیدا شده: ?task=shareholders | ?task=option-board | ?task=financial_statement | ?task=financial_ratio | ?task=fundamental_topsis | ?task=codal-reports | ?task=board | ?task=marketwatch | ?task=stats-heartbeat
- `?task=stats-heartbeat` → 200 · text/html; charset=UTF-8 · 301909 بایت · JSON نیست ·  <!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">--> <m
- `?task=marketwatch` → 200 · text/html; charset=UTF-8 · 301909 بایت · JSON نیست ·  <!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">--> <m
- `?task=board` → 200 · text/html; charset=UTF-8 · 301909 بایت · JSON نیست ·  <!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">--> <m
- جدول «گزارش بازار بورس»: `گزارش بازار بورس <a target="_blank" href="#" class="q_in_h top"> <i class="q_i_in_h fa fa-question-circle" title="گزارش بازار (مبالغ به تومان)"></i> </a> </div> </div> <div class="cardbox__body p-0"> <div class="border_inner responsive-table height600"> <table class="table marketTable mb-0"> <tbody> <!-- شاخص ها --> <tr> <td class='text-right'>شاخص کل</td> <td dir='ltr' class='bl-colu text-nowrap'> 7,284,040 <span class='text-danger'>(-164,802) -2.2124%</span> </td> </tr> <tr> <td class='text-right'>شاخص هم وزن</td> <td dir='ltr' class='bl-colu text-nowrap'> 1,945,200 <span class='text-danger'>(-41,568) -2.0923%</span> </td> </tr> <tr> <td class='text-right'>شاخص کل فرابورس</td> <td dir='ltr' class='bl-colu text-nowrap'> 56,471.0 <span class='text-danger'>(-1,096) -1.904%</span> </td> </tr> <tr> <td class='text-right'>ارزش بازار</td> <td dir='ltr' class='bl-colu'> 24,883.8T (108.1B $) </td> </tr> <!-- 🔹 خرد --> <tr> <td class='text-right text-nowrap'>معاملات خرد</td> <td class='bl-colu'> <div class='d-flex justify-content-between align-items-center'> <div class='text-center'> <div class='fw-bold'><a target='_blank' href='charts#trade-value' class='text-dark'>10T</a></div> <small class='text-muted'>معاملات</small> </div> <div class='text-center'> <div class='fw-bold'><a target='_blank' href='charts#money-inflow' class='text-danger'>-2.3T</a></div> <small class='text-muted'>ورود پول</small> </div> </div> </td> </tr> <!-- 🔹 درآمد ثابت --> <tr> <td class='text-right text-nowrap'>صندوق درآمدثابت</td> <td class='bl-colu'> <div class='d-flex justify-content-between align-items-center'> <div class='text-center'> <div class='fw-bold'>4T</div> <small class='text-muted'>معاملات</small> </div> <div class='text-center'> <div class='fw-bold text-danger'>-579.8B</div> <small class='text-muted'>ورود پول</small> </div> </div> </td> </tr> <!-- 🔹 کالایی --> <tr> <td class='text-right text-nowrap'>صندوق کالایی</td> <td class='bl-colu'> <div class='d-flex justify-content-between align-items-center'> <div class='text-center'> <div class='fw-bold'>0</div> <small class='text-muted'>معاملات</small> </div> <div class='text-center'> <div class='fw-bold text-danger'>0</div> <small class='text-muted'>ورود پول</small> </div> </div> </td> </tr> <!-- سایر موارد --> <tr> <td class='text-right'>معاملات آپشن</td> <td class='bl-colu'>409.8B</td> </tr> <tr> <td class='text-right'>معاملات بلوک سهام</td> <td class='bl-colu'>0</td> </tr> <tr> <td class='text-right'>معاملات بلوک صندوق</td> <td class='bl-colu'>11.4B</td> </tr> <tr> <td class='text-right'>معاملات پایانی TAL</td> <td class='bl-`
- جدول «پایش معاملات»: `پایش معاملات --> <div class="col-xl-5 col-lg-12 col-md-12 col-sm-12 my-2"> <div class="cardbox h-100"> <div class="cardbox__head"> <div class="cardbox__title"> پایش معاملات بازار بورس <a href="#" class="q_in_h top"> <i data-toggle="tooltip" data-placement="bottom" title="معاملات خرد (سهام,حق تقدم,صندوق های سهامی و اهرمی و بخشی) بجز (بلوکی ها,صندوق های درآمد ثابت,آپشن ها,صندوق های طلا و زعفران) قیمت ها به تومان" class="q_i_in_h fa fa-question-circle"></i> </a> </div> </div> <div class="cardbox__body p-0"> <div class="border_inner responsive-table fixTableHead height600"> <table class="table payeshTable mb-0"> <thead> <tr> <th>#</th> <th class='bl-colu'>خرد</th> <th>بورس</th> <th>فرابورس</th> <th>سهامی</th> <th>درآمدثابت</th> <th>آپشن</th> <th>کالایی</th> </tr> </thead> <tbody> <!-- نمادها --> <tr> <td class='text-right'>نمادها</td> <td class='payeshKhord'>919</td> <td>353</td> <td>379</td> <td>187</td> <td>92</td> <td>1513</td> <td>35</td> </tr> <!-- مثبت --> <tr class='bl-colu'> <td class='text-right'>نماد مثبت</td> <td class='payeshKhord text-success'>(13%) 124</td> <td>(7%) 24</td> <td>(20%) 77</td> <td>23</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- منفی --> <tr class='text-danger'> <td class='text-right'>نماد منفی</td> <td class='payeshKhord'>(87%) 795</td> <td>(93%) 329</td> <td>(80%) 302</td> <td>164</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- صف خرید --> <tr class='bl-colu'> <td class='text-right'>صف خرید</td> <td class='payeshKhord'>(8%) 70</td> <td>(4%) 14</td> <td>(14%) 54</td> <td>2</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- صف فروش --> <tr class='text-danger'> <td class='text-right'>صف فروش</td> <td class='payeshKhord'>(62%) 571</td> <td>(76%) 270</td> <td>(60%) 229</td> <td>72</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- ارزش صف خرید --> <tr class='dir_left bl-colu'> <td class='text-right'>ارزش صف خرید</td> <td class='payeshKhord'>5T</td> <td>2.7T</td> <td>2.3T</td> <td>115M</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- ارزش صف فروش --> <tr class='dir_left text-danger'> <td class='text-right'>ارزش صف فروش</td> <td class='payeshKhord'>25.2T</td> <td>13.8T</td> <td>4.3T</td> <td>7.1T</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- ورود پول --> <tr class='dir_left bl-colu'> <td class='text-right'>ورود پول حقیقی</td> <td class='text-danger payeshKhord'>-2.3T</td> <td class='text-danger'>-1.3T</td> <td class='text-danger'>-493.2B</td> <td class='text-danger'>-497B</td> <td class='text-danger'>-579.8B</td> <td class='text-success'>4.3M</td> <td class='text-danger'>0</td> </tr> <!-- ارزش معاملات --> <tr class='dir_left text-primary'> <td class='text-right'>ارزش معاملات</td> <td class='payeshKhord'>10T</td> <td>6.5T</td> <td>2.3T</td> <td>1.2T</td> <td>4T</td> <td>409.8B</td> <td>0</td> </tr> <!-- حجم معاملات --> <tr class='dir_left text-primary'> <td class='text-right'>حجم معاملات</td> <td class='payeshKhord'>16.2B</td> <td>11.3B</td> <td>4.7B</td> <td>287.1M</td> <td>1.5B</td> <td>24.7M</td> <td>0</td> </tr> <!-- تعداد معاملات -`
- `شاخص کل` (2 بار): ` <!-- شاخص ها --> <tr> <td class='text-right'>شاخص کل</td> <td dir='ltr' class='bl-colu text-nowrap'> 7,284,040 <span class='text-danger'>(-164,802) -2.2124%</span> </td> </tr> <tr> <td class='text`
- `شاخص هم وزن` (1 بار): ` </td> </tr> <tr> <td class='text-right'>شاخص هم وزن</td> <td dir='ltr' class='bl-colu text-nowrap'> 1,945,200 <span class='text-danger'>(-41,568) -2.0923%</span> </td> </tr> <tr> <td class='t`
- `شاخص کل فرابورس` (1 بار): ` </td> </tr> <tr> <td class='text-right'>شاخص کل فرابورس</td> <td dir='ltr' class='bl-colu text-nowrap'> 56,471.0 <span class='text-danger'>(-1,096) -1.904%</span> </td> </tr> <tr> <td class='`
- `ارزش بازار` (3 بار): ` <li><a href="ps">فیلتر و نمودار P/S</a></li>--> <li><a href="marketcap">فیلترهای ارزش بازار</a></li> <li><a href="stock-float">فیلترهای شناوری سهام</a></li> <li><a href="tal-filter">فیلتر معاملات پایانی TAL</a></li> <li><a href="block-trade">معاملات بلوکی</a></li> <!--<`
- `ورود پول حقیقی` (11 بار): `_money_sf"></div> <a href="#" class="q_in_h_ch"><i data-toggle="tooltip" data-placement="bottom" title="ورود پول حقیقی به صندوق های درآمد ثابت" class="q_i_in_h fa fa-question-circle"></i></a> <script> var options = { title:{ text:'ورود پول حقیقی به صندوق درآمد ثابت', align:'center' }, subtitle:{ text:'آخرین 580`
- `ارزش معاملات` (11 بار): `n_h_ch"> <i data-toggle="tooltip" data-placement="bottom" title="نمودار درصد ارزش معاملات بازار (همت)" class="q_i_in_h fa fa-question-circle"></i> </a> <script> (function () { const el = document.querySelector("#trans_value_pie"); if (!el) return; `
- `صندوق درآمدثابت` (2 بار): `5910790149937383830547332763671875,4,0]; const labels = ["بورس","فرابورس","آپشن","صندوق سهامی","صندوق درآمدثابت","صندوق کالایی"]; const hasData = true; const safeSeries = hasData ? series : [1]; const safeLabels = hasData ? labels : ["داده‌ای موجود نیست"]; const options = { title: { `
- `تعداد نماد مثبت` (3 بار): `posnegqty"></div> <a href="#" class="q_in_h_ch"><i data-toggle="tooltip" data-placement="bottom" title="تعداد نماد مثبت و منفی بازار" class="q_i_in_h fa fa-question-circle"></i></a> <script> var options = { title:{ text:'تعداد نمادهای مثبت و منفی', align:'center' }, subtitle:{ text:'مثبت 124   منفی 795', `
- `سرانه خرید حقیقی` (1 بار): `nger'>(87%) 795</td> </tr> <tr> <td class='text-right'>سرانه خرید حقیقی</td> <td class='bl-colu text-success'>53.3</td> </tr> <tr> <td class='text-right'>سرانه فروش حقیقی</td> <td class='bl-colu text-danger'>134.4</td> </tr> `
- خروجیِ `parseBourseTrader` (کدِ پروژه روی صفحه‌ی زنده):
  ```json
{
 "ok": true,
 "src": "BourseTrader",
 "missing": [],
 "index": {
  "p": 7284040,
  "chg": -164802,
  "chgPct": -2.2124
 },
 "equal": {
  "p": 1945200,
  "chg": -41568,
  "chgPct": -2.0923
 },
 "fara": {
  "p": 56471,
  "chg": -1096,
  "chgPct": -1.904
 },
 "cap": 24883800000000000,
 "flow": {
  "netToman": -2300000000000,
  "ratio": -0.23
 },
 "trade": {
  "valueToman": 10000000000000,
  "volume": 16200000000
 },
 "funds": {
  "equity": {
   "netToman": -497000000000,
   "valueToman": 1200000000000
  },
  "fixed": {
   "netToman": -579800000000,
   "valueToman": 4000000000000
  },
  "commodity": {
   "netToman": 0,
   "valueToman": null
  },
  "option": {
   "netToman": 4300000,
   "valueToman": 409800000000
  }
 },
 "breadth": {
  "pos": 124,
  "neg": 795,
  "total": 919,
  "posPct": 13.492927094668117,
  "queueBuy": 70,
  "queueSell": 571
 },
 "perCapita": {
  "buy": 53.3,
  "sell": 134.4
 }
}
  ```
- جلسه‌ی تهران باز است؟ بله (اگر خیر، ناشر همان مقدارِ قبلی را نگه می‌دارد)

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

