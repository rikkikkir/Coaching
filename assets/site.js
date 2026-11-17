/* Rikki: Boomer Tutor and AI Consultant. Written by Claude for Rikki, 2026-11-16.
   Three small jobs: the text size buttons, the look switch, the menu on narrow screens.
   Nothing is sent anywhere. The two choices stay in the reader's own browser. */
(function () {
  var root = document.documentElement;
  root.classList.add("js");

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function keep(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private window: the choice lasts for this page only */ }
  }

  // Text size
  var sizeButtons = document.querySelectorAll(".size button");
  function showSize() {
    var now = root.getAttribute("data-size") || "1";
    each(sizeButtons, function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-size") === now)); });
  }
  each(sizeButtons, function (b) {
    b.addEventListener("click", function () {
      root.setAttribute("data-size", b.getAttribute("data-size"));
      keep("bt-size", b.getAttribute("data-size"));
      showSize();
    });
  });
  showSize();

  // Night and Daylight
  var look = document.querySelector(".look");
  if (look) {
    look.addEventListener("click", function () {
      var next = root.getAttribute("data-look") === "night" ? "day" : "night";
      root.setAttribute("data-look", next);
      keep("bt-look", next);
    });
  }

  // Menu on narrow screens
  var menu = document.querySelector(".menu-btn");
  var panel = document.getElementById("panel");
  if (menu && panel) {
    menu.addEventListener("click", function () {
      var open = !panel.classList.contains("open");
      if (open) { panel.classList.add("open"); } else { panel.classList.remove("open"); }
      menu.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.key === "Esc") && panel.classList.contains("open")) {
        panel.classList.remove("open");
        menu.setAttribute("aria-expanded", "false");
        menu.focus();
      }
    });
  }

  // Tells the early check in the page head that this script arrived and ran to the end.
  window.btReady = true;
})();
