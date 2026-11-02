/* ==========================================================================
   fainaiasen.com — language (English / 한국어 / Русский)
   Sits in <head> on every page, so the page is already in the right language
   when it's first drawn. You shouldn't need to edit this.

   Which language: ?lang=ko (or ru / en) in the address, then the visitor's
   earlier choice, then their browser's language, then English.

   Site-wide translations live in assets/i18n/ko.json and ru.json:
     "English text exactly as on the site": "translation"
   (Projects and the discipline names carry their own { "en", "ko", "ru" } fields;
   site.js reads those.)
   An empty or missing translation shows the English. Elements to translate are
   marked with data-i18n in the HTML (and data-i18n-attr="aria-label" for labels).
   Open the site in Korean or Russian and type FI_MISSING in the browser console
   to list the English that has no translation yet.
   ========================================================================== */

(function () {
  "use strict";

  var LANGS = ["en", "ko", "ru"];
  var KEY = "fi-lang";
  var root = document.documentElement;
  var BASE = (document.currentScript && document.currentScript.src || "").replace(/lang\.js(\?.*)?$/, "i18n/");

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function detect() {
    var list = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i]).slice(0, 2).toLowerCase();
      if (LANGS.indexOf(l) > -1) return l;
    }
    return "en";
  }

  var asked = (new URLSearchParams(location.search).get("lang") || "").toLowerCase();
  if (LANGS.indexOf(asked) > -1) write(KEY, asked);
  var lang = LANGS.indexOf(read(KEY)) > -1 ? read(KEY) : detect();

  var dict = null;                       // the current language's translations
  var MISSING = window.FI_MISSING = [];  // English with no translation (for checking)

  // the same text always gives the same key, however the HTML is spaced out
  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }

  // translate one string (English in, English out when there's no translation)
  function t(s) {
    if (lang === "en" || !dict || s == null || s === "") return s;
    var k = norm(s), v = dict[k];
    if (v) return v;
    if (k && MISSING.indexOf(k) < 0) MISSING.push(k);
    return s;
  }

  // each translated piece is marked with its language (so Korean gets Korean spacing
  // and screen readers read it right); text still in English is marked English
  function markEnglish(el, isEnglish) {
    if (el.__fiLang == null) el.__fiLang = el.getAttribute("lang") || "";
    if (isEnglish) el.setAttribute("lang", "en");
    else if (lang !== "en") el.setAttribute("lang", lang);
    else if (el.__fiLang) el.setAttribute("lang", el.__fiLang);
    else el.removeAttribute("lang");
  }

  // translate one marked element (and remember its English, to switch back)
  function apply(el) {
    if (el.__fiEn == null) el.__fiEn = el.innerHTML;
    if (el.hasAttribute("data-i18n")) {
      var out = lang === "en" ? el.__fiEn : t(el.__fiEn);
      if (el.innerHTML !== out) el.innerHTML = out;
      if (el.tagName !== "TITLE") markEnglish(el, lang !== "en" && out === el.__fiEn);
    }
    var attrs = el.getAttribute("data-i18n-attr");
    if (attrs) attrs.split(/\s+/).forEach(function (a) {
      var store = "__fiEn_" + a;
      if (el[store] == null) el[store] = el.getAttribute(a) || "";
      el.setAttribute(a, lang === "en" ? el[store] : t(el[store]));
    });
  }
  var MARKED = "[data-i18n], [data-i18n-attr]";
  function applyAll() { Array.prototype.forEach.call(document.querySelectorAll(MARKED), apply); }

  /* ---------- translations: saved copy first, fresh copy in the background ---------- */

  function cacheKey(l) { return "fi-i18n-" + l; }
  function loadDict(l, done) {
    var saved = read(cacheKey(l));
    if (saved) { try { done(JSON.parse(saved), true); } catch (e) { saved = null; } }
    fetch(BASE + l + ".json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) {
        if (!txt || txt === saved) return;
        var fresh; try { fresh = JSON.parse(txt); } catch (e) { console.error("Typo in i18n/" + l + ".json: " + e.message); return; }
        write(cacheKey(l), txt);
        done(fresh, false);
      })
      .catch(function () {});
  }

  var dicts = {};   // every language loaded so far, ready to switch to
  function clean(d) {
    var out = {};
    Object.keys(d || {}).forEach(function (k) { if (d[k]) out[norm(k)] = d[k]; });
    return out;
  }
  function setDict(d) { dict = dicts[lang] = clean(d); }

  /* ---------- first load ---------- */

  root.lang = lang;
  root.setAttribute("data-lang", lang);

  if (lang !== "en") {
    var ready = false;
    // no saved translations yet (first visit in this language): hide the page
    // for a moment instead of flashing English
    if (!read(cacheKey(lang))) {
      root.classList.add("i18n-pending");
      setTimeout(function () { root.classList.remove("i18n-pending"); }, 2500);
    }
    loadDict(lang, function (d) {
      setDict(d);
      if (ready) { applyAll(); document.dispatchEvent(new CustomEvent("fi:lang", { detail: lang })); }
      root.classList.remove("i18n-pending");
    });

    // translate marked elements as the browser reads them, before they're drawn.
    // An element is only translated once the browser has moved past it (complete).
    var queue = [];
    function flush(upTo) {
      while (queue.length && !(upTo && queue[0].contains(upTo))) {
        var el = queue.shift();
        if (dict) apply(el);
      }
    }
    var watcher = new MutationObserver(function (list) {
      list.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.nodeType !== 1) return;
          flush(n);
          if (n.matches(MARKED)) queue.push(n);
          Array.prototype.forEach.call(n.querySelectorAll(MARKED), function (c) { queue.push(c); });
        });
      });
    });
    watcher.observe(root, { childList: true, subtree: true });
    Array.prototype.forEach.call(document.querySelectorAll(MARKED), function (el) { queue.push(el); });
    document.addEventListener("DOMContentLoaded", function () {
      watcher.disconnect();
      flush(null);
      ready = true;
      if (dict) applyAll();
    });
  }

  /* ---------- switching while on the page ----------
     The text that changes fades out, swaps while it's invisible (so the new
     lengths never jolt the layout) and fades back in. Timing: --relang-out and
     --relang-in in style.css.
     FI_setLang("ko") switches and remembers the choice;
     FI_setLang("ko", { remember: false }) only shows it (the greeting's spin on Home). */

  var target = lang, swapping = null;
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cssTime(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim(), n = parseFloat(v);
    return isNaN(n) ? fallback : /ms$/.test(v) ? n : n * 1000;
  }

  function show(l, d) {
    lang = l;
    dict = d;
    root.lang = l;
    root.setAttribute("data-lang", l);
    MISSING.length = 0;
    applyAll();
    document.dispatchEvent(new CustomEvent("fi:lang", { detail: l }));
  }

  /* The crossfade: the browser takes a picture of each piece of text that's about
     to change, then the old picture sinks and fades while the new text rises and
     fades in, like the greeting (--relang-time, --relang-slide in style.css).
     Pieces are matched by their place on the page, so lists that get rebuilt
     (cards, filters) still pair up; text that stays the same doesn't move. */

  var LIVE = "[data-i18n], [data-clock], [data-field]:not(img), [data-filter-label], .card__caption, " +
             "[data-render='disciplines'], [data-render='disciplines-inline'], [data-render='filters'], " +
             ".project-caption, .apps__note";
  var named = [], sheet = null, running = null;

  function placeOf(el) {
    var path = [];
    for (; el && el !== document.body; el = el.parentElement) {
      var i = 0, s = el;
      while ((s = s.previousElementSibling)) i++;
      path.unshift(i);
    }
    return path.join(".");
  }
  function pieces() {
    var list = Array.prototype.filter.call(document.querySelectorAll(LIVE), function (el) {
      return el.offsetParent !== null && !el.closest("[hidden], .hello, .visually-hidden");
    });
    return list.filter(function (el) { return !list.some(function (o) { return o !== el && o.contains(el); }); });
  }
  // on screen AND actually visible there: text under the phone menu, its veil or the
  // fixed header is left out, or its crossfade would be drawn on top of them
  function onScreen(el) {
    var r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth)) return false;
    var x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
    var y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    var hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit));
  }
  function nameIt(el, name) { el.style.viewTransitionName = name; named.push(el); }
  function unnameAll() { named.forEach(function (el) { el.style.viewTransitionName = ""; }); named = []; }

  function crossfade(l, d) {
    if (running) { try { running.skipTransition(); } catch (e) {} }
    unnameAll();
    var slide = parseFloat(getComputedStyle(root).getPropertyValue("--relang-slide")) || 0;
    var places = {}, css = "", n = 0;

    // before: picture every piece of text on screen
    pieces().forEach(function (el) {
      if (!onScreen(el)) return;
      var name = "fi-t" + (n++), cs = getComputedStyle(el);
      places[placeOf(el)] = { name: name, html: el.innerHTML };
      nameIt(el, name);
      var shift = el.querySelector("img") ? 0 : parseFloat(cs.fontSize) * slide;
      var right = /right|end/.test(cs.textAlign) || (el.closest(".col--right, .bar__end") && cs.textAlign !== "left");
      // each picture at its own size (never stretched), anchored on the side the text is aligned to
      var box = "--fi-shift:" + shift.toFixed(1) + "px;inline-size:auto;block-size:auto;" +
                (right ? "inset-inline-start:auto;inset-inline-end:0;" : "");
      css += "::view-transition-group(" + name + "){animation-duration:var(--relang-time)}" +
             "::view-transition-old(" + name + "){" + box + "animation:fi-out var(--relang-time) ease both}" +
             "::view-transition-new(" + name + "){" + box + "animation:fi-in var(--relang-time) ease both}";
    });
    // the greeting has its own animation: show it live, never crossfaded with itself
    var hello = document.querySelector(".hello");
    if (hello && onScreen(hello)) {
      nameIt(hello, "fi-hello");
      css += "::view-transition-group(fi-hello),::view-transition-new(fi-hello){animation:none}::view-transition-old(fi-hello){display:none}";
    }

    if (!sheet) { sheet = document.createElement("style"); document.head.appendChild(sheet); }
    sheet.textContent = css;

    var me = document.startViewTransition(function () {
      show(l, d);
      // after: pair the new text with its picture (rebuilt lists get new elements)
      var still = "";
      pieces().forEach(function (el) {
        var p = places[placeOf(el)];
        if (!p) return;
        if (el.style.viewTransitionName !== p.name) nameIt(el, p.name);
        if (el.innerHTML === p.html) still += "::view-transition-old(" + p.name + "){display:none}::view-transition-new(" + p.name + "){animation:none}";
      });
      sheet.textContent += still;
    });
    running = me;
    // tidy up afterwards, unless a newer switch has already taken over
    function done() { if (running !== me) return; unnameAll(); sheet.textContent = ""; running = null; }
    me.finished.then(done, done);
  }

  function swap(l, d) {
    if (calm) { show(l, d); return; }
    if (document.startViewTransition && !document.hidden) { crossfade(l, d); return; }
    // browsers without the crossfade: fade out, swap, fade back in
    clearTimeout(swapping);
    root.classList.add("is-relang");
    swapping = setTimeout(function () {
      swapping = null;
      show(l, d);
      // two frames, so freshly built text starts invisible and fades in too
      requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove("is-relang"); }); });
    }, cssTime("--relang-out", 150));
  }

  function setLang(l, opts) {
    if (LANGS.indexOf(l) < 0) return;
    if (!(opts && opts.remember === false)) write(KEY, l);
    target = l;
    if (l === lang && !swapping) return;
    if (l === "en") { swap("en", null); return; }
    if (dicts[l]) { swap(l, dicts[l]); return; }
    var first = true;
    loadDict(l, function (d) {
      dicts[l] = clean(d);
      if (target !== l) return;
      if (first) { first = false; swap(l, dicts[l]); }
      else if (lang === l) { dict = dicts[l]; applyAll(); document.dispatchEvent(new CustomEvent("fi:lang", { detail: l })); }
    });
  }

  // have every language ready, so a switch (or the greeting's spin) needs no waiting
  function preload() {
    LANGS.forEach(function (l) { if (l !== "en" && !dicts[l]) loadDict(l, function (d) { dicts[l] = clean(d); }); });
  }

  window.FI_LANG = lang;
  window.FI_t = t;
  // site.js: mark a node it filled as still-English or translated
  window.FI_markLang = function (node, isEnglish) { markEnglish(node, !!isEnglish); return node; };
  window.FI_lang = function () { return lang; };
  window.FI_setLang = setLang;
  window.FI_preloadLangs = preload;
  window.FI_saved = function () { return LANGS.indexOf(read(KEY)) > -1 ? read(KEY) : null; };
})();
