/* ============================================================
   گرماسنج — config.js (نسل ۳)
   تنها نقطه‌ی تنظیمات: دارایی‌ها، منابع راستی‌آزمایی‌شده،
   آینه‌های TGJU، فرمول‌های زنجیره و آستانه‌ها.
   همه‌ی منابع این فهرست در شهریور ۱۴۰۵ با پاسخ واقعی تست شده‌اند.
   ============================================================ */
(function () {
  'use strict';
  window.GS = window.GS || {};

  /** تورم مرجع (نقطه‌به‌نقطه). چون API عمومی پایدار ندارد،
      به‌صورت دوره‌ای دستی به‌روزرسانی می‌شود و تاریخش شفاف است. */
  var INFLATION = {
    value: 42,
    source: 'مرکز آمار ایران — تورم نقطه‌به‌نقطه (تقریبی)',
    updatedFa: 'شهریور ۱۴۰۵',
    note: 'اگر عدد رسمی جدید منتشر شد، همین‌جا به‌روزرسانی می‌شود و تاریخش ثبت می‌ماند.'
  };

  /** چرخه‌های به‌روزرسانی (میلی‌ثانیه) */
  var REFRESH = {
    fastMs: 45000,   // گروه‌های اصلی: TGJU / صرافی‌ها / جهانی / مرجع ارز
    slowMs: 180000,  // ناواسان (کلیددار) + تاریخچه + بازبینی سلامت
    clockMs: 1000,
    freshMs: 5000    // بازرسم «تازگی» بدون درخواست شبکه
  };

  /** آستانه‌های تازگی داده (میلی‌ثانیه) */
  var FRESH = {
    liveMs: 120000,    // سبز: زنده
    agingMs: 600000,   // کهربایی: در حال قدیمی شدن
    staleMs: 3600000   // خاکستری: قدیمی (نمایش با برچسب صادقانه)
  };

  /** نگهبان جهش: پرش بیش از maxPct رد می‌شود، مگر این‌که confirmCycles بار
      پیاپی از منبع زنده در همان محدوده تکرار شود (بازار واقعاً جابه‌جا شده). */
  var JUMP = { maxPct: 0.25, confirmCycles: 3, confirmBand: 0.05 };

  /** ساعات کاری تقریبی بازار آزاد ارز و طلای تهران (به‌وقت تهران، ۰=شنبه … ۶=جمعه) */
  var SESSION = {
    days: { 0: [9, 18], 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 13] }, // جمعه: تعطیل
    note: 'خارج از این ساعات، قیمت‌های TGJU مربوط به آخرین جلسه‌اند و با برچسب «آخرین جلسه» نمایش داده می‌شوند.'
  };

  /**
   * ساعات جلسه‌ی بورس تهران (به‌وقت تهران، ۰=شنبه … ۶=جمعه).
   * بازارِ سهام شنبه تا چهارشنبه است و زودتر از بازارِ آزادِ ارز می‌بندد؛
   * بیرونِ این ساعات، عددِ شاخص مربوط به «آخرین جلسه» است.
   * این ساعات را باید هر سال با اطلاعیه‌ی رسمیِ بورس تطبیق داد — برای همین
   * فقط یک نقطه‌ی تنظیمات است و در کد پخش نشده.
   */
  var TSE_SESSION = {
    days: { 0: [9, 12.5], 1: [9, 12.5], 2: [9, 12.5], 3: [9, 12.5], 4: [9, 12.5] },
    note: 'جلسه‌ی بورس شنبه تا چهارشنبه است؛ پنجشنبه و جمعه تعطیل. بیرون از این ساعات، شاخص مربوط به آخرین جلسه است.'
  };

  /**
   * مسیرِ کلیددارِ جریانِ پول (BrsApi) — فاز ۳.
   *
   * چرا سمتِ کلاینت؟ دو دلیلِ اندازه‌گیری‌شده/مستند:
   *  ۱) TSETMC از IP خارجی پاسخ نمی‌دهد، پس ناشر نمی‌تواند این داده را بگیرد؛
   *  ۲) قوانینِ BrsApi بازنشرِ داده به‌صورتِ «سرویس برای دیگران» را منع کرده؛
   *     با کلیدِ شخصیِ کاربر و فراخوانیِ مستقیم از مرورگر، مصرف‌کننده همان
   *     صاحبِ کلید است (همان الگوی ناواسان).
   *
   * هشدارِ صداقت: مسیرِ دقیقِ اندپوینت و نامِ فیلدها باید با مستنداتِ رسمیِ
   * BrsApi تطبیق داده شود (صفحه‌ی مستندات برای IP دیتاسنتر پشتِ reCAPTCHA است
   * و از اینجا قابل تأیید نبود). برای همین نام‌ها در یک جا آمده‌اند و در صورت
   * ناشناخته بودنِ ساختار، هیچ عددی ساخته نمی‌شود — فقط گزارش می‌شود.
   */
  var BRSAPI = {
    base: 'https://BrsApi.ir/Api/Tsetmc',
    marketPath: 'MarketWatch.php',   // type=1: سهام بورس و فرابورس + ETF + حق‌تقدم
    type: 1,
    minGapMs: 30 * 60000,            // هر نیم‌ساعت بیش از یک بار نه (سقفِ رایگان ۱۵۰۰/روز)
    unit: 'rial',                    // TSETMC/BrsApi ریال می‌دهند؛ خروجی‌ی ما تومان است
    timeoutMs: 14000,
    // مفهوم → نام‌های محتملِ فیلد (قراردادِ TSETMC: I = حقیقی، N = حقوقی)
    fields: {
      buyRetail: ['Buy_I_Volume', 'BuyIVolume', 'buy_i_volume', 'BuyCountIVolume'],
      buyLegal: ['Buy_N_Volume', 'BuyNVolume', 'buy_n_volume'],
      sellRetail: ['Sell_I_Volume', 'SellIVolume', 'sell_i_volume'],
      sellLegal: ['Sell_N_Volume', 'SellNVolume', 'sell_n_volume'],
      price: ['pl', 'pc', 'PClosing', 'PDrCotVal', 'close', 'Close', 'last'],
      value: ['tval', 'QTotCap', 'value', 'Value', 'TradeValue'],
      volume: ['tvol', 'QTotTran5J', 'volume', 'Volume']
    },
    getKeyUrl: function () { return 'https://brsapi.ir/tsetmc-exchange-free-bourse-api-key-request/'; }
  };

  /**
   * آستانه‌های «جریانِ پولِ حقیقیِ بورس» — عاملِ نهمِ حکم.
   * نسبتِ جریان = خالصِ پولِ حقیقی ÷ ارزشِ معاملات (بدون بُعد تا با تورم خراب نشود).
   * strong: به‌تنهایی امتیاز می‌گیرد؛ mild: فقط اگر جهتِ شاخص هم با آن هم‌خوان باشد.
   */
  var MARKETFLOW = {
    strong: 0.10,
    mild: 0.04,
    note: 'سقفِ اثرِ این عامل روی حکم ۱± است: سیگنالِ تأییدکننده/چرخشی است، نه پیشران.'
  };

  /** آینه‌های TGJU — هر ۵ آینه موازی مسابقه می‌دهند، اولین پاسخ معتبر می‌برد */
  var TGJU_MIRRORS = [
    'https://call5.tgju.org',
    'https://call4.tgju.org',
    'https://call2.tgju.org',
    'https://call1.tgju.org',
    'https://call.tgju.org'
  ];

  /**
   * رجیستری دارایی‌ها — ترتیب نمایش در شبکه‌ی بازار.
   * kind: toman (تومان) | usd (دلار) — مقیاس نمایش و محاسبات مشتق.
   * tgju: کلیدهای کاندید در آبجکت current پاسخ ajax.json (اولین برخورد می‌برد).
   * rial: true یعنی قیمت TGJU ریالی است و بر ۱۰ تقسیم می‌شود (پیش‌فرض true؛
   *       انس و نسبت‌های جهانی دلاری‌اند و تقسیم نمی‌شوند).
   */
  var ASSETS = [
    // ارز (بازار آزاد تهران)
    { sym: 'USD', fa: 'دلار آمریکا', short: 'دلار', cat: 'currency', unit: 'تومان', icon: 'i-usd', kind: 'toman', tgju: ['price_dollar_rl', 'price_dollar_dt'] },
    { sym: 'EUR', fa: 'یورو', short: 'یورو', cat: 'currency', unit: 'تومان', icon: 'i-eur', kind: 'toman', tgju: ['price_eur', 'eur'] },
    { sym: 'GBP', fa: 'پوند انگلیس', short: 'پوند', cat: 'currency', unit: 'تومان', icon: 'i-cur', kind: 'toman', tgju: ['price_gbp', 'gbp'] },
    { sym: 'AED', fa: 'درهم امارات', short: 'درهم', cat: 'currency', unit: 'تومان', icon: 'i-cur', kind: 'toman', tgju: ['price_aed', 'aed'] },
    { sym: 'CHF', fa: 'فرانک سوئیس', short: 'فرانک', cat: 'currency', unit: 'تومان', icon: 'i-cur', kind: 'toman', tgju: ['price_chf', 'chf'] },
    { sym: 'CNY', fa: 'یوان چین', short: 'یوان', cat: 'currency', unit: 'تومان', icon: 'i-cur', kind: 'toman', tgju: ['price_cny', 'cny'] },
    { sym: 'TRY', fa: 'لیر ترکیه', short: 'لیر', cat: 'currency', unit: 'تومان', icon: 'i-cur', kind: 'toman', tgju: ['price_try', 'try'] },
    // طلا
    { sym: 'G18', fa: 'طلای ۱۸ عیار', short: 'طلای ۱۸', cat: 'gold', unit: 'تومان', sub: 'هر گرم', icon: 'i-gold', kind: 'toman', tgju: ['geram18'] },
    { sym: 'G24', fa: 'طلای ۲۴ عیار', short: 'طلای ۲۴', cat: 'gold', unit: 'تومان', sub: 'هر گرم', icon: 'i-gold', kind: 'toman', tgju: ['geram24'] },
    { sym: 'MESGHAL', fa: 'مثقال طلا (مظنه)', short: 'مثقال', cat: 'gold', unit: 'تومان', icon: 'i-gold', kind: 'toman', tgju: ['mesghal'] },
    { sym: 'OUNCE_USD', fa: 'انس جهانی طلا', short: 'اونس', cat: 'gold', unit: 'دلار', icon: 'i-gold', kind: 'usd', dec: 2, tgju: ['ons', 'once', 'ounce'], rial: false },
    { sym: 'OUNCE_TM', fa: 'انس جهانی به تومان', short: 'اونس (تومان)', cat: 'gold', unit: 'تومان', icon: 'i-gold', kind: 'toman', derived: true },
    // سکه
    { sym: 'EMAMI', fa: 'سکه امامی', short: 'امامی', cat: 'coin', unit: 'تومان', sub: 'طرح جدید', icon: 'i-coin', kind: 'toman', tgju: ['sekee'] },
    { sym: 'BAHAR', fa: 'سکه بهار آزادی', short: 'بهار', cat: 'coin', unit: 'تومان', sub: 'طرح قدیم', icon: 'i-coin', kind: 'toman', tgju: ['sekeb'] },
    { sym: 'NIM', fa: 'نیم سکه', short: 'نیم', cat: 'coin', unit: 'تومان', icon: 'i-coin', kind: 'toman', tgju: ['nim', 'retail_nim'] },
    { sym: 'ROB', fa: 'ربع سکه', short: 'ربع', cat: 'coin', unit: 'تومان', icon: 'i-coin', kind: 'toman', tgju: ['rob', 'retail_rob'] },
    { sym: 'GERAMI', fa: 'سکه گرمی', short: 'گرمی', cat: 'coin', unit: 'تومان', icon: 'i-coin', kind: 'toman', tgju: ['gerami', 'retail_gerami'] },
    // رمزارز
    // فقط کلید تترِ واقعی: crypto-usd-coin مربوط به USDC است، نه تتر
    { sym: 'USDT', fa: 'تتر', short: 'تتر', cat: 'crypto', unit: 'تومان', sub: 'صرافی‌های ایران', icon: 'i-usdt', kind: 'toman', tgju: ['crypto-tether-irr'] },
    { sym: 'BTC_USD', fa: 'بیت‌کوین (دلاری)', short: 'بیت‌کوین $', cat: 'crypto', unit: 'دلار', icon: 'i-btc', kind: 'usd', dec: 0, tgju: [] },
    { sym: 'BTC_TM', fa: 'بیت‌کوین (تومانی)', short: 'بیت‌کوین', cat: 'crypto', unit: 'تومان', sub: 'معادل تومانی', icon: 'i-btc', kind: 'toman', tgju: ['crypto-bitcoin-irr', 'btc-irr'] }
  ];

  var CATS = [
    { id: 'all', fa: 'همه' },
    { id: 'currency', fa: 'ارز' },
    { id: 'gold', fa: 'طلا' },
    { id: 'coin', fa: 'سکه' },
    { id: 'crypto', fa: 'رمزارز' }
  ];

  /** ثابت‌های فیزیکی زنجیره‌ی طلا و سکه (استاندارد بازار) */
  var CHAIN = {
    OUNCE_G: 31.1035,   // هر انس تروا چند گرم است
    K18: 0.75,           // عیار ۱۸ از ۲۴
    MESGHAL_K: 4.352,    // مظنه = گرم ۱۸ × ۴٫۳۵۲
    G24_K: 4 / 3,        // گرم ۲۴ ≈ گرم ۱۸ × ۴/۳
    EMAMI_G: 7.3197,     // طلای خالص سکه امامی/بهار: ۸٫۱۳۳ گرم × ۰٫۹
    NIM_G: 3.6599,       // ۴٫۰۶۶۵ × ۰٫۹
    ROB_G: 1.8299,       // ۲٫۰۳۲۲۵ × ۰٫۹
    GERAMI_G: 0.909,     // طلای خالص سکه گرمی: ۱٫۰۱ گرم × ۰٫۹ (عیار ۲۱٫۶ یا ۹۰۰ در ۱۰۰۰)
    AED_PEG: 3.6725      // پگ درهم به دلار
  };

  /** منابع داده — انتشار سرور اول، بعد مستقیم‌ها، بعد فرمول‌ها */
  var SOURCES = [
    { id: 'live', name: 'انتشار زنده', scope: 'تازه‌ترین انتشار سرور (چند بار در روز، هر بار سه دور)', phase: 'fast' },
    { id: 'tgju', name: 'TGJU', scope: 'دلار، یورو، طلا، سکه، اونس — ۵ آینه', phase: 'fast' },
    { id: 'nobitex', name: 'نوبیتکس', scope: 'تتر و بیت‌کوین تومانی', phase: 'fast' },
    { id: 'wallex', name: 'والکس', scope: 'تتر و بیت‌کوین تومانی', phase: 'fast' },
    { id: 'bitpin', name: 'بیت‌پین', scope: 'تتر و بیت‌کوین (پشتیبان)', phase: 'fast' },
    { id: 'coingecko', name: 'CoinGecko', scope: 'بیت‌کوین و PAXG دلاری', phase: 'fast' },
    { id: 'kraken', name: 'Kraken', scope: 'بیت‌کوین و PAXG دلاری', phase: 'fast' },
    { id: 'binance', name: 'Binance Vision', scope: 'بیت‌کوین دلاری (آینه عمومی)', phase: 'fast' },
    { id: 'coinbase', name: 'Coinbase', scope: 'بیت‌کوین دلاری', phase: 'fast' },
    { id: 'frankfurter', name: 'Frankfurter', scope: 'برابری‌های جهانی ارز', phase: 'fast' },
    { id: 'erapi', name: 'ExchangeRate-API', scope: 'برابری‌های جهانی (پشتیبان)', phase: 'fast' },
    { id: 'navasan', name: 'ناواسان', scope: 'دلار، طلا، سکه (نیاز به کلید رایگان)', phase: 'slow' },
    { id: 'tse', name: 'شاخص بورس (TGJU)', scope: 'شاخص کلِ بورس تهران — آخرین جلسه', phase: 'fast' },
    // مکملِ بورس: صفحه‌ی عمومیِ bourse-trader.ir (بدون کلید) — فقط از انتشارِ سرور
    // می‌آید چون مرورگرِ کاربر به آن دسترسیِ مستقیم ندارد (CORS/شبکه).
    { id: 'btrader', name: 'بورس‌تریدر', scope: 'شاخص هم‌وزن و فرابورس، جریانِ پولِ خرد، تحرکاتِ صندوق‌ها — از انتشارِ سرور', phase: 'fast' },
    // جریانِ پولِ حقیقی/حقوقی: TSETMC از IP خارجی پاسخ نمی‌دهد (اندازه‌گیری شده)،
    // برای همین این ردیف یا از مرورگرِ کاربرِ داخل ایران پر می‌شود یا از منبعِ کلیددار.
    { id: 'tsetmc', name: 'جریان پول بورس', scope: 'حقیقی/حقوقی — از مرورگرِ داخل ایران یا منبعِ کلیددار', phase: 'slow' },
    // تابلوخوانی: اندازه‌گیری روی رانرِ گیت‌هاب نشان داد DNS/TCP/TLS برقرار می‌شود
    // اما پاسخِ HTTP نمی‌آید (مسدودسازیِ جغرافیایی) — پس فقط از مرورگرِ داخل ایران.
    { id: 'tablokhani', name: 'تابلوخوانی', scope: 'ارزشِ صف‌های خرید/فروش و روندِ پولِ پشتِ صف — فقط از مرورگرِ داخل ایران، هر یک ساعت', phase: 'slow' },
    { id: 'snapshot', name: 'اسنپ‌شات', scope: 'بوت‌استرپ اولیه + کش مرورگر', phase: 'boot' }
  ];

  /** تنظیمات رد پول داغ (روی نبض لحظه‌ای) */
  var HOTMONEY = {
    wDay: 0.6, wSlope: 0.4,
    dayScale: 3, slopeScale: 2
  };

  GS.config = {
    INFLATION: INFLATION,
    REFRESH: REFRESH,
    FRESH: FRESH,
    JUMP: JUMP,
    SESSION: SESSION,
    TSE_SESSION: TSE_SESSION,
    MARKETFLOW: MARKETFLOW,
    BRSAPI: BRSAPI,
    TGJU_MIRRORS: TGJU_MIRRORS,
    ASSETS: ASSETS,
    CATS: CATS,
    CHAIN: CHAIN,
    SOURCES: SOURCES,
    HOTMONEY: HOTMONEY
  };
})();
