(function () {
  'use strict';

  var DAYS = window.DAYS || [];
  var KEY = 'dailygrace.v1';
  var PRICES = [29.99, 49.99, 69.99];
  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  var memState = null;

  // ---------- state ----------
  function fresh() {
    return { done: {}, notes: {}, price: null, trialTap: false, churchInterest: false, reminder: '' };
  }
  function load() {
    var s = null;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) s = JSON.parse(raw);
    } catch (e) { s = null; }
    if (!s) s = memState || fresh();
    var base = fresh();
    Object.keys(base).forEach(function (k) { if (s[k] === undefined) s[k] = base[k]; });
    if (!s.price) s.price = PRICES[Math.floor(Math.random() * PRICES.length)];
    return s;
  }
  var state = load();
  function save() {
    memState = state;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* in-memory fallback */ }
  }
  save();

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function dateKey(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function today() { return dateKey(new Date()); }
  function shift(key, n) {
    var p = key.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2] + n);
    return dateKey(d);
  }
  function doneDates() {
    var o = {};
    Object.keys(state.done).forEach(function (k) { o[state.done[k]] = true; });
    return o;
  }
  function streak() {
    var dates = doneDates();
    var t = today();
    var cur = dates[t] ? t : (dates[shift(t, -1)] ? shift(t, -1) : null);
    if (!cur) return 0;
    var n = 0;
    while (dates[cur]) { n++; cur = shift(cur, -1); }
    return n;
  }
  function nextDay() {
    for (var i = 0; i < DAYS.length; i++) if (!state.done[DAYS[i].day]) return DAYS[i].day;
    return null;
  }
  function doneCount() { return Object.keys(state.done).length; }
  function getDay(n) {
    for (var i = 0; i < DAYS.length; i++) if (DAYS[i].day === n) return DAYS[i];
    return null;
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }
  function webLink(ref) {
    return 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=WEB';
  }
  function passage(n) {
    var rows = (window.SCRIPTURE || {})[n];
    if (!rows || !rows.length) return '';
    var h = '<div class="scripture">';
    rows.forEach(function (r, i) {
      if (r[2] && i > 0) h += '</div><div class="scripture">';
      h += '<span class="verse"><sup>' + r[0] + '</sup>' + esc(r[1]) + '</span> ';
    });
    return h + '</div>';
  }
  function money(n) { return '$' + n.toFixed(2); }
  function copyText(text, ta) {
    function fallback() {
      if (ta) { ta.focus(); ta.select(); }
      toast('Select the text and copy it');
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, fallback);
        return;
      }
    } catch (e) { /* fall through */ }
    try {
      if (ta) { ta.focus(); ta.select(); }
      if (document.execCommand && document.execCommand('copy')) { toast('Copied'); return; }
    } catch (e) { /* fall through */ }
    fallback();
  }

  // ---------- views ----------
  function dots() {
    var html = '<div class="dots" role="list" aria-label="Your 14 days">';
    var nd = nextDay();
    DAYS.forEach(function (d) {
      var cls = 'dot' + (state.done[d.day] ? ' done' : '') + (d.day === nd ? ' next' : '');
      var label = 'Day ' + d.day + (state.done[d.day] ? ', done' : (d.day === nd ? ', up next' : ''));
      html += '<a class="' + cls + '" role="listitem" href="#day-' + d.day + '" aria-label="' + label + '">' + d.day + '</a>';
    });
    return html + '</div>';
  }

  function viewToday() {
    var s = streak();
    var nd = nextDay();
    var h = '<section class="card hero"><div class="streak"><div class="num" aria-hidden="true">' + s + '</div>' +
      '<div><h2>' + (s === 1 ? '1 day streak' : s + ' day streak') + '</h2>' +
      '<p class="muted small">' + doneCount() + ' of ' + DAYS.length + ' days finished</p></div></div>' + dots() + '</section>';
    if (nd === null) {
      h += '<section class="card"><p class="eyebrow">All done</p><h1>You finished all ' + DAYS.length + ' days</h1>' +
        '<p class="read">Thank you for praying along. Tell us what worked and what did not.</p>' +
        '<div class="row"><a class="btn" href="#plan">Share my results</a><a class="btn ghost" href="#days">Revisit a day</a></div></section>';
    } else {
      var d = getDay(nd);
      h += '<section class="card"><p class="eyebrow">Day ' + d.day + ' · about 5 minutes</p><h1>' + esc(d.title) + '</h1>' +
        '<p class="muted">' + esc(d.ref) + '</p>' +
        '<div class="row"><a class="btn" href="#day-' + d.day + '">Begin today’s prayer</a></div></section>';
    }
    return h;
  }

  function viewDays() {
    var h = '<h1>All days</h1><div class="list">';
    DAYS.forEach(function (d) {
      var done = state.done[d.day];
      h += '<a class="item" href="#day-' + d.day + '"><span class="t"><span class="eyebrow">Day ' + d.day + '</span><strong>' +
        esc(d.title) + '</strong><span class="muted small">' + esc(d.ref) + '</span></span>' +
        (done ? '<span class="badge">Done</span>' : '') + '</a>';
    });
    return h + '</div>';
  }

  function viewDay(n) {
    var d = getDay(n);
    if (!d) return '<h1>Day not found</h1><a class="btn" href="#days">See all days</a>';
    var done = !!state.done[n];
    var note = state.notes[n] || '';
    var h = '<p class="eyebrow">Day ' + d.day + ' of ' + DAYS.length + '</p><h1>' + esc(d.title) + '</h1>' +
      '<section class="card"><h2>Read</h2><p class="ref">' + esc(d.ref) + '</p>' + passage(n) +
      '<p class="muted small">World English Bible, British Edition (public domain). <a href="' + webLink(d.ref) + '" target="_blank" rel="noopener">Open on BibleGateway</a></p></section>' +
      '<section class="card"><p class="read">' + esc(d.leadIn) + '</p></section>' +
      '<section class="card"><h2>Pray</h2><p class="prayer">' + esc(d.prayer) + '</p>' +
      '<div class="row"><button class="btn ghost" id="listen" type="button">Listen</button></div></section>' +
      '<section class="card"><h2>Reflect</h2><p class="read">' + esc(d.reflect) + '</p>' +
      '<label for="note">Your note (stays on this device)</label>' +
      '<textarea id="note" placeholder="Optional">' + esc(note) + '</textarea></section>' +
      '<div class="row"><button class="btn" id="complete" type="button">' + (done ? 'Completed ✓' : 'Mark day complete') + '</button>' +
      '<a class="btn ghost" href="#today">Back</a></div>';
    return h;
  }

  function viewReminder() {
    return '<h1>Daily reminder</h1><section class="card"><p class="read">Pick a time that fits your day. Real reminders come in a later version; for now this saves your choice so we know what time suits you.</p>' +
      '<label for="rtime">Reminder time</label><input type="time" id="rtime" value="' + esc(state.reminder) + '">' +
      '<div class="row"><button class="btn" id="rsave" type="button">Save time</button></div>' +
      '<p class="muted small" id="rstatus">' + (state.reminder ? 'Saved: ' + esc(state.reminder) : 'Nothing saved yet.') + '</p></section>';
  }

  function resultsText() {
    var lines = [
      'Morning Light test results',
      'Days finished: ' + doneCount() + ' of ' + DAYS.length,
      'Current streak: ' + streak(),
      'Reminder time: ' + (state.reminder || 'not set'),
      'Price shown: ' + money(state.price) + '/year',
      'Tapped free trial: ' + (state.trialTap ? 'yes' : 'no'),
      'Interested in church plan: ' + (state.churchInterest ? 'yes' : 'no')
    ];
    var notes = Object.keys(state.notes).filter(function (k) { return state.notes[k]; });
    if (notes.length) {
      lines.push('Notes:');
      notes.forEach(function (k) { lines.push('  Day ' + k + ': ' + state.notes[k]); });
    }
    return lines.join('\n');
  }

  function viewPlan() {
    return '<h1>Plan</h1>' +
      '<section class="card"><p class="eyebrow">Morning Light</p><div class="price">' + money(state.price) + '<span class="muted small"> / year</span></div>' +
      '<ul class="clean"><li>A new 5-minute prayer session every day</li><li>Audio for every session</li><li>Streaks and reminders</li></ul>' +
      '<div class="row"><button class="btn" id="trial" type="button">Start 7-day free trial</button></div>' +
      '<p class="muted small" id="trialmsg">' + (state.trialTap ? 'Thanks. Payments are not live yet, and you have not been charged.' : 'Test version: no payment is taken.') + '</p></section>' +
      '<section class="card"><h2>Share how it went</h2><p class="muted small">Copy this summary and send it to me.</p>' +
      '<textarea id="results" readonly>' + esc(resultsText()) + '</textarea>' +
      '<div class="row"><button class="btn ghost" id="copy" type="button">Copy my test results</button></div></section>';
  }

  function viewChurch() {
    return '<h1>For churches</h1><section class="card"><p class="note">Mockup only. Nothing here is live yet.</p>' +
      '<p class="read">Give your whole congregation the same daily prayer, matched to your sermon series or season.</p>' +
      '<ul class="clean"><li>One shared plan for the whole congregation</li><li>Pastor’s note on any day</li><li>Simple group totals, no personal details</li><li>Flat yearly price by congregation size</li></ul>' +
      '<div class="row"><button class="btn" id="church" type="button">' + (state.churchInterest ? 'Interest noted ✓' : 'I’d like this for my church') + '</button></div></section>';
  }

  // ---------- routing ----------
  function route() {
    var hash = (location.hash || '#today').slice(1);
    var html, active = 'today', m;
    if (hash === 'days') { html = viewDays(); active = 'days'; }
    else if ((m = /^day-(\d+)$/.exec(hash))) { html = viewDay(+m[1]); active = 'days'; }
    else if (hash === 'reminder') { html = viewReminder(); active = 'reminder'; }
    else if (hash === 'plan') { html = viewPlan(); active = 'plan'; }
    else if (hash === 'church') { html = viewChurch(); active = 'church'; }
    else { html = viewToday(); }
    app.innerHTML = html;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    wire(hash);
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  function on(id, ev, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
  }

  function wire(hash) {
    var m = /^day-(\d+)$/.exec(hash);
    if (m) {
      var n = +m[1];
      var d = getDay(n);
      on('note', 'input', function (e) { state.notes[n] = e.target.value; save(); });
      on('complete', 'click', function () {
        if (!state.done[n]) {
          state.done[n] = today();
          save();
          toast('Day ' + n + ' complete');
        }
        location.hash = '#today';
        route();
      });
      on('listen', 'click', function () {
        var btn = document.getElementById('listen');
        if (!('speechSynthesis' in window) || !d) { toast('Audio is not available on this device'); return; }
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          btn.textContent = 'Listen';
          return;
        }
        var u = new SpeechSynthesisUtterance(d.prayer);
        u.rate = 0.9;
        u.onend = function () { btn.textContent = 'Listen'; };
        u.onerror = u.onend;
        btn.textContent = 'Stop';
        window.speechSynthesis.speak(u);
      });
    }
    on('rsave', 'click', function () {
      state.reminder = document.getElementById('rtime').value;
      save();
      document.getElementById('rstatus').textContent = state.reminder ? 'Saved: ' + state.reminder : 'Nothing saved yet.';
      toast('Saved');
    });
    on('trial', 'click', function () {
      state.trialTap = true; save();
      document.getElementById('trialmsg').textContent = 'Thanks. Payments are not live yet, and you have not been charged.';
      document.getElementById('results').value = resultsText();
    });
    on('copy', 'click', function () {
      var ta = document.getElementById('results');
      copyText(ta.value, ta);
    });
    on('church', 'click', function () {
      state.churchInterest = true; save();
      document.getElementById('church').textContent = 'Interest noted ✓';
      toast('Noted');
    });
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', function () {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  });
  route();
})();
