/* ============================================================
   گرماسنج — charts.js (نسل ۳)
   اسپارک‌لاین‌های نشست + میله‌ی دامنه‌ی روز. بدون وابستگی.
   ============================================================ */
(function () {
  'use strict';
  window.GS = window.GS || {};
  var U = GS.utils;

  function D() { return GS.data; }

  /** اسپارک‌لاین SVG از سری [{t,p}] */
  function spark(pts, w, h, color, fill) {
    w = w || 120; h = h || 34;
    pts = (pts || []).filter(function (x) { return x && x.p > 0; }).slice(-60);
    if (pts.length < 2) {
      return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
        '<line x1="0" y1="' + (h / 2) + '" x2="' + w + '" y2="' + (h / 2) + '" stroke="#3A332A" stroke-width="1.5" stroke-dasharray="3 3"/></svg>';
    }
    var ps = pts.map(function (x) { return x.p; });
    var lo = Math.min.apply(null, ps), hi = Math.max.apply(null, ps);
    if (hi === lo) { hi = lo * 1.001 + 1; }
    function X(i) { return (i / (pts.length - 1) * (w - 4) + 2).toFixed(1); }
    function Y(p) { return (h - 3 - (p - lo) / (hi - lo) * (h - 6)).toFixed(1); }
    var d = pts.map(function (x, i) { return (i ? 'L' : 'M') + X(i) + ' ' + Y(x.p); }).join(' ');
    var last = pts[pts.length - 1];
    var area = fill === false ? '' : '<path d="' + d + 'L' + X(pts.length - 1) + ' ' + h + 'L2 ' + h + 'Z" fill="' + color + '" opacity="0.12"/>';
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + area +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + X(pts.length - 1) + '" cy="' + Y(last.p) + '" r="2.4" fill="' + color + '"/></svg>';
  }

  function dirColor(chgPct) {
    if (chgPct == null || Math.abs(chgPct) < 0.05) return '#9A9284';
    return chgPct > 0 ? '#3ECF8E' : '#FF6B5E';
  }

  /** اسپارک‌لاین یک دارایی از بافر نشست */
  function assetSpark(sym, chgPct) {
    return spark(D().hist(sym), 132, 36, dirColor(chgPct));
  }

  /** میله‌ی موقعیت قیمت در دامنه‌ی روز (low..high) */
  function rangeBar(q) {
    if (!q || !(q.p > 0) || !(q.high > 0) || !(q.low > 0) || q.high <= q.low) {
      return '<span class="rbar none"><i></i></span>';
    }
    var k = U.clamp((q.p - q.low) / (q.high - q.low) * 100, 0, 100);
    var loTxt = q.low >= 1000 ? U.fmt(q.low) : U.fa(q.low);
    var hiTxt = q.high >= 1000 ? U.fmt(q.high) : U.fa(q.high);
    return '<div class="rbar-wrap">' +
      '<div class="rbar-labels"><small class="rb-l">کف ' + loTxt + '</small><small class="rb-h">سقف ' + hiTxt + '</small></div>' +
      '<span class="rbar"><i style="right:' + k.toFixed(1) + '%"></i></span>' +
      '</div>';
  }

  /* ============================================================
     نمودار خطی تاریخچه (۷/۳۰/۹۰ روز) — بدون وابستگی، RTL-آگاه
     pts: [{t,p,hi?,lo?,live?}]  opts: {w,h,color,fmt,unit}
     ============================================================ */
  function lineChart(pts, opts) {
    opts = opts || {};
    var w = opts.w || 320, h = opts.h || 130, padL = 8, padR = 8, padT = 18, padB = 20;
    var fmt = opts.fmt || function (v) { return U.fmt(v); };
    pts = (pts || []).filter(function (x) { return x && x.p > 0 && x.t > 0; });
    if (pts.length < 2) {
      return '<div class="lc-empty">' + U.esc(opts.emptyText || 'هنوز تاریخچه‌ی کافی نداریم') + '</div>';
    }
    var t0 = pts[0].t, t1 = pts[pts.length - 1].t; if (t1 === t0) t1 = t0 + 1;
    var ps = [];
    pts.forEach(function (x) { ps.push(x.p); if (x.hi > 0) ps.push(x.hi); if (x.lo > 0) ps.push(x.lo); });
    var lo = Math.min.apply(null, ps), hi = Math.max.apply(null, ps);
    if (hi === lo) { hi = lo * 1.002; lo = lo * 0.998; }
    var pad = (hi - lo) * 0.08; hi += pad; lo -= pad;
    function X(t) { return (padL + (t - t0) / (t1 - t0) * (w - padL - padR)); }
    function Y(p) { return (padT + (hi - p) / (hi - lo) * (h - padT - padB)); }
    var first = pts[0].p, last = pts[pts.length - 1].p;
    var color = opts.color || (last >= first ? '#3ECF8E' : '#FF6B5E');
    var d = pts.map(function (x, i) { return (i ? 'L' : 'M') + X(x.t).toFixed(1) + ' ' + Y(x.p).toFixed(1); }).join(' ');
    var area = d + 'L' + X(t1).toFixed(1) + ' ' + (h - padB) + 'L' + X(t0).toFixed(1) + ' ' + (h - padB) + 'Z';
    // نوار سقف/کف روزانه (اگر داده‌ی روزانه است)
    var band = '';
    var withHL = pts.filter(function (x) { return x.hi > 0 && x.lo > 0; });
    if (withHL.length >= 2) {
      var up = withHL.map(function (x, i) { return (i ? 'L' : 'M') + X(x.t).toFixed(1) + ' ' + Y(x.hi).toFixed(1); }).join(' ');
      var dn = withHL.slice().reverse().map(function (x) { return 'L' + X(x.t).toFixed(1) + ' ' + Y(x.lo).toFixed(1); }).join(' ');
      band = '<path d="' + up + dn + 'Z" fill="' + color + '" opacity=".10"/>';
    }
    // نقاط کمینه/بیشینه
    var iMin = 0, iMax = 0;
    pts.forEach(function (x, i) { if (x.p < pts[iMin].p) iMin = i; if (x.p > pts[iMax].p) iMax = i; });
    function lbl(i, above) {
      var x = X(pts[i].t), y = Y(pts[i].p);
      var anchor = x < w * 0.25 ? 'start' : x > w * 0.75 ? 'end' : 'middle';
      return '<text x="' + x.toFixed(1) + '" y="' + (above ? y - 6 : y + 13).toFixed(1) + '" text-anchor="' + anchor + '" class="lc-lbl">' + fmt(pts[i].p) + '</text>';
    }
    var marks = '<circle cx="' + X(pts[iMax].t).toFixed(1) + '" cy="' + Y(pts[iMax].p).toFixed(1) + '" r="2.6" fill="' + color + '"/>' + lbl(iMax, true) +
      (iMin !== iMax ? '<circle cx="' + X(pts[iMin].t).toFixed(1) + '" cy="' + Y(pts[iMin].p).toFixed(1) + '" r="2.6" fill="' + color + '"/>' + lbl(iMin, false) : '');
    var lastDot = '<circle cx="' + X(t1).toFixed(1) + '" cy="' + Y(last).toFixed(1) + '" r="3.4" fill="' + color + '" class="lc-last"/>';
    var mid = t0 + (t1 - t0) / 2;
    var axis = '<text x="' + padL + '" y="' + (h - 5) + '" class="lc-ax" text-anchor="start">' + U.dateFa(t0) + '</text>' +
      '<text x="' + (w / 2).toFixed(1) + '" y="' + (h - 5) + '" class="lc-ax" text-anchor="middle">' + U.dateFa(mid) + '</text>' +
      '<text x="' + (w - padR) + '" y="' + (h - 5) + '" class="lc-ax" text-anchor="end">' + (opts.lastLabel || 'اکنون') + '</text>';
    var grid = [0.25, 0.5, 0.75].map(function (k) {
      var y = (padT + k * (h - padT - padB)).toFixed(1);
      return '<line x1="' + padL + '" y1="' + y + '" x2="' + (w - padR) + '" y2="' + y + '" class="lc-grid"/>';
    }).join('');
    return '<svg class="lc" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + U.esc(opts.label || 'نمودار قیمت') + '" style="direction:ltr">' +
      grid + band + '<path d="' + area + '" fill="' + color + '" opacity=".13"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      marks + lastDot + axis + '</svg>';
  }

  /* ============================================================
     نمودار مقایسه — دو (یا چند) سری نرمال‌شده به پایه‌ی ۱۰۰
     list: [{pts:[{t,p}], color, name}]
     ============================================================ */
  function compareChart(list, opts) {
    opts = opts || {};
    var w = opts.w || 320, h = opts.h || 150, padL = 8, padR = 8, padT = 16, padB = 20;
    list = (list || []).map(function (s) {
      var pts = (s.pts || []).filter(function (x) { return x && x.p > 0 && x.t > 0; });
      return { pts: pts, color: s.color, name: s.name };
    }).filter(function (s) { return s.pts.length >= 2; });
    if (list.length < 2) return '<div class="lc-empty">' + U.esc(opts.emptyText || 'برای مقایسه، هر دو دارایی باید تاریخچه داشته باشند') + '</div>';
    // شروع مشترک: دیرترینِ نقاط اول؛ هر سری از اولین نقطه‌ی ≥ شروع نرمال می‌شود
    var start = Math.max.apply(null, list.map(function (s) { return s.pts[0].t; }));
    var end = Math.max.apply(null, list.map(function (s) { return s.pts[s.pts.length - 1].t; }));
    if (end <= start) end = start + 1;
    var lo = Infinity, hi = -Infinity;
    list.forEach(function (s) {
      var base = null;
      s.norm = [];
      s.pts.forEach(function (x) {
        if (x.t < start - 12 * 3600000) return;
        if (base == null) base = x.p;
        var v = x.p / base * 100;
        s.norm.push({ t: Math.max(x.t, start), v: v });
        if (v < lo) lo = v; if (v > hi) hi = v;
      });
      s.last = s.norm.length ? s.norm[s.norm.length - 1].v : null;
    });
    if (!isFinite(lo) || !isFinite(hi)) return '<div class="lc-empty">داده‌ی هم‌پوشان کافی نیست</div>';
    if (hi - lo < 0.4) { hi += 0.2; lo -= 0.2; }
    var pad = (hi - lo) * 0.1; hi += pad; lo -= pad;
    function X(t) { return padL + (t - start) / (end - start) * (w - padL - padR); }
    function Y(v) { return padT + (hi - v) / (hi - lo) * (h - padT - padB); }
    var base100 = '<line x1="' + padL + '" y1="' + Y(100).toFixed(1) + '" x2="' + (w - padR) + '" y2="' + Y(100).toFixed(1) + '" class="lc-base"/>' +
      '<text x="' + padL + '" y="' + (Y(100) - 4).toFixed(1) + '" class="lc-ax" text-anchor="start">۱۰۰ = شروع بازه</text>';
    var paths = list.map(function (s) {
      var d = s.norm.map(function (x, i) { return (i ? 'L' : 'M') + X(x.t).toFixed(1) + ' ' + Y(x.v).toFixed(1); }).join(' ');
      var lx = X(s.norm[s.norm.length - 1].t), ly = Y(s.last);
      return '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3.2" fill="' + s.color + '"/>' +
        '<text x="' + (lx - 6).toFixed(1) + '" y="' + (ly - 6).toFixed(1) + '" text-anchor="end" class="lc-lbl" fill="' + s.color + '">' + U.pct(s.last - 100, 1) + '</text>';
    }).join('');
    var axis = '<text x="' + padL + '" y="' + (h - 5) + '" class="lc-ax" text-anchor="start">' + U.dateFa(start) + '</text>' +
      '<text x="' + (w - padR) + '" y="' + (h - 5) + '" class="lc-ax" text-anchor="end">' + (opts.lastLabel || 'اکنون') + '</text>';
    return '<svg class="lc lc-cmp" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + U.esc(opts.label || 'نمودار مقایسه') + '" style="direction:ltr">' +
      base100 + paths + axis + '</svg>';
  }

  GS.charts = { spark: spark, assetSpark: assetSpark, rangeBar: rangeBar, dirColor: dirColor, lineChart: lineChart, compareChart: compareChart };
})();
