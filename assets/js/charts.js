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

  GS.charts = { spark: spark, assetSpark: assetSpark, rangeBar: rangeBar, dirColor: dirColor };
})();
