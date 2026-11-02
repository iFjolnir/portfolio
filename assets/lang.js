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

  function setDict(d) {
    var clean = {};
    Object.keys(d || {}).forEach(function (k) { if (d[k]) clean[norm(k)] = d[k]; });
    dict = clean;
  }

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

  /* ---------- switching while on the page (the names on Home) ---------- */

  function setLang(l) {
    if (LANGS.indexOf(l) < 0) return;
    lang = l;
    write(KEY, l);
    root.lang = l;
    root.setAttribute("data-lang", l);
    MISSING.length = 0;
    var finish = function () {
      applyAll();
      document.dispatchEvent(new CustomEvent("fi:lang", { detail: l }));
    };
    if (l === "en") { dict = null; finish(); return; }
    loadDict(l, function (d) { if (lang === l) { setDict(d); finish(); } });
  }

  window.FI_LANG = lang;
  window.FI_t = t;
  // site.js: mark a node it filled as still-English or translated
  window.FI_markLang = function (node, isEnglish) { markEnglish(node, !!isEnglish); return node; };
  window.FI_lang = function () { return lang; };
  window.FI_setLang = setLang;
})();
