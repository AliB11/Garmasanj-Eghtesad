/* ============================================================
   گرماسنج — ui.js (نسل ۹: ترمینال بورس حرفه‌ای + رادار)
   تیکر، گیج نبض، شبکه‌ی دارایی‌ها، جلسات، وضعیت، توست، مودال‌ها
   + بورس پرو: رادار ۶ بعدی، دونات پهنا، جریان صندوق‌ها
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

  /* ---------------- وضعیت منابع ---------------- */
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
    if (q.p >= 1e9) return U.fmtCompact(q.p);
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
      if (e.target.closest('.qc-pin')) return;
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
      var ch = F('chg');
      if (ch) {
        if (!has || q.chgPct == null) { ch.className = 'qc-chg z'; ch.textContent = '—'; }
        else {
          ch.className = 'qc-chg ' + (Math.abs(q.chgPct) < 0.05 ? 'z' : q.chgPct > 0 ? 'up' : 'down');
          ch.innerHTML = dayHTML(q.chgPct);
        }
      }
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
      var sp = F('spark');
      if (sp) sp.innerHTML = has ? GS.charts.assetSpark(a.sym, q.chgPct) : '';
      var rg = F('range');
      if (rg) rg.innerHTML = has ? GS.charts.rangeBar(q) : '';
      var sr = F('src');
      if (sr) sr.textContent = feedText(a.sym);
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

  /* ---------------- بورس — ابزارها ---------------- */
  function btMoney(v) {
    var a = Math.abs(+v);
    if (!isFinite(a)) return '—';
    if (a >= 1e12) return U.fa(String(+(a / 1e12).toFixed(2))) + ' همت';
    if (a >= 1e9) return U.fa(Math.round(a / 1e9)) + ' میلیارد';
    if (a >= 1e6) return U.fa(Math.round(a / 1e6)) + ' میلیون';
    return U.fmt(Math.round(a)) + ' تومان';
  }
  function btMoneySigned(v) {
    if (v == null || !isFinite(+v)) return '—';
    var a = Math.abs(+v);
    var txt = a >= 1e12 ? U.fa((a / 1e12).toFixed(2)) + ' همت' : a >= 1e9 ? U.fa(Math.round(a / 1e9)) + ' میلیارد' : U.fmt(Math.round(a));
    return (+v < 0 ? '−' : '+') + txt;
  }

  function bourseCard() {
    var mk = null;
    try { mk = D().market ? D().market() : null; } catch (e) { mk = null; }
    function card(label, val, hint, tone) {
      return '<div class="mc"><small>' + label + '</small><b class="' + (tone || '') + '">' + val + '</b><span>' + hint + '</span></div>';
    }
    if (!mk || !(mk.p > 0)) return card('شاخص کل بورس', '—', 'منتظر انتشارِ سرور', '');
    var tone = mk.chgPct == null ? '' : mk.chgPct > 0.3 ? 'hot' : mk.chgPct < -0.3 ? 'cold' : '';
    var hint;
    if (mk.flow && mk.flowRatio != null) {
      var out = mk.flow.netToman < 0;
      hint = (out ? 'خروج ' : 'ورود ') + U.fa((Math.abs(mk.flow.netToman) / 1e12).toFixed(1)) + ' همت (' + U.fa(Math.round(Math.abs(mk.flowRatio) * 100)) + '٪)';
    } else hint = 'جریانِ پول در دسترس نیست';
    if (mk.session && mk.session.label === 'باز') hint = 'جلسه باز · ' + hint;
    else hint = 'آخرین جلسه ' + ((mk.ts && U.dateFa) ? U.dateFa(mk.ts) : U.fa(mk.day || '')) + ' · ' + hint;
    return card('شاخص کل بورس', U.fmt(Math.round(mk.p)) + (mk.chgPct != null ? ' <small class="' + tone + '">' + U.pct(mk.chgPct, 1) + '</small>' : ''), hint, tone);
  }

  /* ---------------- ترمینال حرفه‌ای بورس ---------------- */
  function bourseHealthScore(mk, bt) {
    var dims = bourseRadarDims(mk, bt);
    var avg = dims.reduce(function (s, d) { return s + d.value; }, 0) / (dims.length || 1);
    var tone = avg >= 60 ? 'hot' : avg <= 35 ? 'cold' : 'mid';
    var label = avg >= 65 ? 'پرتحرک' : avg >= 50 ? 'متعادل' : avg >= 35 ? 'کم‌رمق' : 'ضعیف';
    return { pct: Math.round(avg), tone: tone, label: label };
  }

  function bourseRadarDims(mk, bt) {
    var dims = [];
    var breadth = bt.breadth ? bt.breadth.posPct : null;
    dims.push({ label: 'پهنا', value: breadth != null ? U.clamp(breadth, 0, 100) : 50, color: '#3ECF8E', hint: breadth != null ? U.fa(Math.round(breadth)) + '٪ مثبت' : '—' });
    var flowVal = 50;
    if (mk.flow && mk.flowRatio != null) {
      var ar = Math.abs(mk.flowRatio);
      flowVal = U.clamp(ar * 100 * 2.5, 0, 100);
      if (mk.flow.netToman > 0) flowVal = U.clamp(flowVal * 0.7 + 30, 0, 100);
    }
    dims.push({ label: 'جریان خرد', value: flowVal, color: '#E8A33D', hint: mk.flow ? btMoneySigned(mk.flow.netToman) : '—' });
    var fixedVal = 50, fixedHint = '—';
    if (bt.funds && bt.funds.fixed) {
      var fn = bt.funds.fixed.netToman;
      fixedHint = btMoneySigned(fn);
      if (fn < 0) fixedVal = U.clamp(50 + Math.min(40, Math.abs(fn) / 1e12 * 8), 0, 100);
      else fixedVal = U.clamp(50 - Math.min(30, fn / 1e12 * 8), 0, 100);
    }
    dims.push({ label: 'درآمد ثابت', value: fixedVal, color: '#4E8F8B', hint: fixedHint });
    var eqVal = 50, eqHint = '—';
    if (bt.funds && bt.funds.equity) {
      var en = bt.funds.equity.netToman;
      eqHint = btMoneySigned(en);
      if (en > 0) eqVal = U.clamp(50 + Math.min(40, en / 1e12 * 10), 0, 100);
      else eqVal = U.clamp(50 - Math.min(30, Math.abs(en) / 1e12 * 10), 0, 100);
    }
    dims.push({ label: 'سهامی', value: eqVal, color: '#E8A33D', hint: eqHint });
    var pcVal = 50, pcHint = '—';
    if (bt.perCapita && bt.perCapita.buy && bt.perCapita.sell) {
      var ratio = bt.perCapita.buy / bt.perCapita.sell;
      pcVal = U.clamp(50 + (ratio - 1) * 40, 0, 100);
      pcHint = U.fa(ratio.toFixed(2)) + '×';
    }
    dims.push({ label: 'سرانه', value: pcVal, color: '#7E97A3', hint: pcHint });
    var qVal = 50, qHint = '—';
    if (bt.breadth && bt.breadth.queueBuy != null && bt.breadth.queueSell != null) {
      var tot = bt.breadth.queueBuy + bt.breadth.queueSell;
      if (tot > 0) {
        qVal = bt.breadth.queueBuy / tot * 100;
        qHint = U.fa(bt.breadth.queueBuy) + '/' + U.fa(bt.breadth.queueSell);
      }
    }
    dims.push({ label: 'صف خرید', value: qVal, color: '#3ECF8E', hint: qHint });
    return dims;
  }

  function renderBoursePro() {
    var sec = U.$('#boursePro');
    if (!sec) return;
    var mk = null;
    try { mk = D().market ? D().market() : null; } catch (e) { mk = null; }
    var bt = mk && mk.bt ? mk.bt : null;
    if (!mk || !(mk.p > 0) || !bt) { sec.hidden = true; sec.style.display = 'none'; return; }
    sec.hidden = false; sec.style.display = '';

    var titleEl = U.$('#bourseProTitle'), metaEl = U.$('#bourseProMeta'), badgeEl = U.$('#bourseProBadge'), ageEl = U.$('#bourseProAge'), srcEl = U.$('#bourseProSource'), explEl = U.$('#bourseProExplain');
    var chgTxt = mk.chgPct != null ? U.pct(mk.chgPct, 1) : '';
    var chgTone = mk.chgPct == null ? '' : mk.chgPct > 0 ? 'up' : mk.chgPct < 0 ? 'down' : 'z';
    if (titleEl) titleEl.innerHTML = 'شاخص کل ' + U.fmt(Math.round(mk.p)) + (chgTxt ? ' <small class="' + chgTone + '">' + chgTxt + '</small>' : '') + ' <small style="font-weight:400;color:var(--mut)">· ' + U.esc(mk.src || '') + '</small>';
    var ageMin = Math.round((Date.now() - (bt.ts || mk.ts || Date.now())) / 60000);
    var ageTxt = ageMin < 2 ? 'همین الان' : ageMin < 90 ? U.fa(ageMin) + ' دقیقه پیش' : ageMin < 36 * 60 ? U.fa(Math.round(ageMin / 60)) + ' ساعت پیش' : 'آخرین جلسه';
    if (metaEl) metaEl.textContent = 'جلسه ' + (mk.day || (mk.ts ? U.dateFa(mk.ts) : '—')) + ' · به‌روزرسانی ' + ageTxt + (mk.session && mk.session.open ? ' · جلسه باز' : ' · بازار بسته');
    if (badgeEl) {
      var score = bourseHealthScore(mk, bt);
      badgeEl.className = 'bp-badge ' + score.tone;
      badgeEl.textContent = score.label + ' · ' + score.pct + '٪ سلامت';
    }
    if (ageEl) ageEl.textContent = ageTxt;
    if (srcEl) srcEl.textContent = 'شاخص از ' + (mk.src || 'TGJU') + '، مکمل از bourse-trader.ir · ' + ageTxt;
    if (explEl) {
      var parts = [];
      if (bt.breadth) parts.push('پهنا ' + U.fa(Math.round(bt.breadth.posPct)) + '٪ مثبت');
      if (mk.flow) parts.push((mk.flow.netToman < 0 ? 'خروج ' : 'ورود ') + btMoney(mk.flow.netToman) + ' خرد');
      if (bt.funds && bt.funds.fixed) parts.push((bt.funds.fixed.netToman < 0 ? 'خروج از' : 'ورود به') + ' درآمد ثابت');
      explEl.textContent = parts.join(' · ') || '—';
    }

    var idxHost = U.$('#bourseIndices');
    if (idxHost) {
      function idxCard(label, p, chgPct, sub) {
        if (!(p > 0)) return '';
        var t = chgPct == null ? '' : chgPct > 0.3 ? 'hot' : chgPct < -0.3 ? 'cold' : '';
        return '<div class="bp-idx-card"><small>' + label + '</small><b>' + U.fmt(Math.round(p)) + (chgPct != null ? ' <em class="' + t + '">' + U.pct(chgPct, 1) + '</em>' : '') + '</b><span>' + (sub || '') + '</span></div>';
      }
      var cards = [];
      cards.push(idxCard('شاخص کل', mk.p, mk.chgPct, mk.high ? 'سقف ' + U.fmt(mk.high) + ' · کف ' + U.fmt(mk.low) : ''));
      if (bt.equal) cards.push(idxCard('هم‌وزن', bt.equal.p, bt.equal.chgPct, 'بدنه‌ی بازار'));
      if (bt.fara) cards.push(idxCard('فرابورس', bt.fara.p, bt.fara.chgPct, 'بازار دوم'));
      if (bt.cap) cards.push('<div class="bp-idx-card"><small>ارزش بازار</small><b>' + U.fa((bt.cap / 1e15).toFixed(1)) + ' همت</b><span>کل بورس و فرابورس</span></div>');
      idxHost.innerHTML = cards.join('');
    }

    var radarHost = U.$('#bourseRadarChart'), legendHost = U.$('#bourseRadarLegend');
    if (radarHost) {
      var dims = bourseRadarDims(mk, bt);
      radarHost.innerHTML = GS.charts.radarChart(dims, { size: 320, levels: 4, showValues: false, label: 'رادار سلامت بورس' });
      if (legendHost) {
        legendHost.innerHTML = dims.map(function (d) {
          var v = Math.round(d.value);
          var tone = v >= 60 ? 'hot' : v <= 35 ? 'cold' : 'mid';
          return '<div class="bp-rl-row"><span class="bp-rl-dot" style="background:' + (d.color || '#E8A33D') + '"></span><b>' + U.esc(d.label) + '</b><em class="' + tone + '">' + U.fa(v) + '</em><small>' + U.esc(d.hint || '') + '</small></div>';
        }).join('');
      }
    }

    var donutHost = U.$('#bourseBreadthDonut'), breadthStats = U.$('#bourseBreadthStats'), queueHost = U.$('#bourseQueueChart');
    if (donutHost && bt.breadth) {
      donutHost.innerHTML = GS.charts.breadthDonut(bt.breadth, { size: 150, thick: 16 });
      if (breadthStats) {
        var B = bt.breadth;
        breadthStats.innerHTML = '<div class="bp-stat"><span>مثبت</span><b class="up">' + U.fa(B.pos) + '</b><small>' + (B.posPct != null ? U.fa(B.posPct.toFixed(1)) + '٪' : '') + '</small></div>' +
          '<div class="bp-stat"><span>منفی</span><b class="down">' + U.fa(B.neg) + '</b><small>' + U.fa((100 - (B.posPct || 0)).toFixed(1)) + '٪</small></div>' +
          '<div class="bp-stat"><span>کل</span><b>' + U.fa(B.total) + '</b><small>خرد</small></div>';
      }
      if (queueHost) queueHost.innerHTML = GS.charts.queueChart(bt.breadth);
    }

    var mainFlowHost = U.$('#bourseMainFlow'), fundsHost = U.$('#bourseFundsFlow');
    if (mainFlowHost) {
      if (mk.flow) {
        var out = mk.flow.netToman < 0;
        var absT = Math.abs(mk.flow.netToman);
        var ratio = mk.flowRatio != null ? Math.abs(mk.flowRatio) * 100 : null;
        mainFlowHost.innerHTML = '<div class="bp-main-flow-card ' + (out ? 'out' : 'in') + '"><div class="bp-mf-icon">' + (out ? '↗' : '↘') + '</div>' +
          '<div class="bp-mf-main"><small>جریان پول حقیقی خرد</small><b>' + (out ? 'خروج ' : 'ورود ') + btMoney(absT) + '</b><span>' +
          (ratio != null ? U.fa(ratio.toFixed(1)) + '٪ ارزش معاملات · ' + U.fa(mk.flow.n || '') + ' نماد' : '') + '</span></div>' +
          '<div class="bp-mf-ratio"><b>' + (ratio != null ? U.fa(ratio.toFixed(1)) + '٪' : '—') + '</b><small>شدت</small></div></div>';
      } else mainFlowHost.innerHTML = '<div class="lc-empty">جریان خرد در دسترس نیست</div>';
    }
    if (fundsHost) fundsHost.innerHTML = GS.charts.fundsFlowChart(bt.funds);

    var tradeHost = U.$('#bourseTradeStats'), pcHost = U.$('#boursePerCapita'), capHost = U.$('#bourseCap');
    if (tradeHost) {
      if (bt.trade && bt.trade.valueToman) {
        tradeHost.innerHTML = '<div class="bp-trade"><div class="bp-tr-row"><span>ارزش معاملات خرد</span><b>' + btMoney(bt.trade.valueToman) + '</b></div>' +
          (bt.trade.volume ? '<div class="bp-tr-row"><span>حجم</span><b>' + U.fa((bt.trade.volume / 1e9).toFixed(2)) + ' میلیارد برگه</b></div>' : '') +
          '</div>';
      } else tradeHost.innerHTML = '<div class="lc-empty">ارزش معاملات نیست</div>';
    }
    if (pcHost) pcHost.innerHTML = GS.charts.perCapitaGauge(bt.perCapita);
    if (capHost && bt.cap) capHost.innerHTML = '<div class="bp-cap-card"><small>ارزش بازار کل</small><b>' + U.fa((bt.cap / 1e15).toFixed(1)) + ' هزار همت</b></div>';

    /* ---- ردیفِ «روندِ پول»: جریان در طولِ جلسه + پولِ پشتِ صف + چند جلسه ---- */
    var tk = mk.tk || null;
    var trendHost = U.$('#bourseMoneyTrend');
    if (trendHost) {
      // اولویت: منحنیِ پیوسته‌یِ خودِ تابلو (اگر هست)، وگرنه نقاطِ انتشارهای ما
      var curve = (bt && bt.flowCurve) ? bt.flowCurve : null;
      trendHost.innerHTML = curve
        ? GS.charts.flowCurveChart(curve)
        : GS.charts.moneyFlowChart(mk.flowSeries);
    }

    var qmHost = U.$('#bourseQueueMoney');
    if (qmHost) {
      // اولویت: برداشتِ زنده‌ی مرورگر از تابلوخوانی (داخلِ ایران)، بعد انتشارِ سرور
      var qSrc = (tk && tk.queue) ? tk.queue : (bt.queue || null);
      var qTrend = (tk && tk.trend) ? tk.trend : null;
      qmHost.innerHTML = GS.charts.queueMoneyChart(qSrc, qTrend);
      var srcEl2 = U.$('#bourseProSource');
      if (srcEl2 && tk && tk.queue && tk.queue.buyToman != null) {
        srcEl2.textContent = 'پولِ پشتِ صف از تابلوخوانی (مرورگرِ تو) · بقیه از انتشارِ سرور';
      }
    }

    var sHost = U.$('#bourseFlowSessions');
    if (sHost) sHost.innerHTML = GS.charts.flowSessionsChart(mk.flowSessions);

    var lHost = U.$('#bourseTkLinks');
    if (lHost) lHost.innerHTML = tkLinks(tk);
  }

  /**
   * پیوندهایِ تابلوخوانی — چرا پیوند و نه عدد؟ چون اندازه‌گیری نشان داد این سایت
   * بیرون از ایران پاسخِ HTTP نمی‌دهد؛ پس برایِ کاربرِ خارج از ایران، مفیدترین
   * کاری که می‌توانیم بکنیم این است که او را دقیقاً به همان صفحه برسانیم.
   */
  /** وضعیتِ تابلوخوانی در پنجره‌ی تنظیمات (چرا بی‌پاسخ است؟ صادقانه بگوییم) */
  function renderTkStatus() {
    var el = U.$('#tkStatus');
    if (!el) return;
    var st = (D().src && D().src.tablokhani) || null;
    var tk = null;
    try { tk = D().tablokhani ? D().tablokhani() : null; } catch (e) { tk = null; }
    var bits = [];
    if (st && st.ok === true) {
      bits.push('آخرین تلاش موفق — ' + U.esc(st.note || ''));
    } else if (st && st.ok === false) {
      bits.push('بی‌پاسخ: ' + U.esc(st.note || ''));
    } else {
      bits.push('هنوز تلاش نشده (هر یک ساعت یک‌بار، خودکار)');
    }
    if (tk && tk.series && tk.series.length) {
      bits.push('سریِ امروز: ' + U.fa(tk.series.length) + ' برداشت');
      if (tk.trend) bits.push('روند: ' + (tk.trend.rising ? '▲ رو‌به‌رشد' : '▼ رو‌به‌کاهش') + ' ' + GS.charts.signedMoney(tk.trend.delta));
    } else {
      bits.push('سریِ امروز: نداریم (داخلِ ایران و با اجازه‌ی CORS پر می‌شود)');
    }
    el.innerHTML = 'وضعیت: ' + bits.join(' · ');
  }

  function tkLinks(tk) {
    var base = 'https://tablokhani.com/';
    var links = [
      { href: base, label: 'تابلوی بازار' },
      { href: base + 'stock-screener/hot-money', label: 'پول داغ' },
      { href: base + 'stock-screener/market-game', label: 'بازیِ بازار' }
    ];
    if (tk && tk.symbols && tk.symbols.length) {
      tk.symbols.slice(0, 5).forEach(function (s) {
        links.push({ href: base + encodeURIComponent(s), label: s });
      });
    }
    return '<div class="tk-links"><span class="tk-hint">تابلوخوانی (پولِ هوشمند و صف‌ها) — فقط از داخلِ ایران باز می‌شود:</span>' +
      links.map(function (l) {
        return '<a class="tk-link" href="' + l.href + '" target="_blank" rel="noopener noreferrer">' + U.esc(l.label) + ' ↗</a>';
      }).join('') + '</div>';
  }

  function flowCard(label, net, hint) {
    if (net == null || !isFinite(+net)) return '';
    var out = +net < 0, zero = Math.abs(+net) < 1e6;
    return '<div class="mc"><small>' + label + '</small><b class="' + (zero ? '' : (out ? 'cold' : 'hot')) + '">' + (zero ? 'بدون جریان' : (out ? 'خروج ' : 'ورود ') + btMoney(net)) + '</b><span>' + (hint || '') + '</span></div>';
  }
  function renderBourse() {
    var host = U.$('#bourseStrip'), title = U.$('#bourseTitle');
    if (!host) return;
    var mk = null;
    try { mk = D().market ? D().market() : null; } catch (e) { mk = null; }
    var bt = mk && mk.bt ? mk.bt : null;
    if (!bt) { host.innerHTML = ''; host.style.display = 'none'; if (title) title.style.display = 'none'; return; }
    function card(label, val, hint, tone) { return '<div class="mc"><small>' + label + '</small><b class="' + (tone || '') + '">' + val + '</b><span>' + hint + '</span></div>'; }
    function idxCard(label, v, hint) {
      if (!v) return '';
      var tone = v.chgPct == null ? '' : v.chgPct > 0.3 ? 'hot' : v.chgPct < -0.3 ? 'cold' : '';
      return card(label, U.fmt(Math.round(v.p)) + (v.chgPct != null ? ' <small class="' + tone + '">' + U.pct(v.chgPct, 1) + '</small>' : ''), hint || '', tone);
    }
    var cards = [];
    var push = function (h) { if (h) cards.push(h); };
    // labels must stay compatible with tests/bourse.js (old strip) — new rich UI is in renderBoursePro
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
      var ageTxt = ageMin < 2 ? 'همین الان' : ageMin < 90 ? U.fa(ageMin) + ' دقیقه پیش' : ageMin < 36 * 60 ? U.fa(Math.round(ageMin / 60)) + ' ساعت پیش' : 'آخرین جلسه';
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
    renderBoursePro();
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
        if (targetIn) { try { targetIn.focus(); targetIn.select(); } catch (e) {} }
      });
    }
    openModal('#assetModal');
  }

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
    var lines = [];
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
    if (/رادار سلامت/.test(label)) return 'bourseRadar';
    if (/بورس/.test(label)) return 'bourseRadar';
    return null;
  }
  function fRow(k, v) { return '<div class="f-row"><span>' + U.esc(k) + '</span><b>' + v + '</b></div>'; }
  function formulaHTML(key) {
    var dv = D().derived(), CH = CFG().CHAIN, q = function (s) { var x = D().quote(s); return x && x.p > 0 ? x.p : null; };
    var m = D().mood(), H = CFG().HOTMONEY;
    var mk = null; try { mk = D().market ? D().market() : null; } catch (e) { mk = null; }
    var bt = mk && mk.bt ? mk.bt : null;
    var F = {
      bubble: { t: 'حباب سکه', f: 'حباب٪ = (قیمت بازار سکه ÷ ارزش ذاتی − ۱) × ۱۰۰\nارزش ذاتی = طلای ۲۴ عیار (هر گرم) × ' + U.fa(CH.EMAMI_G) + ' گرم طلای خالص',
        rows: [['طلای ۲۴ عیار (هر گرم)', q('G24') ? U.fmt(q('G24')) : (q('G18') ? U.fmt(q('G18') * CH.G24_K) + ' (از ۱۸ × ۴/۳)' : '—')], ['ارزش ذاتی سکه امامی', dv.intrinsicEmami ? U.fmt(Math.round(dv.intrinsicEmami)) : '—'], ['قیمت بازار سکه امامی', q('EMAMI') ? U.fmt(q('EMAMI')) : '—'], ['حباب', dv.bubble != null ? U.fa(dv.bubble.toFixed(2)) + '٪' : '—']],
        n: 'حباب مثبت یعنی بازار برای «سکه بودن» بیش از طلای داخلش می‌پردازد. بالای ۲۲٪ سنگین و بالای ۳۰٪ هیجانی.' },
      intrinsic: { t: 'ارزش ذاتی سکه', f: 'ارزش ذاتی = طلای ۲۴ عیار × وزن طلای خالص\nامامی/بهار ' + U.fa(CH.EMAMI_G) + ' گرم · نیم ' + U.fa(CH.NIM_G) + ' · ربع ' + U.fa(CH.ROB_G),
        rows: [['طلای ۲۴ عیار', q('G24') ? U.fmt(q('G24')) : '—'], ['ذاتی امامی', dv.intrinsicEmami ? U.fmt(Math.round(dv.intrinsicEmami)) : '—']],
        n: 'وزن‌ها استاندارد ضرب هستند.' },
      fairG18: { t: 'طلای منصفانه', f: 'طلای ۱۸ منصفانه = (اونس ÷ ' + U.fa(CH.OUNCE_G) + ') × ' + U.fa(CH.K18) + ' × دلار آزاد',
        rows: [['اونس جهانی', q('OUNCE_USD') ? U.fa(q('OUNCE_USD').toFixed(2)) + ' $' : '—'], ['دلار آزاد', q('USD') ? U.fmt(q('USD')) : '—'], ['منصفانه', dv.fairG18 ? U.fmt(Math.round(dv.fairG18)) : '—']],
        n: 'اختلاف بازار با این عدد، انحراف داخلی طلاست.' },
      goldPrem: { t: 'انحراف طلا', f: 'انحراف٪ = (بازار ÷ منصفانه − ۱) × ۱۰۰',
        rows: [['بازار', q('G18') ? U.fmt(q('G18')) : '—'], ['منصفانه', dv.fairG18 ? U.fmt(Math.round(dv.fairG18)) : '—'], ['انحراف', dv.goldPrem != null ? U.pct(dv.goldPrem, 2) : '—']],
        n: 'بیش از ±۴٪ هشدار می‌دهد.' },
      mesghal: { t: 'مظنه', f: 'مظنه معادل = طلای ۱۸ × ' + U.fa(CH.MESGHAL_K),
        rows: [['طلای ۱۸', q('G18') ? U.fmt(q('G18')) : '—'], ['معادل', q('G18') ? U.fmt(Math.round(q('G18') * CH.MESGHAL_K)) : '—'], ['بازار', q('MESGHAL') ? U.fmt(q('MESGHAL')) : '—']],
        n: 'یک مثقال = ۴٫۶۰۸ گرم.' },
      usdtPrem: { t: 'پریمیوم تتر', f: 'پریمیوم٪ = (تتر − دلار) ÷ دلار × ۱۰۰',
        rows: [['تتر', q('USDT') ? U.fmt(q('USDT')) : '—'], ['دلار', q('USD') ? U.fmt(q('USD')) : '—'], ['پریمیوم', dv.usdtPrem != null ? U.pct(dv.usdtPrem, 2) : '—']],
        n: 'بالای ۱٫۵٪ هیجان خروج از ریال.' },
      btcGap: { t: 'شکاف بیت‌کوین', f: 'دلار ضمنی = تومانی ÷ دلاری',
        rows: [['تومانی', q('BTC_TM') ? U.fmtCompact(q('BTC_TM')) : '—'], ['دلاری', q('BTC_USD') ? U.fmt(q('BTC_USD')) + ' $' : '—'], ['شکاف', dv.btcUsdGap != null ? U.pct(dv.btcUsdGap, 2) : '—']],
        n: 'شکاف بزرگ = اختلال یک سمت.' },
      eurImplied: { t: 'برابری یورو', f: 'یورو ÷ دلار',
        rows: [['یورو', q('EUR') ? U.fmt(q('EUR')) : '—'], ['دلار', q('USD') ? U.fmt(q('USD')) : '—']],
        n: 'مقایسه با Frankfurter.' },
      mood: { t: 'نبض بازار', f: 'نبض = میانگین تغییر × ۱۵ + (پهنا − ۵۰) × ۱٫۱ × مشارکت',
        rows: [['شمرده‌شده', U.fa(m.n)], ['مثبت/منفی/بی‌تغییر', U.fa(m.ups) + '٪ / ' + U.fa(m.downs) + '٪ / ' + U.fa(m.flat) + '٪'], ['میانگین', U.pct(m.avg, 2)], ['نبض', (m.score >= 0 ? '+' : '−') + U.fa(Math.abs(m.score))]],
        n: 'در بازار ساکت پهنا با مشارکت وزن می‌خورد.' },
      hot: { t: 'پول داغ', f: '۶۰٪ تغییر روز + ۴۰٪ شیب نشست',
        rows: [['وزن روز', U.fa(H.wDay * 100) + '٪'], ['وزن شیب', U.fa(H.wSlope * 100) + '٪']],
        n: 'شاخص حرکتی شفاف.' },
      heat: { t: 'حرارت', f: 'تغییر×۸ + شیب×۵', rows: [], n: 'در شبیه‌ساز و ترکیب‌ساز.' },
      sim: { t: 'شبیه‌ساز', f: 'اسمی = تورم + ۰٫۵×حرارت\nواقعی = سرمایه×(۱+اسمی)^سال ÷ (۱+تورم)^سال', rows: [['تورم', U.fa(INFL()) + '٪']], n: 'فرض آموزشی.' },
      verdict: { t: 'حکم امروز', f: 'امتیاز = نبض + پهنا + پول داغ + حباب + تتر + بورس (پهنا، جریان خرد، صندوق‌ها، سرانه)', rows: [], n: '۵ پله: نقد و انتظار · دفاعی · حفظ ترکیب · تعادل رشد · حمله حساب‌شده.' },
      bourseRadar: { t: 'رادار سلامت بورس', f: '۶ بُعد ۰..۱۰۰:\n• پهنا = posPct (٪ مثبت)\n• جریان خرد = |ratio|×۲۵۰ (شدت) + ورود +۳۰\n• درآمد ثابت: خروج → ۵۰+ |net|/1T×۸ (پول از پناهگاه به سهام)\n• سهامی: ورود → ۵۰+ net/1T×۱۰\n• سرانه = ۵۰ + (buy/sell −۱)×۴۰\n• صف خرید = buy/(buy+sell)×۱۰۰',
        rows: bt ? [
          ['پهنا', bt.breadth ? U.fa(Math.round(bt.breadth.posPct)) + '٪ (' + U.fa(bt.breadth.pos) + '/' + U.fa(bt.breadth.neg) + ')' : '—'],
          ['جریان خرد', mk && mk.flow ? btMoneySigned(mk.flow.netToman) + (mk.flowRatio != null ? ' · ' + U.fa((Math.abs(mk.flowRatio) * 100).toFixed(1)) + '٪' : '') : '—'],
          ['درآمد ثابت', bt.funds && bt.funds.fixed ? btMoneySigned(bt.funds.fixed.netToman) : '—'],
          ['سهامی', bt.funds && bt.funds.equity ? btMoneySigned(bt.funds.equity.netToman) : '—'],
          ['سرانه خرید/فروش', bt.perCapita ? U.fa(bt.perCapita.buy) + '/' + U.fa(bt.perCapita.sell) + ' = ' + U.fa((bt.perCapita.buy / (bt.perCapita.sell || 1)).toFixed(2)) + '×' : '—'],
          ['صف خرید/فروش', bt.breadth ? U.fa(bt.breadth.queueBuy || 0) + '/' + U.fa(bt.breadth.queueSell || 0) : '—']
        ] : [],
        n: 'هر بُعد ۰=ضعیف، ۱۰۰=قوی. میانگین ۶ بُعد = سلامت کل بورس. داده از bourse-trader.ir (بدون کلید، صفحه عمومی) + شاخص TGJU.' },
      moneyTrend: { t: 'روندِ پول در جلسه', f: 'خالصِ پولِ حقیقی (تومان) = خریدِ حقیقی − فروشِ حقیقی\nهر انتشارِ سرور یک نقطه می‌افزاید؛ فقط نقاطِ همان جلسه نگه داشته می‌شوند.\nشیب (همت/ساعت) = (آخرین − اولین) ÷ ساعت‌های سپری‌شدهٔ جلسه\nشتاب‌دار = جهتِ حرکت، جهتِ خالص را تقویت می‌کند',
        rows: (function () {
          var out = [];
          var tk2 = mk && mk.flowTrend;
          out.push(['تعدادِ برداشت', tk2 ? U.fa(tk2.points) + ' نقطه در ' + U.fa(tk2.spanMin) + ' دقیقه' : '—']);
          out.push(['اول جلسه', tk2 ? btMoneySigned(tk2.from) : '—']);
          out.push(['اکنون', tk2 ? btMoneySigned(tk2.to) : (mk && mk.flow ? btMoneySigned(mk.flow.netToman) : '—')]);
          out.push(['تغییر از اول جلسه', tk2 ? btMoneySigned(tk2.delta) + ' (' + (tk2.perHour >= 0 ? '+' : '−') + U.fa(Math.abs(tk2.perHour)) + ' همت/ساعت)' : '—']);
          out.push(['وضعیت', !tk2 ? 'دو برداشت لازم است' : tk2.accelerating ? 'شتاب‌دار در جهتِ خالص' : tk2.reversing ? 'برگشتی (خلافِ جهتِ اولیه)' : 'ثبات']);
          if (mk && mk.flowSessions && mk.flowSessions.n) {
            out.push(['چند جلسه‌ی اخیر', U.fa(mk.flowSessions.n) + ' جلسه · مجموع ' + btMoneySigned(mk.flowSessions.sum) +
              (mk.flowSessions.streak ? (mk.flowSessions.streak === 'out' ? ' · خروجِ پیاپی' : ' · ورودِ پیاپی') : '')]);
          }
          return out;
        })(),
        n: 'چرا مهم است؟ یک عددِ لحظه‌ای نمی‌گوید پول «در حالِ رفتن» است یا «رفته»؛ شیبِ جلسه این را می‌گوید. دو منبع دارد: منحنیِ پیوسته‌یِ خودِ تابلو (وضوحِ بالا، بدون برچسبِ ساعت) و نقاطِ زمان‌دارِ انتشارهای سرور (مبنایِ محاسبه‌یِ همت/ساعت).' },
      queueMoney: { t: 'پولِ پشتِ صف', f: 'ارزشِ صفِ خرید/فروش = مجموعِ ارزشِ سفارش‌هایِ صف‌شده (تومان)\nخالص = ارزشِ صفِ خرید − ارزشِ صفِ فروش\nسهمِ صفِ خرید = خرید ÷ (خرید + فروش)\nروندِ امروز = خالصِ آخرین برداشت − خالصِ اولین برداشت',
        rows: (function () {
          var q2 = (mk && mk.tk && mk.tk.queue) ? mk.tk.queue : (bt ? bt.queue : null);
          if (!q2) return [['داده', 'در دسترس نیست']];
          return [
            ['ارزش صف خرید', q2.buyToman != null ? btMoneySigned(q2.buyToman) : '—'],
            ['ارزش صف فروش', q2.sellToman != null ? btMoneySigned(q2.sellToman) : '—'],
            ['خالص', q2.netToman != null ? btMoneySigned(q2.netToman) : '—'],
            ['سهمِ صفِ خرید', q2.buyShare != null ? U.fa(Math.round(q2.buyShare * 100)) + '٪' : '—'],
            ['تعدادِ صف', (q2.buy != null || q2.sell != null) ? U.fa(q2.buy || 0) + ' خرید / ' + U.fa(q2.sell || 0) + ' فروش' : '—']
          ];
        })(),
        n: 'تعدادِ صف می‌گوید چند نماد صف است؛ ارزشِ صف می‌گوید چقدر پول پشت آن ایستاده — برای سنجشِ فشارِ تقاضا دقیق‌تر است. منبع: تابلوخوانی از مرورگرِ داخلِ ایران (هر یک ساعت)، در غیر این صورت از انتشارِ سرور.' }
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
      '<li>بورس: رادار ۶ بعدی پهنا، جریان خرد، صندوق‌ها، سرانه و صف‌ها را از بورس‌تریدر می‌خواند.</li>' +
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

  function summaryText() {
    var lines = ['📊 گرماسنج — ' + U.todayFa() + ' ' + U.clockFa()];
    var rows = [['USD', 'دلار'], ['EUR', 'یورو'], ['USDT', 'تتر'], ['G18', 'طلای ۱۸'], ['MESGHAL', 'مثقال'], ['EMAMI', 'سکه امامی'], ['OUNCE_USD', 'اونس'], ['BTC_USD', 'بیت‌کوین']];
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
      var mk = D().market ? D().market() : null;
      if (mk && mk.p > 0) {
        lines.push('• شاخص بورس: ' + U.fmt(Math.round(mk.p)) + (mk.chgPct != null ? ' (' + U.pct(mk.chgPct, 1) + ')' : ''));
        if (mk.bt && mk.bt.breadth) lines.push('• پهنا بورس: ' + U.fa(Math.round(mk.bt.breadth.posPct)) + '٪ مثبت (' + U.fa(mk.bt.breadth.pos) + '/' + U.fa(mk.bt.breadth.neg) + ')');
        if (mk.flow) lines.push('• جریان خرد: ' + (mk.flow.netToman < 0 ? 'خروج ' : 'ورود ') + U.fa((Math.abs(mk.flow.netToman) / 1e12).toFixed(1)) + ' همت');
      }
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
    renderPulse: renderPulse, renderMacro: renderMacro, renderBoursePro: renderBoursePro,
    renderTkStatus: renderTkStatus,
    openModal: openModal, closeModal: closeModal, buildDiag: buildDiag,
    openAssetModal: openAssetModal,
    initReveal: initReveal, initCounters: initCounters,
    dayHTML: dayHTML, dispPrice: dispPrice, feedText: feedText,
    pins: function () { return PINS.slice(); }, isPinned: isPinned, togglePin: togglePin, applyPins: applyPins,
    setQuery: setQuery, focusSearch: focusSearch,
    getTheme: getTheme, applyTheme: applyTheme, toggleTheme: toggleTheme, initTheme: initTheme,
    initCompare: initCompare, openCompare: openCompare, renderCompare: renderCompare,
    openInfo: openInfo, openFormula: openFormula, formulaHTML: formulaHTML, openHelp: openHelp, openEmbed: openEmbed, embedCode: embedCode,
    historyBlock: historyBlock
  };
})();
