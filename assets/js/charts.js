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

  /* ============================================================
     رادار چارت حرفه‌ای — برای نبض بورس و سلامت بازار
     dims: [{label, value:0..100, color, hint}]
     opts: {size, levels, labelRadius}
     ============================================================ */
  function radarChart(dims, opts) {
    opts = opts || {};
    var size = opts.size || 300;
    var cx = size / 2, cy = size / 2;
    var maxR = (size / 2) - (opts.labelRadius || 52);
    var levels = opts.levels || 4;
    dims = (dims || []).filter(function (d) { return d && isFinite(d.value); });
    if (dims.length < 3) return '<div class=\"lc-empty\">برای رادار حداقل ۳ بُعد لازم است</div>';
    var n = dims.length;
    function pt(angleDeg, r) {
      var rad = (angleDeg - 90) * Math.PI / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    }
    // شبکه‌ی چندضلعی
    var grid = '';
    for (var lv = 1; lv <= levels; lv++) {
      var rr = maxR * lv / levels;
      var pts = [];
      for (var i = 0; i < n; i++) {
        var p = pt(i * 360 / n, rr);
        pts.push(p[0].toFixed(1) + ',' + p[1].toFixed(1));
      }
      grid += '<polygon points=\"' + pts.join(' ') + '\" fill=\"none\" stroke=\"var(--line)\" stroke-width=\"' + (lv === levels ? '1.2' : '0.7') + '\" opacity=\"' + (lv === levels ? '0.9' : '0.45') + '\" stroke-dasharray=\"' + (lv % 2 ? '3 3' : 'none') + '\"/>';
    }
    // محورها
    var axes = '';
    for (var j = 0; j < n; j++) {
      var p = pt(j * 360 / n, maxR);
      axes += '<line x1=\"' + cx + '\" y1=\"' + cy + '\" x2=\"' + p[0].toFixed(1) + '\" y2=\"' + p[1].toFixed(1) + '\" stroke=\"var(--line)\" stroke-width=\"0.7\" opacity=\"0.5\"/>';
    }
    // داده
    var dataPts = [];
    var dots = '';
    for (var k = 0; k < n; k++) {
      var v = U.clamp(dims[k].value, 0, 100);
      var r = maxR * v / 100;
      var pp = pt(k * 360 / n, r);
      dataPts.push(pp[0].toFixed(1) + ',' + pp[1].toFixed(1));
      var col = dims[k].color || (v >= 60 ? '#3ECF8E' : v <= 35 ? '#FF6B5E' : '#E8A33D');
      dots += '<circle cx=\"' + pp[0].toFixed(1) + '\" cy=\"' + pp[1].toFixed(1) + '\" r=\"4.5\" fill=\"' + col + '\" stroke=\"var(--card)\" stroke-width=\"2\" class=\"radar-dot\"/>';
      // مقدار روی نقطه
      if (opts.showValues) {
        var vp = pt(k * 360 / n, r + 14);
        dots += '<text x=\"' + vp[0].toFixed(1) + '\" y=\"' + vp[1].toFixed(1) + '\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"700\" fill=\"' + col + '\" font-family=\"Vazirmatn\">' + Math.round(v) + '</text>';
      }
    }
    var fill = '<polygon points=\"' + dataPts.join(' ') + '\" fill=\"url(#radarGrad)\" opacity=\"0.22\"/>';
    var stroke = '<polygon points=\"' + dataPts.join(' ') + '\" fill=\"none\" stroke=\"#E8A33D\" stroke-width=\"2.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\" opacity=\"0.95\"/>';
    // برچسب‌ها
    var labels = '';
    for (var l = 0; l < n; l++) {
      var lp = pt(l * 360 / n, maxR + 28);
      var anchor = 'middle';
      var ang = l * 360 / n;
      if (ang > 30 && ang < 150) anchor = 'start';
      else if (ang > 210 && ang < 330) anchor = 'end';
      labels += '<text x=\"' + lp[0].toFixed(1) + '\" y=\"' + lp[1].toFixed(1) + '\" text-anchor=\"' + anchor + '\" font-size=\"11\" font-weight=\"700\" fill=\"var(--txt)\" font-family=\"Vazirmatn\">' + U.esc(dims[l].label) + '</text>';
    }
    var grad = '<defs><radialGradient id=\"radarGrad\" cx=\"50%\" cy=\"50%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#E8A33D\" stop-opacity=\"0.5\"/><stop offset=\"100%\" stop-color=\"#E8A33D\" stop-opacity=\"0.05\"/></radialGradient></defs>';
    return '<svg class=\"radar-chart\" viewBox=\"0 0 ' + size + ' ' + size + '\" role=\"img\" aria-label=\"' + U.esc(opts.label || 'نمودار رادار بورس') + '\" style=\"direction:ltr;width:100%;height:auto\">' +
      grad + grid + axes + fill + stroke + dots + labels + '</svg>';
  }

  /* دونات پهنا — مثبت vs منفی */
  function breadthDonut(breadth, opts) {
    opts = opts || {};
    var size = opts.size || 160;
    var cx = size / 2, cy = size / 2, r = (size / 2) - 12, thick = opts.thick || 18;
    if (!breadth || !(breadth.pos >= 0) || !(breadth.neg >= 0)) return '<div class=\"lc-empty\">داده‌ی پهنا نیست</div>';
    var total = breadth.pos + breadth.neg;
    if (total <= 0) return '<div class=\"lc-empty\">پهنا صفر</div>';
    var posPct = breadth.pos / total;
    var circ = 2 * Math.PI * r;
    var posLen = circ * posPct;
    var negLen = circ - posLen;
    var rot = -90;
    var posColor = posPct >= 0.55 ? '#3ECF8E' : posPct <= 0.25 ? '#FF6B5E' : '#E8A33D';
    var center = '<text x=\"' + cx + '\" y=\"' + (cy - 2) + '\" text-anchor=\"middle\" font-size=\"20\" font-weight=\"900\" fill=\"var(--txt)\" font-family=\"Vazirmatn\">' + Math.round(posPct * 100) + '٪</text>' +
      '<text x=\"' + cx + '\" y=\"' + (cy + 14) + '\" text-anchor=\"middle\" font-size=\"10\" fill=\"var(--mut)\" font-family=\"Vazirmatn\">مثبت</text>';
    return '<svg class=\"donut-chart\" viewBox=\"0 0 ' + size + ' ' + size + '\" style=\"width:100%;height:auto;max-width:' + size + 'px\">' +
      '<circle cx=\"' + cx + '\" cy=\"' + cy + '\" r=\"' + r + '\" fill=\"none\" stroke=\"var(--track)\" stroke-width=\"' + thick + '\"/>' +
      '<circle cx=\"' + cx + '\" cy=\"' + cy + '\" r=\"' + r + '\" fill=\"none\" stroke=\"#FF6B5E\" stroke-width=\"' + thick + '\" stroke-dasharray=\"' + negLen.toFixed(1) + ' ' + posLen.toFixed(1) + '\" transform=\"rotate(' + (rot + posPct * 360) + ' ' + cx + ' ' + cy + ')\" stroke-linecap=\"round\" opacity=\"0.9\"/>' +
      '<circle cx=\"' + cx + '\" cy=\"' + cy + '\" r=\"' + r + '\" fill=\"none\" stroke=\"' + posColor + '\" stroke-width=\"' + thick + '\" stroke-dasharray=\"' + posLen.toFixed(1) + ' ' + negLen.toFixed(1) + '\" transform=\"rotate(' + rot + ' ' + cx + ' ' + cy + ')\" stroke-linecap=\"round\"/>' +
      center + '</svg>';
  }

  /* میله‌ی جریان صندوق‌ها */
  function fundsFlowChart(funds, opts) {
    opts = opts || {};
    if (!funds) return '<div class=\"lc-empty\">تحرک صندوق‌ها نیست</div>';
    var items = [];
    var labels = { fixed: 'درآمد ثابت', equity: 'سهامی', commodity: 'کالایی/طلا', option: 'آپشن' };
    var colors = { fixed: '#4E8F8B', equity: '#E8A33D', commodity: '#E3A93C', option: '#7E97A3' };
    Object.keys(labels).forEach(function (k) {
      if (funds[k] && isFinite(funds[k].netToman)) items.push({ key: k, label: labels[k], net: funds[k].netToman, color: colors[k] });
    });
    if (!items.length) return '<div class=\"lc-empty\">صندوقی با جریان معنادار نیست</div>';
    var maxAbs = Math.max.apply(null, items.map(function (x) { return Math.abs(x.net); }).concat([1e9]));
    var rows = items.map(function (it) {
      var pct = U.clamp(Math.abs(it.net) / maxAbs * 100, 4, 100);
      var out = it.net < 0;
      var dir = out ? 'out' : 'in';
      var w = pct.toFixed(1) + '%';
      var txt = (out ? 'خروج ' : 'ورود ') + (Math.abs(it.net) >= 1e12 ? U.fa((Math.abs(it.net) / 1e12).toFixed(2)) + ' همت' : Math.abs(it.net) >= 1e9 ? U.fa(Math.round(Math.abs(it.net) / 1e9)) + ' میلیارد' : U.fmt(Math.round(it.net)));
      return '<div class=\"fund-row ' + dir + '\"><span class=\"fund-label\" style=\"--c:' + it.color + '\"><i></i>' + U.esc(it.label) + '</span>' +
        '<div class=\"fund-track\"><i class=\"fund-fill ' + dir + '\" style=\"width:' + w + ';background:' + it.color + '\"></i></div>' +
        '<span class=\"fund-val ' + dir + '\">' + txt + '</span></div>';
    }).join('');
    return '<div class=\"funds-chart\">' + rows + '</div>';
  }

  /* گیج سرانه خرید/فروش */
  function perCapitaGauge(pc, opts) {
    opts = opts || {};
    if (!pc || !(pc.buy > 0 || pc.sell > 0)) return '<div class=\"lc-empty\">سرانه نیست</div>';
    var buy = pc.buy || 0, sell = pc.sell || 0;
    var total = buy + sell;
    var buyPct = total > 0 ? buy / total * 100 : 50;
    var ratio = sell > 0 ? buy / sell : 0;
    var tone = ratio >= 1.3 ? 'hot' : ratio <= 0.75 ? 'cold' : 'neutral';
    var label = ratio >= 1.3 ? 'قدرت خریداران' : ratio <= 0.75 ? 'فشار فروش' : 'متعادل';
    return '<div class=\"pc-gauge ' + tone + '\">' +
      '<div class=\"pc-head\"><span>سرانه خرید حقیقی</span><b>' + U.fa(buy.toFixed(1)) + ' م</b></div>' +
      '<div class=\"pc-track\"><i class=\"pc-buy\" style=\"width:' + buyPct.toFixed(1) + '%\"></i><i class=\"pc-sell\" style=\"width:' + (100 - buyPct).toFixed(1) + '%\"></i></div>' +
      '<div class=\"pc-foot\"><span>فروش ' + U.fa(sell.toFixed(1)) + ' م</span><em class=\"pc-badge ' + tone + '\">' + label + ' (' + (ratio ? U.fa(ratio.toFixed(2)) + '×' : '—') + ')</em></div>' +
      '</div>';
  }

  /* نمودار صف‌ها — خرید vs فروش */
  function queueChart(breadth, opts) {
    if (!breadth || (breadth.queueBuy == null && breadth.queueSell == null)) return '<div class=\"lc-empty\">صف‌ها نیست</div>';
    var buy = breadth.queueBuy || 0, sell = breadth.queueSell || 0;
    var total = buy + sell;
    if (total <= 0) return '<div class=\"lc-empty\">صفی نیست</div>';
    var buyPct = buy / total * 100;
    return '<div class=\"queue-chart\">' +
      '<div class=\"queue-row\"><span class=\"q-label buy\">صف خرید</span><div class=\"queue-track\"><i class=\"queue-fill buy\" style=\"width:' + buyPct.toFixed(1) + '%\"></i></div><b>' + U.fa(buy) + '</b></div>' +
      '<div class=\"queue-row\"><span class=\"q-label sell\">صف فروش</span><div class=\"queue-track\"><i class=\"queue-fill sell\" style=\"width:' + (100 - buyPct).toFixed(1) + '%\"></i></div><b>' + U.fa(sell) + '</b></div>' +
      '<div class=\"queue-foot\">نسبت صف: ' + U.fa(buy) + ' خرید در برابر ' + U.fa(sell) + ' فروش · ' + (buyPct >= 55 ? 'تمایل به خرید' : buyPct <= 35 ? 'فشار فروش در صف' : 'متعادل') + '</div>' +
      '</div>';
  }

  /* ============================================================
     روندِ پول — سه نمودارِ تازه برای «تحلیلِ ورود و خروجِ پول»
     ۱) moneyFlowChart: خالصِ پولِ حقیقی در طولِ جلسه (سریِ انتشارها)
     ۲) queueMoneyChart: پولِ ایستاده پشتِ صف‌های خرید/فروش + روندش
     ۳) flowSessionsChart: خالصِ جریانِ چند جلسه‌ی اخیر (روندِ چندروزه)
     ============================================================ */

  /** نمایشِ کوتاهِ مبالغِ بورسی (همت/میلیارد) */
  function bourseMoney(v) {
    var a = Math.abs(+v);
    if (!isFinite(a)) return '—';
    if (a >= 1e12) return U.fa((a / 1e12).toFixed(2)) + ' همت';
    if (a >= 1e9) return U.fa(Math.round(a / 1e9)) + ' میلیارد';
    if (a >= 1e6) return U.fa(Math.round(a / 1e6)) + ' میلیون';
    return U.fmt(Math.round(a));
  }
  function signedMoney(v) { return (+v < 0 ? '−' : '+') + bourseMoney(v); }

  /**
   * روندِ خالصِ پولِ حقیقی در طولِ جلسه.
   * series: [[ts, netToman], ...] — خروجیِ مستقیمِ انتشارهای سرور
   * خطِ صفر کشیده می‌شود چون معنای نمودار «عبور از ورود به خروج» است.
   */
  function moneyFlowChart(series, opts) {
    opts = opts || {};
    var pts = (series || []).filter(function (p) { return Array.isArray(p) && p.length >= 2 && isFinite(+p[0]) && isFinite(+p[1]); });
    if (pts.length < 2) return '<div class="lc-empty">برای رسمِ روند، دو برداشتِ معتبر در این جلسه لازم است</div>';
    var w = opts.w || 300, h = opts.h || 96;
    var vals = pts.map(function (p) { return +p[1]; }).concat([0]);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi = lo + Math.max(1, Math.abs(lo) * 0.1); }
    var pad = 6;
    function X(i) { return (pad + i / (pts.length - 1) * (w - pad * 2)).toFixed(1); }
    function Y(v) { return (pad + (hi - v) / (hi - lo) * (h - pad * 2)).toFixed(1); }
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(i) + ' ' + Y(+p[1]); }).join(' ');
    var last = +pts[pts.length - 1][1], first = +pts[0][1];
    var col = last > 0 ? '#3ECF8E' : last < 0 ? '#FF6B5E' : '#9A9284';
    var zeroY = Y(0);
    var area = '<path d="' + d + 'L' + X(pts.length - 1) + ' ' + zeroY + 'L' + X(0) + ' ' + zeroY + 'Z" fill="' + col + '" opacity="0.14"/>';
    var dots = pts.map(function (p, i) {
      return '<circle cx="' + X(i) + '" cy="' + Y(+p[1]) + '" r="' + (i === pts.length - 1 ? 3 : 1.8) + '" fill="' + col + '" opacity="' + (i === pts.length - 1 ? 1 : 0.65) + '"/>';
    }).join('');
    var head = '<text x="' + X(0) + '" y="' + (h - 1) + '" font-size="8" fill="#7E97A3" text-anchor="start">اول جلسه</text>';
    var tail = '<text x="' + X(pts.length - 1) + '" y="' + (h - 1) + '" font-size="8" fill="#7E97A3" text-anchor="end">اکنون</text>';
    var delta = last - first;
    var arrow = Math.abs(delta) < 1e9 ? 'ثبات' : (delta > 0 ? '▲ ورودیِ رو‌به‌رشد' : '▼ خروجیِ رو‌به‌رشد');
    return '<div class="mf-chart">' +
      '<svg class="mf-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="روند خالص پول حقیقی در جلسه">' +
      '<line x1="0" y1="' + zeroY + '" x2="' + w + '" y2="' + zeroY + '" stroke="#3A332A" stroke-width="1" stroke-dasharray="4 3"/>' +
      area +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + head + tail + '</svg>' +
      '<div class="mf-foot"><b style="color:' + col + '">' + signedMoney(last) + '</b>' +
      '<span>' + arrow + '</span><span class="mf-delta">' + (delta >= 0 ? '+' : '−') + bourseMoney(delta) + ' از اولِ جلسه</span></div>' +
      '</div>';
  }

  /**
   * منحنیِ درون‌جلسه‌ایِ جریانِ پول (از نمودارِ خودِ منبع).
   * تفاوت با moneyFlowChart: آن یکی نقاطِ «زمان‌دارِ» انتشارهای ماست؛
   * این یکی منحنیِ پیوسته‌یِ خودِ تابلوست (بدون برچسبِ ساعت — محور فقط ترتیب است،
   * برای همین ادعا نمی‌کنیم هر نقطه چه ساعتی بوده).
   */
  function flowCurveChart(curve, opts) {
    opts = opts || {};
    var pts = (curve && Array.isArray(curve.v)) ? curve.v.slice() : null;
    if (!pts || pts.length < 5) return '<div class="lc-empty">منحنیِ درون‌جلسه‌ای در دسترس نیست</div>';
    var w = opts.w || 300, h = opts.h || 104, pad = 6;
    var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts);
    if (hi === lo) hi = lo + 1;
    // کمی حاشیه تا خط روی لبه نچسبد
    var span = hi - lo; lo -= span * 0.08; hi += span * 0.08;
    function X(i) { return (pad + i / (pts.length - 1) * (w - pad * 2)).toFixed(1); }
    function Y(v) { return (pad + (hi - v) / (hi - lo) * (h - pad * 2)).toFixed(1); }
    var d = pts.map(function (v, i) { return (i ? 'L' : 'M') + X(i) + ' ' + Y(v); }).join(' ');
    var last = pts[pts.length - 1], first = pts[0];
    var col = last > 0 ? '#3ECF8E' : last < 0 ? '#FF6B5E' : '#9A9284';
    var zeroY = Y(0);
    var area = '<path d="' + d + 'L' + X(pts.length - 1) + ' ' + zeroY + 'L' + X(0) + ' ' + zeroY + 'Z" fill="' + col + '" opacity="0.12"/>';
    // نقطه‌یِ کمینه و بیشینه را نشان بده (دو سرِ ماجرا)
    var iMin = pts.indexOf(Math.min.apply(null, pts)), iMax = pts.indexOf(Math.max.apply(null, pts));
    var marks = '<circle cx="' + X(iMin) + '" cy="' + Y(pts[iMin]) + '" r="2" fill="#7E97A3" opacity=".8"/>' +
      '<circle cx="' + X(iMax) + '" cy="' + Y(pts[iMax]) + '" r="2" fill="#7E97A3" opacity=".8"/>';
    var delta = last - first;
    var dir = Math.abs(delta) < 1 ? 'ثبات' : (delta > 0 ? '▲ ورودی در جریان' : '▼ خروجی در جریان');
    return '<div class="mf-chart">' +
      '<svg class="mf-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="منحنی ورود و خروج پول حقیقی در جلسه">' +
      '<line x1="0" y1="' + zeroY + '" x2="' + w + '" y2="' + zeroY + '" stroke="#3A332A" stroke-width="1" stroke-dasharray="4 3"/>' +
      area +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      marks +
      '<circle cx="' + X(pts.length - 1) + '" cy="' + Y(last) + '" r="3" fill="' + col + '"/>' +
      '<text x="' + X(0) + '" y="' + (h - 1) + '" font-size="8" fill="#7E97A3" text-anchor="start">شروع جلسه</text>' +
      '<text x="' + X(pts.length - 1) + '" y="' + (h - 1) + '" font-size="8" fill="#7E97A3" text-anchor="end">اکنون</text>' +
      '</svg>' +
      '<div class="mf-foot"><b style="color:' + col + '">' + signedMoney(last * 1e9) + '</b>' +
      '<span>' + dir + '</span>' +
      '<span class="mf-delta">' + U.fa(pts.length) + ' نقطه · تغییر از شروع: ' +
      (delta >= 0 ? '+' : '−') + bourseMoney(Math.abs(delta) * 1e9) + '</span></div>' +
      '<div class="mf-note">منحنیِ پیوسته از نمودارِ بورس‌تریدر (ترتیبی، بدون برچسبِ ساعت)؛ ' +
      'اعدادِ بالا به میلیارد تومان در مقیاسِ منبع است.</div>' +
      '</div>';
  }

  /** پولِ ایستاده پشتِ صف‌های خرید و فروش (و روندش اگر سری داریم) */
  function queueMoneyChart(queue, trend) {
    if (!queue || (queue.buyToman == null && queue.sellToman == null && queue.buy == null)) {
      return '<div class="lc-empty">ارزشِ صف‌ها در دسترس نیست</div>';
    }
    var vb = queue.buyToman, vs = queue.sellToman;
    var max = Math.max.apply(null, [vb || 0, vs || 0, 1]);
    function row(label, val, dir) {
      if (val == null) return '';
      var pct = U.clamp(val / max * 100, 3, 100);
      return '<div class="qm-row ' + dir + '"><span class="qm-label">' + label + '</span>' +
        '<div class="qm-track"><i class="qm-fill ' + dir + '" style="width:' + pct.toFixed(1) + '%"></i></div>' +
        '<b class="qm-val">' + bourseMoney(val) + '</b></div>';
    }
    var net = queue.netToman;
    var netTxt = (net == null) ? '' :
      '<div class="qm-net ' + (net >= 0 ? 'in' : 'out') + '">خالصِ پولِ پشتِ صف: <b>' + signedMoney(net) + '</b>' +
      (queue.buyShare != null ? ' <span>· سهمِ صفِ خرید ' + U.fa(Math.round(queue.buyShare * 100)) + '٪</span>' : '') + '</div>';
    var tr = '';
    if (trend && trend.points >= 2) {
      tr = '<div class="qm-trend ' + (trend.rising ? 'in' : 'out') + '">روندِ امروز: ' +
        (trend.rising ? '▲ ' : '▼ ') + signedMoney(trend.delta) + ' در ' + U.fa(trend.spanMin) + ' دقیقهٔ اخیر' +
        ' <span>(' + U.fa(trend.points) + ' برداشت)</span></div>';
    }
    return '<div class="qm-chart">' + row('صف خرید', vb, 'in') + row('صف فروش', vs, 'out') +
      (queue.buy != null || queue.sell != null ? '<div class="qm-count">تعداد: ' + U.fa(queue.buy || 0) + ' صف خرید / ' + U.fa(queue.sell || 0) + ' صف فروش</div>' : '') +
      netTxt + tr + '</div>';
  }

  /** خالصِ جریانِ چند جلسه‌ی اخیر (مثبت = ورود، منفی = خروج) */
  function flowSessionsChart(sessions) {
    if (!sessions || !sessions.rows || !sessions.rows.length) {
      return '<div class="lc-empty">تاریخچه‌ی جریانِ پول هنوز انباشته نشده</div>';
    }
    var rows = sessions.rows;
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.netToman); }).concat([1e9]));
    var bars = rows.map(function (r) {
      var pct = U.clamp(Math.abs(r.netToman) / max * 100, 6, 100);
      var inFlow = r.netToman >= 0;
      return '<div class="fs-row"><span class="fs-day">' + U.esc(r.day.slice(5)) + '</span>' +
        '<div class="fs-track"><i class="fs-fill ' + (inFlow ? 'in' : 'out') + '" style="width:' + pct.toFixed(1) + '%"></i></div>' +
        '<b class="fs-val ' + (inFlow ? 'in' : 'out') + '">' + signedMoney(r.netToman) + '</b></div>';
    }).join('');
    var streak = '';
    if (sessions.streak === 'out') streak = '<div class="fs-note out">خروجِ پیاپی در ' + U.fa(sessions.n) + ' جلسه — رفتار، نه اتفاق.</div>';
    else if (sessions.streak === 'in') streak = '<div class="fs-note in">ورودِ پیاپی در ' + U.fa(sessions.n) + ' جلسه.</div>';
    return '<div class="fs-chart">' + bars + streak + '</div>';
  }

  GS.charts = { spark: spark, assetSpark: assetSpark, rangeBar: rangeBar, dirColor: dirColor, lineChart: lineChart, compareChart: compareChart, radarChart: radarChart, breadthDonut: breadthDonut, fundsFlowChart: fundsFlowChart, perCapitaGauge: perCapitaGauge, queueChart: queueChart, moneyFlowChart: moneyFlowChart, flowCurveChart: flowCurveChart, queueMoneyChart: queueMoneyChart, flowSessionsChart: flowSessionsChart, bourseMoney: bourseMoney, signedMoney: signedMoney };
})();
