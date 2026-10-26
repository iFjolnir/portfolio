/* ==========================================================================
   fainaiasen.com — page switches: which way the reels spin
   The animation itself is in style.css ("Page switches"). Pages are ordered
   Home, Work, a project, Info, Apps: going right in that order spins down, going
   left spins up. This file sits in <head> so it's listening before the new
   page is first drawn. You shouldn't need to edit this.
   ========================================================================== */

(function () {
  "use strict";

  var KEY = "fi-slide";
  var root = document.documentElement;

  function pageRank(url) {
    var path = new URL(url, location.href).pathname;
    if (path.indexOf("/work/project/") > -1) return 1.5;
    if (path.indexOf("/work/") > -1) return 1;
    if (path.indexOf("/info/") > -1) return 2;
    if (path.indexOf("/apps/") > -1) return 3;
    return 0;
  }

  var lastClicked = null;
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (a) lastClicked = a.href;
  }, true);

  // old page, just before leaving: note the direction for the next page
  window.addEventListener("pageswap", function (e) {
    if (!e.viewTransition) return;
    var to = (e.activation && e.activation.entry && e.activation.entry.url) || lastClicked;
    var a = pageRank(location.href), b = to ? pageRank(to) : a;
    try { sessionStorage.setItem(KEY, b > a ? "down" : b < a ? "up" : ""); } catch (err) { /* no direction: plain fade */ }
  });

  // new page (also when Back restores a page): pick the direction up before it's drawn
  window.addEventListener("pagereveal", function (e) {
    var slide = "";
    try { slide = sessionStorage.getItem(KEY) || ""; sessionStorage.removeItem(KEY); } catch (err) { /* plain fade */ }    if (!e.viewTransition || !slide) { root.removeAttribute("data-slide"); return; }
    root.setAttribute("data-slide", slide);
    var done = function () { root.removeAttribute("data-slide"); };
    e.viewTransition.finished.then(done, done);
  });
})();
