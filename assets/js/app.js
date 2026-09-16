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
    GS.features.renderHotmoney();
    GS.features.renderMix();
    GS.features.renderVerdict();
    GS.features.renderChain();
    GS.features.renderHeatmap();
    GS.features.renderHealth();
    GS.features.checkRadars();
  }

  function initStatic() {
    var tf = U.$('#todayFa');
    if (tf) tf.textContent = 'داده‌ی امروز: ' + U.todayFa();
    var infNote = U.$('#inflNote');
    if (infNote) infNote.textContent = 'تورم مرجع ' + U.fa(GS.config.INFLATION.value) + '٪ — ' + GS.config.INFLATION.source + ' · ' + GS.config.INFLATION.updatedFa;

    GS.ui.buildTicker();
    GS.ui.buildMood();
    GS.ui.buildGrid();
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

    GS.data.on('quotes', function () {
      renderAll();
      GS.ui.renderStatus();
    });
    GS.data.on('toast', function (t) { GS.ui.toast(t.kind, t.title, t.msg); });
    GS.data.on('cycle', function (c) {
      if (!c.start) {
        GS.ui.renderStatus();
        GS.features.renderHealth();
        GS.features.renderSim();
      }
      var pill = U.$('#netStatus');
      if (pill) {
        if (c.start) {
          pill.className = 'net-pill busy';
          pill.innerHTML = '<i class="live-dot"></i>در حال دریافت…';
        } else {
          pill.className = 'net-pill ok';
          pill.innerHTML = '<i class="s-dot ok"></i>متصل';
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { GS.ui.closeModal('#diagModal'); GS.ui.closeModal('#settingsModal'); }
    });
  }

  function bindSettings() {
    U.$$('#srcSettingsBtn,#headSettingsBtn').forEach(function (openBtn) {
      openBtn.addEventListener('click', function () {
      var k = U.$('#navKey'), m = U.$('#manUsd');
      if (k) k.value = GS.data.getNavasanKey() || '';
      if (m) m.value = GS.data.getManualUsd() ? U.fmt(GS.data.getManualUsd()) : '';
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
      try { localStorage.removeItem('garmasanj_quotes_v7'); } catch (e) {}
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
      GS.ui.toast('info', 'اتصال برقرار شد', 'دریافت داده از سر گرفته شد.');
    });
    window.addEventListener('offline', function () {
      GS.ui.toast('warn', 'اتصال قطع شد', 'نمایش آخرین داده‌های ذخیره‌شده ادامه دارد.');
    });

    var retry = U.$('#retryBtn');
    if (retry) retry.addEventListener('click', function () {
      fastAt = Date.now(); slowAt = Date.now();
      GS.ui.toast('info', 'در حال دریافت', 'مسیرهای سریع چند ثانیه‌ای نتیجه می‌دهند؛ پشتیبان‌ها بعداً می‌رسند.');
    });

    document.addEventListener('click', function once() {
      GS.features.askNotify();
      document.removeEventListener('click', once);
    });

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
