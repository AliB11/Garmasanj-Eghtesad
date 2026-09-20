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

  /** فهرست تیکر: سنجاق‌شده‌ها اول، بعد فهرست پیش‌فرض (بدون تکرار) */
  function tickerList() {
    var pinned = PINS.map(function (k) { return { k: k }; });
    return pinned.concat(TICKER.filter(function (t) { return !isPinned(t.k); }));
  }

  function buildTicker() {
    var track = U.$('#tickerTrack');
    if (!track) return;
    var half = tickerList().map(function (t) {
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
    tickerList().forEach(function (t) {
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
      '<span class="sess"><i class="led on"></i>رمزارز جهانی: ۲۴/۷</span>' +
      (function () {
        var t = U.tseSession ? U.tseSession() : null;
        if (!t || t.label === 'نامشخص') return '';
        var mk = null;
        try { mk = D().market ? D().market() : null; } catch (e) { mk = null; }
        var tail = (t.open || !mk || !(mk.p > 0)) ? '' :
          ' <small>(آخرین جلسه ' + ((mk.ts && U.dateFa) ? U.dateFa(mk.ts) : U.fa(mk.day || '')) + ')</small>';
        return '<span class="sess" title="جلسه‌ی بورس تهران: شنبه تا چهارشنبه"><i class="led ' + (t.open ? 'on' : '') + '"></i>بورس تهران: ' +
          t.label + (!t.open && t.next ? ' <small>(' + U.esc(t.next) + ')</small>' : '') + tail + '</span>';
      })();
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
      '<span class="qc-badge" data-f="badge"></span>' +
      '<button class="qc-pin" type="button" data-pin="' + a.sym + '" aria-pressed="false" aria-label="سنجاق «' + U.esc(a.short) + '» به بالای فهرست" title="سنجاق به بالای فهرست و اول تیکر"><svg class="ic s14"><use href="#i-star"/></svg></button></div>' +
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
  var query = '';

  /* ---------------- سنجاق (واچ‌لیست) ---------------- */
  var LS_PINS = 'garmasanj_pins_v1', PIN_MAX = 6;
  var PINS = [];
  function pinsLoad() {
    var p = U.store.get(LS_PINS, []);
    PINS = Array.isArray(p) ? p.filter(function (k) { return !!D().asset(k); }).slice(0, PIN_MAX) : [];
  }
  function isPinned(sym) { return PINS.indexOf(sym) >= 0; }
  function togglePin(sym) {
    var a = D().asset(sym);
    if (!a) return false;
    var i = PINS.indexOf(sym);
    if (i >= 0) PINS.splice(i, 1);
    else {
      if (PINS.length >= PIN_MAX) { toast('warn', 'سقف سنجاق', 'حداکثر ' + U.fa(PIN_MAX) + ' دارایی را می‌توانی سنجاق کنی؛ یکی را بردار.'); return false; }
      PINS.push(sym);
    }
    U.store.set(LS_PINS, PINS);
    applyPins();
    buildTicker();
    toast('info', i >= 0 ? 'سنجاق برداشته شد' : 'سنجاق شد', i >= 0 ? '«' + a.fa + '» به جای خودش برگشت.' : '«' + a.fa + '» بالای فهرست و اول تیکر می‌آید.');
    return true;
  }
  /** ترتیب شبکه: سنجاق‌شده‌ها (به ترتیب سنجاق) بعد بقیه به ترتیب رجیستری */
  function applyPins() {
    var grid = U.$('#assetGrid');
    if (!grid) return;
    var order = PINS.slice();
    CFG().ASSETS.forEach(function (a) { if (order.indexOf(a.sym) < 0) order.push(a.sym); });
    order.forEach(function (sym, idx) {
      var card = grid.querySelector('.qcard[data-sym="' + sym + '"]');
      if (!card) return;
      if (grid.children[idx] !== card) grid.insertBefore(card, grid.children[idx] || null);
      var on = isPinned(sym);
      card.classList.toggle('pinned', on);
      var b = card.querySelector('.qc-pin');
      if (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? 'برداشتن سنجاق' : 'سنجاق به بالای فهرست و اول تیکر'; }
    });
  }

  /* ---------------- جست‌وجو ---------------- */
  function normFa(x) {
    return String(x || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200f]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function matchesQuery(a) {
    if (!query) return true;
    var hay = normFa([a.fa, a.short, a.sym, a.sub || '', catFa(a.cat)].join(' '));
    return query.split(' ').every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function setQuery(q) {
    query = normFa(q);
    var inp = U.$('#qsearch');
    if (inp && normFa(inp.value) !== query) inp.value = q || '';
    // جست‌وجو همه‌ی بازارها را می‌گردد؛ تب دسته را به «همه» برمی‌گرداند تا نتیجه پنهان نماند
    if (query && activeCat !== 'all') { setCategory('all'); return; }
    applyCatFilter();
  }
  function initSearch() {
    var inp = U.$('#qsearch');
    if (!inp) return;
    inp.addEventListener('input', function () { setQuery(inp.value); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); setQuery(''); inp.blur(); }
      if (e.key === 'Enter') {
        // اولین کارت دیده‌شده را باز کن
        var first = U.$$('#assetGrid .qcard').filter(function (c) { return c.style.display !== 'none'; })[0];
        if (first) openAssetModal(first.dataset.sym);
      }
    });
  }
  function focusSearch() {
    var inp = U.$('#qsearch');
    if (!inp) return;
    try { inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    try { inp.focus(); inp.select(); } catch (e) {}
  }

  function buildGrid() {
    var grid = U.$('#assetGrid');
    if (!grid) return;
    grid.innerHTML = CFG().ASSETS.map(cardHTML).join('');
    pinsLoad();
    grid.addEventListener('click', function (e) {
      var pin = e.target.closest('.qc-pin');
      if (pin) { e.preventDefault(); e.stopPropagation(); togglePin(pin.dataset.pin); return; }
      var card = e.target.closest('.qcard');
      if (card && card.dataset.sym) openAssetModal(card.dataset.sym);
    });
    grid.addEventListener('keydown', function (e) {
      if (e.target.closest('.qc-pin')) return; // Enter/Space روی ستاره = کلیک بومی دکمه
      if (e.key === 'Enter' || e.key === ' ') {
        var card = e.target.closest('.qcard');
        if (card && card.dataset.sym) { e.preventDefault(); openAssetModal(card.dataset.sym); }
      }
    });
    U.$$('.cat-tab').forEach(function (btn) {
      btn.setAttribute('aria-selected', btn.classList.contains('on') ? 'true' : 'false');
      btn.addEventListener('click', function () { setCategory(btn.dataset.cat || 'all'); });
    });
    initSearch();
    applyPins();
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
    var shown = 0;
    U.$$('#assetGrid .qcard').forEach(function (card) {
      var a = D().asset(card.dataset.sym);
      var show = (activeCat === 'all' || card.dataset.cat === activeCat) && (!a || matchesQuery(a));
      card.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    var grid = U.$('#assetGrid');
    if (grid) {
      var empty = U.$('#gridEmpty');
      if (!shown) {
        if (!empty) { empty = U.el('<div class="radar-empty grid-empty" id="gridEmpty"></div>'); grid.parentNode.insertBefore(empty, grid.nextSibling); }
        empty.textContent = query ? 'چیزی با «' + query + '» پیدا نشد.' : 'دارایی‌ای در این دسته نیست.';
        empty.style.display = 'block';
      } else if (empty) empty.style.display = 'none';
    }
  }

  /** اطمینان از دیده‌شدن کارت یک دارایی (اگر تب یا جست‌وجو آن را پنهان کرده، بازش می‌کند) */
  function ensureCardVisible(sym) {
    var card = document.querySelector('.qcard[data-sym="' + sym + '"]');
    if (!card) return null;
    if (activeCat !== 'all' && card.dataset.cat !== activeCat) setCategory('all');
    if (query) { var a = D().asset(sym); if (a && !matchesQuery(a)) setQuery(''); }
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

  /* ---------------- کارتِ بورس (شاخص + جریان پول) ---------------- */
  /**
   * صادقانه: اگر جریانِ پول در دسترس نباشد (حالتِ پیش‌فرض — TSETMC از بیرون
   * ایران پاسخ نمی‌دهد)، فقط شاخص نشان داده می‌شود و کنارش نوشته می‌شود که
   * جریانِ پول در دسترس نیست. هرگز از روی شاخص، جریان ساخته نمی‌شود.
   */
  function bourseCard() {
    var mk = null;
    try { mk = D().market ? D().market() : null; } catch (e) { mk = null; }
    function card(label, val, hint, tone) {
      return '<div class="mc"><small>' + label + '</small><b class="' + (tone || '') + '">' + val + '</b><span>' + hint + '</span></div>';
    }
    if (!mk || !(mk.p > 0)) {
      return card('شاخص کل بورس', '—', 'منتظر انتشارِ سرور', '');
    }
    var tone = mk.chgPct == null ? '' : (mk.chgPct > 0.3 ? 'hot' : mk.chgPct < -0.3 ? 'cold' : '');
    var hint;
    if (mk.flow && mk.flowRatio != null) {
      var out = mk.flow.netToman < 0;
      hint = (out ? 'خروج ' : 'ورود ') + U.fa((Math.abs(mk.flow.netToman) / 1e12).toFixed(1)) +
        ' همت پولِ حقیقی (' + U.fa(Math.round(Math.abs(mk.flowRatio) * 100)) + '٪ ارزش معاملات)';
    } else {
      hint = 'جریانِ پولِ حقیقی در دسترس نیست';
    }
    if (mk.session && mk.session.label === 'باز') hint = 'جلسه باز · ' + hint;
    else hint = 'آخرین جلسه ' + ((mk.ts && U.dateFa) ? U.dateFa(mk.ts) : U.fa(mk.day || '')) + ' · ' + hint;
    return card('شاخص کل بورس', U.fmt(Math.round(mk.p)) +
      (mk.chgPct != null ? ' <small class="' + tone + '">' + U.pct(mk.chgPct, 1) + '</small>' : ''), hint, tone);
  }

  /* ---------------- ردیفِ بورس: فراتر از شاخصِ کل ---------------- */
  /**
   * مکملِ بورس‌تریدر (از انتشارِ سرور؛ بدون کلید): شاخصِ هم‌وزن و فرابورس،
   * جریانِ پولِ خرد، تحرکاتِ صندوق‌ها، پهنا و ارزشِ معاملات.
   * فقط چیزی نشان داده می‌شود که واقعاً رسیده باشد — کارتِ خالی ساخته نمی‌شود.
   */
  function btMoney(v) {
    var a = Math.abs(+v);
    if (!isFinite(a)) return '—';
    if (a >= 1e12) return U.fa(String(+(a / 1e12).toFixed(2))) + ' همت';
    if (a >= 1e9) return U.fa(Math.round(a / 1e9)) + ' میلیارد';
    if (a >= 1e6) return U.fa(Math.round(a / 1e6)) + ' میلیون';
    return U.fmt(Math.round(a)) + ' تومان';
  }

  /** کارتِ جریان: «خروج ۱.۸ همت» با رنگِ جهت و توضیحِ کوتاه */
  function flowCard(label, net, hint) {
    if (net == null || !isFinite(+net)) return '';
    var out = +net < 0;
    var zero = Math.abs(+net) < 1e6;
    return '<div class="mc"><small>' + label + '</small><b class="' + (zero ? '' : (out ? 'cold' : 'hot')) + '">' +
      (zero ? 'بدون جریان' : (out ? 'خروج ' : 'ورود ') + btMoney(net)) + '</b><span>' + (hint || '') + '</span></div>';
  }

  function renderBourse() {
    var host = U.$('#bourseStrip'), title = U.$('#bourseTitle');
    if (!host) return;
    var mk = null;
    try { mk = D().market ? D().market() : null; } catch (e) { mk = null; }
    var bt = (mk && mk.bt) ? mk.bt : null;
    if (!bt) { host.innerHTML = ''; host.style.display = 'none'; if (title) title.style.display = 'none'; return; }

    function card(label, val, hint, tone) {
      return '<div class="mc"><small>' + label + '</small><b class="' + (tone || '') + '">' + val + '</b><span>' + hint + '</span></div>';
    }
    function idxCard(label, v, hint) {
      if (!v) return '';
      var tone = v.chgPct == null ? '' : (v.chgPct > 0.3 ? 'hot' : v.chgPct < -0.3 ? 'cold' : '');
      return card(label, U.fmt(Math.round(v.p)) + (v.chgPct != null ? ' <small class="' + tone + '">' + U.pct(v.chgPct, 1) + '</small>' : ''), hint || '', tone);
    }
    var cards = [];
    var push = function (h) { if (h) cards.push(h); };   // کارتِ خالی هرگز ساخته نمی‌شود
    push(idxCard('شاخص هم‌وزن', bt.equal, 'وزنِ برابر برای همه‌ی نمادها — تصویرِ بدنه‌ی بازار'));
    push(idxCard('شاخص کل فرابورس', bt.fara, 'شرکت‌های کوچک‌تر و بازارِ دوم'));

    if (mk.flow) {
      var ratioTxt = (mk.flowRatio != null) ? U.fa(Math.round(Math.abs(mk.flowRatio) * 100)) + '٪ ارزشِ معاملات خرد' : '';
      push(flowCard('جریانِ پولِ خرد', mk.flow.netToman, ratioTxt || 'از بورس‌تریدر'));
    }
    if (bt.funds) {
      push(flowCard('صندوق‌های درآمد ثابت', bt.funds.fixed && bt.funds.fixed.netToman, 'پناهگاهِ کم‌ریسکِ بورس'));
      push(flowCard('صندوق‌های سهامی', bt.funds.equity && bt.funds.equity.netToman, 'پولِ تازه در سهام'));
      if (bt.funds.commodity && Math.abs(bt.funds.commodity.netToman) >= 1e6) {
        push(flowCard('صندوق‌های کالایی (طلا)', bt.funds.commodity.netToman, 'تقاضایِ طلا از مسیرِ بورس'));
      }
    }
    if (bt.breadth) {
      var B = bt.breadth;
      push(card('پهنای بازار', U.fa(Math.round(B.posPct)) + '٪',
        U.fa(B.pos) + ' مثبت در برابر ' + U.fa(B.neg) + ' منفی' +
        (B.queueBuy != null && B.queueSell != null ? ' · صف خرید ' + U.fa(B.queueBuy) + ' / فروش ' + U.fa(B.queueSell) : ''),
        B.posPct >= 55 ? 'hot' : B.posPct <= 25 ? 'cold' : ''));
    }
    if (bt.trade && bt.trade.valueToman) {
      var per = (bt.perCapita && bt.perCapita.buy) ? 'سرانه خرید ' + U.fa(bt.perCapita.buy) + ' / فروش ' + U.fa(bt.perCapita.sell || 0) : 'حجمِ دست‌به‌دست‌شدنِ امروز';
      push(card('ارزشِ معاملاتِ خرد', btMoney(bt.trade.valueToman), per, ''));
    }
    if (cards.length < 2) { host.innerHTML = ''; host.style.display = 'none'; if (title) title.style.display = 'none'; return; }
    if (title) {
      var ageMin = Math.round((Date.now() - bt.ts) / 60000);
      var ageTxt = ageMin < 2 ? 'همین الان'
        : ageMin < 90 ? U.fa(ageMin) + ' دقیقه پیش'
        : ageMin < 36 * 60 ? U.fa(Math.round(ageMin / 60)) + ' ساعت پیش'
        : 'آخرین جلسه';
      title.style.display = '';
      title.textContent = 'بورس تهران — فراتر از شاخصِ کل · منبع: bourse-trader.ir (از انتشارِ سرور) · ' + ageTxt;
    }
    host.innerHTML = cards.join('');
    host.style.display = '';
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
    cards.push(bourseCard());
    host.innerHTML = cards.join('');
    renderBourse();
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

  var histDays = 30;
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
      var fk = formulaKeyFor(sym, m.k);
      return '<div class="am-metric"><span class="am-k">' + U.esc(m.k) +
        (fk ? ' <button class="f-help" type="button" data-formula="' + fk + '" aria-label="فرمول ' + U.esc(m.k) + '" title="فرمول و ورودی‌های لحظه‌ای">؟</button>' : '') +
        '</span><b class="am-v">' + m.v + '</b></div>';
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
      (!a.derived ? '<div class="am-hist-box" id="amHist">' + historyBlock(sym, histDays) + '</div>' : '') +
      '<div class="am-source-box">' +
        '<h4>شناسنامه منبع</h4>' +
        '<div class="am-src-row"><span>منبع استخراج:</span><b>' + U.esc(q.srcFa || q.src || '—') + '</b></div>' +
        '<div class="am-src-row"><span>وضعیت داده:</span><b>' + (q.live ? 'زنده' : (q.src === 'snapshot' ? 'اسنپ‌شات اولیه' : 'کش شده')) + '</b></div>' +
        '<div class="am-src-row"><span>آخرین به‌روزرسانی:</span><b>' + U.relLabel(q.ts) + '</b></div>' +
      '</div>' +
      (!a.derived ? '<div class="am-actions" style="margin-top:16px">' +
        '<button class="btn btn-primary sm" id="amRadarBtn"><svg class="ic s16"><use href="#i-bell"/></svg>رادار قیمت برای ' + U.esc(a.short) + '</button>' +
        '<button class="btn btn-ghost sm" id="amCmpBtn"><svg class="ic s16"><use href="#i-cmp"/></svg>مقایسه با…</button>' +
        '<button class="btn btn-ghost sm" id="amPinBtn" aria-pressed="' + (isPinned(sym) ? 'true' : 'false') + '"><svg class="ic s16"><use href="#i-star"/></svg>' + (isPinned(sym) ? 'برداشتن سنجاق' : 'سنجاق') + '</button>' +
      '</div>' : '<p class="micro" style="margin-top:12px">این کوت مشتق (فرمولی) است و رادار قیمت روی اجزای آن — دلار و اونس — تنظیم می‌شود.</p>');

    // بازه‌های تاریخچه
    body.querySelectorAll('[data-hist-days]').forEach(function (b) {
      b.addEventListener('click', function () {
        histDays = +b.dataset.histDays || 30;
        var box = U.$('#amHist');
        if (box) { box.innerHTML = historyBlock(sym, histDays); wireHistRange(box, sym); }
      });
    });
    function wireHistRange(box, sy) {
      box.querySelectorAll('[data-hist-days]').forEach(function (b2) {
        b2.addEventListener('click', function () {
          histDays = +b2.dataset.histDays || 30;
          box.innerHTML = historyBlock(sy, histDays); wireHistRange(box, sy);
        });
      });
    }
    body.querySelectorAll('[data-formula]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); openFormula(b.dataset.formula); });
    });
    var cBtn = U.$('#amCmpBtn');
    if (cBtn) cBtn.addEventListener('click', function () { closeModal('#assetModal'); openCompare(sym, null); });
    var pBtn = U.$('#amPinBtn');
    if (pBtn) pBtn.addEventListener('click', function () {
      if (togglePin(sym)) { var on = isPinned(sym); pBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); pBtn.innerHTML = '<svg class="ic s16"><use href="#i-star"/></svg>' + (on ? 'برداشتن سنجاق' : 'سنجاق'); }
    });

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

  /* ---------------- تاریخچه در مودال دارایی ---------------- */
  function priceFmtFor(a) {
    return function (v) { return a.kind === 'usd' ? fmtDec(v, a.dec != null ? a.dec : 0) : (v >= 1e9 ? U.fmtCompact(v) : U.fmt(v)); };
  }
  function historyBlock(sym, days) {
    var a = D().asset(sym);
    if (!a) return '';
    days = days || 30;
    var hm = D().historyMeta(sym);
    var pts = D().series(sym, days);
    var chips = [7, 30, 90].map(function (d) {
      return '<button class="chip' + (d === days ? ' on' : '') + '" type="button" data-hist-days="' + d + '">' + U.fa(d) + ' روز</button>';
    }).join('');
    var head = '<div class="am-hist-head"><h4>تاریخچه</h4><div class="chips sm">' + chips + '</div></div>';
    var stat = '';
    var ch = D().changeOver(sym, days);
    if (pts.length >= 2) {
      var ps = pts.map(function (x) { return x.p; });
      var hi = Math.max.apply(null, ps), lo = Math.min.apply(null, ps);
      var f = priceFmtFor(a);
      var span = ch ? ch.days : Math.max(1, Math.round((pts[pts.length - 1].t - pts[0].t) / 86400000));
      stat = '<div class="am-hist-stats">' +
        '<span>تغییر ' + (ch ? U.fa(ch.days) + ' روزه' : 'بازه') + ': <b class="' + (ch && ch.pct > 0.05 ? 'up' : ch && ch.pct < -0.05 ? 'down' : 'z') + '" dir="ltr">' + (ch ? U.pct(ch.pct, 1) : U.pct((pts[pts.length - 1].p / pts[0].p - 1) * 100, 1)) + '</b></span>' +
        '<span>سقف: <b>' + f(hi) + '</b></span><span>کف: <b>' + f(lo) + '</b></span>' +
        (span < days ? '<span class="dim">فقط ' + U.fa(span) + ' روز داده داریم</span>' : '') +
        '</div>';
    }
    var note = '';
    if (!hm.ok) note = '<p class="micro">تاریخچه‌ی بلندمدت از ' + (hm.from ? U.dateFa(hm.from) : '۲۵ شهریور ۱۴۰۵') + ' با هر انتشار سرور جمع می‌شود' + (hm.days ? ' — فعلاً ' + U.fa(hm.days) + ' روز.' : '.') + ' نمودار زیر فقط نشست فعلی مرورگر توست.</p>';
    else if (hm.days < days) note = '<p class="micro">تاریخچه از ' + U.dateFa(hm.from) + ' جمع‌آوری می‌شود؛ بازه‌های بلندتر با گذشت زمان پر می‌شوند.</p>';
    var chartPts = pts.length >= 2 ? pts : D().hist(sym);
    var chart = GS.charts.lineChart(chartPts, { fmt: priceFmtFor(a), label: 'نمودار ' + a.fa, emptyText: 'هنوز داده‌ای برای نمودار نداریم' });
    return head + chart + stat + note;
  }

  /* ---------------- تم روشن/تیره ---------------- */
  var LS_THEME = 'garmasanj_theme_v1';
  function getTheme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function applyTheme(t, persist) {
    t = t === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    if (persist) U.store.set(LS_THEME, t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#F4F6F9' : '#0B0F14');
    var btn = U.$('#themeBtn');
    if (btn) { btn.setAttribute('aria-pressed', t === 'light' ? 'true' : 'false'); btn.title = t === 'light' ? 'برگشت به تم تیره (t)' : 'تم روشن (t)'; }
    return t;
  }
  function toggleTheme() {
    var t = applyTheme(getTheme() === 'light' ? 'dark' : 'light', true);
    toast('info', t === 'light' ? 'تم روشن' : 'تم تیره', 'انتخابت ذخیره شد؛ با کلید t هر وقت خواستی عوضش کن.');
    return t;
  }
  function initTheme() {
    var t = U.store.get(LS_THEME, null);
    applyTheme(t === 'light' || t === 'dark' ? t : getTheme(), false);
    var btn = U.$('#themeBtn');
    if (btn) btn.addEventListener('click', toggleTheme);
  }

  /* ---------------- مقایسه‌ی دو دارایی ---------------- */
  var LS_CMP = 'garmasanj_cmp_v1';
  var cmp = { a: 'USD', b: 'G18', days: 30 };
  var CMP_COLORS = ['#E8A33D', '#3E8E9E'];
  function initCompare() {
    var sa = U.$('#cmpA'), sb = U.$('#cmpB');
    if (!sa || !sb) return;
    var saved = U.store.get(LS_CMP, null);
    if (saved && D().asset(saved.a) && D().asset(saved.b)) cmp = { a: saved.a, b: saved.b, days: saved.days || 30 };
    var opts = CFG().ASSETS.filter(function (a) { return !a.derived; })
      .map(function (a) { return '<option value="' + a.sym + '">' + U.esc(a.fa) + '</option>'; }).join('');
    sa.innerHTML = opts; sb.innerHTML = opts;
    sa.addEventListener('change', function () { cmp.a = sa.value; renderCompare(); });
    sb.addEventListener('change', function () { cmp.b = sb.value; renderCompare(); });
    U.$$('#compareModal [data-days]').forEach(function (b) {
      b.addEventListener('click', function () { cmp.days = +b.dataset.days; renderCompare(); });
    });
    var open = U.$('#compareBtn');
    if (open) open.addEventListener('click', function () { openCompare(); });
    U.$$('#compareModal [data-cm-close]').forEach(function (el) { el.addEventListener('click', function () { closeModal('#compareModal'); }); });
  }
  function openCompare(a, b) {
    if (a && D().asset(a)) { if (a === cmp.b) cmp.b = cmp.a; cmp.a = a; }
    if (b && D().asset(b)) cmp.b = b;
    if (cmp.a === cmp.b) cmp.b = cmp.a === 'USD' ? 'G18' : 'USD';
    renderCompare();
    openModal('#compareModal');
  }
  function cmpSeries(sym) {
    if (cmp.days === 0) return D().hist(sym);
    return D().series(sym, cmp.days);
  }
  function renderCompare() {
    var sa = U.$('#cmpA'), sb = U.$('#cmpB'), body = U.$('#cmpBody');
    if (!sa || !sb || !body) return;
    sa.value = cmp.a; sb.value = cmp.b;
    U.$$('#compareModal [data-days]').forEach(function (b) { b.classList.toggle('on', +b.dataset.days === cmp.days); });
    U.store.set(LS_CMP, cmp);
    var A = D().asset(cmp.a), B = D().asset(cmp.b);
    if (!A || !B) { body.innerHTML = ''; return; }
    var pa = cmpSeries(cmp.a), pb = cmpSeries(cmp.b);
    var chart = GS.charts.compareChart([{ pts: pa, color: CMP_COLORS[0], name: A.fa }, { pts: pb, color: CMP_COLORS[1], name: B.fa }],
      { label: 'مقایسه‌ی ' + A.fa + ' و ' + B.fa, emptyText: cmp.days === 0 ? 'نشست فعلی هنوز نقطه‌ی کافی ندارد؛ چند چرخه صبر کن یا بازه‌ی روزانه را انتخاب کن.' : 'برای این بازه هنوز تاریخچه‌ی کافی نداریم؛ بازه‌ی کوتاه‌تر یا «نشست امروز» را امتحان کن.' });
    function chg(pts) { return pts.length >= 2 ? (pts[pts.length - 1].p / pts[0].p - 1) * 100 : null; }
    var ca = chg(pa), cb = chg(pb);
    var qa = D().quote(cmp.a), qb = D().quote(cmp.b);
    function row(a, q, c, col) {
      return '<div class="cmp-row"><i style="background:' + col + '"></i><b>' + U.esc(a.fa) + '</b>' +
        '<span>' + (q && q.p > 0 ? dispPrice(a, q) + ' ' + U.esc(a.unit) : '—') + '</span>' +
        '<span class="' + (c == null ? 'z' : c > 0.05 ? 'up' : c < -0.05 ? 'down' : 'z') + '" dir="ltr">' + (c == null ? '—' : U.pct(c, 1)) + '</span></div>';
    }
    var legend = '<div class="cmp-legend">' + row(A, qa, ca, CMP_COLORS[0]) + row(B, qb, cb, CMP_COLORS[1]) + '</div>';
    // جمع‌بندی
    var lines = [];
    // بازه‌ی واقعیِ پوشش‌داده‌شده (تاریخچه ممکن است کوتاه‌تر از بازه‌ی انتخابی باشد)
    var t0 = Math.max(pa.length ? pa[0].t : 0, pb.length ? pb[0].t : 0);
    var realDays = t0 ? Math.max(1, Math.round((Date.now() - t0) / 86400000)) : cmp.days;
    var spanTxt = cmp.days === 0 ? 'در نشست امروز' : 'در ' + U.fa(Math.min(realDays, cmp.days)) + ' روز گذشته';
    if (cmp.days > 0 && realDays < cmp.days * 0.8) lines.push('تاریخچه فعلاً ' + U.fa(realDays) + ' روز را پوشش می‌دهد؛ بازه‌ی ' + U.fa(cmp.days) + ' روزه با گذشت زمان کامل می‌شود.');
    if (ca != null && cb != null) {
      var lead = ca >= cb ? A : B, lag = ca >= cb ? B : A, diff = Math.abs(ca - cb);
      if (diff < 0.2) lines.push(spanTxt + ' هر دو تقریباً هم‌قدم بوده‌اند (اختلاف ' + U.fa(diff.toFixed(1)) + ' واحد درصد).');
      else lines.push(spanTxt + ' «' + lead.short + '» (' + U.pct(ca >= cb ? ca : cb, 1) + ') از «' + lag.short + '» (' + U.pct(ca >= cb ? cb : ca, 1) + ') جلوتر بوده — یعنی ' + lead.short + ' نسبت به ' + lag.short + ' حدود ' + U.fa(diff.toFixed(1)) + '٪ گران‌تر شده.');
    }
    if (qa && qb && qa.p > 0 && qb.p > 0 && A.kind === B.kind) {
      var r = qa.p / qb.p;
      var r0 = (pa.length && pb.length) ? pa[0].p / pb[0].p : null;
      lines.push('نسبت ' + A.short + ' ÷ ' + B.short + ' الان ' + U.fa(r >= 100 ? Math.round(r).toLocaleString('en-US') : r.toFixed(r >= 10 ? 1 : 3)) + (r0 ? ' (ابتدای بازه: ' + U.fa(r0 >= 100 ? Math.round(r0).toLocaleString('en-US') : r0.toFixed(r0 >= 10 ? 1 : 3)) + ')' : '') + '.');
    }
    var dv = D().derived(), pair = [cmp.a, cmp.b].sort().join('/');
    if (pair === 'G18/USD' && dv.goldPrem != null) lines.push('انحراف طلای ۱۸ از ارزش جهانی (اونس × دلار) الان ' + U.pct(dv.goldPrem, 1) + ' است — اگر طلا از دلار جلو افتاده ولی انحراف بالا رفته، بخشی از رشد «حباب داخلی» است.');
    if (pair === 'EMAMI/G18' && dv.bubble != null) lines.push('حباب سکه‌ی امامی الان ' + U.fa(dv.bubble.toFixed(1)) + '٪ است؛ جلو افتادن سکه از طلا یعنی حباب در حال باز شدن است.');
    if (pair === 'USD/USDT' && dv.usdtPrem != null) lines.push('پریمیوم تتر نسبت به دلار الان ' + U.pct(dv.usdtPrem, 2) + ' است.');
    if (pair === 'BTC_TM/BTC_USD' && dv.btcUsdGap != null) lines.push('دلار ضمنی بیت‌کوین صرافی‌ها ' + U.pct(dv.btcUsdGap, 2) + ' با دلار آزاد فاصله دارد.');
    body.innerHTML = chart + legend + (lines.length ? '<div class="cmp-note">' + lines.map(function (l) { return '<p>' + U.esc(l) + '</p>'; }).join('') + '</div>' : '');
  }

  /* ---------------- مودال اطلاعات: فرمول‌ها، راهنما، ویجت ---------------- */
  function openInfo(title, html) {
    var t = U.$('#infoTitle'), b = U.$('#infoBody');
    if (!t || !b) return;
    t.textContent = title; b.innerHTML = html;
    openModal('#infoModal');
  }
  function formulaKeyFor(sym, label) {
    if (/حباب/.test(label)) return 'bubble';
    if (/ارزش طلای خالص/.test(label)) return 'intrinsic';
    if (/منصفانه/.test(label)) return 'fairG18';
    if (/انحراف از ارزش جهانی/.test(label)) return 'goldPrem';
    if (/مظنه|معادل طلای ۱۸/.test(label)) return 'mesghal';
    if (/پریمیوم/.test(label)) return 'usdtPrem';
    if (/ضمنی بیت|انحراف از دلار آزاد/.test(label)) return 'btcGap';
    if (/برابری ضمنی/.test(label)) return 'eurImplied';
    return null;
  }
  function fRow(k, v) { return '<div class="f-row"><span>' + U.esc(k) + '</span><b>' + v + '</b></div>'; }
  function formulaHTML(key) {
    var dv = D().derived(), CH = CFG().CHAIN, q = function (s) { var x = D().quote(s); return x && x.p > 0 ? x.p : null; };
    var m = D().mood(), H = CFG().HOTMONEY;
    var F = {
      bubble: { t: 'حباب سکه', f: 'حباب٪ = (قیمت بازار سکه ÷ ارزش ذاتی − ۱) × ۱۰۰\nارزش ذاتی = طلای ۲۴ عیار (هر گرم) × ' + U.fa(CH.EMAMI_G) + ' گرم طلای خالص',
        rows: [['طلای ۲۴ عیار (هر گرم)', q('G24') ? U.fmt(q('G24')) : (q('G18') ? U.fmt(q('G18') * CH.G24_K) + ' (از ۱۸ × ۴/۳)' : '—')], ['ارزش ذاتی سکه امامی', dv.intrinsicEmami ? U.fmt(Math.round(dv.intrinsicEmami)) : '—'], ['قیمت بازار سکه امامی', q('EMAMI') ? U.fmt(q('EMAMI')) : '—'], ['حباب', dv.bubble != null ? U.fa(dv.bubble.toFixed(2)) + '٪' : '—']],
        n: 'حباب مثبت یعنی بازار برای «سکه بودن» (نقدشوندگی، ضرب، انتظارات) بیش از طلای داخلش می‌پردازد. بالای ۲۲٪ سنگین و بالای ۳۰٪ هیجانی تلقی می‌شود.' },
      intrinsic: { t: 'ارزش ذاتی سکه', f: 'ارزش ذاتی = طلای ۲۴ عیار (هر گرم) × وزن طلای خالص سکه\nامامی/بهار ' + U.fa(CH.EMAMI_G) + ' گرم · نیم ' + U.fa(CH.NIM_G) + ' · ربع ' + U.fa(CH.ROB_G) + ' · گرمی ' + U.fa(CH.GERAMI_G),
        rows: [['طلای ۲۴ عیار', q('G24') ? U.fmt(q('G24')) : '—'], ['ذاتی امامی', dv.intrinsicEmami ? U.fmt(Math.round(dv.intrinsicEmami)) : '—'], ['ذاتی نیم', dv.intrinsicNim ? U.fmt(Math.round(dv.intrinsicNim)) : '—'], ['ذاتی ربع', dv.intrinsicRob ? U.fmt(Math.round(dv.intrinsicRob)) : '—']],
        n: 'وزن‌ها استاندارد ضرب (۸٫۱۳۳ گرم با عیار ۹۰۰) هستند.' },
      fairG18: { t: 'طلای منصفانه', f: 'طلای ۱۸ منصفانه = (اونس ÷ ' + U.fa(CH.OUNCE_G) + ') × ' + U.fa(CH.K18) + ' × دلار آزاد',
        rows: [['اونس جهانی', q('OUNCE_USD') ? U.fa(q('OUNCE_USD').toFixed(2)) + ' $' : '—'], ['دلار آزاد', q('USD') ? U.fmt(q('USD')) : '—'], ['طلای ۱۸ منصفانه', dv.fairG18 ? U.fmt(Math.round(dv.fairG18)) : '—'], ['طلای ۱۸ بازار', q('G18') ? U.fmt(q('G18')) : '—']],
        n: 'اختلاف بازار با این عدد، «انحراف داخلی» طلاست: مالیات، اجرت، انتظارات و کمبود عرضه.' },
      goldPrem: { t: 'انحراف طلا از ارزش جهانی', f: 'انحراف٪ = (طلای ۱۸ بازار ÷ طلای ۱۸ منصفانه − ۱) × ۱۰۰',
        rows: [['طلای ۱۸ بازار', q('G18') ? U.fmt(q('G18')) : '—'], ['طلای ۱۸ منصفانه', dv.fairG18 ? U.fmt(Math.round(dv.fairG18)) : '—'], ['انحراف', dv.goldPrem != null ? U.pct(dv.goldPrem, 2) : '—']],
        n: 'بیش از ±۴٪ در حکم امروز هشدار می‌دهد: مثبت = گران‌فروشی داخلی، منفی = فرصت ارزشی.' },
      mesghal: { t: 'مظنه (مثقال)', f: 'مظنه‌ی معادل = طلای ۱۸ × ' + U.fa(CH.MESGHAL_K) + '\nانحراف٪ = (مظنه‌ی بازار ÷ معادل − ۱) × ۱۰۰',
        rows: [['طلای ۱۸', q('G18') ? U.fmt(q('G18')) : '—'], ['معادل', q('G18') ? U.fmt(Math.round(q('G18') * CH.MESGHAL_K)) : '—'], ['مظنه‌ی بازار', q('MESGHAL') ? U.fmt(q('MESGHAL')) : '—'], ['انحراف', dv.mesghalDev != null ? U.pct(dv.mesghalDev, 2) : '—']],
        n: 'یک مثقال = ۴٫۶۰۸ گرم؛ مظنه بر پایه‌ی عیار ۱۷ اعلام می‌شود، از این‌رو ضریب ۴٫۳۵۲ نسبت به گرم ۱۸.' },
      usdtPrem: { t: 'پریمیوم تتر', f: 'پریمیوم٪ = (تتر − دلار آزاد) ÷ دلار آزاد × ۱۰۰',
        rows: [['تتر (صرافی‌ها)', q('USDT') ? U.fmt(q('USDT')) : '—'], ['دلار آزاد', q('USD') ? U.fmt(q('USD')) : '—'], ['پریمیوم', dv.usdtPrem != null ? U.pct(dv.usdtPrem, 2) : '—']],
        n: 'پریمیوم بالای ۱٫۵٪ یعنی عجله برای خروج از ریال از مسیر رمزارز؛ منفی یعنی فشار فروش تتر.' },
      btcGap: { t: 'دلار ضمنی بیت‌کوین', f: 'دلار ضمنی = بیت‌کوین تومانی ÷ بیت‌کوین دلاری\nشکاف٪ = (دلار ضمنی ÷ دلار آزاد − ۱) × ۱۰۰',
        rows: [['بیت‌کوین تومانی', q('BTC_TM') ? U.fmtCompact(q('BTC_TM')) : '—'], ['بیت‌کوین دلاری', q('BTC_USD') ? U.fmt(q('BTC_USD')) + ' $' : '—'], ['دلار ضمنی', dv.btcImpliedUsd ? U.fmt(Math.round(dv.btcImpliedUsd)) : '—'], ['شکاف', dv.btcUsdGap != null ? U.pct(dv.btcUsdGap, 2) : '—']],
        n: 'شکاف بزرگ یعنی یکی از دو سمت (صرافی داخلی یا بازار ارز) هیجانی یا مختل است.' },
      eurImplied: { t: 'برابری ضمنی یورو/دلار', f: 'برابری ضمنی = یورو (تومان) ÷ دلار (تومان)',
        rows: [['یورو', q('EUR') ? U.fmt(q('EUR')) : '—'], ['دلار', q('USD') ? U.fmt(q('USD')) : '—'], ['برابری ضمنی', dv.eurUsdImplied ? U.fa(dv.eurUsdImplied.toFixed(4)) : '—']],
        n: 'اگر با برابری جهانی (Frankfurter) فاصله‌ی زیادی داشت، یکی از دو بازار عقب است.' },
      mood: { t: 'نبض بازار', f: 'نبض = میانگین تغییر روز × ۱۵ + (پهنا − ۵۰) × ۱٫۱ × مشارکت\nپهنا = سهم مثبت‌ها فقط میان متحرک‌ها · مشارکت = سهم دارایی‌های متحرک (|تغییر| > ۰٫۰۵٪)',
        rows: [['دارایی‌های شمرده‌شده (بدون مشتق)', U.fa(m.n)], ['مثبت / منفی / بی‌تغییر', U.fa(m.ups) + '٪ / ' + U.fa(m.downs) + '٪ / ' + U.fa(m.flat) + '٪'], ['میانگین تغییر روز', U.pct(m.avg, 2)], ['پهنا (میان متحرک‌ها)', U.fa(m.breadth) + '٪'], ['مشارکت', U.fa(Math.round(m.part * 100)) + '٪' + (m.quiet ? ' — بازار ساکت' : '')], ['نبض', (m.score >= 0 ? '+' : '−') + U.fa(Math.abs(m.score)) + ' (' + m.label + ')']],
        n: 'در بازار ساکت (مشارکت زیر ۳۵٪، مثل تعطیلات) پهنا با مشارکت وزن می‌خورد تا بی‌تغییری «منفی» خوانده نشود.' },
      hot: { t: 'امتیاز جریان پول داغ', f: 'امتیاز = (' + U.fa(H.wDay * 100) + '٪ × تغییر روز ÷ ' + U.fa(H.dayScale) + ' + ' + U.fa(H.wSlope * 100) + '٪ × شیب نشست ÷ ' + U.fa(H.slopeScale) + ') × ۱۰۰\nشیب نشست = رگرسیون لگاریتم قیمت بر ساعت در ۲۴ نقطه‌ی اخیر (٪ در ساعت)',
        rows: [['وزن تغییر روز', U.fa(H.wDay * 100) + '٪'], ['وزن شیب نشست', U.fa(H.wSlope * 100) + '٪'], ['اشباع', '±' + U.fa(H.dayScale) + '٪ روز / ±' + U.fa(H.slopeScale) + '٪ شیب']],
        n: 'یک شاخص حرکتی شفاف است، نه دیتای سفارش‌گذاری. هر مؤلفه در ±۱ اشباع می‌شود تا یک جهش تنها، تابلو را نبلعد.' },
      heat: { t: 'حرارت دارایی', f: 'حرارت = تغییر روز × ۸ + شیب نشست × ۵ (محدود به −۴۰ تا +۶۰)',
        rows: [], n: 'حرارت در شبیه‌ساز (نرخ اسمی = تورم فرضی + ۰٫۵ × حرارت) و ترکیب‌ساز استفاده می‌شود.' },
      sim: { t: 'شبیه‌ساز سرنوشت پول', f: 'نرخ اسمی (همگام) = تورم فرضی + ۰٫۵ × حرارت زنده‌ی همان بازار\nارزش واقعی = سرمایه × (۱ + نرخ اسمی)^سال ÷ (۱ + تورم)^سال',
        rows: [['تورم مرجع', U.fa(INFL()) + '٪']], n: 'یک فرض آموزشی صریح است، نه پیش‌بینی: می‌گوید «اگر حرارت امروز ادامه یابد» پول واقعی‌ات کجا می‌رود.' },
      verdict: { t: 'حکم امروز', f: 'امتیاز = نبض (−۳..+۳) + پهنا (−۲..+۲) + پول داغ (+۱) + حباب سکه (−۲..+۱) + پریمیوم تتر (−۱)\nاطمینان = ۳۵ + پوشش داده‌ی تازه × ۵۵ + min(۱۲, |امتیاز| × ۲)؛ در بازار بسته سقف ۷۰٪',
        rows: [], n: '۵ پله‌ی حکم: نقد و انتظار (≤ −۵) · حالت دفاعی · حفظ ترکیب · تعادل متمایل به رشد (≥ ۲) · حمله‌ی حساب‌شده (≥ ۵). هیچ‌کدام توصیه‌ی خرید/فروش نیست.' }
    };
    var x = F[key];
    if (!x) return null;
    return { title: x.t, html: '<pre class="f-formula" dir="rtl">' + U.esc(x.f) + '</pre>' + (x.rows.length ? '<div class="f-rows">' + x.rows.map(function (r) { return fRow(r[0], r[1]); }).join('') + '</div>' : '') + '<p class="micro">' + U.esc(x.n) + '</p>' };
  }
  function openFormula(key) {
    var f = formulaHTML(key);
    if (f) openInfo('فرمول: ' + f.title, f.html);
  }
  var SHORTCUTS = [
    ['/', 'جست‌وجوی دارایی'], ['۱ تا ۵', 'تب‌های همه / ارز / طلا / سکه / رمزارز'], ['c', 'مقایسه‌ی دو دارایی'], ['s', 'اشتراک خلاصه‌ی بازار'],
    ['t', 'تم روشن / تیره'], ['r', 'دریافت مجدد فوری'], ['p', 'سنجاق دارایی باز در مودال'], ['?', 'همین راهنما'], ['Esc', 'بستن پنجره‌ها']
  ];
  function openHelp() {
    var html = '<p class="dg-sub">میان‌برها وقتی فعال‌اند که در حال تایپ در فیلدی نباشی.</p><div class="kbd-list">' +
      SHORTCUTS.map(function (s) { return '<div><kbd dir="ltr">' + U.esc(s[0]) + '</kbd><span>' + U.esc(s[1]) + '</span></div>'; }).join('') + '</div>' +
      '<h4>گرماسنج چطور کار می‌کند؟</h4><ul class="help-list">' +
      '<li>هر عدد با منبع و زمان دقیقش برچسب می‌خورد؛ «زنده» یعنی تازه از منبع، «آخرین جلسه» یعنی بازار تهران بسته است.</li>' +
      '<li>روی هر کارت بزن تا فرمول‌ها، تاریخچه و قدرت خریدت را ببینی؛ علامت «؟» کنار هر متریک فرمول و ورودی‌های لحظه‌ای را نشان می‌دهد.</li>' +
      '<li>ستاره‌ی هر کارت آن را سنجاق می‌کند (بالای فهرست و اول تیکر).</li>' +
      '<li>رادار قیمت در همین مرورگر پایش می‌کند؛ با «تکرارشونده» بعد از هر عبور دوباره مسلح می‌شود.</li>' +
      '<li>هیچ‌چیز در گرماسنج توصیه‌ی خرید یا فروش نیست.</li></ul>';
    openInfo('راهنما و میان‌برهای کیبورد', html);
  }
  function embedCode(syms, theme) {
    var base = 'https://alib11.github.io/Garmasanj-Eghtesad/embed.html';
    var qs = '?sym=' + encodeURIComponent(syms.join(',')) + '&theme=' + (theme || getTheme());
    var h = 96 + Math.ceil(syms.length / 2) * 74;
    return '<iframe src="' + base + qs + '" width="100%" height="' + h + '" style="border:0;border-radius:14px;overflow:hidden" loading="lazy" title="گرماسنج — قیمت زنده"></iframe>';
  }
  function openEmbed() {
    var syms = PINS.length ? PINS.slice() : ['USD', 'G18', 'EMAMI', 'USDT'];
    var code = embedCode(syms, getTheme());
    var html = '<p class="dg-sub">این کد را در سایت یا وبلاگت بگذار؛ ویجت همان قیمت‌های انتشار زنده را با برچسب زمان نشان می‌دهد و هر ۵ دقیقه تازه می‌شود. دارایی‌ها از سنجاق‌های تو خوانده شده‌اند' + (PINS.length ? '' : ' (پیش‌فرض، چون چیزی سنجاق نکرده‌ای)') + '.</p>' +
      '<textarea class="field code" id="embedCode" dir="ltr" rows="4" readonly>' + U.esc(code) + '</textarea>' +
      '<div class="set-row"><button class="btn btn-primary sm" id="embedCopy" type="button">کپی کد</button>' +
      '<a class="btn btn-ghost sm" href="embed.html?sym=' + encodeURIComponent(syms.join(',')) + '&theme=' + getTheme() + '" target="_blank" rel="noopener">پیش‌نمایش ویجت</a></div>' +
      '<p class="m-hint">پارامترها: <b dir="ltr">sym</b> فهرست نمادها با ویرگول (مثل USD,G18,EMAMI)، <b dir="ltr">theme</b> = dark یا light، <b dir="ltr">compact=1</b> برای ردیف تک‌خطی.</p>';
    openInfo('ویجت قابل‌جاسازی گرماسنج', html);
    var cp = U.$('#embedCopy');
    if (cp) cp.addEventListener('click', function () {
      U.copyText(code).then(function (ok) { toast(ok ? 'ok' : 'warn', ok ? 'کد کپی شد' : 'کپی ممکن نشد', ok ? 'در HTML صفحه‌ات جای‌گذاری کن.' : 'متن را دستی انتخاب و کپی کن.'); });
    });
  }

  /* ---------------- خلاصه‌ی قابل اشتراک ---------------- */
  /** متن خلاصه‌ی بازار برای کپی/اشتراک در پیام‌رسان‌ها */
  function summaryText() {
    var lines = ['📊 گرماسنج — ' + U.todayFa() + ' ' + U.clockFa()];
    var rows = [['USD', 'دلار'], ['EUR', 'یورو'], ['USDT', 'تتر'], ['G18', 'طلای ۱۸'], ['MESGHAL', 'مثقال'], ['EMAMI', 'سکه امامی'], ['OUNCE_USD', 'اونس'], ['BTC_USD', 'بیت‌کوین']];
    // سنجاق‌شده‌ها اول می‌آیند
    PINS.slice().reverse().forEach(function (k) {
      var a = D().asset(k); if (!a) return;
      rows = rows.filter(function (r) { return r[0] !== k; });
      rows.unshift([k, a.short]);
    });
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
    dayHTML: dayHTML, dispPrice: dispPrice, feedText: feedText,
    // نسل ۵
    pins: function () { return PINS.slice(); }, isPinned: isPinned, togglePin: togglePin, applyPins: applyPins,
    setQuery: setQuery, focusSearch: focusSearch,
    getTheme: getTheme, applyTheme: applyTheme, toggleTheme: toggleTheme, initTheme: initTheme,
    initCompare: initCompare, openCompare: openCompare, renderCompare: renderCompare,
    openInfo: openInfo, openFormula: openFormula, formulaHTML: formulaHTML, openHelp: openHelp, openEmbed: openEmbed, embedCode: embedCode,
    historyBlock: historyBlock
  };
})();
