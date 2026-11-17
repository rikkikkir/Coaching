/* The yes-or-no quiz. Written by Claude for Rikki, 2026-11-16; reworked after the review of the same day.
   Every question, result and lesson line lives in the page text. This script only shows and hides them.
   Answers are kept in this browser tab only (session storage), so the plan survives a visit to another page
   and the browser's Back button. Closing the tab erases them. Nothing is sent anywhere. */
(function () {
  var quiz = document.getElementById("quiz");
  if (!quiz) { return; }
  var root = document.documentElement;
  root.classList.add("js");

  var KEY = "bt-quiz";
  var TAP_PAUSE = 450;   // milliseconds a new question ignores taps, so a double tap cannot answer two questions
  var SHOW_FIRST = 3;    // lessons shown before the "Later, if you like" line

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function all(sel) { return Array.prototype.slice.call(quiz.querySelectorAll(sel)); }
  function one(sel) { return quiz.querySelector(sel); }
  function setOn(el, on) { if (!el) { return; } if (on) { el.classList.add("on"); } else { el.classList.remove("on"); } }
  function idOf(q) { return q.getAttribute("data-id"); }

  var lists = {
    me: all('.quiz-qs[data-path="me"] .q'),
    org: all('.quiz-qs[data-path="org"] .q')
  };
  var bar = one(".track i");
  var answerButtons = all(".ans");
  var state = { path: null, answers: {}, view: "intro", i: 0 };
  var lockUntil = 0;
  var steps = 0;         // how many steps this page has added to the browser's history

  function questions() { return lists[state.path] || []; }
  function said(token) {              // "scam:yes" or "locked:no"
    var p = token.split(":");
    return state.answers[p[0]] === p[1];
  }
  function allAnswered() {
    var qs = questions();
    if (!qs.length) { return false; }
    for (var k = 0; k < qs.length; k++) { if (!state.answers[idOf(qs[k])]) { return false; } }
    return true;
  }

  // ---- Remembering, in this tab only ----
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage off: the quiz still works */ }
  }
  function restore() {
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || !lists[s.path] || !s.answers || typeof s.answers !== "object") { return; }
    var clean = {};
    each(lists[s.path], function (q) {
      var v = s.answers[idOf(q)];
      if (v === "yes" || v === "no") { clean[idOf(q)] = v; }
    });
    state.path = s.path;
    state.answers = clean;
    state.view = (s.view === "ask" || s.view === "result") ? s.view : "intro";
    state.i = Math.max(0, Math.min(lists[s.path].length - 1, parseInt(s.i, 10) || 0));
    if (state.view === "result" && !allAnswered()) { state.view = "ask"; }
  }

  // ---- The browser's own Back button ----
  function stamp() { return { bt: true, n: steps, view: state.view, i: state.i, path: state.path }; }
  function remember(push) {
    try {
      if (push) { steps += 1; history.pushState(stamp(), ""); } else { history.replaceState(stamp(), ""); }
    } catch (e) { /* history not available: the Back button on the page still works */ }
  }
  window.addEventListener("popstate", function (e) {
    var s = e.state;
    if (!s || !s.bt) { return; }
    steps = s.n || 0;
    state.view = s.view;
    state.i = s.i || 0;
    state.path = lists[s.path] ? s.path : null;
    if (!state.path) { state.view = "intro"; }
    if (state.view === "result" && !allAnswered()) { state.view = state.path ? "ask" : "intro"; state.i = 0; }
    render(true);
  });

  // ---- Moving between screens ----
  function go(view, i, push) {
    state.view = view;
    state.i = i || 0;
    remember(push !== false);
    render(true);
  }

  function place() {
    // Jump to the right spot at once (no gliding), then decide whether Yes and No may stay pinned to the bottom.
    try {
      if (state.view === "intro") { window.scrollTo(0, 0); } else { quiz.scrollIntoView(); }
    } catch (e) { /* older browsers */ }
    fit();
  }
  function fit() {
    quiz.classList.remove("flow");
    if (state.view !== "ask") { return; }
    var card = one(".q.on"), box = one(".answers");
    if (!card || !box) { return; }
    // If the question would run under the pinned buttons, let the buttons follow the question instead.
    if (card.getBoundingClientRect().bottom > box.getBoundingClientRect().top - 6) { quiz.classList.add("flow"); }
  }
  var fitTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fit, 120);
  });

  function focusOn(el) {
    if (!el) { return; }
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  function render(moveFocus) {
    quiz.setAttribute("data-state", state.view);
    quiz.setAttribute("data-path", state.path || "");
    each(all(".q"), function (q) { q.classList.remove("on"); });
    var target = null;
    if (state.view === "ask") { target = showQuestion(); }
    else if (state.view === "result") { target = showResult(); }
    else { target = one(".start"); }
    save();
    place();
    if (moveFocus) { focusOn(target); }
  }

  function showQuestion() {
    var qs = questions(), q = qs[state.i];
    q.classList.add("on");
    var label = q.querySelector(".q-num");
    if (label) { label.textContent = "Question " + (state.i + 1) + " of " + qs.length; }
    bar.style.width = Math.round((state.i / qs.length) * 100) + "%";
    var before = state.answers[idOf(q)];
    each(answerButtons, function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-answer") === before)); });
    lockUntil = Date.now() + TAP_PAUSE;
    return q.querySelector(".q-title");
  }

  function answer(value) {
    if (state.view !== "ask" || Date.now() < lockUntil) { return; }
    var qs = questions();
    state.answers[idOf(qs[state.i])] = value;
    if (state.i + 1 < qs.length) { go("ask", state.i + 1); } else { go("result", 0); }
  }

  function back() {
    // Use the browser's own history when this page added the step; otherwise step back directly.
    if (steps > 0) { try { history.back(); return; } catch (e) { /* fall through */ } }
    if (state.view === "ask" && state.i > 0) { go("ask", state.i - 1, false); } else { go("intro", 0, false); }
  }

  function showResult() {
    var path = state.path;
    each(all(".quiz-result [data-path]"), function (el) { setOn(el, el.getAttribute("data-path") === path); });

    // 1. The lesson plan: every lesson with a matching answer behind the lesson, in page order.
    var plan = one('.plan[data-path="' + path + '"]');
    var safety = plan.querySelector('[data-lesson="safety"]'), afterSafety = plan.querySelector('[data-after-safety]');
    if (safety) {
      // Urgent trouble puts the safety lesson first. Otherwise safety comes after the lessons on using the device.
      if (said("urgent:yes")) { plan.insertBefore(safety, plan.firstElementChild); }
      else if (afterSafety) { plan.insertBefore(safety, afterSafety); }
    }
    var laterHead = plan.querySelector(".later-head");
    var shown = [];
    each(plan.querySelectorAll("li.lesson"), function (li) {
      var on = li.getAttribute("data-for").split(" ").some(said);
      setOn(li, on);
      li.classList.remove("first");
      if (on) { shown.push(li); }
    });
    if (shown.length) { shown[0].classList.add("first"); }
    if (laterHead) {
      setOn(laterHead, shown.length > SHOW_FIRST);
      if (shown.length > SHOW_FIRST) { plan.insertBefore(laterHead, shown[SHOW_FIRST]); }
    }
    setOn(plan, shown.length > 0);
    each(all(".plan-head"), function (h) { setOn(h, h.getAttribute("data-path") === path && shown.length > 0); });
    each(all(".plan-empty"), function (p) { setOn(p, p.getAttribute("data-path") === path && shown.length === 0); });

    // 2. The headline follows the first lesson, so the name and "Start here" always agree.
    var name = shown.length ? shown[0].getAttribute("data-lesson") : (path === "org" ? "waitsee" : "confident");
    var headline = null;
    each(all(".type"), function (el) {
      var on = el.getAttribute("data-type") === name;
      setOn(el, on);
      if (on) { headline = el.querySelector("h2"); }
    });

    // 3. Extra lines that depend on one answer, and the urgent "Do this first" box.
    each(all("[data-show]"), function (el) { setOn(el, said(el.getAttribute("data-show"))); });

    // 4. The reader's answers, each with a button that flips the answer.
    var box = one(".your-answers");
    while (box.firstChild) { box.removeChild(box.firstChild); }
    each(questions(), function (q) {
      var id = idOf(q), text = q.getAttribute("data-short") || "", v = state.answers[id];
      var li = document.createElement("li");
      var a = document.createElement("span"); a.className = "ya-q"; a.textContent = text;
      var b = document.createElement("span"); b.className = "ya-a"; b.textContent = v === "yes" ? "Yes" : "No";
      var c = document.createElement("button"); c.type = "button"; c.className = "ya-change"; c.textContent = "Change";
      var d = document.createElement("span"); d.className = "vh"; d.textContent = " the answer to: " + text;
      c.appendChild(d);
      c.setAttribute("data-id", id);
      li.appendChild(a); li.appendChild(b); li.appendChild(c);
      box.appendChild(li);
    });

    bar.style.width = "100%";
    var alertHead = one(".quiz-result .alert.on h2");
    return alertHead || headline;
  }

  function flip(id) {
    state.answers[id] = state.answers[id] === "yes" ? "no" : "yes";
    showResult();
    save();
    focusOn(one('.ya-change[data-id="' + id + '"]'));
  }

  function startOver() {
    state.path = null; state.answers = {};
    go("intro", 0);
  }

  function printPlan() {
    stampDate();
    window.print();
  }
  function stampDate() {
    var el = one(".print-date");
    if (!el) { return; }
    var d = new Date(), text = "";
    try { text = d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch (e) { text = d.toDateString(); }
    el.textContent = " Printed " + text + ".";
  }
  window.addEventListener("beforeprint", stampDate);

  // ---- Wiring ----
  each(all(".start"), function (b) {
    b.addEventListener("click", function () {
      state.path = b.getAttribute("data-path");
      state.answers = {};
      go("ask", 0);
    });
  });
  one(".back").addEventListener("click", back);
  one(".again").addEventListener("click", startOver);
  one(".print").addEventListener("click", printPlan);
  each(answerButtons, function (b) {
    b.addEventListener("click", function () { answer(b.getAttribute("data-answer")); });
  });
  one(".your-answers").addEventListener("click", function (e) {
    var t = e.target;
    while (t && t !== this && !(t.classList && t.classList.contains("ya-change"))) { t = t.parentNode; }
    if (t && t !== this) { flip(t.getAttribute("data-id")); }
  });

  // ---- First showing: pick up where this tab left off, if anywhere ----
  restore();
  remember(false);
  render(false);

  // Tells the early check in the page head that this script arrived and ran to the end.
  window.btQuizReady = true;
})();
