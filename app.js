(function () {
  'use strict';

  var KEY = 'dailygrace.v1'; // kept so existing testers keep their progress
  var PRICES = [29.99, 49.99, 69.99];
  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  var memState = null;

  // ---------- paths ----------
  var START = window.DAYS || [];
  var LENT = (window.LENT && window.LENT.days) || [];
  var PATHS = {
    start: { id: 'start', name: 'Start here', blurb: '14 days, any time. Free.', days: START, scripture: window.SCRIPTURE || {}, doneKey: 'done', noteKey: 'notes', dated: false },
    lent: { id: 'lent', name: 'Lent 2027', blurb: 'Ash Wednesday, Feb 10 to Holy Saturday, Mar 27.', days: LENT, scripture: (window.LENT && window.LENT.scripture) || {}, doneKey: 'doneLent', noteKey: 'notesLent', dated: true }
  };
  var ADV = (window.ADVENT && window.ADVENT.days) || [];
  // Advent runs Dec 1 to Dec 24 of the current season: this year until Dec 24, then next year
  var _t = today(), _y = +_t.slice(0, 4);
  var ADV_YEAR = _t > _y + '-12-24' ? _y + 1 : _y;
  ADV.forEach(function (d) { d.date = ADV_YEAR + '-12-' + (d.day < 10 ? '0' : '') + d.day; });
  PATHS.advent = { id: 'advent', name: 'Advent ' + ADV_YEAR, blurb: '24 days, Dec 1 to Christmas Eve.', days: ADV, scripture: (window.ADVENT && window.ADVENT.scripture) || {}, doneKey: 'doneAdvent', noteKey: 'notesAdvent', dated: true };
  var ORDER = ['start', 'lent', 'advent'];

  // ---------- state ----------
  function fresh() {
    return { done: {}, notes: {}, doneLent: {}, notesLent: {}, doneAdvent: {}, notesAdvent: {}, price: null, trialTap: false, churchInterest: false, reminder: '', path: 'start', testMode: false };
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
    if (!PATHS[s.path]) s.path = 'start';
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
  function today() { return window.__TODAY__ || dateKey(new Date()); }
  function shift(key, n) {
    var p = key.split('-');
    return dateKey(new Date(+p[0], +p[1] - 1, +p[2] + n));
  }
  function niceDate(key) {
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function doneMap(p) { return state[p.doneKey]; }
  function isDone(p, n) { return !!doneMap(p)[n]; }
  function doneCount(p) { return Object.keys(doneMap(p)).length; }
  function getDay(p, n) { return p.days[n - 1] || null; }
  function isOpen(p, n) {
    var d = getDay(p, n);
    if (!d) return false;
    if (!p.dated || state.testMode) return true;
    return d.date <= today();
  }
  function streakDates() {
    var o = {};
    ORDER.forEach(function (id) {
      var m = doneMap(PATHS[id]);
      Object.keys(m).forEach(function (k) { o[m[k]] = true; });
    });
    return o;
  }
  function streak() {
    var dates = streakDates();
    var t = today();
    var cur = dates[t] ? t : (dates[shift(t, -1)] ? shift(t, -1) : null);
    if (!cur) return 0;
    var n = 0;
    while (dates[cur]) { n++; cur = shift(cur, -1); }
    return n;
  }
  // first open, unfinished day in a path (or null)
  function nextOpen(p) {
    for (var i = 0; i < p.days.length; i++) {
      var n = p.days[i].day;
      if (!isDone(p, n) && isOpen(p, n)) return n;
    }
    return null;
  }
  function allDone(p) { return doneCount(p) >= p.days.length; }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }
  function webLink(ref) {
    return 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=WEB';
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
  function passage(p, n) {
    var rows = p.scripture[n];
    if (!rows || !rows.length) return '';
    var h = '<div class="scripture">';
    rows.forEach(function (r, i) {
      if (r[2] && i > 0) h += '</div><div class="scripture">';
      h += '<span class="verse"><sup>' + r[0] + '</sup>' + esc(r[1]) + '</span> ';
    });
    return h + '</div>';
  }

  // ---------- views ----------
  function dots(p) {
    var nd = nextOpen(p);
    var html = '<div class="dots" role="list" aria-label="' + esc(p.name) + ' days">';
    p.days.forEach(function (d) {
      var done = isDone(p, d.day), open = isOpen(p, d.day);
      var cls = 'dot' + (done ? ' done' : '') + (d.day === nd ? ' next' : '') + (!open ? ' locked' : '');
      var label = 'Day ' + d.day + (done ? ', done' : (d.day === nd ? ', up next' : (!open ? ', opens ' + niceDate(d.date) : '')));
      html += '<a class="' + cls + '" role="listitem" href="#' + p.id + '-' + d.day + '" aria-label="' + label + '">' + d.day + '</a>';
    });
    return html + '</div>';
  }

  function viewToday() {
    var p = PATHS[state.path];
    var s = streak();
    var nd = nextOpen(p);
    var h = '<section class="card hero"><div class="streak"><div class="num" aria-hidden="true">' + s + '</div>' +
      '<div><h2>' + (s === 1 ? '1 day streak' : s + ' day streak') + '</h2>' +
      '<p class="muted small">' + esc(p.name) + ': ' + doneCount(p) + ' of ' + p.days.length + ' days finished</p></div></div>' + dots(p) + '</section>';
    if (allDone(p)) {
      h += '<section class="card"><p class="eyebrow">All done</p><h1>You finished ' + esc(p.name) + '</h1>' +
        '<p class="read">Thank you for praying along. Tell us what worked and what did not.</p>' +
        '<div class="row"><a class="btn" href="#plan">Share my results</a><a class="btn ghost" href="#paths">Choose a path</a></div></section>';
    } else if (nd !== null) {
      var d = getDay(p, nd);
      h += '<section class="card"><p class="eyebrow">' + (p.dated ? niceDate(d.date) + ' · ' : '') + 'Day ' + d.day + ' · about 5 minutes</p><h1>' + esc(d.title) + '</h1>' +
        '<p class="muted">' + esc(d.ref) + '</p>' +
        '<div class="row"><a class="btn" href="#' + p.id + '-' + d.day + '">Begin today’s prayer</a></div></section>';
    } else {
      // dated path with nothing open right now
      var first = p.days[0], lastD = p.days[p.days.length - 1];
      var msg;
      if (today() < first.date) msg = esc(p.name) + ' begins on ' + niceDate(first.date) + '. Day 1 opens then.';
      else if (today() > lastD.date) msg = esc(p.name) + ' has ended.';
      else msg = 'You are caught up. The next session opens tomorrow.';
      h += '<section class="card"><p class="eyebrow">' + esc(p.name) + '</p><h1>' + (today() < first.date ? 'Coming soon' : 'Come back tomorrow') + '</h1>' +
        '<p class="read">' + msg + '</p><div class="row"><a class="btn ghost" href="#list-' + p.id + '">See all days</a><a class="btn ghost" href="#paths">Choose a path</a></div></section>';
    }
    return h;
  }

  function viewPaths() {
    var h = '<h1>Paths</h1><p class="muted">Pick the series you want to follow today.</p>';
    ORDER.forEach(function (id) {
      var p = PATHS[id];
      var active = state.path === id;
      var pct = Math.round(100 * doneCount(p) / p.days.length);
      h += '<section class="card"><div class="row spread"><h2>' + esc(p.name) + '</h2>' + (active ? '<span class="badge">Following</span>' : '') + '</div>' +
        '<p class="muted small">' + esc(p.blurb) + '</p>' +
        '<div class="bar" role="img" aria-label="' + pct + ' percent done"><span style="width:' + pct + '%"></span></div>' +
        '<p class="muted small">' + doneCount(p) + ' of ' + p.days.length + ' days finished</p>' +
        '<div class="row"><button class="btn' + (active ? ' ghost' : '') + '" type="button" data-pick="' + id + '">' + (active ? 'Go to today' : 'Follow this path') + '</button>' +
        '<a class="btn ghost" href="#list-' + id + '">See all days</a></div></section>';
    });
    h += '<section class="card"><h2>Test mode</h2><p class="muted small">For testers and demos. Unlocks every day of Lent and Advent so you can read ahead. Real users will not see this.</p>' +
      '<label class="check"><input type="checkbox" id="testmode"' + (state.testMode ? ' checked' : '') + '> Unlock all days</label></section>';
    return h;
  }

  function viewList(id) {
    var p = PATHS[id];
    if (!p) return '<h1>Not found</h1><a class="btn" href="#paths">Paths</a>';
    var h = '<h1>' + esc(p.name) + '</h1><div class="list">';
    p.days.forEach(function (d) {
      var done = isDone(p, d.day), open = isOpen(p, d.day);
      h += '<a class="item' + (open ? '' : ' locked') + '" href="#' + p.id + '-' + d.day + '"><span class="t"><span class="eyebrow">Day ' + d.day + (p.dated ? ' · ' + niceDate(d.date) : '') + '</span><strong>' +
        esc(d.title) + '</strong><span class="muted small">' + esc(d.ref) + '</span></span>' +
        (done ? '<span class="badge">Done</span>' : (!open ? '<span class="badge soft">Locked</span>' : '')) + '</a>';
    });
    return h + '</div>';
  }

  function viewDay(id, n) {
    var p = PATHS[id];
    var d = p && getDay(p, n);
    if (!d) return '<h1>Day not found</h1><a class="btn" href="#paths">See paths</a>';
    if (!isOpen(p, n)) {
      return '<p class="eyebrow">' + esc(p.name) + ' · Day ' + d.day + '</p><h1>' + esc(d.title) + '</h1>' +
        '<section class="card"><p class="read">This day opens on ' + niceDate(d.date) + '. Each session unlocks on its own date so we pray through the season together.</p>' +
        '<div class="row"><a class="btn" href="#today">Back to today</a><a class="btn ghost" href="#list-' + id + '">See all days</a></div></section>';
    }
    var done = isDone(p, n);
    var note = state[p.noteKey][n] || '';
    return '<p class="eyebrow">' + esc(p.name) + ' · Day ' + d.day + ' of ' + p.days.length + (p.dated ? ' · ' + niceDate(d.date) : '') + '</p><h1>' + esc(d.title) + '</h1>' +
      '<section class="card"><h2>Read</h2><p class="ref">' + esc(d.ref) + '</p>' + passage(p, n) +
      '<p class="muted small">World English Bible, British Edition (public domain). <a href="' + webLink(d.ref) + '" target="_blank" rel="noopener">Open on BibleGateway</a></p></section>' +
      '<section class="card"><p class="read">' + esc(d.leadIn) + '</p></section>' +
      '<section class="card"><h2>Pray</h2><p class="prayer">' + esc(d.prayer) + '</p>' +
      '<div class="row"><button class="btn ghost" id="listen" type="button">Listen</button></div></section>' +
      '<section class="card"><h2>Reflect</h2><p class="read">' + esc(d.reflect) + '</p>' +
      '<label for="note">Your note (stays on this device)</label>' +
      '<textarea id="note" placeholder="Optional">' + esc(note) + '</textarea></section>' +
      '<div class="row"><button class="btn" id="complete" type="button">' + (done ? 'Completed ✓' : 'Mark day complete') + '</button>' +
      '<a class="btn ghost" href="#today">Back</a></div>';
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
      'Start here: ' + doneCount(PATHS.start) + ' of ' + PATHS.start.days.length + ' days finished',
      'Lent: ' + doneCount(PATHS.lent) + ' of ' + PATHS.lent.days.length + ' days finished',
      'Advent: ' + doneCount(PATHS.advent) + ' of ' + PATHS.advent.days.length + ' days finished',
      'Current streak: ' + streak(),
      'Reminder time: ' + (state.reminder || 'not set'),
      'Price shown: ' + money(state.price) + '/year',
      'Tapped free trial: ' + (state.trialTap ? 'yes' : 'no'),
      'Interested in church plan: ' + (state.churchInterest ? 'yes' : 'no')
    ];
    ORDER.forEach(function (id) {
      var p = PATHS[id], nm = state[p.noteKey];
      var ks = Object.keys(nm).filter(function (k) { return nm[k]; });
      if (ks.length) {
        lines.push('Notes (' + p.name + '):');
        ks.forEach(function (k) { lines.push('  Day ' + k + ': ' + nm[k]); });
      }
    });
    return lines.join('\n');
  }

  function viewPlan() {
    return '<h1>Plan</h1>' +
      '<section class="card"><p class="eyebrow">Morning Light</p><div class="price">' + money(state.price) + '<span class="muted small"> / year</span></div>' +
      '<ul class="clean"><li>A new 5-minute prayer session every day</li><li>Seasonal paths like Lent and Advent</li><li>Audio for every session</li><li>Streaks and reminders</li></ul>' +
      '<div class="row"><button class="btn" id="trial" type="button">Start 7-day free trial</button></div>' +
      '<p class="muted small" id="trialmsg">' + (state.trialTap ? 'Thanks. Payments are not live yet, and you have not been charged.' : 'Test version: no payment is taken.') + '</p></section>' +
      '<section class="card"><h2>Share how it went</h2><p class="muted small">Copy this summary and send it to me.</p>' +
      '<textarea id="results" readonly>' + esc(resultsText()) + '</textarea>' +
      '<div class="row"><button class="btn ghost" id="copy" type="button">Copy my test results</button></div></section>';
  }

  function viewChurch() {
    return '<h1>For churches</h1><section class="card"><p class="note">Mockup only. Nothing here is live yet.</p>' +
      '<p class="read">Give your whole congregation the same daily prayer, matched to your sermon series or season.</p>' +
      '<ul class="clean"><li>One shared path for the whole congregation, such as Lent together</li><li>Pastor’s note on any day</li><li>Simple group totals, no personal details</li><li>Flat yearly price by congregation size</li></ul>' +
      '<div class="row"><button class="btn" id="church" type="button">' + (state.churchInterest ? 'Interest noted ✓' : 'I’d like this for my church') + '</button></div></section>';
  }

  // ---------- routing ----------
  function route() {
    var hash = (location.hash || '#today').slice(1);
    var html, active = 'today', m;
    if ((m = /^(start|lent|advent)-(\d+)$/.exec(hash))) { html = viewDay(m[1], +m[2]); active = 'paths'; }
    else if ((m = /^day-(\d+)$/.exec(hash))) { hash = 'start-' + m[1]; html = viewDay('start', +m[1]); active = 'paths'; }
    else if ((m = /^list-(start|lent|advent)$/.exec(hash))) { html = viewList(m[1]); active = 'paths'; }
    else if (hash === 'days') { html = viewList(state.path); active = 'paths'; }
    else if (hash === 'paths') { html = viewPaths(); active = 'paths'; }
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
    var m = /^(start|lent|advent)-(\d+)$/.exec(hash);
    if (m) {
      var p = PATHS[m[1]], n = +m[2], d = getDay(p, n);
      on('note', 'input', function (e) { state[p.noteKey][n] = e.target.value; save(); });
      on('complete', 'click', function () {
        if (!isDone(p, n)) {
          doneMap(p)[n] = today();
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
    document.querySelectorAll('[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.path = b.getAttribute('data-pick');
        save();
        location.hash = '#today';
        route();
      });
    });
    on('testmode', 'change', function (e) { state.testMode = e.target.checked; save(); toast(state.testMode ? 'Test mode on' : 'Test mode off'); });
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
