/* ============================================================
   گرماسنج — ui.js (نسل ۳)
   تیکر، گیج نبض، شبکه‌ی دارایی‌ها، جلسات، وضعیت، توست، مودال‌ها.
   ============================================================ */
(function () {
  'use strict';
  window.GS = window.GS || {};
  var U = GS.utils;

  function D() { return GS.data; }
  function CFG() { return GS.config; }
  function INFL() { return GS.config.INFLATION.value; }

  /* ---------------- توست ---------------- */
  function toast(kind, title, msg) {
    var box = U.$('#toasts');
    if (!box) return;
    var el = U.el('<div class="toast t-' + kind + '">' +
      '<span class="t-ic"><svg class="ic s18"><use href="#' + (kind === 'ok' ? 'i-check' : kind === 'warn' ? 'i-bell' : 'i-clock') + '"/></svg></span>' +
      '<span class="t-tx"><b>' + U.esc(title) + '</b><small>' + U.esc(msg) + '</small></span>' +
      '<button class="t-x" aria-label="بستن"><svg class="ic s14"><use href="#i-x"/></svg></button>' +
      '<i class="t-bar"></i></div>');
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    var gone = false;
    function rm() {
      if (gone || !el.parentNode) return; gone = true;
      el.classList.add('out'); setTimeout(function () { el.remove(); }, 320);
    }
    el.querySelector('.t-x').addEventListener('click', rm);
    setTimeout(rm, 5200);
  }

  /* ---------------- تیکر ---------------- */
  var TICKER = [
    { k: 'USD' }, { k: 'USDT' }, { k: 'EUR' }, { k: 'GBP' },
    { k: 'G18' }, { k: 'MESGHAL' }, { k: 'EMAMI' }, { k: 'NIM' },
    { k: 'BTC_USD' }, { k: 'BTC_TM' }, { k: 'OUNCE_USD' },
    { k: 'bubble', label: 'حباب سکه' }, { k: 'infl', label: 'تورم نقطه‌به‌نقطه' }
  ];

  function dayHTML(d) {
    if (d == null || Math.abs(d) < 0.05) return '<span class="z">—</span>';
    return '<svg class="ic s12"><use href="#' + (d > 0 ? 'i-up' : 'i-down') + '"/></svg><span dir="ltr">' + U.pct(d) + '</span>';
  }

  function tickerVal(k) {
    if (k === 'infl') return { txt: U.fa(INFL()) + '٪', chg: 0 };
    if (k === 'bubble') {
      var dv = D().derived();
      if (dv.bubble == null) return null;
      return { txt: U.fa(dv.bubble.toFixed(1)) + '٪', chg: 0 };
    }
    var a = D().asset(k), q = D().quote(k);
    if (!a || !q || !(q.p > 0)) return null;
    return { txt: dispPrice(a, q), chg: q.chgPct };
  }

  function buildTicker() {
    var track = U.$('#tickerTrack');
    if (!track) return;
    var half = TICKER.map(function (t) {
      var a = D().asset(t.k), label = t.label || (a ? a.short : '');
      var v = tickerVal(t.k) || { txt: '—', chg: 0 };
      return '<div class="tk"><span class="tk-n">' + U.esc(label) + '</span>' +
        '<span class="tk-p" data-tp="' + t.k + '">' + v.txt + '</span>' +
        '<span class="tk-c z" data-tc="' + t.k + '">' + dayHTML(v.chg) + '</span></div><span class="tk-sep"></span>';
    }).join('');
    track.innerHTML = half + half;
  }

  function updateTickerAll() {
    var track = U.$('#tickerTrack');
    if (!track) return;
    TICKER.forEach(function (t) {
      var v = tickerVal(t.k);
      if (!v) return;
      U.$$('#tickerTrack [data-tp="' + t.k + '"]').forEach(function (el) {
        if (el.textContent !== v.txt) {
          el.textContent = v.txt;
          el.classList.remove('fu', 'fd'); void el.offsetWidth;
          if (v.chg > 0.05) el.classList.add('fu');
          else if (v.chg < -0.05) el.classList.add('fd');
        }
      });
      U.$$('#tickerTrack [data-tc="' + t.k + '"]').forEach(function (el) {
        el.className = 'tk-c ' + (v.chg == null || Math.abs(v.chg) < 0.05 ? 'z' : v.chg > 0 ? 'up' : 'down');
        el.innerHTML = dayHTML(v.chg);
      });
    });
  }

  /* ---------------- گیج نبض بازار ---------------- */
  function buildMood() {
    var host = U.$('#moodSvg');
    if (!host) return;
    var cx = 170, cy = 150, r = 116;
    function pt(th, rr) { var a = th * Math.PI / 180; return [cx + rr * Math.sin(a), cy - rr * Math.cos(a)]; }
    function arc(th0, th1, rr) {
      var p0 = pt(th0, rr), p1 = pt(th1, rr);
      return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + rr + ' ' + rr + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
    }
    function mA(s) { return -90 + (U.clamp(s, -100, 100) + 100) / 200 * 180; }
    var segs = '';
    for (var i = 0; i < 20; i++) {
      var s0 = -100 + i * 10, mid = s0 + 5;
      var col = mid < -20 ? '#3E8E9E' : mid < 0 ? '#7E97A3' : mid < 20 ? '#C9A24B' : mid < 50 ? '#E8833A' : '#E84E3A';
      segs += '<path d="' + arc(mA(s0), mA(s0 + 10), r) + '" stroke="' + col + '" stroke-width="12" fill="none" opacity=".9"/>';
    }
    var ticks = '', labels = '';
    [[-100, '−۱۰۰'], [-50, '−۵۰'], [0, '۰'], [50, '+۵۰'], [100, '+۱۰۰']].forEach(function (pair) {
      var s = pair[0], lb = U.fa(pair[1]), a = mA(s);
      var p0 = pt(a, r + 9), p1 = pt(a, r + 17);
      ticks += '<line x1="' + p0[0].toFixed(1) + '" y1="' + p0[1].toFixed(1) + '" x2="' + p1[0].toFixed(1) + '" y2="' + p1[1].toFixed(1) +
        '" stroke="' + (s === 0 ? '#9AA4AD' : '#454E57') + '" stroke-width="' + (s === 0 ? 2.4 : 1.4) + '"' + (s === 0 ? ' stroke-dasharray="3 3"' : '') + '/>';
      var lp = pt(a, r + 30);
      labels += '<text x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 4).toFixed(1) + '" text-anchor="middle" font-size="12" fill="#8B949C" font-family="Vazirmatn">' + lb + '</text>';
    });
    host.innerHTML = '<svg viewBox="0 0 340 205" role="img" aria-label="گیج نبض بازار">' +
      '<path d="' + arc(-90, 90, r) + '" stroke="#22282E" stroke-width="16" fill="none"/>' + segs + ticks + labels +
      '<g id="moodNeedle"><line x1="' + cx + '" y1="' + (cy - 14) + '" x2="' + cx + '" y2="' + (cy - (r - 32)) + '" stroke="#C9CFD4" stroke-width="3.2" stroke-linecap="round" id="moodNeedleLine"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="7.5" fill="#22282E" stroke="#C9CFD4" stroke-width="3" id="moodHub"/></g></svg>';
    var nd = U.$('#moodNeedle');
    if (nd) nd.style.transformOrigin = '170px 150px';
  }

  function moodColor(s) {
    if (s >= 50) return '#E84E3A';
    if (s >= 20) return '#E8833A';
    if (s >= 5) return '#C9A24B';
    if (s > -5) return '#9AA4AD';
    if (s > -20) return '#7E97A3';
    if (s > -50) return '#3E8E9E';
    return '#3E6E9E';
  }

  function updateMood() {
    var m = D().mood();
    var a = -90 + (U.clamp(m.score, -100, 100) + 100) / 200 * 180, col = moodColor(m.score);
    var nd = U.$('#moodNeedle');
    if (nd) nd.style.transform = 'rotate(' + a + 'deg)';
    var nl = U.$('#moodNeedleLine'), hb = U.$('#moodHub');
    if (nl) nl.setAttribute('stroke', col);
    if (hb) hb.setAttribute('stroke', col);
    var gNum = U.$('#moodNum');
    if (gNum) { gNum.textContent = (m.score >= 0 ? '+' : '−') + U.fa(Math.abs(m.score)); gNum.style.color = col; }
    var gz = U.$('#moodZone');
    if (gz) { gz.textContent = m.n ? m.label : 'بدون داده'; gz.style.color = col; }
    var gm = U.$('#moodMsg');
    if (gm) {
      if (!m.n) gm.textContent = 'در انتظار اولین داده…';
      else if (m.quiet) {
        var ses = U.marketSession();
        gm.textContent = U.fa(m.flat) + '٪ دارایی‌ها بی‌تغییرند' + (!ses.open ? ' (بازار تهران بسته است' + (ses.next ? ' — ' + ses.next : '') + ')' : '') +
          ' · متحرک‌ها: ' + U.fa(m.ups) + '٪ مثبت، ' + U.fa(m.downs) + '٪ منفی';
      } else {
        gm.textContent = U.fa(m.ups) + '٪ مثبت · ' + U.fa(m.downs) + '٪ منفی · میانگین تغییر ' + U.pct(m.avg, 2);
      }
    }
    var hs = U.$('#heroStats2');
    if (hs && m.n) {
      var b = D().asset(m.best), w = D().asset(m.worst);
      hs.innerHTML = '<div class="hs"><b class="up">' + U.esc(b ? b.short : '') + '</b><small>بهترین امروز ' + U.pct(D().quote(m.best).chgPct) + '</small></div>' +
        '<div class="hs"><b class="down">' + U.esc(w ? w.short : '') + '</b><small>ضعیف‌ترین امروز ' + U.pct(D().quote(m.worst).chgPct) + '</small></div>';
    }
  }

  /* ---------------- جلسات معاملاتی ---------------- */
  function renderSessions() {
    var el = U.$('#sessStrip');
    if (!el) return;
    var ses = U.marketSession();
    if (ses.label === 'نامشخص') { el.innerHTML = ''; return; }
    el.innerHTML =
      '<span class="sess" title="' + U.esc(ses.next || 'ساعات تقریبی بازار آزاد تهران') + '"><i class="led ' + (ses.open ? 'on' : '') + '"></i>بازار ارز و طلا: ' + ses.label +
      (!ses.open && ses.next ? ' <small>(' + U.esc(ses.next) + ')</small>' : '') + '</span>' +
      '<span class="sess"><i class="led on"></i>رمزارز جهانی: ۲۴/۷</span>';
  }

  /** پیل وضعیت هدر — صادقانه: قطع/بی‌پاسخ/تک‌منبع/متصل */
  function renderNetPill(busy) {
    var pill = U.$('#netStatus');
    if (!pill) return;
    if (busy) { pill.className = 'net-pill busy'; pill.innerHTML = '<i class="live-dot"></i>در حال دریافت…'; return; }
    var offline = (typeof navigator !== 'undefined' && navigator.onLine === false);
    var live = D().liveCount(), oks = D().okSources();
    if (offline) { pill.className = 'net-pill off'; pill.innerHTML = '<i class="s-dot off"></i>آفلاین — نمایش کش'; }
    else if (!live) { pill.className = 'net-pill off'; pill.innerHTML = '<i class="s-dot off"></i>منابع بی‌پاسخ'; }
    else if (oks <= 1 || live < 5) { pill.className = 'net-pill alt'; pill.innerHTML = '<i class="s-dot alt"></i>اتصال محدود (' + U.fa(live) + ' زنده)'; }
    else { pill.className = 'net-pill ok'; pill.innerHTML = '<i class="s-dot ok"></i>متصل · ' + U.fa(live) + ' زنده'; }
  }

  /* ---------------- وضعیت منابع (نوار خلاصه) ---------------- */
  function renderStatus() {
    var strip = U.$('#srcStrip');
    if (!strip) return;
    var groups = [
      { label: 'ایران (TGJU)', ids: ['tgju'] },
      { label: 'صرافی رمزارز', ids: ['nobitex', 'wallex', 'bitpin'] },
      { label: 'بازار جهانی', ids: ['coingecko', 'kraken', 'binance', 'coinbase'] },
      { label: 'مرجع ارز', ids: ['frankfurter', 'erapi'] }
    ];
    strip.innerHTML = groups.map(function (g) {
      var oks = g.ids.filter(function (id) { return D().src[id] && D().src[id].ok; }).length;
      var tried = g.ids.filter(function (id) { return D().src[id] && D().src[id].ok !== null; }).length;
      var st, txt;
      if (!tried) { st = 'wait'; txt = 'اتصال…'; }
      else if (oks >= 2 || (g.ids.length === 1 && oks === 1)) { st = 'ok'; txt = g.ids.length === 1 ? 'متصل' : 'اجماع فعال'; }
      else if (oks === 1) { st = 'alt'; txt = 'تک‌منبع'; }
      else { st = 'off'; txt = 'بی‌پاسخ'; }
      return '<span class="src"><i class="s-dot ' + st + '"></i>' + g.label + ' <em>' + txt + '</em></span>';
    }).join('');
    renderFreshBadge();
  }

  function renderFreshBadge() {
    var b = U.$('#freshBadge');
    if (!b) return;
    var live = CFG().ASSETS.filter(function (a) { var q = D().quote(a.sym); return q && q.p > 0 && q.live; }).length;
    var total = CFG().ASSETS.length;
    b.innerHTML = '<i class="s-dot ' + (live >= 12 ? 'ok' : live >= 5 ? 'alt' : 'off') + '"></i>' +
      U.fa(live) + ' از ' + U.fa(total) + ' کوت زنده';
  }

  /* ---------------- شبکه‌ی دارایی‌ها ---------------- */
  function fmtDec(p, dec) {
    if (p == null || !isFinite(p)) return '—';
    dec = dec || 0;
    var s = Number(p).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return U.fa(s);
  }

  function dispPrice(a, q) {
    if (!q || !(q.p > 0)) return '—';
    if (a.kind === 'usd') return fmtDec(q.p, a.dec != null ? a.dec : 0);
    if (q.p >= 1e9) return U.fmtCompact(q.p); // فقط ارقام واقعاً بزرگ (بیت‌کوین تومانی) فشرده می‌شوند
    return U.fmt(q.p);
  }

  function feedText(sym) {
    var q = D().quote(sym);
    if (!q || !(q.p > 0)) return 'بدون داده';
    return (q.srcFa || '') + ' · ' + U.relLabel(q.ts);
  }

  function cardHTML(a) {
    return '<article class="qcard skel" data-sym="' + a.sym + '" data-cat="' + a.cat + '" tabindex="0" role="button" aria-label="' + U.esc(a.fa) + '">' +
      '<div class="qc-top"><span class="qc-ic"><svg class="ic s22"><use href="#' + a.icon + '"/></svg></span>' +
      '<span class="qc-names"><b>' + U.esc(a.fa) + '</b><small data-f="sub">' + U.esc(a.sub || catFa(a.cat)) + '</small></span>' +
      '<span class="qc-badge" data-f="badge"></span></div>' +
      '<div class="qc-price"><b data-f="price">—</b><small>' + U.esc(a.unit) + '</small></div>' +
      '<div class="qc-mid"><span class="qc-chg z" data-f="chg">—</span><span class="qc-spark" data-f="spark"></span></div>' +
      '<div class="qc-range" data-f="range"></div>' +
      '<div class="qc-foot"><span class="qc-src" data-f="src">در انتظار داده…</span></div>' +
      '</article>';
  }

  function catFa(cat) {
    var c = CFG().CATS.filter(function (x) { return x.id === cat; })[0];
    return c ? c.fa : cat;
  }

  var activeCat = 'all';

  function buildGrid() {
    var grid = U.$('#assetGrid');
    if (!grid) return;
    grid.innerHTML = CFG().ASSETS.map(cardHTML).join('');
    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.qcard');
      if (card && card.dataset.sym) openAssetModal(card.dataset.sym);
    });
    grid.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var card = e.target.closest('.qcard');
        if (card && card.dataset.sym) { e.preventDefault(); openAssetModal(card.dataset.sym); }
      }
    });
    U.$$('.cat-tab').forEach(function (btn) {
      btn.setAttribute('aria-selected', btn.classList.contains('on') ? 'true' : 'false');
      btn.addEventListener('click', function () { setCategory(btn.dataset.cat || 'all'); });
    });
    applyCatFilter();
    updateGrid();
  }

  function setCategory(cat) {
    activeCat = cat || 'all';
    U.$$('.cat-tab').forEach(function (b) {
      var on = (b.dataset.cat || 'all') === activeCat;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    applyCatFilter();
  }

  function applyCatFilter() {
    U.$$('#assetGrid .qcard').forEach(function (card) {
      var show = activeCat === 'all' || card.dataset.cat === activeCat;
      card.style.display = show ? '' : 'none';
    });
  }

  /** اطمینان از دیده‌شدن کارت یک دارایی (اگر تب فعلی آن را پنهان کرده، به «همه» برمی‌گردد) */
  function ensureCardVisible(sym) {
    var card = document.querySelector('.qcard[data-sym="' + sym + '"]');
    if (!card) return null;
    if (activeCat !== 'all' && card.dataset.cat !== activeCat) setCategory('all');
    return card;
  }

  function updateGrid() {
    var grid = U.$('#assetGrid');
    if (!grid) return;
    var dv = D().derived();
    var ses = U.marketSession();
    CFG().ASSETS.forEach(function (a) {
      var card = grid.querySelector('.qcard[data-sym="' + a.sym + '"]');
      if (!card) return;
      var q = D().quote(a.sym);
      var has = q && q.p > 0;
      card.classList.toggle('skel', !has);
      var F = function (k) { return card.querySelector('[data-f="' + k + '"]'); };
      // قیمت + فلش تغییر
      var pv = has ? dispPrice(a, q) : '—';
      var pEl = F('price');
      if (pEl && pEl.textContent !== pv) {
        var old = parseFloat(pEl.dataset.v || '');
        pEl.textContent = pv;
        pEl.dataset.v = q ? q.p : '';
        if (has && isFinite(old) && old !== q.p) {
          pEl.classList.remove('fu', 'fd'); void pEl.offsetWidth;
          pEl.classList.add(q.p > old ? 'fu' : 'fd');
        }
      }
      // تغییر روز
      var ch = F('chg');
      if (ch) {
        if (!has || q.chgPct == null) { ch.className = 'qc-chg z'; ch.textContent = '—'; }
        else {
          ch.className = 'qc-chg ' + (Math.abs(q.chgPct) < 0.05 ? 'z' : q.chgPct > 0 ? 'up' : 'down');
          ch.innerHTML = dayHTML(q.chgPct);
        }
      }
      // زیرعنوان و بینش تحلیلی (حباب و انحراف)
      var subEl = F('sub');
      if (subEl) {
        var subTxt = a.sub || catFa(a.cat);
        if (a.sym === 'EMAMI' && dv.bubble != null) subTxt = 'طرح جدید · حباب ' + U.fa(dv.bubble.toFixed(1)) + '٪';
        else if (a.sym === 'BAHAR' && dv.bubbleBahar != null) subTxt = 'طرح قدیم · حباب ' + U.fa(dv.bubbleBahar.toFixed(1)) + '٪';
        else if (a.sym === 'NIM' && dv.bubbleNim != null) subTxt = 'نیم سکه · حباب ' + U.fa(dv.bubbleNim.toFixed(1)) + '٪';
        else if (a.sym === 'ROB' && dv.bubbleRob != null) subTxt = 'ربع سکه · حباب ' + U.fa(dv.bubbleRob.toFixed(1)) + '٪';
        else if (a.sym === 'GERAMI' && dv.bubbleGerami != null) subTxt = 'سکه گرمی · حباب ' + U.fa(dv.bubbleGerami.toFixed(1)) + '٪';
        else if (a.sym === 'G18' && dv.goldPrem != null) subTxt = 'هر گرم · انحراف ' + U.pct(dv.goldPrem, 1);
        else if (a.sym === 'USDT' && dv.usdtPrem != null) subTxt = 'صرافی‌ها · پریمیوم ' + U.pct(dv.usdtPrem, 1);
        else if (a.sym === 'MESGHAL' && dv.mesghalDev != null) subTxt = 'مظنه · انحراف ' + U.pct(dv.mesghalDev, 1);
        subEl.textContent = subTxt;
      }
      // اسپارک‌لاین
      var sp = F('spark');
      if (sp) sp.innerHTML = has ? GS.charts.assetSpark(a.sym, q.chgPct) : '';
      // دامنه‌ی روز
      var rg = F('range');
      if (rg) rg.innerHTML = has ? GS.charts.rangeBar(q) : '';
      // منبع
      var sr = F('src');
      if (sr) sr.textContent = feedText(a.sym);
      // بج تازگی
      var bd = F('badge');
      if (bd) {
        if (!has) { bd.className = 'qc-badge'; bd.textContent = ''; }
        else if (q.est) { bd.className = 'qc-badge snap'; bd.textContent = 'تخمین'; }
        else if (!q.live) { bd.className = 'qc-badge snap'; bd.textContent = q.src === 'snapshot' ? 'اسنپ‌شات' : 'کش'; }
        else {
          var age = Date.now() - (q.ts || 0), Fr = CFG().FRESH;
          var tehranAsset = (a.cat === 'currency' || a.cat === 'gold' || a.cat === 'coin') && a.sym !== 'OUNCE_USD';
          if (age < Fr.liveMs) { bd.className = 'qc-badge live'; bd.textContent = 'زنده'; }
          else if (age < Fr.agingMs) { bd.className = 'qc-badge aging'; bd.textContent = 'در حال قدیمی شدن'; }
          else if (tehranAsset && !ses.open) { bd.className = 'qc-badge session'; bd.textContent = 'آخرین جلسه'; bd.title = 'بازار تهران بسته است؛ این آخرین قیمت جلسه‌ی قبل است. ' + (ses.next || ''); }
          else { bd.className = 'qc-badge stale'; bd.textContent = 'قدیمی'; }
        }
      }
    });
    updateMarketsMeta();
  }

  function updateMarketsMeta() {
    var du = U.$('#marketsUpdated');
    if (du) {
      var ts = 0;
      CFG().ASSETS.forEach(function (a) {
        var q = D().quote(a.sym);
        if (q && q.ts > ts) ts = q.ts;
      });
      du.textContent = ts ? ('آخرین به‌روزرسانی موفق: ' + U.relLabel(ts)) : 'هنوز داده‌ای دریافت نشده';
    }
    var cc = U.$('#quotesCount');
    if (cc) {
      var live = CFG().ASSETS.filter(function (a) { var q = D().quote(a.sym); return q && q.p > 0 && q.live; }).length;
      cc.textContent = U.fa(live) + ' زنده / ' + U.fa(CFG().ASSETS.length);
    }
  }

  function refreshAllFeeds() {
    updateGrid();
    renderFreshBadge();
    updateMood();
  }

  /* ---------------- کارت‌های نبض (هیرو) ---------------- */
  function renderPulse() {
    var host = U.$('#pulseCards');
    if (!host) return;
    var act = CFG().ASSETS.filter(function (a) {
      var q = D().quote(a.sym);
      return q && q.p > 0 && q.chgPct != null;
    });
    if (!act.length) {
      host.innerHTML = '<div class="pulse-skel">در انتظار اولین داده‌ی زنده…</div>';
      return;
    }
    var sorted = act.slice().sort(function (a, b) { return Math.abs(D().quote(b.sym).chgPct) - Math.abs(D().quote(a.sym).chgPct); }).slice(0, 3);
    host.innerHTML = sorted.map(function (a) {
      var q = D().quote(a.sym);
      var cls = Math.abs(q.chgPct) < 0.05 ? 'z' : q.chgPct > 0 ? 'up' : 'down';
      return '<div class="pulse"><span class="p-n">' + U.esc(a.short) + '</span>' +
        '<b class="p-v">' + dispPrice(a, q) + '</b>' +
        '<span class="p-c ' + cls + '">' + dayHTML(q.chgPct) + '</span></div>';
    }).join('');
  }

  /* ---------------- نوار ماکرو ---------------- */
  function renderMacro() {
    var host = U.$('#macroStrip');
    if (!host) return;
    var dv = D().derived(), m = D().mood();
    function card(label, val, hint, tone) {
      return '<div class="mc"><small>' + label + '</small><b class="' + (tone || '') + '">' + val + '</b><span>' + hint + '</span></div>';
    }
    var cards = [];
    cards.push(card('پریمیوم تتر', dv.usdtPrem != null ? U.pct(dv.usdtPrem, 2) : '—',
      dv.usdtPrem != null && dv.usdtPrem > 0.5 ? 'هیجان خرید دلار' : dv.usdtPrem != null && dv.usdtPrem < -0.5 ? 'فشار فروش تتر' : 'متعادل',
      dv.usdtPrem != null && Math.abs(dv.usdtPrem) > 0.5 ? (dv.usdtPrem > 0 ? 'hot' : 'cold') : ''));
    cards.push(card('حباب سکه امامی', dv.bubble != null ? U.fa(dv.bubble.toFixed(1)) + '٪' : '—',
      dv.bubble != null ? 'ذاتی: ' + U.fmtCompact(dv.intrinsicEmami) : 'منتظر طلا و سکه',
      dv.bubble != null && dv.bubble > 25 ? 'hot' : ''));
    cards.push(card('انحراف طلا از جهانی', dv.goldPrem != null ? U.pct(dv.goldPrem, 2) : '—',
      'مقایسه با اونس × دلار', dv.goldPrem != null && Math.abs(dv.goldPrem) > 3 ? 'hot' : ''));
    cards.push(card('پهنای بازار', m.n ? U.fa(m.ups) + '٪' : '—',
      m.n ? 'سهم دارایی‌های مثبت امروز' : 'منتظر داده',
      m.n ? (m.ups >= 60 ? 'hot' : m.ups < 40 ? 'cold' : '') : ''));
    host.innerHTML = cards.join('');
  }

  /* ---------------- مودال‌ها ---------------- */
  function trapFocus(modal) {
    var f = U.$$('button, input, select, [tabindex]', modal).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!f.length) return;
    f[0].focus();
    modal.onkeydown = function (e) {
      if (e.key !== 'Tab') return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
  }

  var lastFocus = null;
  function openModal(id) {
    var m = U.$(id);
    if (!m) return;
    if (!m.classList.contains('show')) lastFocus = document.activeElement;
    m.classList.add('show');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trapFocus(m);
  }
  function closeModal(id) {
    var m = U.$(id);
    if (!m || !m.classList.contains('show')) return;
    m.classList.remove('show');
    m.setAttribute('aria-hidden', 'true');
    m.onkeydown = null;
    document.body.style.overflow = '';
    // بازگرداندن فوکوس به عنصر بازکننده (دسترس‌پذیری صفحه‌کلید)
    if (lastFocus && typeof lastFocus.focus === 'function' && document.contains(lastFocus)) {
      try { lastFocus.focus(); } catch (e) {}
    }
    lastFocus = null;
  }

  function openAssetModal(sym) {
    var a = D().asset(sym);
    if (!a) return;
    var q = D().quote(sym) || {};
    var dv = D().derived();
    var modal = U.$('#assetModal'), body = U.$('#assetModalBody');
    if (!modal || !body) return;
    var priceStr = (q.p > 0) ? dispPrice(a, q) : '—';
    var chgStr = (q.chgPct != null) ? dayHTML(q.chgPct) : '—';
    var chgVal = (q.chg != null && isFinite(q.chg)) ? ((q.chg >= 0 ? '+' : '') + U.fmt(q.chg) + ' ' + a.unit) : '';

    var metrics = [];
    if (sym === 'EMAMI' && dv.bubble != null) {
      metrics.push({ k: 'ارزش طلای خالص (۲۴ عیار)', v: U.fmt(Math.round(dv.intrinsicEmami)) + ' تومان' });
      metrics.push({ k: 'حباب اسمی سکه', v: U.fa(dv.bubble.toFixed(1)) + '٪ (' + U.fmt(Math.round(q.p - dv.intrinsicEmami)) + ' تومان)' });
    } else if (sym === 'BAHAR' && dv.bubbleBahar != null) {
      metrics.push({ k: 'ارزش طلای خالص (۲۴ عیار)', v: U.fmt(Math.round(dv.intrinsicBahar)) + ' تومان' });
      metrics.push({ k: 'حباب اسمی سکه', v: U.fa(dv.bubbleBahar.toFixed(1)) + '٪ (' + U.fmt(Math.round(q.p - dv.intrinsicBahar)) + ' تومان)' });
    } else if (sym === 'NIM' && dv.bubbleNim != null) {
      metrics.push({ k: 'ارزش طلای خالص (۲۴ عیار)', v: U.fmt(Math.round(dv.intrinsicNim)) + ' تومان' });
      metrics.push({ k: 'حباب اسمی سکه', v: U.fa(dv.bubbleNim.toFixed(1)) + '٪ (' + U.fmt(Math.round(q.p - dv.intrinsicNim)) + ' تومان)' });
    } else if (sym === 'ROB' && dv.bubbleRob != null) {
      metrics.push({ k: 'ارزش طلای خالص (۲۴ عیار)', v: U.fmt(Math.round(dv.intrinsicRob)) + ' تومان' });
      metrics.push({ k: 'حباب اسمی سکه', v: U.fa(dv.bubbleRob.toFixed(1)) + '٪ (' + U.fmt(Math.round(q.p - dv.intrinsicRob)) + ' تومان)' });
    } else if (sym === 'GERAMI' && dv.bubbleGerami != null) {
      metrics.push({ k: 'ارزش طلای خالص (۲۴ عیار)', v: U.fmt(Math.round(dv.intrinsicGerami)) + ' تومان' });
      metrics.push({ k: 'حباب اسمی سکه', v: U.fa(dv.bubbleGerami.toFixed(1)) + '٪ (' + U.fmt(Math.round(q.p - dv.intrinsicGerami)) + ' تومان)' });
    } else if (sym === 'G18' && dv.fairG18 != null) {
      metrics.push({ k: 'طلای منصفانه (اونس × دلار)', v: U.fmt(Math.round(dv.fairG18)) + ' تومان' });
      metrics.push({ k: 'انحراف از ارزش جهانی', v: U.pct(dv.goldPrem, 2) });
    } else if (sym === 'MESGHAL' && dv.mesghalDev != null) {
      metrics.push({ k: 'معادل طلای ۱۸ (× ۴٫۳۵۲)', v: dv.g18 ? U.fmt(Math.round(dv.g18 * GS.config.CHAIN.MESGHAL_K)) + ' تومان' : '—' });
      metrics.push({ k: 'انحراف مظنه از طلا', v: U.pct(dv.mesghalDev, 2) });
    } else if (sym === 'USDT' && dv.usdtPrem != null) {
      metrics.push({ k: 'پریمیوم نسبت به دلار بازار', v: U.pct(dv.usdtPrem, 2) });
    } else if (sym === 'BTC_TM' && dv.btcUsdGap != null) {
      metrics.push({ k: 'دلار ضمنی بیت‌کوین', v: dv.btcImpliedUsd ? U.fmt(Math.round(dv.btcImpliedUsd)) + ' تومان' : '—' });
      metrics.push({ k: 'انحراف از دلار آزاد', v: U.pct(dv.btcUsdGap, 2) });
    } else if (sym === 'EUR' && dv.eurUsdImplied != null) {
      metrics.push({ k: 'برابری ضمنی با دلار آزاد', v: dv.eurUsdImplied.toFixed(4) });
    }

    if (q.high > 0 && q.low > 0) {
      metrics.push({ k: 'بیشترین قیمت امروز', v: (a.kind === 'usd' ? U.fa(q.high.toFixed(a.dec || 0)) : U.fmt(q.high)) + ' ' + a.unit });
      metrics.push({ k: 'کمترین قیمت امروز', v: (a.kind === 'usd' ? U.fa(q.low.toFixed(a.dec || 0)) : U.fmt(q.low)) + ' ' + a.unit });
    }
    // «چقدر می‌خرد؟» — قدرت خرید سرمایه‌ی شبیه‌ساز با این دارایی
    var simP = (GS.features && GS.features.simAmount) ? GS.features.simAmount() : 0;
    if (simP > 0 && q.p > 0 && a.kind === 'toman') {
      var units = simP / q.p;
      var unitFa = a.cat === 'gold' ? (a.sym === 'MESGHAL' ? 'مثقال' : 'گرم') : a.cat === 'coin' ? 'عدد' : a.cat === 'crypto' ? 'واحد' : 'واحد';
      var uTxt = units >= 100 ? U.fmt(Math.floor(units)) : U.fa(units.toFixed(units >= 10 ? 1 : 3));
      metrics.push({ k: 'با ' + U.fmtMoney(simP) + ' تومان چقدر می‌خری؟', v: '≈ ' + uTxt + ' ' + unitFa });
    }

    var metricHTML = metrics.map(function (m) {
      return '<div class="am-metric"><span class="am-k">' + U.esc(m.k) + '</span><b class="am-v">' + m.v + '</b></div>';
    }).join('');

    body.innerHTML =
      '<div class="am-head">' +
        '<span class="qc-ic"><svg class="ic s24"><use href="#' + a.icon + '"/></svg></span>' +
        '<div><h3 style="margin:0">' + U.esc(a.fa) + ' <small class="am-sym" style="font-size:.85rem;color:var(--dim)">(' + a.sym + ')</small></h3>' +
        '<span class="am-cat" style="font-size:.8rem;color:var(--mut)">' + catFa(a.cat) + (a.sub ? ' · ' + a.sub : '') + '</span></div>' +
      '</div>' +
      '<div class="am-price-box">' +
        '<div class="am-main-p"><b>' + priceStr + '</b> <small>' + U.esc(a.unit) + '</small></div>' +
        '<div class="am-chg-row">' + chgStr + (chgVal ? ' <span class="am-abs" style="font-size:.8rem;color:var(--mut)">(' + chgVal + ')</span>' : '') + '</div>' +
      '</div>' +
      (metricHTML ? '<div class="am-metrics-box"><h4>تحلیل و فرمول‌های بازار</h4>' + metricHTML + '</div>' : '') +
      '<div class="am-source-box">' +
        '<h4>شناسنامه منبع</h4>' +
        '<div class="am-src-row"><span>منبع استخراج:</span><b>' + U.esc(q.srcFa || q.src || '—') + '</b></div>' +
        '<div class="am-src-row"><span>وضعیت داده:</span><b>' + (q.live ? 'زنده' : (q.src === 'snapshot' ? 'اسنپ‌شات اولیه' : 'کش شده')) + '</b></div>' +
        '<div class="am-src-row"><span>آخرین به‌روزرسانی:</span><b>' + U.relLabel(q.ts) + '</b></div>' +
      '</div>' +
      (!a.derived ? '<div class="am-actions" style="margin-top:16px">' +
        '<button class="btn btn-primary sm" id="amRadarBtn" style="width:100%;justify-content:center"><svg class="ic s16"><use href="#i-bell"/></svg>تنظیم رادار قیمت برای ' + U.esc(a.short) + '</button>' +
      '</div>' : '<p class="micro" style="margin-top:12px">این کوت مشتق (فرمولی) است و رادار قیمت روی اجزای آن — دلار و اونس — تنظیم می‌شود.</p>');

    var rBtn = U.$('#amRadarBtn');
    if (rBtn) {
      rBtn.addEventListener('click', function () {
        closeModal('#assetModal');
        var sel = U.$('#radarMarket');
        if (sel) sel.value = sym;
        var targetIn = U.$('#radarTarget');
        if (targetIn && q.p > 0) targetIn.value = U.fmt(q.p);
        var radarSec = U.$('#radar');
        try { if (radarSec && radarSec.scrollIntoView) radarSec.scrollIntoView({ behavior: 'smooth' }); } catch (e) {}
        // قیمت فعلی پیش‌فرض است؛ متن انتخاب می‌شود تا کاربر مستقیم هدف خودش را تایپ کند
        if (targetIn) { try { targetIn.focus(); targetIn.select(); } catch (e) {} }
      });
    }
    openModal('#assetModal');
  }

  /* ---------------- خلاصه‌ی قابل اشتراک ---------------- */
  /** متن خلاصه‌ی بازار برای کپی/اشتراک در پیام‌رسان‌ها */
  function summaryText() {
    var lines = ['📊 گرماسنج — ' + U.todayFa() + ' ' + U.clockFa()];
    var rows = [['USD', 'دلار'], ['EUR', 'یورو'], ['USDT', 'تتر'], ['G18', 'طلای ۱۸'], ['MESGHAL', 'مثقال'], ['EMAMI', 'سکه امامی'], ['OUNCE_USD', 'اونس'], ['BTC_USD', 'بیت‌کوین']];
    rows.forEach(function (r) {
      var a = D().asset(r[0]), q = D().quote(r[0]);
      if (!a || !q || !(q.p > 0)) return;
      var ch = (q.chgPct != null && Math.abs(q.chgPct) >= 0.05) ? ' (' + U.pct(q.chgPct) + ')' : '';
      lines.push('• ' + r[1] + ': ' + dispPrice(a, q) + ' ' + a.unit + ch);
    });
    var dv = D().derived();
    if (dv.bubble != null) lines.push('• حباب سکه: ' + U.fa(dv.bubble.toFixed(1)) + '٪');
    if (dv.usdtPrem != null) lines.push('• پریمیوم تتر: ' + U.pct(dv.usdtPrem, 2));
    var m = D().mood();
    if (m.n) lines.push('• نبض بازار: ' + (m.score >= 0 ? '+' : '−') + U.fa(Math.abs(m.score)) + ' (' + m.label + ')');
    try {
      var v = GS.features && GS.features.verdict ? GS.features.verdict() : null;
      if (v && v.action) lines.push('• حکم امروز: ' + v.action.t + ' — اطمینان ' + U.fa(v.conf) + '٪');
    } catch (e) {}
    lines.push('');
    lines.push('🔗 https://alib11.github.io/Garmasanj-Eghtesad/');
    return lines.join('\n');
  }
  function shareSummary() {
    var txt = summaryText();
    return U.shareText('گرماسنج — خلاصه‌ی بازار', txt).then(function (res) {
      if (res === 'copied') toast('ok', 'خلاصه کپی شد', 'قیمت‌ها و حکم امروز آماده‌ی ارسال در پیام‌رسان است.');
      else if (res === 'failed') toast('warn', 'کپی ممکن نشد', 'مرورگر اجازه‌ی دسترسی به کلیپ‌بورد نداد.');
      return res;
    });
  }

  function buildDiag() {
    var d = U.$('#diagBody');
    if (!d) return;
    var srcRows = D().diag.slice(-16).reverse().map(function (x) {
      return '<div class="dg-row ' + (x.ok ? '' : 'dg-bad') + '"><b>' + U.esc(x.src) + '</b><span>' + U.esc(x.detail) + '</span></div>';
    }).join('');
    var vals = CFG().ASSETS.map(function (a) {
      var q = D().quote(a.sym);
      return '<div class="dg-val"><b>' + U.esc(a.fa) + '</b><span>' + (q && q.p > 0 ? dispPrice(a, q) : '—') + '</span><small>' + U.esc(feedText(a.sym)) + '</small></div>';
    }).join('');
    var net = D().netlog.slice(-24).reverse().map(function (x) {
      return '<div class="dg-net ' + (x.ok ? '' : 'dg-bad') + '">' + U.esc(x.note) + '</div>';
    }).join('');
    d.innerHTML = '<h4>وضعیت کوت‌ها و اجماع (آخرین چرخه‌ها)</h4>' + (srcRows || '<p class="dg-empty">هنوز چرخه‌ای کامل نشده.</p>') +
      '<h4>مقادیر نهایی</h4>' + vals +
      '<h4>گزارش شبکه (از جدید به قدیم)</h4>' + (net || '<p class="dg-empty">—</p>');
  }

  /* ---------------- ظهور تدریجی و شمارنده‌ها ---------------- */
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      U.$$('.rv').forEach(function (el) { el.classList.add('on'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    U.$$('.rv').forEach(function (el) { io.observe(el); });
  }

  function initCounters() {
    U.$$('[data-cnt]').forEach(function (el) {
      var target = +el.dataset.cnt, dec = +(el.dataset.dec || 0);
      function run() {
        if (typeof requestAnimationFrame !== 'function') { el.textContent = U.fa(target.toFixed(dec)); return; }
        var t0 = performance.now();
        function step(now) {
          var k = Math.min(1, (now - t0) / 900), v = target * (1 - Math.pow(1 - k, 3));
          el.textContent = U.fa(v.toFixed(dec));
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
      if (!('IntersectionObserver' in window)) { run(); return; }
      var o = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { run(); o.unobserve(el); } });
      }, { threshold: 0.6 });
      o.observe(el);
    });
  }

  GS.ui = {
    toast: toast,
    buildTicker: buildTicker, updateTickerAll: updateTickerAll,
    buildMood: buildMood, updateMood: updateMood,
    renderSessions: renderSessions, renderStatus: renderStatus, renderNetPill: renderNetPill,
    buildGrid: buildGrid, updateGrid: updateGrid, setCategory: setCategory, ensureCardVisible: ensureCardVisible,
    summaryText: summaryText, shareSummary: shareSummary,
    refreshAllFeeds: refreshAllFeeds,
    renderPulse: renderPulse, renderMacro: renderMacro,
    openModal: openModal, closeModal: closeModal, buildDiag: buildDiag,
    openAssetModal: openAssetModal,
    initReveal: initReveal, initCounters: initCounters,
    dayHTML: dayHTML, dispPrice: dispPrice, feedText: feedText
  };
})();
