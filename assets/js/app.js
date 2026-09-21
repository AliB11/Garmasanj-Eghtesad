/* ============================================================
   گرماسنج — app.js (نسل ۳)
   راه‌اندازی، زمان‌بندی دوحلقه‌ای، ساعت و رویدادهای سراسری.
   ============================================================ */
(function () {
  'use strict';
  var U = GS.utils;

  function renderAll() {
    GS.ui.updateTickerAll();
    GS.ui.updateMood();
    GS.ui.updateGrid();
    GS.ui.renderPulse();
    GS.ui.renderMacro();
    GS.ui.renderSessions();
    GS.features.renderHotmoney();
    GS.features.renderMix();
    GS.features.renderVerdict();
    GS.features.renderChain();
    GS.features.renderHeatmap();
    GS.features.renderHealth();
    GS.features.renderSim();
    GS.features.checkRadars();
    try { GS.ui.renderTkStatus(); } catch (e) {}
  }

  function initStatic() {
    var tf = U.$('#todayFa');
    if (tf) tf.textContent = 'داده‌ی امروز: ' + U.todayFa();
    var infNote = U.$('#inflNote');
    if (infNote) infNote.textContent = 'تورم مرجع ' + U.fa(GS.config.INFLATION.value) + '٪ — ' + GS.config.INFLATION.source + ' · ' + GS.config.INFLATION.updatedFa;
    // شمارنده‌های هیرو از تنظیمات خوانده می‌شوند تا با کد هم‌خوان بمانند
    var cSrc = U.$('[data-stat="sources"]'), cInf = U.$('[data-stat="inflation"]'), cAst = U.$('[data-stat="assets"]');
    if (cSrc) cSrc.dataset.cnt = GS.config.SOURCES.length;
    if (cInf) cInf.dataset.cnt = GS.config.INFLATION.value;
    if (cAst) cAst.dataset.cnt = GS.config.ASSETS.length;

    GS.ui.initTheme();
    GS.ui.buildTicker();
    GS.ui.buildMood();
    GS.ui.buildGrid();
    GS.ui.initCompare();
    GS.ui.updateMood();
    GS.ui.renderSessions();
    GS.ui.renderStatus();
    GS.ui.renderPulse();
    GS.ui.renderMacro();
    GS.ui.initReveal();
    GS.ui.initCounters();
    GS.features.initHeatmap();
    GS.features.renderVerdict();
    GS.features.renderChain();
    GS.features.renderHeatmap();
    GS.features.initSim();
    GS.features.initMix();
    GS.features.initRadar();
    GS.features.renderHotmoney();
    GS.features.renderHealth();

    bindSettings();
    var dg = U.$('#diagBtn');
    if (dg) dg.addEventListener('click', function () { GS.ui.buildDiag(); GS.ui.openModal('#diagModal'); });
    U.$$('#diagModal [data-dg-close]').forEach(function (el) {
      el.addEventListener('click', function () { GS.ui.closeModal('#diagModal'); });
    });
    U.$$('#assetModal [data-am-close]').forEach(function (el) {
      el.addEventListener('click', function () { GS.ui.closeModal('#assetModal'); });
    });

    GS.data.on('quotes', function () {
      renderAll();
      GS.ui.renderStatus();
    });
    GS.data.on('toast', function (t) { GS.ui.toast(t.kind, t.title, t.msg); });
    GS.data.on('since', function (d) {
      // «از آخرین بازدیدت» — فقط یک‌بار، فقط اگر نشست قبلی دست‌کم ۳۰ دقیقه پیش بوده
      var parts = d.rows.slice(0, 3).map(function (r) { return r.fa + ' ' + U.pct(r.pct, 1); });
      GS.ui.toast('info', 'از آخرین بازدیدت (' + U.relLabel(d.since) + ')', parts.join(' · '));
    });
    GS.data.on('cycle', function (c) {
      if (!c.start) {
        GS.ui.renderStatus();
        GS.features.renderHealth();
        GS.features.renderSim();
      }
      GS.ui.renderNetPill(!!c.start && c.phase === 'fast');
    });
    var shareBtn = U.$('#shareBtn');
    if (shareBtn) shareBtn.addEventListener('click', function () { GS.ui.shareSummary(); });
    var embedBtn = U.$('#embedBtn');
    if (embedBtn) embedBtn.addEventListener('click', function () { GS.ui.openEmbed(); });
    U.$$('#helpBtn,#footHelpBtn').forEach(function (b) { b.addEventListener('click', function () { GS.ui.openHelp(); }); });
    U.$$('#infoModal [data-if-close]').forEach(function (el) {
      el.addEventListener('click', function () { GS.ui.closeModal('#infoModal'); });
    });
    // دکمه‌های «؟» فرمول در هر جای صفحه (تفویض رویداد؛ محتوای پویا هم پوشش داده می‌شود)
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-formula]');
      if (!b || b.closest('#assetModalBody')) return; // مودال دارایی خودش وصل می‌کند
      e.preventDefault();
      GS.ui.openFormula(b.dataset.formula);
    });
    // تاریخچه‌ی بلندمدت رسید → حکم («این هفته») و مودال باز را تازه کن
    GS.data.on('history', function () {
      GS.features.renderVerdict();
      var am = U.$('#assetModal');
      if (am && am.classList.contains('show')) {
        var box = U.$('#amHist');
        var h = U.$('#assetModalBody h3');
        if (box && h) {
          var symEl = h.querySelector('.am-sym');
          var sym = symEl ? symEl.textContent.replace(/[()]/g, '') : '';
          if (sym) box.innerHTML = GS.ui.historyBlock(sym, 30);
        }
      }
      var cm = U.$('#compareModal');
      if (cm && cm.classList.contains('show')) GS.ui.renderCompare();
    });

    initShortcuts();
  }

  var ALL_MODALS = ['#diagModal', '#settingsModal', '#assetModal', '#compareModal', '#infoModal'];
  function closeAllModals() { ALL_MODALS.forEach(function (id) { GS.ui.closeModal(id); }); }
  function anyModalOpen() { return ALL_MODALS.some(function (id) { var m = U.$(id); return m && m.classList.contains('show'); }); }
  function currentModalAsset() {
    var am = U.$('#assetModal');
    if (!am || !am.classList.contains('show')) return null;
    var symEl = U.$('#assetModalBody .am-sym');
    return symEl ? symEl.textContent.replace(/[()]/g, '') : null;
  }

  /* ---------------- میان‌برهای کیبورد ---------------- */
  var FA_DIGITS = { '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5 };
  var CATS = ['all', 'currency', 'gold', 'coin', 'crypto'];
  function initShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeAllModals(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing) return;
      var k = e.key;
      var digit = /^[1-5]$/.test(k) ? +k : (FA_DIGITS[k] || 0);
      if (k === '/' ) { e.preventDefault(); closeAllModals(); GS.ui.focusSearch(); return; }
      if (k === '?' || k === '؟') { e.preventDefault(); if (U.$('#infoModal').classList.contains('show')) closeAllModals(); else { closeAllModals(); GS.ui.openHelp(); } return; }
      if (anyModalOpen()) {
        if ((k === 'p' || k === 'P') && currentModalAsset()) { e.preventDefault(); var pb = U.$('#amPinBtn'); if (pb) pb.click(); }
        return;
      }
      if (digit) { e.preventDefault(); GS.ui.setCategory(CATS[digit - 1]); var mk = U.$('#markets'); if (mk) { try { mk.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (err) {} } return; }
      switch (k) {
        case 's': case 'S': case 'س': e.preventDefault(); GS.ui.shareSummary(); break;
        case 'c': case 'C': case 'ز': e.preventDefault(); GS.ui.openCompare(); break;
        case 't': case 'T': case 'ف': e.preventDefault(); GS.ui.toggleTheme(); break;
        case 'r': case 'R': case 'ق': e.preventDefault(); fastAt = Date.now(); slowAt = Date.now(); GS.ui.toast('info', 'در حال دریافت', 'مسیرهای سریع چند ثانیه‌ای نتیجه می‌دهند.'); break;
        default: break;
      }
    });
  }

  function bindSettings() {
    U.$$('#srcSettingsBtn,#headSettingsBtn').forEach(function (openBtn) {
      openBtn.addEventListener('click', function () {
      var k = U.$('#navKey'), m = U.$('#manUsd'), b = U.$('#brsKey');
      if (k) k.value = GS.data.getNavasanKey() || '';
      if (m) m.value = GS.data.getManualUsd() ? U.fmt(GS.data.getManualUsd()) : '';
      if (b) b.value = GS.data.getBrsKey() || '';
      GS.ui.openModal('#settingsModal');
      });
    });
    U.$$('#settingsModal [data-st-close]').forEach(function (el) {
      el.addEventListener('click', function () { GS.ui.closeModal('#settingsModal'); });
    });
    var navSave = U.$('#navSave');
    if (navSave) navSave.addEventListener('click', function () {
      var k = (U.$('#navKey').value || '').trim();
      if (!k) { GS.ui.toast('warn', 'کلید خالی است', 'کلید API ناواسان را وارد کن.'); return; }
      GS.data.setNavasanKey(k);
      GS.ui.closeModal('#settingsModal');
      slowAt = Date.now();
      GS.ui.toast('ok', 'کلید ذخیره شد', 'ناواسان به چرخه‌ی بعدی اضافه شد.');
    });
    var navClear = U.$('#navClear');
    if (navClear) navClear.addEventListener('click', function () {
      GS.data.clearNavasanKey();
      U.$('#navKey').value = '';
      GS.ui.toast('info', 'کلید حذف شد', 'ناواسان از چرخه خارج شد.');
    });
    var brsSave = U.$('#brsSave');
    if (brsSave) brsSave.addEventListener('click', function () {
      var k = (U.$('#brsKey').value || '').trim();
      if (!k) { GS.ui.toast('warn', 'کلید خالی است', 'کلید API BrsApi را وارد کن.'); return; }
      GS.data.setBrsKey(k);
      GS.data.fetchBrsFlow(true);
      GS.ui.closeModal('#settingsModal');
      GS.ui.toast('ok', 'کلید ذخیره شد', 'جریانِ پولِ بورس در چرخه‌ی بعدی می‌آید.');
    });
    var brsTest = U.$('#brsTest');
    if (brsTest) brsTest.addEventListener('click', function () {
      var k = (U.$('#brsKey').value || '').trim();
      if (!k) { GS.ui.toast('warn', 'کلید خالی است', 'اول کلید را وارد و ذخیره کن.'); return; }
      GS.data.setBrsKey(k);
      GS.data.fetchBrsFlow(true).then(function (r) {
        var st = GS.data.src.tsetmc || {};
        if (r) GS.ui.toast('ok', 'جریانِ پول دریافت شد', U.fa(r.n) + ' نماد — خالص ' +
          U.fa((Math.abs(r.netToman) / 1e12).toFixed(1)) + ' همت ' + (r.netToman < 0 ? 'خروج' : 'ورود'));
        else GS.ui.toast('warn', 'پاسخِ قابل استفاده نبود', (st.note || 'بی‌پاسخ') + ' — جزئیات در «سلامت داده».');
        renderAll();
      });
    });
    var brsClear = U.$('#brsClear');
    if (brsClear) brsClear.addEventListener('click', function () {
      GS.data.clearBrsKey();
      U.$('#brsKey').value = '';
      renderAll();
      GS.ui.toast('info', 'کلید حذف شد', 'جریانِ پولِ بورس دیگر دریافت نمی‌شود.');
    });
    /* تابلوخوانی: منبعِ فقط‌داخل‌ایران — تلاشِ دستی و پاک‌سازیِ سریِ محلی */
    var tkRetry = U.$('#tkRetry');
    if (tkRetry) tkRetry.addEventListener('click', function () {
      tkRetry.disabled = true;
      GS.ui.toast('info', 'در حال تلاش', 'تابلوخوانی فقط از داخلِ ایران پاسخ می‌دهد…');
      GS.data.fetchTablokhani(true).then(function (d) {
        tkRetry.disabled = false;
        renderAll();
        if (d && d.queue && d.queue.buyToman != null) {
          GS.ui.toast('ok', 'تابلوخوانی خوانده شد',
            'ارزشِ صف خرید ' + U.fa((d.queue.buyToman / 1e12).toFixed(1)) + ' همت در برابر ' +
            U.fa(((d.queue.sellToman || 0) / 1e12).toFixed(1)) + ' همتِ صف فروش.');
        } else {
          GS.ui.toast('warn', 'تابلوخوانی بی‌پاسخ',
            'این منبع فقط از داخلِ ایران پاسخ می‌دهد و ممکن است CORS هم اجازه ندهد؛ جزئیات در «سلامت داده». پیوندهایِ تابلوخوانی در بخشِ بورس همچنان کار می‌کنند.');
        }
      });
    });
    var tkClear = U.$('#tkClear');
    if (tkClear) tkClear.addEventListener('click', function () {
      GS.data.clearTablokhani();
      renderAll();
      GS.ui.toast('info', 'سری پاک شد', 'سریِ «پولِ پشتِ صفِ امروز» حذف شد؛ از برداشتِ بعدی دوباره ساخته می‌شود.');
    });

    var manSave = U.$('#manSave');
    if (manSave) manSave.addEventListener('click', function () {
      var v = +U.toEn(U.$('#manUsd').value || '');
      if (!(v >= 10000 && v <= 10000000)) { GS.ui.toast('warn', 'مبلغ نامعتبر', 'قیمت دلار را به تومان وارد کن (مثلاً ۲۳۰٬۵۰۰).'); return; }
      GS.data.setManualUsd(v);
      GS.ui.closeModal('#settingsModal');
      renderAll();
      GS.ui.toast('ok', 'قیمت دستی ثبت شد', 'دلار ' + U.fmt(v) + ' تومان — با برچسب «ورود دستی».');
    });
    var manClear = U.$('#manClear');
    if (manClear) manClear.addEventListener('click', function () {
      GS.data.clearManualUsd();
      U.$('#manUsd').value = '';
      renderAll();
      GS.ui.toast('info', 'قیمت دستی حذف شد', 'دلار فقط از منابع زنده می‌آید.');
    });
    var cacheClear = U.$('#cacheClear');
    if (cacheClear) cacheClear.addEventListener('click', function () {
      GS.data.clearCache();
      GS.ui.toast('info', 'کش پاک شد', 'در چرخه‌ی بعدی فقط داده‌ی تازه نمایش داده می‌شود.');
    });
  }

  /* ---------------- زمان‌بند دوحلقه‌ای ---------------- */
  var fastAt = 0, slowAt = 0, started = false;

  function loop1s() {
    var clockEl = U.$('#srcClock'), nextEl = U.$('#nextIn');
    if (clockEl) clockEl.textContent = U.clockFa();
    if (!started) return;
    var now = Date.now();
    if (now >= fastAt && !GS.data.isFastBusy()) {
      fastAt = now + GS.config.REFRESH.fastMs;
      try { var pf = GS.data.tickFast(); if (pf && pf.catch) pf.catch(function () {}); } catch (e) {}
    }
    if (now >= slowAt && !GS.data.isSlowBusy()) {
      slowAt = now + GS.config.REFRESH.slowMs;
      try { var ps = GS.data.tickSlow(); if (ps && ps.catch) ps.catch(function () {}); } catch (e) {}
    }
    if (nextEl) {
      if (GS.data.isFastBusy()) nextEl.textContent = 'در حال دریافت…';
      else {
        var rem = Math.max(0, Math.ceil((fastAt - now) / 1000));
        nextEl.textContent = rem > 0 ? 'به‌روزرسانی بعدی: ' + U.fa(rem) + ' ثانیه' : 'در حال دریافت…';
      }
    }
  }

  function boot() {
    initStatic();
    setInterval(loop1s, 1000);
    loop1s();
    setInterval(function () { GS.ui.refreshAllFeeds(); }, GS.config.REFRESH.freshMs);
    setInterval(function () { GS.ui.renderSessions(); }, 30000);

    started = true;
    // بوت‌استرپ: اول اسنپ‌شات/کش (نمایش فوری)، بعد انتشار زنده، بعد حلقه‌ی زنده
    try {
      var sp = GS.data.bootAll();
      if (sp && sp.catch) sp.catch(function () {});
      if (sp && sp.then) sp.then(function () { renderAll(); GS.data.setBootDone(); });
      else GS.data.setBootDone();
    } catch (e) { GS.data.setBootDone(); }
    fastAt = Date.now() + 600;
    slowAt = Date.now() + 5000;

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        if (fastAt - Date.now() > 4000) fastAt = Date.now();
        GS.ui.refreshAllFeeds();
      }
    });
    window.addEventListener('online', function () {
      fastAt = Date.now();
      GS.ui.renderNetPill(false);
      GS.ui.toast('info', 'اتصال برقرار شد', 'دریافت داده از سر گرفته شد.');
    });
    window.addEventListener('offline', function () {
      GS.ui.renderNetPill(false);
      GS.ui.toast('warn', 'اتصال قطع شد', 'نمایش آخرین داده‌های ذخیره‌شده ادامه دارد.');
    });

    var retry = U.$('#retryBtn');
    if (retry) retry.addEventListener('click', function () {
      fastAt = Date.now(); slowAt = Date.now();
      GS.ui.toast('info', 'در حال دریافت', 'مسیرهای سریع چند ثانیه‌ای نتیجه می‌دهند؛ پشتیبان‌ها بعداً می‌رسند.');
    });

    // اجازه‌ی اعلان دیگر با «اولین کلیک روی صفحه» پرسیده نمی‌شود؛
    // فقط وقتی کاربر رادار ثبت می‌کند (نیت روشن) درخواست می‌شود.

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener('load', function () {
        var hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.register('sw.js').catch(function () {});
        // نسخه‌ی جدید نصب شد → به کاربر بگو تازه‌سازی کند (به‌جای اجرای بی‌صدا با کد قدیمی)
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (!hadController) return; // نصب اول؛ چیزی برای اعلام نیست
          GS.ui.toast('info', 'نسخه‌ی جدید گرماسنج آماده است', 'برای اعمال تغییرات، صفحه را یک‌بار تازه کن.');
        });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
