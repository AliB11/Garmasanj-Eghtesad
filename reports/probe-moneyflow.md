# گزارش پروبِ «روند پول» — تابلوخوانی + بورس‌تریدر

این فایل را **خودِ جریان کاری** بعد از اجرای `scripts/probe_moneyflow.cjs` روی یک رانرِ
GitHub Actions (IP خارجِ ایران) نوشته است. مبنای تصمیم برای نوشتن/اصلاحِ پارسرهاست؛
هیچ فایلِ داده‌ای را تغییر نمی‌دهد.

- زمان (UTC): `2026-09-21T15:08:43.306Z`
- مبدأ درخواست: `{ "ip": "172.214.47.24", "city": "Dulles Town Center", "region": "Virginia", "country": "US", "loc": "39.0376,-77.4158", "org": "AS8075 Microsoft Corporation", `

## ۱) دسترسی‌پذیری از رانر

| منبع | وضعیت | بایت | زمان (ms) | نوع | یادداشت |
|---|---|---:|---:|---|---|
| `tk.robots` | ❌ خطا | 0 | 10426 | `?` | fetch failed |
| `tk.home` | ❌ خطا | 0 | 10495 | `?` | fetch failed |
| `tk.api.root` | ❌ خطا | 0 | 10494 | `?` | fetch failed |
| `tk.hotmoney` | ❌ خطا | 0 | 10494 | `?` | fetch failed |
| `tk.marketgame` | ❌ خطا | 0 | 10495 | `?` | fetch failed |
| `tk.bigmoves` | ❌ خطا | 0 | 10495 | `?` | fetch failed |
| `tk.hall` | ❌ خطا | 0 | 10494 | `?` | fetch failed |
| `bt.api` | ✅ 200 | 341572 | 1130 | `text/html; charset=UTF-8` | بورس‌تریدر — منبعِ فعلیِ جریانِ پول |

## ۲) تابلوخوانی — ساختارِ خامِ صفحه‌ی اصلی

صفحه‌ی اصلی در دسترس نبود — ادامه‌ی بررسیِ تابلوخوانی ممکن نیست.
## ۳) اندپوینت‌های JSON (حدسی + استخراج‌شده)

- `https://api.tablokhani.com/api/market` → ❌ خطا · 0 بایت · JSON نیست · ``
- `https://api.tablokhani.com/api/v1/market` → ❌ خطا · 0 بایت · JSON نیست · ``
- `https://tablokhani.com/api/market` → ❌ خطا · 0 بایت · JSON نیست · ``
- `https://tablokhani.com/api/v1/market/overview` → ❌ خطا · 0 بایت · JSON نیست · ``

## ۴) صفحاتِ پول‌محورِ تابلوخوانی

- `tk.hotmoney`: در دسترس نبود (خطا)
- `tk.marketgame`: در دسترس نبود (خطا)
- `tk.bigmoves`: در دسترس نبود (خطا)

## ۵) بورس‌تریدر — کالبدشکافیِ پارسرِ فعلی

- حجم: 341572 بایت · نوع: `text/html; charset=UTF-8`
- `parseBourseTrader.ok`: **true**
- بخش‌های استخراج‌شده: `index, equal, fara, cap, flow, trade, funds, breadth, perCapita`

```json
{
 "ok": true,
 "src": "BourseTrader",
 "missing": [],
 "index": {
  "p": 7280430,
  "chg": -11395,
  "chgPct": -0.1563
 },
 "equal": {
  "p": 1936930,
  "chg": -9426,
  "chgPct": -0.4843
 },
 "fara": {
  "p": 56741,
  "chg": 107,
  "chgPct": 0.1889
 },
 "cap": 24886200000000000,
 "flow": {
  "netToman": 692600000000,
  "ratio": 0.013879759519038077
 },
 "trade": {
  "valueToman": 49900000000000,
  "volume": 91500000000
 },
 "funds": {
  "equity": {
   "netToman": 123100000000,
   "valueToman": 15400000000000
  },
  "fixed": {
   "netToman": 74200000000,
   "valueToman": 60000000000000
  },
  "commodity": {
   "netToman": 1100000000000,
   "valueToman": 15000000000000
  },
  "option": {
   "netToman": 156300000,
   "valueToman": 3100000000000
  }
 },
 "breadth": {
  "pos": 410,
  "neg": 532,
  "total": 942,
  "posPct": 43.524416135881104,
  "queueBuy": 216,
  "queueSell": 176
 },
 "perCapita": {
  "buy": 98.2,
  "sell": 119.8
 }
}
```

### ۵٫۱) ردیف‌های خامِ جدولِ پایش (همان‌هایی که پارسر می‌خواند)

- ستون‌ها (8): `#` `خرد` `بورس` `فرابورس` `سهامي` `درآمدثابت` `آپشن` `کالايي`
  - `نمادها` → `942` `364` `390` `188` `93` `1485` `35`
  - `نماد مثبت` → `(44%) 410` `(42%) 154` `(48%) 186` `70` `-` `-` `-`
  - `نماد منفي` → `(56%) 532` `(58%) 210` `(52%) 204` `118` `-` `-` `-`
  - `صف خريد` → `(23%) 216` `(23%) 84` `(32%) 125` `7` `-` `-` `-`
  - `صف فروش` → `(19%) 176` `(22%) 80` `(22%) 87` `9` `-` `-` `-`
  - `ارزش صف خريد` → `5.1T` `2.6T` `2.4T` `65.6B` `-` `-` `-`
  - `ارزش صف فروش` → `2.1T` `854.3B` `839.6B` `398.4B` `-` `-` `-`
  - `ورود پول حقيقي` → `692.6B` `862.8B` `-293.3B` `123.1B` `74.2B` `156.3M` `1.1T`
  - `ارزش معاملات` → `49.9T` `26.5T` `8.1T` `15.4T` `60T` `3.1T` `15T`
  - `حجم معاملات` → `91.5B` `75.2B` `13.4B` `2.9B` `22.4B` `112.6M` `1.7B`
  - `تعداد معاملات` → `1.5M` `0.9M` `378.7K` `227K` `153.8K` `390.8K` `262.6K`

### ۵٫۲) برشِ خام دورِ «ورود پول حقیقی» و «ارزش معاملات»

- `ورود پول حقیقی`: 11 بار → `s="boxborard"> <div class="pre_chart responsive-table" id="input_money_sf"></div> <a href="#" class="q_in_h_ch"><i data-toggle="tooltip" data-placement="bottom" title="ورود پول حقیقی به صندوق های درآمد ثابت" class="q_i_in_h fa fa-question-circle"></i></a> <script> var options = { title:{ text:'ورود پول حقیقی به صندوق درآمد ثابت', align:'center' }, subtitle:{ text:'آخرین 123- میلیارد تومان', align:'center', offsetY:25, style:{fontSize:'12px', color:'#9699a2'} }, series:[ { name:"ورود پول", data: [null,null,null,null,null,null,null,null,null,null,n`
- `ارزش معاملات`: 11 بار → `nsive-table " id="trans_value_pie"></div> <a href="#" class="q_in_h_ch"> <i data-toggle="tooltip" data-placement="bottom" title="نمودار درصد ارزش معاملات بازار (همت)" class="q_i_in_h fa fa-question-circle"></i> </a> <script> (function () { const el = document.querySelector("#trans_value_pie"); if (!el) return; const series = [26.5,8.0999999999999996447286321199499070644378662109375,3.100000000000000088817841970012523233890533447265625,15.4000000000000003552713678800500929355621337890625,60,14.300000000000000710542735760100185871124267578125]; const labels = ["بو`
- `سرانه خرید حقیقی`: 1 بار → `t-right'>تعداد نماد منفی</td> <td class='bl-colu text-danger'>(56%) 532</td> </tr> <tr> <td class='text-right'>سرانه خرید حقیقی</td> <td class='bl-colu text-success'>98.2</td> </tr> <tr> <td class='text-right'>سرانه فروش حقیقی</td> <td class='bl-colu text-danger'>119.8</td> </tr> <tr> <td class='text-right'>میانگین قیمت سهام</td> <td dir='ltr' class='bl-colu'> L <span class='text-danger'>-0.05</span> C <span class='text-danger'>-0.31</span> `
- `صف خرید`: 8 بار → `"stock-filter">فیلترهای کاربردی</a></li> <li><a href="pre-opening">فیلترهای پیش گشایش</a></li> <li><a href="buy-sell-queues">فیلترهای صف خرید/فروش</a></li> <li><a href="volume-filter">فیلترهای حجم مشکوک</a></li> <li><a href="real-money">فیلترهای ورود پول</a></li> <!--<li><a href="pe">فیلتر و نمودار P/E</a></li> <li><a href="ps">فیلتر و نمودار P/S</a></li>--> <li><a href="marketcap">فیلترهای ارزش بازار</a></li> <li><a href="stock-float">فیلترهای شناوری سهام</a></li> <li><a href="tal-filter">فیلتر مع`
- `نماد مثبت`: 5 بار → `="boxborard"> <div class="pre_chart responsive-table" id="posnegqty"></div> <a href="#" class="q_in_h_ch"><i data-toggle="tooltip" data-placement="bottom" title="تعداد نماد مثبت و منفی بازار" class="q_i_in_h fa fa-question-circle"></i></a> <script> var options = { title:{ text:'تعداد نمادهای مثبت و منفی', align:'center' }, subtitle:{ text:'مثبت 420 \| منفی 523', align:'center', offsetY:25, style:{fontSize:'12px', color:'#9699a2'} }, series:[ { name:"مثبت", data: [383,404,434,454,486,515,537,547,553,555,561,561,555,545,536,512,488,478,456,426,400,3`

- جلسه‌ی تهران باز است؟ خیر

## ۶) نشانی‌های امتحان‌شده

- `https://tablokhani.com/robots.txt` — مجوزِ واکشی (Disallow دارد؟)
- `https://tablokhani.com/` — صفحه‌ی اصلی: شاخص‌ها، صف‌ها، سریِ روز
- `https://api.tablokhani.com/` — زیردامنه‌ی api
- `https://tablokhani.com/stock-screener/hot-money` — پول داغ (معاملاتِ درشتِ حقیقی)
- `https://tablokhani.com/stock-screener/market-game` — بازیِ بازار (خرد/متوسط/بزرگ)
- `https://tablokhani.com/stock-screener/big-moves` — تحرکاتِ بزرگان (ورود/خروجِ ۱۰ دقیقه‌ای)
- `https://tablokhani.com/trading-hall/stocks` — تالارِ معاملات
- `https://bourse-trader.ir/api/?task=api` — بورس‌تریدر — منبعِ فعلیِ جریانِ پول
