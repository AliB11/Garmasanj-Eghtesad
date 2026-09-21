/* ============================================================
   گرماسنج — features.js (نسل ۳)
   نبض لحظه‌ای، حکم امروز، زنجیره، هیت‌مپ، پول داغ، شبیه‌ساز،
   ترکیب‌ساز، رادار و سلامت داده — همه روی کوت‌های واقعی.
   ============================================================ */
(function () {
  'use strict';
  window.GS = window.GS || {};
  var U = GS.utils;
  function D() { return GS.data; }
  function CFG() { return GS.config; }
  function INFL() { return GS.config.INFLATION.value; }

  /** نبض لحظه‌ای یک دارایی از تغییر امروز + شیب نشست (‎-40..+60) */
  function heatOf(sym) {
    var q = D().quote(sym);
    if (!q || !(q.p > 0)) return 0;
    var day = (q.chgPct != null && isFinite(q.chgPct)) ? q.chgPct : 0;
    var sl = D().slope(sym);
    sl = isFinite(sl) ? sl : 0;
    return U.clamp(day * 8 + sl * 5, -40, 60);
  }

  /* ================= رد پول داغ ================= */
  function hotScores() {
    var H = CFG().HOTMONEY;
    return CFG().ASSETS
      .filter(function (a) {
        var q = D().quote(a.sym);
        return q && q.p > 0 && !a.derived;
      })
      .map(function (a) {
        var q = D().quote(a.sym), sl = D().slope(a.sym);
        var day = (q.chgPct != null && isFinite(q.chgPct)) ? q.chgPct : 0;
        sl = isFinite(sl) ? sl : 0;
        var sDay = U.clamp(day / H.dayScale, -1, 1);
        var sSlope = U.clamp(sl / H.slopeScale, -1, 1);
        var score = (H.wDay * sDay + H.wSlope * sSlope) * 100;
        return { a: a, q: q, slope: sl, score: score };
      })
      .sort(function (x, y) { return y.score - x.score; });
  }

  function regimeOf() {
    var m = D().mood();
    if (!m.n) return { key: 'neutral', label: 'در انتظار داده', desc: 'هنوز نبضی ثبت نشده.' };
    if (m.quiet) {
      var ses = U.marketSession();
      return { key: 'neutral', label: 'رژیم کم‌تحرک', desc: (ses.open ? 'اکثر دارایی‌ها امروز بی‌تغییرند؛ ' : 'بازار تهران بسته است؛ ') + 'فقط متحرک‌ها (عمدتاً رمزارز) رتبه‌بندی معناداری دارند.' };
    }
    if (m.score >= 20 && m.breadth >= 60) return { key: 'on', label: 'رژیم ریسک‌پذیر', desc: 'اکثر دارایی‌های متحرک مثبت‌اند؛ پول داغ در چرخش است.' };
    if (m.score <= -20 && m.breadth < 40) return { key: 'off', label: 'رژیم ریسک‌گریز', desc: 'پول به پناهگاه‌ها می‌خزد؛ حفظ قدرت خرید اولویت است.' };
    return { key: 'neutral', label: 'رژیم خنثی / چرخشی', desc: 'بازار تصمیم نگرفته؛ پول بین پناهگاه و ریسک در نوسان است.' };
  }

  function renderHotmoney() {
    var host = U.$('#flowBars');
    if (!host) return;
    var rows = hotScores().slice(0, 10);
    var reg = regimeOf();
    var badge = U.$('#regimeBadge');
    if (badge) {
      badge.className = 'regime ' + reg.key;
      badge.innerHTML = '<b>' + reg.label + '</b><span>' + reg.desc + '</span>';
    }
    var bm = U.$('#breadthMeter');
    if (bm) {
      var m = D().mood();
      bm.innerHTML = '<div class="bm-top"><span>پهنای بازار</span><b>' + U.fa(m.ups) + '٪ مثبت · ' + U.fa(m.downs || 0) + '٪ منفی' + (m.flat ? ' · ' + U.fa(m.flat) + '٪ بی‌تغییر' : '') + '</b></div>' +
        '<div class="bm-track bm-tri"><i class="bm-up" style="width:' + U.clamp(m.ups, 0, 100) + '%"></i><i class="bm-down" style="width:' + U.clamp(m.downs || 0, 0, 100) + '%"></i></div>';
    }
    if (!rows.length) {
      host.innerHTML = '<div class="radar-empty">هنوز داده‌ی زنده‌ای برای ردیابی جریان پول نرسیده.<br>چند ثانیه صبر کن…</div>';
      return;
    }
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.score); }).concat([1]));
    host.innerHTML = rows.map(function (r, i) {
      var s = r.score, hot = s > 12, cold = s < -12;
      var w = Math.max(4, Math.abs(s) / max * 100);
      var tag = (i === 0 && s > 0) ? 'ورود پول داغ' : (i === rows.length - 1 && s < 0) ? 'خروج / سرد' : (hot ? 'گرم' : cold ? 'سرد' : Math.abs(s) < 1 ? 'بی‌تغییر' : 'خنثی');
      return '<div class="flow-row">' +
        '<div class="fl-name"><b>' + U.esc(r.a.short) + '</b><small>امروز <span dir="ltr">' + U.pct(r.q.chgPct || 0) + '</span>' +
        ' · شیب نشست <span dir="ltr">' + U.pct(r.slope, 1) + '/h</span></small></div>' +
        '<div class="fl-track"><i class="fl-fill ' + (hot ? 'hot' : cold ? 'cold' : '') + '" style="width:' + w + '%"></i></div>' +
        '<div class="fl-val"><b dir="ltr">' + (s >= 0 ? '+' : '−') + U.fa(Math.abs(s).toFixed(0)) + '</b><small>' + tag + '</small></div>' +
        '</div>';
    }).join('');
    var note = U.$('#flowNote');
    if (note && rows.length >= 2) {
      var top = rows[0], low = rows[rows.length - 1];
      if (top.score <= 1 && low.score >= -1) note.innerHTML = 'الان جریان معناداری دیده نمی‌شود؛ اکثر دارایی‌ها بی‌تغییرند. رتبه‌بندی با اولین حرکت واقعی بازسازی می‌شود.';
      else if (low.score >= -1) note.innerHTML = 'الان پول داغ به سمت <b>' + U.esc(top.a.short) + '</b> متمایل است؛ خروج معناداری از هیچ دارایی‌ای ثبت نشده. این رتبه‌بندی هر چرخه با داده‌ی زنده بازسازی می‌شود.';
      else note.innerHTML = 'الان پول داغ به سمت <b>' + U.esc(top.a.short) + '</b> متمایل است و از <b>' + U.esc(low.a.short) +
        '</b> فاصله می‌گیرد. این رتبه‌بندی هر چرخه با داده‌ی زنده بازسازی می‌شود.';
    }
  }

  /* ================= شبیه‌ساز ================= */
  var ASSETS = [
    { id: 'cash', name: 'زیر تشک', sub: 'پول نقد', r: 0 },
    { id: 'dep', name: 'سپرده بانکی', sub: 'سود مرکب', r: 27 },
    { id: 'fund', name: 'صندوق درآمد ثابت', sub: 'بازده مرکب', r: 28.5 },
    { id: 'USD', name: 'دلار', sub: 'بازار آزاد', r: 60 },
    { id: 'EUR', name: 'یورو', sub: 'بازار آزاد', r: 58 },
    { id: 'G18', name: 'طلای ۱۸', sub: 'هر گرم', r: 70 },
    { id: 'EMAMI', name: 'سکه امامی', sub: 'طرح جدید', r: 72 },
    { id: 'BTC_TM', name: 'بیت‌کوین', sub: 'معادل تومانی', r: 120 }
  ];
  var simState = { P: 100000000, t: 3, inf: 42, liveSync: true };

  function simRates() {
    if (!simState.liveSync) return ASSETS;
    return ASSETS.map(function (a) {
      var q = D().quote(a.id);
      if (!q || !(q.p > 0)) return a;
      var nominal = simState.inf + heatOf(a.id) * 0.5;
      return { id: a.id, name: a.name, sub: a.sub + ' · زنده', r: +nominal.toFixed(1) };
    });
  }

  function barHTML(a) {
    return '<div class="bar-row" data-id="' + a.id + '">' +
      '<div class="bar-name"><b>' + U.esc(a.name) + '</b><small>' + U.esc(a.sub) + ' • <span dir="ltr">' + U.fa(a.r) + '٪</span></small></div>' +
      '<div class="bar-track"><i class="bar-fill"></i><i class="bar-guide"></i></div>' +
      '<div class="bar-val"><b class="js-v">۰</b><small class="js-r"></small></div></div>';
  }

  function renderSim() {
    var barsEl = U.$('#simBars');
    if (!barsEl) return;
    var assets = simRates();
    var res = assets.map(function (a) {
      var g = Math.pow(1 + a.r / 100, simState.t) / Math.pow(1 + simState.inf / 100, simState.t);
      return { id: a.id, name: a.name, sub: a.sub, r: a.r, real: simState.P * g, ratio: g };
    }).sort(function (x, y) { return y.real - x.real; });
    var max = (res[0] && res[0].real) || 1;
    var built = barsEl.children.length === res.length;
    if (!built) barsEl.innerHTML = res.map(barHTML).join('');
    res.forEach(function (a, idx) {
      var el = barsEl.querySelector('.bar-row[data-id="' + a.id + '"]');
      if (!el) return;
      // ترتیب رتبه‌ای و برچسب نرخ همیشه با وضعیت فعلی (همگام/پایه، تورم، افق) هم‌خوان می‌ماند
      if (barsEl.children[idx] !== el) barsEl.insertBefore(el, barsEl.children[idx] || null);
      var lbl = el.querySelector('.bar-name small');
      if (lbl) {
        var lblTxt = U.esc(a.sub) + ' • <span dir="ltr">' + U.fa(a.r) + '٪</span>';
        if (lbl.innerHTML !== lblTxt) lbl.innerHTML = lblTxt;
      }
      var fill = el.querySelector('.bar-fill'), g = el.querySelector('.bar-guide');
      fill.style.width = Math.max(0, a.real / max * 100) + '%';
      fill.style.background = U.tempColor(a.r - simState.inf);
      g.style.right = U.clamp(simState.P / max * 100, 0, 99) + '%';
      U.animateNum(el.querySelector('.js-v'), a.real, U.fmtMoney);
      el.querySelector('.js-r').innerHTML = '<span dir="ltr">' + U.fa(Math.round(a.ratio * 100)) + '٪</span> سرمایه‌ی اولیه';
    });
    var best = res[0], worst = res[res.length - 1];
    U.$('#simReport').innerHTML =
      '<div class="rp"><span class="rp-k" style="color:' + U.tempColor(best.r - simState.inf) + '">گرم‌ترین سرنوشت</span><b>' + U.esc(best.name) + ' — ' + U.fmtMoney(best.real) + ' تومان</b><small>یعنی ' + U.fa(best.ratio.toFixed(2)) + ' برابر قدرت خرید امروز</small></div>' +
      '<div class="rp"><span class="rp-k" style="color:' + U.tempColor(worst.r - simState.inf) + '">سردترین سرنوشت</span><b>' + U.esc(worst.name) + ' — ' + U.fmtMoney(worst.real) + ' تومان</b><small>فقط <span dir="ltr">' + U.fa(Math.round(worst.ratio * 100)) + '٪</span> سرمایه‌ی اولیه باقی می‌ماند</small></div>' +
      '<div class="rp"><span class="rp-k">شکاف گرمایی</span><b>' + U.fa((best.ratio / worst.ratio).toFixed(1)) + ' برابر تفاوت</b><small>بین انتخاب درست و اشتباه، فقط ' + U.fa(simState.t) + ' سال فاصله است</small></div>';
    U.$('#simTitleAmt').textContent = simState.P >= 1e6 ? U.fmtMoney(simState.P) : 'پولِ';
    U.$('#simTitleYears').textContent = U.fa(simState.t);
  }

  function initSim() {
    if (!U.$('#simBars')) return;
    simState.inf = INFL();
    var out = U.$('#simInflOut');
    if (out) out.textContent = U.fa(simState.inf) + '٪';
    var inflIn = U.$('#simInflation');
    if (inflIn) { inflIn.value = simState.inf; paintRange(inflIn); }
    renderSim();
    var amountIn = U.$('#simAmount');
    if (amountIn) amountIn.addEventListener('input', function () {
      var n = +U.toEn(amountIn.value);
      simState.P = n > 0 ? Math.min(n, 1e13) : 0;
      amountIn.value = n > 0 ? U.fmt(n) : '';
      U.$$('.chip[data-v]').forEach(function (ch) { ch.classList.toggle('on', +ch.dataset.v === simState.P); });
      renderSim();
    });
    U.$$('.chip[data-v]').forEach(function (ch) {
      ch.addEventListener('click', function () {
        simState.P = +ch.dataset.v;
        if (amountIn) amountIn.value = U.fmt(simState.P);
        U.$$('.chip[data-v]').forEach(function (c) { c.classList.toggle('on', c === ch); });
        renderSim();
      });
    });
    var yearsIn = U.$('#simYears');
    if (yearsIn) {
      paintRange(yearsIn);
      yearsIn.addEventListener('input', function () {
        simState.t = +yearsIn.value;
        U.$('#simYearsOut').textContent = U.fa(simState.t) + ' سال';
        paintRange(yearsIn); renderSim();
      });
    }
    if (inflIn) inflIn.addEventListener('input', function () {
      simState.inf = +inflIn.value;
      U.$('#simInflOut').textContent = U.fa(simState.inf) + '٪';
      paintRange(inflIn); renderSim();
    });
    var sync = U.$('#simSync');
    if (sync) sync.addEventListener('click', function () {
      simState.liveSync = !simState.liveSync;
      sync.classList.toggle('on', simState.liveSync);
      sync.setAttribute('aria-pressed', simState.liveSync ? 'true' : 'false');
      sync.innerHTML = simState.liveSync ? 'همگام با نبض زنده: روشن' : 'همگام با نبض زنده: خاموش';
      renderSim();
    });
  }

  function paintRange(r) {
    var p = (r.value - r.min) / (r.max - r.min) * 100;
    r.style.background = 'linear-gradient(to left, var(--gold) 0 ' + p + '%, var(--track) ' + p + '% 100%)';
  }

  /* ================= ترکیب‌ساز هوشمند ================= */
  var P_ASSETS = [
    { id: 'cash', sym: null, base: -18, name: 'نقد', role: 'پل هزینه‌های پیش‌رو', color: '#8B949C' },
    { id: 'fixed', sym: null, base: -4, name: 'صندوق درآمد ثابت', role: 'ترمز امن پرتفوی', color: '#4E8F8B' },
    { id: 'gold', sym: 'G18', base: 8, name: 'طلای ۱۸ / صندوق طلا', role: 'هسته‌ی ضدتورمی', color: '#E3A93C' },
    { id: 'coin', sym: 'EMAMI', base: 10, name: 'سکه (حجم کم)', role: 'پناهگاه داغ با حباب', color: '#D97E32' },
    { id: 'eur', sym: 'EUR', base: 2, name: 'یورو', role: 'تنوع ارزی', color: '#7E97A3' },
    { id: 'usd', sym: 'USD', base: 4, name: 'دلار', role: 'بیمه‌ی ارزی', color: '#6E9B6B' },
    { id: 'btc', sym: 'BTC_TM', base: 14, name: 'رمزارز', role: 'بیشترین حرارت، بیشترین نوسان', color: '#F2662F' }
  ];
  var segMap = {};
  var DONUT_C = 2 * Math.PI * 74;

  function pHeat(p) {
    if (!p.sym) return p.base;
    var q = D().quote(p.sym);
    if (!q || !(q.p > 0)) return p.base;
    return p.base * 0.5 + heatOf(p.sym) * 0.5;
  }

  function initDonut() {
    var svg = U.$('#mixDonut');
    if (!svg || svg.children.length) return;
    var NS = 'http://www.w3.org/2000/svg';
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', 'rotate(-90 100 100)');
    var base = document.createElementNS(NS, 'circle');
    base.setAttribute('cx', 100); base.setAttribute('cy', 100); base.setAttribute('r', 74);
    base.setAttribute('fill', 'none'); base.setAttribute('stroke', '#22282E'); base.setAttribute('stroke-width', 27);
    g.appendChild(base);
    P_ASSETS.forEach(function (a) {
      var cir = document.createElementNS(NS, 'circle');
      cir.setAttribute('cx', 100); cir.setAttribute('cy', 100); cir.setAttribute('r', 74);
      cir.setAttribute('fill', 'none'); cir.setAttribute('stroke', a.color); cir.setAttribute('stroke-width', 27);
      cir.setAttribute('class', 'seg-c');
      cir.style.strokeDasharray = '0 ' + DONUT_C;
      g.appendChild(cir); segMap[a.id] = cir;
    });
    svg.appendChild(g);
    U.$('#mixLegend').innerHTML = P_ASSETS.map(function (a) {
      return '<div class="lg-row" data-id="' + a.id + '">' +
        '<span class="lg-sw" style="background:' + a.color + '"></span>' +
        '<span class="lg-n"><b>' + U.esc(a.name) + '</b><small>' + U.esc(a.role) + '</small></span>' +
        '<span class="lg-p js-w">۰٪</span></div>';
    }).join('');
  }

  function profileVal(n) {
    var el = document.querySelector('input[name=' + n + ']:checked');
    return el ? +el.value : 2;
  }

  function computeWeights(rk, hz, lq) {
    var risky = (rk - 1) / 2, long = (hz - 1) / 2, liqNeed = (3 - lq) / 2;
    var w = {
      cash: 14 - risky * 5 - long * 4 + liqNeed * 11,
      fixed: 26 - risky * 10 - long * 8 + liqNeed * 9,
      gold: 30 + long * 3 - liqNeed * 4,
      coin: 8 - risky * 2,
      eur: 4,
      usd: 12 - long * 3,
      btc: 2 + risky * 14 + long * 7
    };
    // چرخش رژیمی از نبض زنده
    var m = D().mood();
    var tilt = U.clamp(m.score / 60, -1, 1);
    var riskBias = risky - 0.5;
    var k = tilt * (0.5 + Math.abs(riskBias));
    if (k > 0) {
      var hot = hotScores().slice(0, 2).map(function (r) { return r.a.sym; });
      var move = Math.min(10, 6 * k);
      w.cash = Math.max(2, w.cash - move * 0.5);
      w.fixed = Math.max(4, w.fixed - move * 0.5);
      hot.forEach(function (sym) {
        var key = sym === 'BTC_TM' || sym === 'BTC_USD' || sym === 'USDT' ? 'btc' :
          sym === 'EUR' ? 'eur' : sym === 'USD' ? 'usd' :
          (sym === 'G18' || sym === 'G24' || sym === 'MESGHAL' || sym === 'OUNCE_TM') ? 'gold' :
          (sym === 'EMAMI' || sym === 'BAHAR' || sym === 'NIM' || sym === 'ROB' || sym === 'GERAMI') ? 'coin' : null;
        if (key && w[key] != null) w[key] += move / hot.length;
      });
    } else if (k < 0) {
      var cold = Math.min(12, -7 * k);
      w.btc = Math.max(0, w.btc - cold * 0.5);
      w.coin = Math.max(2, w.coin - cold * 0.3);
      w.usd = Math.max(2, w.usd - cold * 0.2);
      w.fixed += cold * 0.55;
      w.gold += cold * 0.45;
    }
    Object.keys(w).forEach(function (key) { w[key] = U.clamp(w[key], 0, 45); });
    var s = Object.keys(w).reduce(function (a, b) { return a + w[b]; }, 0) || 1;
    Object.keys(w).forEach(function (key) { w[key] = w[key] / s * 100; });
    return { w: w, tilt: tilt };
  }

  function renderMix() {
    if (!U.$('#mixDonut')) return;
    initDonut();
    var rk = profileVal('rk'), hz = profileVal('hz'), lq = profileVal('lq');
    var out = computeWeights(rk, hz, lq), w = out.w;
    var acc = 0;
    P_ASSETS.forEach(function (a) {
      var len = DONUT_C * w[a.id] / 100;
      segMap[a.id].style.strokeDasharray = len + ' ' + (DONUT_C - len);
      segMap[a.id].style.strokeDashoffset = -acc;
      acc += len;
      var row = document.querySelector('.lg-row[data-id="' + a.id + '"]');
      if (row) {
        row.classList.toggle('off', w[a.id] < 1);
        U.animateNum(row.querySelector('.js-w'), w[a.id], function (v) { return U.fa(v.toFixed(1)) + '٪'; }, 500);
      }
    });
    var mixT = P_ASSETS.reduce(function (s, a) { return s + w[a.id] * pHeat(a); }, 0) / 100;
    var tEl = U.$('#mixTemp');
    tEl.textContent = (mixT >= 0 ? '+' : '−') + U.fa(Math.abs(mixT).toFixed(0)) + '°';
    tEl.style.color = U.tempColor(mixT);
    U.$('#mixName').textContent = ['محافظه‌کار', 'متعادل', 'جسور'][rk - 1] + ' • ' + ['کوتاه‌مدت', 'میان‌مدت', 'بلندمدت'][hz - 1];
    var m = D().mood(), diff = mixT - m.score / 4, vs = U.$('#mixVs');
    vs.textContent = 'نبض بازار ' + (m.score >= 0 ? '+' : '−') + U.fa(Math.abs(m.score).toFixed(0)) + ' (' + m.label + ')';
    vs.style.color = U.tempColor(mixT);
    vs.style.borderColor = U.tempRGBA(mixT, 0.4);
    void diff;
    var why = U.$('#mixWhy');
    if (why) {
      var hot = hotScores().slice(0, 2).map(function (r) { return r.a.short; }).join(' و ');
      var tiltTxt = out.tilt > 0.25 ? 'چون بازار داغ است، وزن موتورهای رشد بیشتر شد' :
        out.tilt < -0.25 ? 'چون بازار سرد است، وزن امن‌ها (طلا و درآمد ثابت) بیشتر شد' :
        'رژیم بازار خنثی است؛ ترکیب نزدیک به پروفایل پایه‌ی توست';
      why.innerHTML = 'چرا این ترکیب؟ ' + tiltTxt + (hot ? ' — الان پول داغ در <b>' + U.esc(hot) + '</b> می‌چرخد.' : '.');
    }
    var risk = U.$('#mixRisk');
    if (risk) {
      var riskScore = U.clamp((w.btc * 1 + w.coin * 0.6 + w.usd * 0.4 + w.eur * 0.3) / 45 * 10, 1, 10);
      risk.innerHTML = '<span>ریسک پرتفوی</span><b>' + U.fa(riskScore.toFixed(0)) + ' از ۱۰</b>' +
        '<div class="risk-track"><i style="width:' + (riskScore * 10) + '%"></i></div>';
    }
  }

  function initMix() {
    if (!U.$('#mixDonut')) return;
    U.$$('input[name=rk],input[name=hz],input[name=lq]').forEach(function (r) {
      r.addEventListener('change', renderMix);
    });
    renderMix();
  }

  /* ================= رادار قیمت ================= */
  var ALERTS = [];
  var LS_ALERTS = 'garmasanj_alerts_v6';
  var OLD_ID_MAP = { usd: 'USD', eur: 'EUR', usdt: 'USDT', coin: 'EMAMI', gold: 'G18', btc: 'BTC_TM', tse: null, fund: null };

  var LS_RPREF = 'garmasanj_radar_prefs_v1';
  var RPREF = { repeat: false, sound: false };
  var REARM_BAND = 0.003; // ۰٫۳٪ آن‌سوی هدف → دوباره مسلح
  function prefsLoad() {
    var p = U.store.get(LS_RPREF, null);
    if (p && typeof p === 'object') RPREF = { repeat: !!p.repeat, sound: !!p.sound };
    var r = U.$('#radarRepeat'), so = U.$('#radarSound');
    if (r) r.checked = RPREF.repeat;
    if (so) so.checked = RPREF.sound;
  }
  function prefsSave() { U.store.set(LS_RPREF, RPREF); }

  function alertsLoad() {
    ALERTS.length = 0;
    var a = U.store.get(LS_ALERTS, []);
    if (Array.isArray(a)) a.forEach(function (x) {
      if (!x || !(x.target > 0)) return;
      var sym = x.s || OLD_ID_MAP[x.m];
      if (!sym || !D().asset(sym)) return;
      ALERTS.push({ s: sym, target: x.target, dir: x.dir || null, done: !!x.done, at: x.at || 0,
        repeat: !!x.repeat, armed: x.armed !== false, hits: x.hits || 0, lastHit: x.lastHit || 0 });
    });
  }
  function alertsSave() { U.store.set(LS_ALERTS, ALERTS); }

  /* صدا (WebAudio) — فقط با اجازه‌ی صریح کاربر؛ کانتکست در یک ژست کاربر ساخته می‌شود */
  var audioCtx = null;
  function ensureAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume().catch(function () {});
      return audioCtx;
    } catch (e) { return null; }
  }
  function beep() {
    var ctx = ensureAudio();
    if (!ctx) return false;
    try {
      [[880, 0, 0.12], [1175, 0.16, 0.18]].forEach(function (n) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, ctx.currentTime + n[1]);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n[1] + n[2]);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + n[1]); o.stop(ctx.currentTime + n[1] + n[2] + 0.02);
      });
      return true;
    } catch (e) { return false; }
  }
  function buzz() {
    try { if (navigator.vibrate) return !!navigator.vibrate([180, 90, 180]); } catch (e) {}
    return false;
  }
  /** اعلام فعال‌شدن رادار: توست + اعلان مرورگر + (اختیاری) صدا و لرزش */
  function announceHit(a, al) {
    GS.ui.toast('ok', 'رادار فعال شد', 'قیمت ' + a.fa + ' از ' + U.fmt(al.target) + ' گذشت — وقت تصمیمه.' + (al.repeat ? ' (تکرارشونده — با برگشت قیمت دوباره مسلح می‌شود)' : ''));
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('گرماسنج — رادار فعال شد', { body: a.fa + ' از ' + U.fmt(al.target) + ' گذشت.', tag: 'radar-' + al.s + '-' + al.target });
      }
    } catch (e) {}
    if (RPREF.sound) { beep(); buzz(); }
  }

  function initRadar() {
    var sel = U.$('#radarMarket');
    if (!sel) return;
    alertsLoad();
    sel.innerHTML = CFG().ASSETS.filter(function (a) { return !a.derived; })
      .map(function (a) { return '<option value="' + a.sym + '">' + U.esc(a.fa) + ' (' + U.esc(a.unit) + ')</option>'; }).join('');
    U.$$('.quick .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = D().quote(sel.value);
        if (q && q.p) U.$('#radarTarget').value = U.fmt(Math.round(q.p * (1 + (+b.dataset.rel))));
      });
    });
    prefsLoad();
    var rp = U.$('#radarRepeat'), so = U.$('#radarSound');
    if (rp) rp.addEventListener('change', function () { RPREF.repeat = rp.checked; prefsSave(); });
    if (so) so.addEventListener('change', function () {
      RPREF.sound = so.checked; prefsSave();
      if (so.checked) { // ژست کاربر: کانتکست صدا همین‌جا باز می‌شود و یک نمونه پخش می‌کنیم
        var ok = beep(); buzz();
        GS.ui.toast('info', 'صدا و لرزش روشن شد', ok ? 'همین صدا هنگام فعال‌شدن رادار پخش می‌شود.' : 'مرورگر اجازه‌ی پخش صدا نداد؛ لرزش (در موبایل) فعال است.');
      }
    });
    U.$('#radarAdd').addEventListener('click', function () {
      var a = D().asset(sel.value), q = D().quote(sel.value);
      if (!a) { GS.ui.toast('warn', 'دارایی نامعتبر', 'یک دارایی از فهرست انتخاب کن.'); return; }
      var t = +U.toEn(U.$('#radarTarget').value);
      if (!(t > 0)) { GS.ui.toast('warn', 'هدف نامعتبر', 'قیمت هدف را یک عدد درست وارد کن.'); return; }
      if (q && q.p > 0 && Math.abs(t - q.p) / q.p < 0.0005) { GS.ui.toast('warn', 'هدف برابر قیمت فعلی است', 'هدفی کمی بالاتر یا پایین‌تر از قیمت الان بگذار.'); return; }
      var dup = ALERTS.some(function (x) { return !x.done && x.s === a.sym && x.target === Math.round(t); });
      if (dup) { GS.ui.toast('info', 'رادار تکراری', 'همین هدف قبلاً برای «' + a.fa + '» ثبت شده.'); return; }
      // اگر هنوز قیمتی نداریم، جهت را در اولین داده تعیین می‌کنیم (نه کورکورانه «پایین»)
      var dir = (q && q.p > 0) ? (t > q.p ? 'up' : 'down') : null;
      ALERTS.push({ s: a.sym, target: Math.round(t), dir: dir, done: false, at: Date.now(), repeat: RPREF.repeat, armed: true, hits: 0, lastHit: 0 });
      U.$('#radarTarget').value = '';
      alertsSave(); renderRadars();
      askNotify(); // اجازه‌ی اعلان فقط وقتی کاربر واقعاً رادار می‌خواهد (نه با اولین کلیک روی صفحه)
      if (RPREF.sound) ensureAudio(); // ژست کاربر → کانتکست صدا برای بعد آماده می‌شود
      GS.ui.toast('ok', 'رادار ثبت شد', '«' + a.fa + '» زیر پایش است — هدف: ' + U.fmt(t) + ' ' + a.unit + (RPREF.repeat ? ' (تکرارشونده)' : '') + '.');
    });
    U.$('#radarItems').addEventListener('click', function (e) {
      var x = e.target.closest('.ri-x');
      if (!x) return;
      var al = ALERTS[+x.dataset.i];
      var name = al ? (D().asset(al.s) || {}).fa : '';
      ALERTS.splice(+x.dataset.i, 1);
      alertsSave(); renderRadars();
      GS.ui.toast('info', 'رادار حذف شد', 'پایش «' + name + '» متوقف شد.');
    });
    renderRadars();
  }

  function renderRadars() {
    var items = U.$('#radarItems'), empty = U.$('#radarEmpty');
    if (!items) return;
    empty.style.display = ALERTS.length ? 'none' : 'block';
    items.innerHTML = ALERTS.map(function (al, i) {
      var a = D().asset(al.s), q = a ? D().quote(al.s) : null;
      if (!a) return '';
      var gap = (q && q.p) ? (al.target - q.p) / q.p * 100 : null;
      var dirTxt = al.dir === 'up' ? '↑ صعود به' : al.dir === 'down' ? '↓ نزول به' : 'هدف:';
      var waiting = al.repeat && !al.armed && !al.done;
      var state = al.done ? '<svg class="ic s14"><use href="#i-check"/></svg> فعال شد' :
        waiting ? '<i class="w-dot"></i> منتظر برگشت قیمت' : '<i class="w-dot"></i> در حال پایش';
      var detail = al.done ? 'عبور از هدف رخ داد' + (al.lastHit ? ' (' + U.relLabel(al.lastHit) + ')' : '') :
        waiting ? 'فعال شد؛ وقتی قیمت ' + U.fa((REARM_BAND * 100).toFixed(1)) + '٪ آن‌سوی هدف برگردد دوباره مسلح می‌شود' :
        (gap != null ? 'فاصله تا هدف: ' + U.fa(Math.abs(gap).toFixed(2)) + '٪' : 'منتظر اولین داده');
      var tags = (al.repeat ? '<em class="ri-tag">تکرارشونده' + (al.hits ? ' · ' + U.fa(al.hits) + ' بار' : '') + '</em>' : '');
      return '<div class="r-item ' + (al.done ? 'hit' : '') + (waiting ? ' wait' : '') + '">' +
        '<svg class="ic s18 ri-ic"><use href="#i-bell"/></svg>' +
        '<div class="ri-mid"><b>' + U.esc(a.fa) + tags + '</b><small>' + dirTxt + ' <span dir="ltr">' + U.fmt(al.target) + '</span> — ' + detail + '</small></div>' +
        '<span class="ri-state ' + (al.done ? 'hit' : '') + '">' + state + '</span>' +
        '<button class="ri-x" data-i="' + i + '" aria-label="حذف رادار"><svg class="ic s14"><use href="#i-x"/></svg></button></div>';
    }).join('');
  }

  function checkRadars() {
    var changed = false;
    ALERTS.forEach(function (al) {
      if (al.done) return;
      var a = D().asset(al.s), q = a ? D().quote(al.s) : null;
      if (!q || !(q.p > 0)) return;
      if (!al.dir) { al.dir = al.target > q.p ? 'up' : 'down'; changed = true; return; } // جهت با اولین قیمت واقعی
      if (al.repeat && al.armed === false) {
        // بازآرم: قیمت باید ۰٫۳٪ به آن‌سوی هدف برگردد (هیسترزیس؛ جلوی پینگ‌پنگ را می‌گیرد)
        var back = al.dir === 'up' ? q.p <= al.target * (1 - REARM_BAND) : q.p >= al.target * (1 + REARM_BAND);
        if (back) { al.armed = true; changed = true; }
        return;
      }
      var hit = al.dir === 'up' ? q.p >= al.target : q.p <= al.target;
      if (hit) {
        changed = true;
        al.hits = (al.hits || 0) + 1; al.lastHit = Date.now();
        if (al.repeat) al.armed = false; else al.done = true;
        announceHit(a, al);
      }
    });
    if (changed) { alertsSave(); renderRadars(); }
    else if (ALERTS.length) renderRadars();
  }

  function askNotify() {
    try {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(function () {});
    } catch (e) {}
  }

  /* ================= سلامت داده ================= */
  var SRC_LABEL = {
    live: 'انتشار زنده',
    tgju: 'TGJU', nobitex: 'نوبیتکس', wallex: 'والکس', bitpin: 'بیت‌پین',
    coingecko: 'CoinGecko', kraken: 'Kraken', binance: 'Binance Vision', coinbase: 'Coinbase',
    frankfurter: 'Frankfurter', erapi: 'ExchangeRate-API', navasan: 'ناواسان', snapshot: 'اسنپ‌شات',
    tse: 'شاخص بورس', tsetmc: 'جریان پول بورس', btrader: 'بورس‌تریدر', tbl: 'تابلوخوانی'
  };

  function renderHealth() {
    var host = U.$('#healthTable');
    if (!host) return;
    var rows = CFG().SOURCES.map(function (s) {
      var st = D().src[s.id] || {};
      var badge = st.ok == null ? '<span class="h-badge wait">در انتظار</span>' :
        st.ok ? '<span class="h-badge ok">سالم</span>' : '<span class="h-badge bad">بی‌پاسخ</span>';
      var ago = st.at ? U.relLabel(st.at) : '—';
      var ms = st.ms != null ? U.fa(st.ms) + 'ms' : '—';
      return '<div class="h-row">' + badge +
        '<span class="h-n"><b>' + U.esc(SRC_LABEL[s.id] || s.name) + '</b><small>' + U.esc(s.scope) + '</small></span>' +
        '<span class="h-note">' + U.esc(st.note || '') + '</span>' +
        '<span class="h-ms" dir="ltr">' + ms + '</span>' +
        '<span class="h-ago">' + ago + '</span></div>';
    }).join('');
    host.innerHTML = rows;
    var tail = U.$('#netTail');
    if (tail) {
      tail.innerHTML = D().netlog.slice(-10).reverse().map(function (x) {
        return '<div class="dg-net ' + (x.ok ? '' : 'dg-bad') + '">' + U.esc(x.note) + '</div>';
      }).join('') || '<p class="dg-empty">—</p>';
    }
    var note = U.$('#healthNote');
    if (note) {
      var oks = CFG().SOURCES.filter(function (s) { return D().src[s.id] && D().src[s.id].ok; }).length;
      note.textContent = 'الان ' + U.fa(oks) + ' از ' + U.fa(CFG().SOURCES.length) + ' منبع پاسخ می‌دهند. هر کوت فقط از مسیر راستی‌آزمایی‌شده می‌آید و منبع و تازگی‌اش زیر قیمت نوشته شده؛ اگر همه‌ی مسیرهای یک دارایی قطع شد، آخرین مقدار معتبر با برچسب «کش» می‌ماند — هرگز عدد ساختگی نمایش داده نمی‌شود.';
    }
  }

  /* ================= حکم امروز (موتور تصمیم) ================= */
  function verdict() {
    var m = D().mood(), dv = D().derived();
    var rows = hotScores();
    var total = CFG().ASSETS.length;
    var liveN = CFG().ASSETS.filter(function (a) { return D().quote(a.sym).live; }).length;
    var freshN = CFG().ASSETS.filter(function (a) {
      var q = D().quote(a.sym);
      return q.live && q.p > 0 && (Date.now() - q.ts < 3 * 60000);
    }).length;
    var coverage = total ? freshN / total : 0;
    var ses = U.marketSession();
    var score = 0, reasons = [], warns = [];
    var top = rows[0], low = rows[rows.length - 1];
    function f1(v) { return U.fa(Math.abs(v).toFixed(1)); }
    function sg(v) { return v >= 0 ? '+' : '−'; }
    // ۱) نبض بازار
    if (m.score >= 50) { score += 3; reasons.push('نبض بازار ' + sg(m.score) + f1(m.score) + ' — طوفانی و پرشتاب.'); }
    else if (m.score >= 20) { score += 2; reasons.push('نبض بازار ' + sg(m.score) + f1(m.score) + ' — داغ و همراه.'); }
    else if (m.score >= 5) { score += 1; reasons.push('نبض بازار ' + sg(m.score) + f1(m.score) + ' — مثبت ولی محتاط.'); }
    else if (m.score > -5) { reasons.push('نبض بازار آرام است — بازار تصمیم نگرفته.'); }
    else if (m.score > -20) { score -= 1; reasons.push('نبض بازار ' + sg(m.score) + f1(m.score) + ' — منفی و کم‌رمق.'); }
    else { score -= 3; reasons.push('نبض بازار ' + sg(m.score) + f1(m.score) + ' — سرد؛ حفظ سرمایه اولویت است.'); }
    // ۲) پهنا — فقط میان دارایی‌های متحرک؛ بازار بسته/بی‌تغییر جریمه نمی‌شود
    if (m.n && m.quiet) {
      reasons.push(U.fa(m.flat) + '٪ دارایی‌ها بی‌تغییرند' + (!ses.open ? ' — بازار تهران بسته است' : '') + '؛ پهنا فقط از ' + U.fa(Math.round(m.part * 100)) + '٪ متحرک (' + U.fa(m.breadth) + '٪ مثبت) خوانده شد.');
      if (m.breadth >= 70 && m.part >= 0.1) score += 1;
      else if (m.breadth <= 30 && m.part >= 0.1) score -= 1;
    }
    else if (m.breadth >= 70) { score += 2; reasons.push('پهنای بازار ' + U.fa(m.breadth) + '٪ — رشد فراگیر است، نه تک‌محصولی.'); }
    else if (m.breadth >= 50) { score += 1; reasons.push('پهنای بازار ' + U.fa(m.breadth) + '٪ — نیمی از متحرک‌ها مثبت‌اند.'); }
    else if (m.breadth >= 35) { score -= 1; reasons.push('پهنای بازار فقط ' + U.fa(m.breadth) + '٪ — رشد محدود به چند دارایی است.'); }
    else if (m.n) { score -= 2; reasons.push('پهنای بازار ' + U.fa(m.breadth) + '٪ — اکثر دارایی‌های متحرک منفی‌اند.'); }
    // ۳) پول داغ
    if (top && top.score > 20) { score += 1; reasons.push('پول داغ به «' + top.a.short + '» سرازیر شده (امتیاز ' + sg(top.score) + f1(top.score) + ').'); }
    if (low && low.score < -20) { reasons.push('«' + low.a.short + '» سردترین نقطه است — برای خرید عجله نکن.'); }
    // ۴) حباب سکه
    if (dv.bubble != null) {
      if (dv.bubble > 30) { score -= 2; warns.push('حباب سکه ' + f1(dv.bubble) + '٪ — خرید سکه در اوج هیجان است؛ مثقال کم‌ریسک‌تر است.'); }
      else if (dv.bubble > 22) { score -= 1; reasons.push('حباب سکه ' + f1(dv.bubble) + '٪ — سنگین؛ در خرید سکه پله‌ای عمل کن.'); }
      else if (dv.bubble < 8) { score += 1; reasons.push('حباب سکه سبک (' + f1(dv.bubble) + '٪) — ریسک حبابی پایین است.'); }
    }
    // ۵) پریمیوم تتر
    if (dv.usdtPrem != null) {
      if (dv.usdtPrem > 1.5) { score -= 1; warns.push('پریمیوم تتر ' + f1(dv.usdtPrem) + '٪ — عجله برای خروج از ریال؛ احتمال نوسان ارزی.'); }
      else if (dv.usdtPrem < -1) { reasons.push('تتر ' + f1(dv.usdtPrem) + '٪ زیر دلار — فشار فروش در بازار ارز.'); }
    }
    // ۶) انحراف طلا
    if (dv.goldPrem != null && Math.abs(dv.goldPrem) > 4) {
      warns.push('طلا ' + f1(dv.goldPrem) + '٪ ' + (dv.goldPrem > 0 ? 'بالاتر' : 'پایین‌تر') + ' از ارزش جهانی — ' + (dv.goldPrem > 0 ? 'گران‌فروشی داخلی.' : 'فرصت ارزشی در مثقال.'));
    }
    // ۷) شکاف بیت‌کوین صرافی‌ها
    if (dv.btcUsdGap != null && Math.abs(dv.btcUsdGap) > 2) {
      warns.push('نرخ دلاریِ ضمنی بیت‌کوین صرافی‌ها ' + f1(dv.btcUsdGap) + '٪ با دلار آزاد فاصله دارد — نشانه‌ی هیجان یا اختلال در یک سمت.');
    }
    // ۸) «این هفته» — از تاریخچه‌ی انتشارهای سرور (بدون سرور)
    var wk = null;
    try { wk = D().weekly ? D().weekly() : null; } catch (e) { wk = null; }
    if (wk && wk.rows.length >= 2 && wk.days >= 2) {
      var keyRows = wk.rows.filter(function (r) { return r.sym === 'USD' || r.sym === 'G18' || r.sym === 'EMAMI'; });
      if (keyRows.length) {
        var span = wk.days >= 6 ? 'این هفته' : 'در ' + U.fa(wk.days) + ' روز گذشته';
        var txt = span + ': ' + keyRows.map(function (r) { return r.fa + ' ' + U.pct(r.pct, 1); }).join('، ');
        if (wk.bubbleThen != null && wk.bubbleNow != null && Math.abs(wk.bubbleNow - wk.bubbleThen) >= 0.3) {
          txt += '؛ حباب سکه از ' + f1(wk.bubbleThen) + '٪ به ' + f1(wk.bubbleNow) + '٪ ' + (wk.bubbleNow > wk.bubbleThen ? 'رسید (هیجان در حال ساخت).' : 'رسید (هیجان در حال تخلیه).');
          if (wk.bubbleNow > wk.bubbleThen + 3) score -= 1;
        } else txt += '.';
        reasons.push(txt);
        var usdW = keyRows.filter(function (r) { return r.sym === 'USD'; })[0];
        if (usdW && usdW.pct >= 3) { warns.push('دلار ' + span + ' ' + U.pct(usdW.pct, 1) + ' بالا رفته — پله‌ای عمل کن؛ بعد از جهش‌های تند، اصلاح کوتاه رایج است.'); }
      }
    }
    // ۹) بورس — رادار ۶ بعدی (پهنا، جریان خرد، صندوق‌ها، سرانه، صف)
    var mk = null, bourseScored = null, bourseCtx = null, bourseScore = 0, bourseBits = [];
    try { mk = D().market ? D().market() : null; } catch (e) { mk = null; }
    if (mk && mk.p > 0) {
      var MF = CFG().MARKETFLOW || { strong: 0.10, mild: 0.04 };
      var idxTxt = 'شاخص کلِ بورس ' + U.fmt(Math.round(mk.p)) + (mk.chgPct != null ? ' (' + U.pct(mk.chgPct, 1) + ')' : '');
      // جریان خرد
      if (mk.flow && mk.flowRatio != null && !mk.stale) {
        var rr = mk.flowRatio, ar = Math.abs(rr);
        var netTxt = U.fa((Math.abs(mk.flow.netToman) / 1e12).toFixed(1)) + ' همت';
        var agree = (mk.chgPct == null) || (rr < 0 && mk.chgPct < 0) || (rr > 0 && mk.chgPct > 0);
        if (ar >= MF.strong || (ar >= MF.mild && agree)) {
          if (rr < 0) {
            bourseScore += 1;
            bourseBits.push('خروج ' + netTxt + ' پول حقیقی (' + U.fa(Math.round(ar * 100)) + '٪ ارزش معاملات)');
          } else {
            bourseScore -= 0.8;
            bourseBits.push('ورود ' + netTxt + ' پول حقیقی (' + U.fa(Math.round(ar * 100)) + '٪) — پارک تقاضا در سهام');
          }
        } else {
          bourseBits.push('جریان خرد خفیف ' + netTxt + ' (' + U.fa(Math.round(ar * 100)) + '٪)');
        }
      }
      var bt = mk.bt;
      if (bt) {
        // پهنا
        if (bt.breadth && bt.breadth.posPct != null) {
          var bp = bt.breadth.posPct;
          if (bp >= 65) { bourseScore += 1; bourseBits.push('پهنا ' + U.fa(Math.round(bp)) + '٪ — فراگیر صعودی'); }
          else if (bp >= 55) { bourseScore += 0.5; bourseBits.push('پهنا ' + U.fa(Math.round(bp)) + '٪ مثبت'); }
          else if (bp <= 20) { bourseScore -= 1; bourseBits.push('پهنا ' + U.fa(Math.round(bp)) + '٪ — فراگیر منفی'); }
          else if (bp <= 35) { bourseScore -= 0.5; bourseBits.push('پهنا ' + U.fa(Math.round(bp)) + '٪ کم‌رمق'); }
          else bourseBits.push('پهنا ' + U.fa(Math.round(bp)) + '٪ (' + U.fa(bt.breadth.pos) + '/' + U.fa(bt.breadth.neg) + ')');
        }
        // صندوق درآمد ثابت — خروج = پول از پناهگاه به سهام → ریسک‌پذیر
        if (bt.funds && bt.funds.fixed && bt.funds.fixed.netToman != null) {
          var fFix = bt.funds.fixed.netToman;
          var fAbs = Math.abs(fFix);
          if (fFix < -2e12) { bourseScore += 1; bourseBits.push('خروج ' + fMoney(fAbs) + ' از درآمد ثابت → چرخش به سهام'); }
          else if (fFix < -5e11) { bourseScore += 0.5; bourseBits.push('خروج ' + fMoney(fAbs) + ' از درآمد ثابت'); }
          else if (fFix > 2e12) { bourseScore -= 1; bourseBits.push('ورود ' + fMoney(fAbs) + ' به درآمد ثابت — پناهگاه‌خواهی'); }
          else if (fFix > 5e11) { bourseScore -= 0.5; bourseBits.push('ورود ' + fMoney(fAbs) + ' به درآمد ثابت'); }
          else bourseBits.push('درآمد ثابت: ' + (fFix < 0 ? 'خروج ' : 'ورود ') + fMoney(fAbs));
        }
        // صندوق سهامی
        if (bt.funds && bt.funds.equity && bt.funds.equity.netToman != null) {
          var fEq = bt.funds.equity.netToman;
          if (fEq > 1e12) { bourseScore += 0.8; bourseBits.push('ورود ' + fMoney(fEq) + ' به صندوق‌های سهامی'); }
          else if (fEq > 2e11) { bourseScore += 0.4; bourseBits.push('ورود ' + fMoney(fEq) + ' به سهامی'); }
          else if (fEq < -1e12) { bourseScore -= 0.8; bourseBits.push('خروج ' + fMoney(Math.abs(fEq)) + ' از سهامی'); }
          else if (Math.abs(fEq) >= 1e9) bourseBits.push('سهامی: ' + (fEq < 0 ? 'خروج ' : 'ورود ') + fMoney(Math.abs(fEq)));
        }
        if (bt.funds && bt.funds.commodity && Math.abs(bt.funds.commodity.netToman) >= 1e9) {
          bourseBits.push('صندوق طلا: ' + (bt.funds.commodity.netToman < 0 ? 'خروج ' : 'ورود ') + fMoney(Math.abs(bt.funds.commodity.netToman)));
        }
        // سرانه
        if (bt.perCapita && bt.perCapita.buy && bt.perCapita.sell) {
          var rBuy = bt.perCapita.buy / bt.perCapita.sell;
          if (rBuy >= 1.3) { bourseScore += 1; bourseBits.push('سرانه خرید ' + U.fa(rBuy.toFixed(2)) + '× فروش — قدرت خریدار'); }
          else if (rBuy >= 1.1) { bourseScore += 0.5; bourseBits.push('سرانه ' + U.fa(rBuy.toFixed(2)) + '×'); }
          else if (rBuy <= 0.75) { bourseScore -= 1; bourseBits.push('سرانه ' + U.fa(rBuy.toFixed(2)) + '× — فشار فروش'); }
          else if (rBuy <= 0.9) { bourseScore -= 0.4; bourseBits.push('سرانه ' + U.fa(rBuy.toFixed(2)) + '× ضعیف'); }
          else bourseBits.push('سرانه ' + U.fa(rBuy.toFixed(2)) + '×');
        }
        // صف خرید
        if (bt.breadth && bt.breadth.queueBuy != null && bt.breadth.queueSell != null) {
          var totQ = bt.breadth.queueBuy + bt.breadth.queueSell;
          if (totQ > 0) {
            var qR = bt.breadth.queueBuy / totQ;
            if (qR >= 0.65) { bourseScore += 0.6; bourseBits.push('صف خرید ' + U.fa(bt.breadth.queueBuy) + ' / فروش ' + U.fa(bt.breadth.queueSell) + ' — غلبه خرید'); }
            else if (qR <= 0.35) { bourseScore -= 0.6; bourseBits.push('صف فروش سنگین ' + U.fa(bt.breadth.queueSell) + ' در برابر ' + U.fa(bt.breadth.queueBuy) + ' خرید'); }
            else bourseBits.push('صف ' + U.fa(bt.breadth.queueBuy) + ' خرید / ' + U.fa(bt.breadth.queueSell) + ' فروش');
          }
        }
        // ارزش معاملات خرد — نقدشوندگی
        if (bt.trade && bt.trade.valueToman) {
          var tv = bt.trade.valueToman;
          if (tv >= 15e12) bourseBits.push('ارزش معاملات خرد ' + fMoney(tv) + ' — پرحجم');
          else if (tv <= 3e12) bourseBits.push('ارزش خرد ' + fMoney(tv) + ' — کم‌حجم');
        }
      }
      // اعمال امتیاز بورس به امتیاز کل — سقف ±۲٫۵
      bourseScore = U.clamp(bourseScore, -2.5, 2.5);
      score += bourseScore;
      if (bourseBits.length) {
        var joined = bourseBits.slice(0, 5).join(' · ');
        if (Math.abs(bourseScore) >= 0.8) bourseScored = 'بورس: ' + joined + ' — رادار سلامت ' + (bourseScore > 0 ? '+' : '') + U.fa(bourseScore.toFixed(1)) + '.';
        else bourseCtx = idxTxt + ' · ' + joined + '.';
      } else {
        bourseCtx = idxTxt + '؛ جریان بورس در دسترس نیست — فقط زمینه.';
      }
    }

    // تصمیم
    var hotName = top ? top.a.short : 'دارایی‌های داغ';
    var A;
    if (score >= 5) A = { t: 'حمله‌ی حساب‌شده', tone: 'hot', d: 'چراغ سبز؛ وزن موتورهای رشد را بالا ببر — اما با حد ضرر.', steps: ['افزایش وزن «' + hotName + '» تا سقف ریسک پروفایلت', 'خرید پله‌ای در ۲ تا ۳ مرحله، نه یکجا', 'حد ضرر ۸ تا ۱۰ درصدی برای بخش جسور سبد'] };
    else if (score >= 2) A = { t: 'تعادل متمایل به رشد', tone: 'warm', d: 'بازار همراه است؛ هسته‌ی ضدتورمی + چاشنی رشد.', steps: ['هسته‌ی سبد: طلا و درآمد ثابت', 'چاشنی رشد: «' + hotName + '» تا ۲۰٪ سبد', 'بازبینی هفتگی با رادار قیمت'] };
    else if (score >= -1) A = { t: 'حفظ ترکیب، شکار نوسان', tone: 'neutral', d: 'بازار تصمیم نگرفته؛ نه هیجان، نه خواب.', steps: ['ترکیب فعلی را حفظ کن؛ معامله‌ی اضافه ممنوع', 'نقد ذخیره نگه دار برای فرصت‌های ناگهانی', 'رادار روی «' + (low ? low.a.short : 'بازارها') + '» فعال کن'] };
    else if (score >= -4) A = { t: 'حالت دفاعی', tone: 'cold', d: 'سرما نزدیک است؛ به پناهگاه‌ها برگرد.', steps: ['کاهش وزن رمزارز و سکه‌ی حباب‌دار', 'افزایش طلا و صندوق درآمد ثابت', 'خریدهای جدید را به بعد از تثبیت موکول کن'] };
    else A = { t: 'نقد و انتظار', tone: 'ice', d: 'یخ‌زدگی؛ بهترین معامله، عدم معامله است.', steps: ['حداقل ۳۰٪ سبد نقد یا درآمد ثابت', 'فقط خرید پله‌ای طلا در ریزش‌های عمیق', 'تصمیم بزرگ را به بهبود پهنا موکول کن'] };
    // پوشش: در بازار بسته، «زنده بودن منبع» ملاک است نه تازگی آخرین معامله
    var liveCov = total ? liveN / total : 0;
    var effCov = ses.open ? coverage : Math.max(coverage, liveCov * 0.85);
    var conf = Math.round(U.clamp(35 + effCov * 55 + Math.min(12, Math.abs(score) * 2), 5, 97));
    if (liveN < 3) { warns.unshift('داده‌ی زنده‌ی کافی نرسیده — این حکم موقت است؛ وضعیت منابع را در «سلامت داده» ببین.'); conf = Math.min(conf, 45); }
    else if (!ses.open && m.quiet) { warns.push('بازار تهران بسته است' + (ses.next ? ' (' + ses.next + ')' : '') + ' — حکم بر پایه‌ی آخرین جلسه و بازارهای ۲۴ساعته است؛ اقدام را به بازگشایی موکول کن.'); conf = Math.min(conf, 70); }
    else if (coverage < 0.4) { warns.push('پوشش داده‌ی تازه پایین است — حکم را با احتیاط اجرا کن.'); conf = Math.min(conf, 60); }
    if (bourseScored) reasons.unshift(bourseScored);
    else if (bourseCtx) reasons.push(bourseCtx);
    // ۶ سطر: پنج عاملِ اصلی + زمینه‌ی بورس (اگر جریانِ پول داشت، همان اول می‌آمد)
    return { mood: m, score: score, conf: conf, reasons: reasons.slice(0, 6), warns: warns.slice(0, 3), action: A, top: top, low: low, coverage: coverage, liveN: liveN, session: ses, weekly: wk, market: mk };
  }

  /** نمایشِ کوتاهِ مبالغِ ریالی-تومانیِ بورس (همت/میلیارد) — فقط برای متنِ حکم */
  function fMoney(v) {
    var a = Math.abs(+v);
    if (!isFinite(a)) return '—';
    if (a >= 1e12) return U.fa(String(+(a / 1e12).toFixed(2))) + ' همت';
    if (a >= 1e9) return U.fa(Math.round(a / 1e9)) + ' میلیارد';
    if (a >= 1e6) return U.fa(Math.round(a / 1e6)) + ' میلیون';
    return U.fmt(Math.round(a)) + ' تومان';
  }

  var TONE_C = { hot: '#FF4E2E', warm: '#E8833A', neutral: '#9AA4AD', cold: '#3E8E9E', ice: '#7FB3D5' };

  function renderVerdict() {
    var host = U.$('#verdictBody');
    if (!host) return;
    var v = verdict();
    var col = TONE_C[v.action.tone] || '#E8833A';
    var ang = U.clamp(v.score, -8, 8) / 8 * 80;
    var rad = (ang - 90) * Math.PI / 180;
    var nx = 100 + 62 * Math.cos(rad), ny = 92 + 62 * Math.sin(rad);
    var dial = '<svg viewBox="0 0 200 110" class="v-dial" role="img" aria-label="عقربه حکم بازار">' +
      '<path d="M14 92 A86 86 0 0 1 186 92" fill="none" stroke="#22282E" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M14 92 A86 86 0 0 1 186 92" fill="none" stroke="' + col + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + U.clamp((v.score + 8) / 16 * 270, 8, 270) + ' 270" opacity=".85"/>' +
      '<line x1="100" y1="92" x2="' + nx.toFixed(1) + '" y2="' + ny.toFixed(1) + '" stroke="' + col + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<circle cx="100" cy="92" r="7" fill="#1A2026" stroke="' + col + '" stroke-width="3"/>' +
      '<text x="14" y="108" font-size="10" fill="#8B949C">دفاع</text>' +
      '<text x="186" y="108" font-size="10" fill="#8B949C" text-anchor="end">حمله</text></svg>';
    host.innerHTML =
      '<div class="verdict" style="--vc:' + col + '">' +
      '<div class="v-side">' + dial +
      '<div class="v-conf"><span>اطمینان حکم</span><b>' + U.fa(v.conf) + '٪</b><div class="risk-track"><i style="width:' + v.conf + '%;background:' + col + '"></i></div></div>' +
      '<div class="v-meters"><span>نبض <b dir="ltr">' + (v.mood.score >= 0 ? '+' : '−') + U.fa(Math.abs(v.mood.score)) + '</b></span>' +
      '<span>پهنا <b>' + U.fa(v.mood.ups) + '٪</b></span></div></div>' +
      '<div class="v-main"><span class="v-kicker">حکم امروز گرماسنج <button class="f-help" type="button" data-formula="verdict" aria-label="فرمول حکم امروز" title="چطور محاسبه می‌شود؟">؟</button></span>' +
      '<h3>' + U.esc(v.action.t) + '</h3><p>' + U.esc(v.action.d) + '</p>' +
      '<div class="v-cols"><div><b>چرا؟</b><ul>' + v.reasons.map(function (r) { return '<li>' + U.esc(r) + '</li>'; }).join('') + '</ul></div>' +
      '<div><b>۳ اقدام امروز</b><ol>' + v.action.steps.map(function (s) { return '<li>' + U.esc(s) + '</li>'; }).join('') + '</ol></div></div>' +
      (v.warns.length ? '<div class="v-warns">' + v.warns.map(function (w) { return '<span>⚠ ' + U.esc(w) + '</span>'; }).join('') + '</div>' : '') +
      '</div></div>';
  }

  /* ================= زنجیره‌ی اقتصاد ================= */
  function renderChain() {
    var flow = U.$('#chainFlow'), sig = U.$('#chainSignal');
    if (!flow) return;
    var c = D().chain();
    function card(label, val, sub, delta, tone, fkey) {
      return '<div class="ch-card ' + (tone || '') + '"><small>' + label + (fkey ? ' <button class="f-help" type="button" data-formula="' + fkey + '" aria-label="فرمول ' + label + '" title="فرمول و ورودی‌های لحظه‌ای">؟</button>' : '') + '</small><b>' + val + '</b>' +
        (sub ? '<span>' + sub + '</span>' : '') + (delta ? '<i class="ch-delta ' + delta[1] + '">' + delta[0] + '</i>' : '') + '</div>';
    }
    var arrow = '<span class="ch-arrow" aria-hidden="true"><i></i><i></i><i></i></span>';
    var cards = [];
    cards.push(card('اونس جهانی', c.ounce ? U.fa(Math.round(c.ounce.p).toLocaleString('en-US')) + ' $' : '—',
      c.ounce ? ('امروز ' + U.pct(c.ounce.chgPct || 0)) : 'منتظر داده'));
    cards.push(card('دلار آزاد', c.usd ? U.fmtCompact(c.usd.p) + ' تومان' : '—',
      c.usd ? U.esc((c.usd.srcFa || '').split('(')[0].split('·')[0]) : 'منتظر داده'));
    cards.push(card('طلای ۱۸ منصفانه', c.fairG18 ? U.fmtCompact(Math.round(c.fairG18)) : '—', 'اونس × دلار × ۰٫۷۵', null, '', 'fairG18'));
    var devCls = c.g18 && c.g18.dev != null ? (Math.abs(c.g18.dev) < 3 ? 'ok' : c.g18.dev > 0 ? 'hi' : 'lo') : '';
    var devTxt = c.g18 && c.g18.dev != null ? ('انحراف ' + U.pct(c.g18.dev, 1)) : '';
    cards.push(card('طلای واقعی بازار', c.g18 ? U.fmtCompact(c.g18.p) : '—',
      c.g18 ? ('امروز ' + U.pct(c.g18.chgPct || 0)) : 'منتظر داده',
      devTxt ? [devTxt, devCls] : null, '', 'goldPrem'));
    var mCls = c.mesghal && c.mesghal.dev != null ? (Math.abs(c.mesghal.dev) < 2 ? 'ok' : c.mesghal.dev > 0 ? 'hi' : 'lo') : '';
    var mTxt = c.mesghal && c.mesghal.dev != null ? ('انحراف ' + U.pct(c.mesghal.dev, 1)) : '';
    cards.push(card('مثقال (مظنه)', c.mesghal ? U.fmtCompact(c.mesghal.p) : '—',
      'گرم ۱۸ × ۴٫۳۵۲', mTxt ? [mTxt, mCls] : null, '', 'mesghal'));
    var bubCls = c.emami && c.emami.bubble != null ? (c.emami.bubble > 25 ? 'hi' : c.emami.bubble > 15 ? 'mid' : 'ok') : '';
    var bubTxt = c.emami && c.emami.bubble != null ? ('حباب ' + U.fa(c.emami.bubble.toFixed(1)) + '٪') : '';
    cards.push(card('سکه امامی', c.emami ? U.fmtCompact(c.emami.p) : '—',
      c.intrinsicEmami ? ('ذاتی ' + U.fmtCompact(Math.round(c.intrinsicEmami))) : 'منتظر داده',
      bubTxt ? [bubTxt, bubCls] : null, '', 'bubble'));
    flow.innerHTML = cards.join(arrow);
    if (sig) {
      sig.className = 'ch-signal ' + (c.tone || '');
      sig.textContent = c.signal || 'زنجیره با رسیدن دلار، اونس، طلا و سکه کامل می‌شود…';
    }
  }

  /* ================= هیت‌مپ بازارها ================= */
  function renderHeatmap() {
    var grid = U.$('#heatGrid');
    if (!grid) return;
    var arr = CFG().ASSETS.filter(function (a) { return !a.derived; }).slice()
      .sort(function (a, b) { return (D().quote(b.sym).chgPct || -999) - (D().quote(a.sym).chgPct || -999); });
    grid.innerHTML = arr.map(function (a) {
      var q = D().quote(a.sym);
      var chg = q.chgPct || 0, has = q.p > 0;
      var col = !has ? '#5A636C' : GS.charts.dirColor(chg);
      var price = !has ? '—' : GS.ui.dispPrice(a, q);
      var dayCls = !has || Math.abs(chg) < 0.05 ? 'z' : chg > 0 ? 'up' : 'down';
      return '<button class="heat-tile" data-heat="' + a.sym + '" style="border-color:' + col + '55;background:' + col + '14">' +
        '<span class="ht-n">' + U.esc(a.short) + '</span>' +
        '<b class="ht-p">' + price + '</b>' +
        '<span class="ht-d ' + dayCls + '" dir="ltr">' + (has ? U.pct(chg) : '') + '</span></button>';
    }).join('');
  }

  function initHeatmap() {
    var grid = U.$('#heatGrid');
    if (!grid || grid.dataset.wired) return;
    grid.dataset.wired = '1';
    grid.addEventListener('click', function (e) {
      var t = e.target.closest('[data-heat]');
      if (!t) return;
      var card = GS.ui.ensureCardVisible ? GS.ui.ensureCardVisible(t.dataset.heat) : document.querySelector('.qcard[data-sym="' + t.dataset.heat + '"]');
      if (!card) return;
      try { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) {}
      card.classList.remove('flash');
      void card.offsetWidth;
      card.classList.add('flash');
      setTimeout(function () { card.classList.remove('flash'); }, 1600);
    });
  }

  GS.features = {
    heatOf: heatOf,
    simAmount: function () { return simState.P; },
    hotScores: hotScores, regimeOf: regimeOf, renderHotmoney: renderHotmoney,
    renderSim: renderSim, initSim: initSim,
    renderMix: renderMix, initMix: initMix,
    initRadar: initRadar, renderRadars: renderRadars, checkRadars: checkRadars, askNotify: askNotify,
    renderHealth: renderHealth,
    verdict: verdict, renderVerdict: renderVerdict,
    renderChain: renderChain, renderHeatmap: renderHeatmap, initHeatmap: initHeatmap
  };
})();
