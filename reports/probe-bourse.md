# گزارش پروبِ امکان‌سنجیِ بورس

این فایل را **خودِ جریان کاری** بعد از اجرای `scripts/probe_bourse.cjs` از روی یک رانرِ
GitHub Actions (IP خارجِ ایران) نوشته است. فقط برای تصمیم‌گیریِ فنی است و
هیچ فایلِ داده‌ای (`live.json` / `history.json`) را تغییر نمی‌دهد.

- زمان (UTC): `2026-09-20T05:45:32.973Z`
- مبدأ درخواست: `{. "ip": "20.169.93.33",. "city": "Phoenix",. "region": "Arizona",. "country": "US",. "loc": "33.4484,-112.0740",. "org"`

## نتیجه‌ی هر نامزد

| منبع | وضعیت | بایت | زمان (ms) | یادداشت | نمونه‌ی پاسخ |
|---|---|---:|---:|---|---|
| `clientTypeAll` | ❌ خطا | 0 | 10530 | خطا: fetch failed | `` |
| `clientTypeAll.tls` | ❌ خطا | 0 | 10499 | خطا: fetch failed | `` |
| `closingPriceAll` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `marketWatchInit` | ❌ خطا | 0 | 10492 | خطا: fetch failed | `` |
| `marketWatchPlus` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `indexChart` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `cdn.tsetmc` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `tgju.ajax` | ✅ 200 | 176485 | 257 | — | `{"current":{"zinc":{"p":"2575.6","h":"2575.6","l":"2575.6","d":"0","dp":0,"dt":"","t":".. ......","t_en":"28 Jun","t-g":".. ......","ts":"2021-06-28 14:00:00"},"yemen@kwd` |
| `brsapi.nokey` | ✅ 200 | 1686 | 1583 | پاسخ HTML، نه داده | `<!DOCTYPE html>.<html>.<head>. <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">. <meta http-equiv="X-UA-Compatible" content="IE=edge` |
| `egress.geo` | ✅ 200 | 259 | 118 | — | `{. "ip": "20.169.93.33",. "city": "Phoenix",. "region": "Arizona",. "country": "US",. "loc": "33.4484,-112.0740",. "org": "AS8075 Microsoft Corporation",. "postal": "8500` |
| `www.tsetmc` | ❌ خطا | 0 | 10016 | خطا: fetch failed | `` |
| `cdn.marketOverview` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `cdn.clientType` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `tse.ir` | ❌ خطا | 0 | 10493 | خطا: fetch failed | `` |
| `service.tsetmc` | ❌ خطا | 0 | 10494 | خطا: fetch failed | `` |
| `bourse-trader` | ✅ 200 | 311986 | 1528 | پاسخ HTML، نه داده | `....<!doctype html>.<html lang="en">.<head>. <meta charset="utf-8">. <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">-->. <meta ` |
| `yahoo.tedpix` | ❌ 404 | 108 | 129 | رد/بلاک؟ | `{"chart":{"result":null,"error":{"code":"Not Found","description":"No data found, symbol may be delisted"}}}` |
| `yahoo.search` | ✅ 200 | 442 | 166 | — | `{"explains":[],"count":0,"quotes":[],"news":[],"nav":[],"lists":[],"researchReports":[],"screenerFieldResults":[],"totalTime":33,"timeTakenForQuotes":410,"timeTakenForNew` |
| `stooq.tedpix` | ✅ 200 | 796 | 678 | پاسخ HTML، نه داده | `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"></head><body><noscript>This site requires JavaScript to verify your browse` |
| `stooq.tse` | ✅ 200 | 796 | 555 | پاسخ HTML، نه داده | `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"></head><body><noscript>This site requires JavaScript to verify your browse` |

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

## بورس‌تریدر (bourse-trader.ir) — ساختارِ خام

- وضعیت: 200 · بایت: 298072 · نوع: text/html; charset=UTF-8
- نشانی‌های پیدا شده: ?task=shareholders | ?task=option-board | ?task=financial_statement | ?task=financial_ratio | ?task=fundamental_topsis | ?task=codal-reports | ?task=board | ?task=marketwatch | ?task=stats-heartbeat
- `?task=stats-heartbeat` → 200 · text/html; charset=UTF-8 · 298072 بایت · JSON نیست ·  <!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">--> <m
- `?task=marketwatch` → 200 · text/html; charset=UTF-8 · 298072 بایت · JSON نیست ·  <!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">--> <m
- `?task=board` → 200 · text/html; charset=UTF-8 · 298072 بایت · JSON نیست ·  <!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <!--<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">--> <m
- جدول «گزارش بازار بورس»: `گزارش بازار بورس <a target="_blank" href="#" class="q_in_h top"> <i class="q_i_in_h fa fa-question-circle" title="گزارش بازار (مبالغ به تومان)"></i> </a> </div> </div> <div class="cardbox__body p-0"> <div class="border_inner responsive-table height600"> <table class="table marketTable mb-0"> <tbody> <!-- شاخص ها --> <tr> <td class='text-right'>شاخص کل</td> <td dir='ltr' class='bl-colu text-nowrap'> 7,298,500 <span class='text-danger'>(-150,339) -2.0183%</span> </td> </tr> <tr> <td class='text-right'>شاخص هم وزن</td> <td dir='ltr' class='bl-colu text-nowrap'> 1,950,840 <span class='text-danger'>(-35,926) -1.8083%</span> </td> </tr> <tr> <td class='text-right'>شاخص کل فرابورس</td> <td dir='ltr' class='bl-colu text-nowrap'> 56,577.0 <span class='text-danger'>(-989) -1.7196%</span> </td> </tr> <tr> <td class='text-right'>ارزش بازار</td> <td dir='ltr' class='bl-colu'> 25,489T (110.6B $) </td> </tr> <!-- 🔹 خرد --> <tr> <td class='text-right text-nowrap'>معاملات خرد</td> <td class='bl-colu'> <div class='d-flex justify-content-between align-items-center'> <div class='text-center'> <div class='fw-bold'><a target='_blank' href='charts#trade-value' class='text-dark'>7.7T</a></div> <small class='text-muted'>معاملات</small> </div> <div class='text-center'> <div class='fw-bold'><a target='_blank' href='charts#money-inflow' class='text-danger'>-1.8T</a></div> <small class='text-muted'>ورود پول</small> </div> </div> </td> </tr> <!-- 🔹 درآمد ثابت --> <tr> <td class='text-right text-nowrap'>صندوق درآمدثابت</td> <td class='bl-colu'> <div class='d-flex justify-content-between align-items-center'> <div class='text-center'> <div class='fw-bold'>3.1T</div> <small class='text-muted'>معاملات</small> </div> <div class='text-center'> <div class='fw-bold text-danger'>-745.6B</div> <small class='text-muted'>ورود پول</small> </div> </div> </td> </tr> <!-- 🔹 کالایی --> <tr> <td class='text-right text-nowrap'>صندوق کالایی</td> <td class='bl-colu'> <div class='d-flex justify-content-between align-items-center'> <div class='text-center'> <div class='fw-bold'>0</div> <small class='text-muted'>معاملات</small> </div> <div class='text-center'> <div class='fw-bold text-danger'>0</div> <small class='text-muted'>ورود پول</small> </div> </div> </td> </tr> <!-- سایر موارد --> <tr> <td class='text-right'>معاملات آپشن</td> <td class='bl-colu'>213.6B</td> </tr> <tr> <td class='text-right'>معاملات بلوک سهام</td> <td class='bl-colu'>0</td> </tr> <tr> <td class='text-right'>معاملات بلوک صندوق</td> <td class='bl-colu'>11.4B</td> </tr> <tr> <td class='text-right'>معاملات پایانی TAL</td> <td class='bl-`
- جدول «پایش معاملات»: `پایش معاملات --> <div class="col-xl-5 col-lg-12 col-md-12 col-sm-12 my-2"> <div class="cardbox h-100"> <div class="cardbox__head"> <div class="cardbox__title"> پایش معاملات بازار بورس <a href="#" class="q_in_h top"> <i data-toggle="tooltip" data-placement="bottom" title="معاملات خرد (سهام,حق تقدم,صندوق های سهامی و اهرمی و بخشی) بجز (بلوکی ها,صندوق های درآمد ثابت,آپشن ها,صندوق های طلا و زعفران) قیمت ها به تومان" class="q_i_in_h fa fa-question-circle"></i> </a> </div> </div> <div class="cardbox__body p-0"> <div class="border_inner responsive-table fixTableHead height600"> <table class="table payeshTable mb-0"> <thead> <tr> <th>#</th> <th class='bl-colu'>خرد</th> <th>بورس</th> <th>فرابورس</th> <th>سهامی</th> <th>درآمدثابت</th> <th>آپشن</th> <th>کالایی</th> </tr> </thead> <tbody> <!-- نمادها --> <tr> <td class='text-right'>نمادها</td> <td class='payeshKhord'>919</td> <td>353</td> <td>379</td> <td>187</td> <td>92</td> <td>1499</td> <td>35</td> </tr> <!-- مثبت --> <tr class='bl-colu'> <td class='text-right'>نماد مثبت</td> <td class='payeshKhord text-success'>(14%) 126</td> <td>(7%) 26</td> <td>(22%) 82</td> <td>18</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- منفی --> <tr class='text-danger'> <td class='text-right'>نماد منفی</td> <td class='payeshKhord'>(86%) 793</td> <td>(93%) 327</td> <td>(78%) 297</td> <td>169</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- صف خرید --> <tr class='bl-colu'> <td class='text-right'>صف خرید</td> <td class='payeshKhord'>(7%) 64</td> <td>(4%) 15</td> <td>(13%) 48</td> <td>1</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- صف فروش --> <tr class='text-danger'> <td class='text-right'>صف فروش</td> <td class='payeshKhord'>(55%) 509</td> <td>(69%) 244</td> <td>(55%) 210</td> <td>55</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- ارزش صف خرید --> <tr class='dir_left bl-colu'> <td class='text-right'>ارزش صف خرید</td> <td class='payeshKhord'>5.5T</td> <td>3T</td> <td>2.5T</td> <td>56.9M</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- ارزش صف فروش --> <tr class='dir_left text-danger'> <td class='text-right'>ارزش صف فروش</td> <td class='payeshKhord'>21.7T</td> <td>11.3T</td> <td>3.8T</td> <td>6.6T</td> <td>-</td><td>-</td><td>-</td> </tr> <!-- ورود پول --> <tr class='dir_left bl-colu'> <td class='text-right'>ورود پول حقیقی</td> <td class='text-danger payeshKhord'>-1.8T</td> <td class='text-danger'>-1.1T</td> <td class='text-danger'>-299.3B</td> <td class='text-danger'>-425B</td> <td class='text-danger'>-745.6B</td> <td class='text-danger'>-654.6K</td> <td class='text-danger'>0</td> </tr> <!-- ارزش معاملات --> <tr class='dir_left text-primary'> <td class='text-right'>ارزش معاملات</td> <td class='payeshKhord'>7.7T</td> <td>5.1T</td> <td>1.7T</td> <td>1T</td> <td>3.1T</td> <td>213.6B</td> <td>0</td> </tr> <!-- حجم معاملات --> <tr class='dir_left text-primary'> <td class='text-right'>حجم معاملات</td> <td class='payeshKhord'>13.1B</td> <td>9.3B</td> <td>3.6B</td> <td>225.8M</td> <td>1.2B</td> <td>12.3M</td> <td>0</td> </tr> <!-- تعداد معاملا`
- `شاخص کل` (2 بار): ` <!-- شاخص ها --> <tr> <td class='text-right'>شاخص کل</td> <td dir='ltr' class='bl-colu text-nowrap'> 7,298,500 <span class='text-danger'>(-150,339) -2.0183%</span> </td> </tr> <tr> <td class='text`
- `شاخص هم وزن` (1 بار): ` </td> </tr> <tr> <td class='text-right'>شاخص هم وزن</td> <td dir='ltr' class='bl-colu text-nowrap'> 1,950,840 <span class='text-danger'>(-35,926) -1.8083%</span> </td> </tr> <tr> <td class='t`
- `شاخص کل فرابورس` (1 بار): ` </td> </tr> <tr> <td class='text-right'>شاخص کل فرابورس</td> <td dir='ltr' class='bl-colu text-nowrap'> 56,577.0 <span class='text-danger'>(-989) -1.7196%</span> </td> </tr> <tr> <td class='t`
- `ارزش بازار` (3 بار): ` <li><a href="ps">فیلتر و نمودار P/S</a></li>--> <li><a href="marketcap">فیلترهای ارزش بازار</a></li> <li><a href="stock-float">فیلترهای شناوری سهام</a></li> <li><a href="tal-filter">فیلتر معاملات پایانی TAL</a></li> <li><a href="block-trade">معاملات بلوکی</a></li> <!--<`
- `ورود پول حقیقی` (11 بار): `_money_sf"></div> <a href="#" class="q_in_h_ch"><i data-toggle="tooltip" data-placement="bottom" title="ورود پول حقیقی به صندوق های درآمد ثابت" class="q_i_in_h fa fa-question-circle"></i></a> <script> var options = { title:{ text:'ورود پول حقیقی به صندوق درآمد ثابت', align:'center' }, subtitle:{ text:'آخرین 747`
- `ارزش معاملات` (11 بار): `n_h_ch"> <i data-toggle="tooltip" data-placement="bottom" title="نمودار درصد ارزش معاملات بازار (همت)" class="q_i_in_h fa fa-question-circle"></i> </a> <script> (function () { const el = document.querySelector("#trans_value_pie"); if (!el) return; `
- `صندوق درآمدثابت` (2 بار): `088817841970012523233890533447265625,0]; const labels = ["بورس","فرابورس","آپشن","صندوق سهامی","صندوق درآمدثابت","صندوق کالایی"]; const hasData = true; const safeSeries = hasData ? series : [1]; const safeLabels = hasData ? labels : ["داده‌ای موجود نیست"]; const options = { title: { `
- `تعداد نماد مثبت` (3 بار): `posnegqty"></div> <a href="#" class="q_in_h_ch"><i data-toggle="tooltip" data-placement="bottom" title="تعداد نماد مثبت و منفی بازار" class="q_i_in_h fa fa-question-circle"></i></a> <script> var options = { title:{ text:'تعداد نمادهای مثبت و منفی', align:'center' }, subtitle:{ text:'مثبت 127   منفی 792', `
- `سرانه خرید حقیقی` (1 بار): `nger'>(86%) 793</td> </tr> <tr> <td class='text-right'>سرانه خرید حقیقی</td> <td class='bl-colu text-success'>51.8</td> </tr> <tr> <td class='text-right'>سرانه فروش حقیقی</td> <td class='bl-colu text-danger'>135.6</td> </tr> `

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

