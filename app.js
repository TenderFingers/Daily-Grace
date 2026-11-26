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
  var EAS = (window.EASTER && window.EASTER.days) || [];
  PATHS.easter = { id: 'easter', name: 'Easter 2027', blurb: '14 days, Easter Sunday Mar 28 to Apr 10. Free.', days: EAS, scripture: (window.EASTER && window.EASTER.scripture) || {}, doneKey: 'doneEaster', noteKey: 'notesEaster', dated: true };
  var TIDE = (window.EASTERTIDE && window.EASTERTIDE.days) || [];
  PATHS.eastertide = { id: 'eastertide', name: 'Eastertide', blurb: 'Bonus: 36 more days, Apr 11 to Pentecost, May 16. Part of the paid plan (open in this test).', days: TIDE, scripture: (window.EASTERTIDE && window.EASTERTIDE.scripture) || {}, doneKey: 'doneTide', noteKey: 'notesTide', dated: true };
  PATHS.still = { id: 'still', name: 'Stillness', blurb: '14 days, any time. Quiet prayer with a moment of silence each day.', days: (window.STILL && window.STILL.days) || [], scripture: (window.STILL && window.STILL.scripture) || {}, doneKey: 'doneStill', noteKey: 'notesStill', dated: false };
  PATHS.abide = { id: 'abide', name: 'Abiding', blurb: '10 days, any time. Living in Christ and in each other.', days: (window.ABIDE && window.ABIDE.days) || [], scripture: (window.ABIDE && window.ABIDE.scripture) || {}, doneKey: 'doneAbide', noteKey: 'notesAbide', dated: false };
  PATHS.whole = { id: 'whole', name: 'Wholeness', blurb: '10 days, any time. Healing, grace, and being made whole.', days: (window.WHOLE && window.WHOLE.days) || [], scripture: (window.WHOLE && window.WHOLE.scripture) || {}, doneKey: 'doneWhole', noteKey: 'notesWhole', dated: false };
  var ORDER = ['start', 'advent', 'lent', 'easter', 'eastertide', 'still', 'abide', 'whole'];
  var PATHRE = ORDER.join('|');

  // ---------- state ----------
  function fresh() {
    return { done: {}, notes: {}, doneLent: {}, notesLent: {}, doneAdvent: {}, notesAdvent: {}, doneEaster: {}, notesEaster: {}, doneTide: {}, notesTide: {}, doneStill: {}, notesStill: {}, doneAbide: {}, notesAbide: {}, doneWhole: {}, notesWhole: {}, price: null, trialTap: false, churchInterest: false, churchNote: '', reminder: '', path: 'start', testMode: false };
  }
  function load() {
    var s = null, isNew = false;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) s = JSON.parse(raw);
    } catch (e) { s = null; }
    if (!s) { s = memState; }
    if (!s) {
      s = fresh(); isNew = true;
      // new visitors open on Advent while it is in season, otherwise on Start here
      var t = today();
      if (t >= ADV_YEAR + '-12-01' && t <= ADV_YEAR + '-12-24') s.path = 'advent';
    }
    var base = fresh();
    Object.keys(base).forEach(function (k) { if (s[k] === undefined) s[k] = base[k]; });
    if (!s.price) s.price = PRICES[Math.floor(Math.random() * PRICES.length)];
    if (!PATHS[s.path] || (PATHS[s.path].id === 'eastertide' && !s.testMode)) s.path = 'start';
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
  function hidden(p) { return p.id === 'eastertide' && !state.testMode; }
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
  function dayNum(key) {
    var p = key.split('-');
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
  }
  // Gentle streak: one missed day is forgiven (a grace day), but not twice within a week.
  function streakInfo() {
    var keys = Object.keys(streakDates()).map(dayNum).sort(function (a, b) { return b - a; });
    var t = dayNum(today());
    if (!keys.length) return { n: 0, atRisk: false };
    var last = keys[0];
    var gap = t - last;
    if (gap > 2) return { n: 0, atRisk: false };
    var n = 1, lastGrace = null;
    for (var i = 1; i < keys.length; i++) {
      var g = keys[i - 1] - keys[i];
      if (g === 1) { n++; continue; }
      if (g === 2 && (lastGrace === null || lastGrace - keys[i - 1] >= 7)) { lastGrace = keys[i - 1]; n++; continue; }
      break;
    }
    // today still open and yesterday was missed: today uses the grace day
    return { n: n, atRisk: gap === 2 };
  }
  function streak() { return streakInfo().n; }
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
    if (hidden(PATHS[state.path])) state.path = 'start';
    var p = PATHS[state.path];
    var s = streak();
    var nd = nextOpen(p);
    var h = '<section class="card hero"><div class="streak"><div class="num" aria-hidden="true">' + s + '</div>' +
      '<div><h2>' + (s === 1 ? '1 day streak' : s + ' day streak') + '</h2>' +
      '<p class="muted small">' + esc(p.name) + ': ' + doneCount(p) + ' of ' + p.days.length + ' days finished</p>' + (streakInfo().atRisk ? '<p class="muted small">You missed yesterday. Pray today and your streak keeps going.</p>' : '') + '</div></div>' + dots(p) + '</section>';
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
      if (hidden(p)) return;
      var active = state.path === id;
      var pct = Math.round(100 * doneCount(p) / p.days.length);
      h += '<section class="card"><div class="row spread"><h2>' + esc(p.name) + '</h2>' + (active ? '<span class="badge">Following</span>' : '') + '</div>' +
        '<p class="muted small">' + esc(p.blurb) + '</p>' +
        '<div class="bar" role="img" aria-label="' + pct + ' percent done"><span style="width:' + pct + '%"></span></div>' +
        '<p class="muted small">' + doneCount(p) + ' of ' + p.days.length + ' days finished</p>' +
        '<div class="row"><button class="btn' + (active ? ' ghost' : '') + '" type="button" data-pick="' + id + '">' + (active ? 'Go to today' : 'Follow this path') + '</button>' +
        '<a class="btn ghost" href="#list-' + id + '">See all days</a></div></section>';
    });
    h += '<section class="card"><h2>Test mode</h2><p class="muted small">For testers and demos. Unlocks every day of Lent, Easter and Advent so you can read ahead. Real users will not see this.</p>' +
      '<label class="check"><input type="checkbox" id="testmode"' + (state.testMode ? ' checked' : '') + '> Unlock all days</label></section>';
    return h;
  }

  function viewList(id) {
    var p = PATHS[id];
    if (!p || hidden(p)) return '<h1>Not found</h1><a class="btn" href="#paths">Paths</a>';
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
    var d = p && !hidden(p) && getDay(p, n);
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
      (d.pause ? '<section class="card pause"><h2>Pause</h2><p class="read">' + esc(d.pause) + '</p>' + breathMarkup(d.pause) + '</section>' : '') +
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
      'Easter: ' + doneCount(PATHS.easter) + ' of ' + PATHS.easter.days.length + ' days finished',
      'Eastertide: ' + doneCount(PATHS.eastertide) + ' of ' + PATHS.eastertide.days.length + ' days finished',
      'Advent: ' + doneCount(PATHS.advent) + ' of ' + PATHS.advent.days.length + ' days finished',
      'Stillness: ' + doneCount(PATHS.still) + ' of ' + PATHS.still.days.length + ' days finished',
      'Abiding: ' + doneCount(PATHS.abide) + ' of ' + PATHS.abide.days.length + ' days finished',
      'Wholeness: ' + doneCount(PATHS.whole) + ' of ' + PATHS.whole.days.length + ' days finished',
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
    var note = state.churchNote || 'Friends, this Lent we are praying the same passage each day. Read it, pray it, and let us hold one another up.';
    return '<h1>For churches</h1>' +
      '<section class="card"><p class="note">Mockup only. Nothing here is live yet, and the numbers below are made up to show the idea.</p>' +
      '<p class="read">Give your whole congregation the same daily prayer, matched to your sermon series or season. A pastor sets it up once, and members just open the app.</p></section>' +
      '<section class="card"><h2>A note from your pastor</h2><p class="muted small">Write a short note that members see on a day you choose. Try it:</p>' +
      '<label for="pnote">Pastor’s note</label><textarea id="pnote" placeholder="Write a note to your congregation">' + esc(state.churchNote || '') + '</textarea>' +
      '<p class="eyebrow">How members see it</p><div class="preview"><p class="read" id="pnotepreview">' + esc(note) + '</p><p class="muted small">Your pastor · Lent, Day 5</p></div></section>' +
      '<section class="card"><h2>Our Lent challenge together</h2><p class="muted small">A shared goal, shown as one total with no names.</p>' +
      '<div class="bar" role="img" aria-label="68 percent of the goal"><span style="width:68%"></span></div>' +
      '<p class="read"><strong>1,360 of 2,000</strong> sessions prayed together so far.</p>' +
      '<p class="muted small">Sample numbers.</p></section>' +
      '<section class="card"><h2>Fair for every size</h2><p class="muted small">Goals are set per member, so a church of 40 and a church of 400 each aim for the same thing: about the same number of sessions per person. Small congregations can always keep up.</p>' +
      '<div class="list"><div class="item"><span class="t"><strong>Grace Methodist (42 members)</strong><span class="muted small">31 sessions per member</span></span></div>' +
      '<div class="item"><span class="t"><strong>First Church (380 members)</strong><span class="muted small">29 sessions per member</span></span></div></div>' +
      '<p class="muted small">Sample numbers. Every church opts in, and only group totals are shown. Individuals are never ranked.</p></section>' +
      '<section class="card"><h2>What a church gets</h2><ul class="clean"><li>One shared path for the whole congregation, such as Lent together</li><li>Pastor’s notes on any day</li><li>Group totals and a shared goal, with no personal details</li><li>Optional badges and milestones, which you switch on or leave off</li><li>Flat yearly price by congregation size</li></ul>' +
      '<div class="row"><button class="btn" id="church" type="button">' + (state.churchInterest ? 'Interest noted ✓' : 'I’d like this for my church') + '</button></div></section>';
  }

  // ---------- routing ----------
  // ---------- breathing timer (Pause card): one breath, 4 seconds in and 4 seconds out ----------
  var breathTimer = null, breathOverlay = null;
  function breathParts(text) {
    var m = /Breathe in:\s*[“"]([^”"]*)[”"]\s*Breathe out:\s*[“"]([^”"]*)[”"]/.exec(text || '');
    return m ? { inn: m[1], out: m[2] } : null;
  }
  function breathMarkup(text) {
    if (!breathParts(text)) return '';
    return '<div class="breath"><p class="bcue" id="bcue" aria-live="polite"></p>' +
      '<div class="row"><button class="btn breathbtn" type="button" id="breathe"><span aria-hidden="true">&#9675;</span> Tap to take one slow breath</button></div></div>';
  }
  function endBreath(msg) {
    if (breathTimer) { clearInterval(breathTimer); breathTimer = null; }
    var o = breathOverlay; breathOverlay = null;
    if (o) { o.classList.remove('on'); setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 700); }
    document.removeEventListener('keydown', breathKey);
    var c = document.getElementById('bcue');
    if (c) c.textContent = msg || '';
  }
  function breathKey(e) { if (e.key === 'Escape') endBreath('Stopped. Try again any time.'); }
  function startBreath(text) {
    var parts = breathParts(text);
    if (!parts || breathTimer) return;
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cue, phrase, ov = null, tick = 0;
    if (!calm) {
      ov = document.createElement('div');
      ov.className = 'breathscreen dark';
      ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Breathing');
      ov.innerHTML = '<div class="bbox"><p class="bcue2" id="bcue2" aria-live="polite"></p><p class="bphrase2" id="bphrase2"></p>' +
        '<button class="btn ghost" type="button" id="bstop">Stop</button></div>';
      document.body.appendChild(ov);
      breathOverlay = ov;
      cue = ov.querySelector('#bcue2'); phrase = ov.querySelector('#bphrase2');
      ov.querySelector('#bstop').addEventListener('click', function () { endBreath('Stopped. Try again any time.'); });
      document.addEventListener('keydown', breathKey);
      void ov.offsetWidth; ov.classList.add('on');
    } else {
      cue = document.getElementById('bcue'); phrase = { textContent: '' };
    }
    function show() {
      var inPhase = tick < 4;
      cue.textContent = inPhase ? 'Breathe in' : 'Breathe out';
      phrase.textContent = inPhase ? parts.inn : parts.out;
      if (ov) {
        if (inPhase) { ov.classList.remove('dark'); ov.classList.add('bright'); }
        else { ov.classList.remove('bright'); ov.classList.add('dark'); }
      }
    }
    // start dark, then brighten to white over the first four seconds
    setTimeout(function () { if (breathTimer) show(); }, 30);
    breathTimer = setInterval(function () {
      tick++;
      if (tick >= 8) { endBreath('Rest here a moment. Amen.'); return; }
      show();
    }, 1000);
  }

  function route() {
    if (breathTimer || breathOverlay) endBreath('');
    var hash = (location.hash || '#today').slice(1);
    var html, active = 'today', m;
    if ((m = new RegExp('^(' + PATHRE + ')-(\\d+)$').exec(hash))) { html = viewDay(m[1], +m[2]); active = 'paths'; }
    else if ((m = /^day-(\d+)$/.exec(hash))) { hash = 'start-' + m[1]; html = viewDay('start', +m[1]); active = 'paths'; }
    else if ((m = new RegExp('^list-(' + PATHRE + ')$').exec(hash))) { html = viewList(m[1]); active = 'paths'; }
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
    var m = new RegExp('^(' + PATHRE + ')-(\\d+)$').exec(hash);
    if (m) {
      var p = PATHS[m[1]], n = +m[2], d = getDay(p, n);
      on('note', 'input', function (e) { state[p.noteKey][n] = e.target.value; save(); });
      on('breathe', 'click', function () { startBreath(d && d.pause); });
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
    on('testmode', 'change', function (e) {
      state.testMode = e.target.checked;
      if (!state.testMode && state.path === 'eastertide') state.path = 'start';
      save();
      toast(state.testMode ? 'Test mode on' : 'Test mode off');
      route();
    });
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
    on('pnote', 'input', function (e) {
      state.churchNote = e.target.value; save();
      var pv = document.getElementById('pnotepreview');
      if (pv) pv.textContent = state.churchNote || 'Friends, this Lent we are praying the same passage each day. Read it, pray it, and let us hold one another up.';
    });
    on('church', 'click', function () {
      state.churchInterest = true; save();
      document.getElementById('church').textContent = 'Interest noted ✓';
      toast('Noted');
    });
  }

  // installable app: only where service workers exist (the real site, not preview sandboxes)
  try {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
    }
  } catch (e) { /* ignore */ }

  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', function () {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  });
  route();
})();
