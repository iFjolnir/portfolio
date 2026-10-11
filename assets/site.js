/* ==========================================================================
   fainaiasen.com — site script
   You shouldn't need to edit this.
   Projects live in /projects: list.json (order + disciplines) and one folder
   per project with a project.json and its images.
   ========================================================================== */

(function () {
  "use strict";

  var body = document.body;
  var ROOT = body.getAttribute("data-root") || "./";
  var DATA = ROOT + "projects/";
  var PROJECTS = [];
  var DISCIPLINES = [];

  /* ---------- helpers ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function shortYear(y) { return y ? "\u2019" + String(y).slice(-2) : ""; }
  function projectUrl(p) { return ROOT + "work/project/?p=" + encodeURIComponent(p.slug); }
  function fileUrl(p, name) { return DATA + p.slug + "/" + name; }
  function coverUrl(p) { return fileUrl(p, p.cover || "cover.jpg"); }
  // "discipline" can be one key ("web") or several (["web", "identity"])
  function inDiscipline(p, key) {
    var d = p.discipline;
    return Array.isArray(d) ? d.indexOf(key) > -1 : d === key;
  }
  function labelFor(key) {
    var d = DISCIPLINES.filter(function (x) { return x.key === key; })[0];
    return d ? d.label : key;
  }

  // black or white text, whichever reads better on a given hex colour
  function inkFor(hex) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r + g + b)) return "#ffffff";
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150 ? "#121212" : "#ffffff";
  }

  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(r.status + " — " + url);
      return r.text();
    }).then(function (txt) {
      try { return JSON.parse(txt); }
      catch (e) { throw new Error("Typo in " + url + ": " + e.message); }
    });
  }

  /* ---------- Busan clock ---------- */

  var clocks = all("[data-clock]");
  if (clocks.length) {
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit", hour12: true
      });
    } catch (e) { fmt = null; }

    var tick = function () {
      if (!fmt) return;
      var t = fmt.format(new Date()).replace(/\s?([ap])\.?m\.?/i, function (_, a) {
        return " " + a.toLowerCase() + "m";
      });
      clocks.forEach(function (c) { c.textContent = "Busan, " + t; });
    };
    tick();
    setInterval(tick, 15000);
  }

  /* ---------- nav: mark the current page ---------- */

  var page = body.getAttribute("data-page");
  all(".bar__nav a").forEach(function (a) {
    if (a.getAttribute("data-nav") === page) a.setAttribute("aria-current", "page");
  });

  /* ---------- load the projects (only on pages that show them) ---------- */

  var isTemplate = body.getAttribute("data-template") === "project";
  var needsData = isTemplate || document.querySelector("[data-render], [data-count]");
  if (!needsData) return;

  getJSON(DATA + "list.json")
    .then(function (list) {
      DISCIPLINES = list.disciplines || [];
      var slugs = list.projects || [];
      return Promise.all(slugs.map(function (slug) {
        return getJSON(DATA + slug + "/project.json")
          .then(function (p) { p.slug = slug; return p; })
          .catch(function (e) { console.error(e.message); return null; }); // one broken project doesn't break the site
      }));
    })
    .then(function (items) {
      PROJECTS = items.filter(Boolean);
      renderLists();
      if (isTemplate) renderProject();
    })
    .catch(function (e) {
      console.error(e.message);
      if (isTemplate) showNotice("Couldn\u2019t load the project list. " + e.message);
    });

  /* ---------- project card ---------- */

  function card(p, opts) {
    var img = el("img", {
      src: coverUrl(p),
      alt: p.coverAlt || p.title || "",
      loading: "lazy",
      decoding: "async"
    });
    var media = el("div", { "class": "media" + (opts && opts.crop ? " media--4x3" : "") }, [img]);
    var caption = el("div", { "class": "card__caption" }, [
      el("span", null, [
        el("span", { "class": "card__title", text: p.title || p.slug }),
        el("span", { "class": "card__cat", text: p.category || "" })
      ]),
      el("span", { "class": "card__year", text: shortYear(p.year) })
    ]);
    return el("a", { "class": "card", href: projectUrl(p) }, [media, caption]);
  }

  /* ---------- lists: home, work page, index ---------- */

  function renderLists() {
    all("[data-render='selected']").forEach(function (box) {
      PROJECTS.filter(function (p) { return p.selected; })
        .forEach(function (p) { box.appendChild(el("li", null, [card(p)])); });
    });

    all("[data-count='selected']").forEach(function (n) {
      n.textContent = "(" + PROJECTS.filter(function (p) { return p.selected; }).length + ")";
    });
    all("[data-count='all']").forEach(function (n) {
      n.textContent = "(" + PROJECTS.length + ")";
    });

    all("[data-render='disciplines']").forEach(function (box) {
      DISCIPLINES.forEach(function (d) {
        box.appendChild(el("li", null, [
          el("a", { href: ROOT + "work/?f=" + d.key, text: d.label })
        ]));
      });
    });

    all("[data-render='disciplines-inline']").forEach(function (box) {
      DISCIPLINES.forEach(function (d, n) {
        if (n) box.appendChild(document.createTextNode(" \u00b7 "));
        box.appendChild(el("a", { href: ROOT + "work/?f=" + d.key, text: d.label }));
      });
    });

    var filterBox = document.querySelector("[data-render='filters']");
    var grid = document.querySelector("[data-render='grid']");
    var indexBox = document.querySelector("[data-render='index']");

    if (filterBox) {
      [{ key: "all", label: "All" }].concat(DISCIPLINES).forEach(function (o) {
        var count = o.key === "all"
          ? PROJECTS.length
          : PROJECTS.filter(function (p) { return inDiscipline(p, o.key); }).length;
        var a = el("a", { href: o.key === "all" ? "./" : "?f=" + o.key, "data-filter": o.key }, [
          el("span", { text: o.label }),
          el("span", { text: String(count) })
        ]);
        a.addEventListener("click", function (e) {
          e.preventDefault();
          history.replaceState(null, "", o.key === "all" ? location.pathname : "?f=" + o.key);
          renderWork();
        });
        filterBox.appendChild(el("li", null, [a]));
      });
    }

    if (indexBox) {
      PROJECTS.forEach(function (p) {
        indexBox.appendChild(el("li", null, [
          el("a", { href: projectUrl(p) }, [
            el("span", { "class": "ink", text: shortYear(p.year) }),
            el("span", { text: p.title || p.slug })
          ])
        ]));
      });
    }

    function currentFilter() {
      var f = new URLSearchParams(location.search).get("f");
      return DISCIPLINES.some(function (d) { return d.key === f; }) ? f : "all";
    }

    function renderWork() {
      var f = currentFilter();
      var list = PROJECTS.filter(function (p) { return f === "all" || inDiscipline(p, f); });
      if (grid) {
        grid.innerHTML = "";
        list.forEach(function (p) { grid.appendChild(el("li", null, [card(p, { crop: true })])); });
        if (!list.length) grid.appendChild(el("li", { "class": "empty", text: "Nothing in this category yet." }));
      }
      all("[data-render='filters'] a").forEach(function (a) {
        a.setAttribute("aria-current", a.getAttribute("data-filter") === f ? "true" : "false");
      });
      all("[data-filter-label]").forEach(function (n) {
        n.textContent = f === "all" ? "All work" : labelFor(f);
      });
    }

    if (grid || filterBox) renderWork();
  }

  /* ---------- the project template ---------- */

  function showNotice(msg) {
    // nothing to show: hide the empty parts of the template
    all(".project-thumb, .facts, .project-notes, [data-render='next']").forEach(function (n) { n.hidden = true; });
    var intro = document.querySelector("[data-field='intro']");
    if (intro) {
      intro.innerHTML = "";
      intro.appendChild(el("span", { "class": "notice", html: msg }));
    }
    body.classList.add("is-ready");
  }

  // brief / did: a string, or a list of strings (one paragraph each)
  function paragraphs(v) {
    if (Array.isArray(v)) return v.map(function (t) { return "<p>" + t + "</p>"; }).join("");
    return v || "";
  }

  function renderProject() {
    var slug = new URLSearchParams(location.search).get("p");
    var i = -1;
    PROJECTS.forEach(function (p, n) { if (p.slug === slug) i = n; });

    if (i < 0) {
      var safe = String(slug || "").replace(/[<>&"]/g, "");
      showNotice(slug
        ? "No project called <code>" + safe + "</code>. Check its folder name in <code>projects/list.json</code>. <a href=\"../\">All work</a>"
        : "No project chosen. <a href=\"../\">See all work</a>");
      return;
    }

    var p = PROJECTS[i];
    var next = PROJECTS[(i + 1) % PROJECTS.length];

    document.title = (p.title || slug) + " \u2014 Faina Iasen";

    // optional per-project selection colour:
    //   "selection": "#c08a5b"                              (text colour picked automatically)
    //   "selection": { "bg": "#c08a5b", "ink": "#ffffff" }  (both chosen by you)
    if (p.selection) {
      var selBg = typeof p.selection === "string" ? p.selection : p.selection.bg;
      var selInk = typeof p.selection === "object" ? p.selection.ink : null;
      if (selBg) {
        document.documentElement.style.setProperty("--selection-bg", selBg);
        document.documentElement.style.setProperty("--selection-ink", selInk || inkFor(selBg));
      }
    }

    // text fields
    var fields = {
      title: p.title || slug,
      category: p.category,
      year: p.year,
      client: p.client,
      service: p.service,
      intro: p.intro,
      brief: paragraphs(p.brief),
      did: paragraphs(p.did)
    };
    Object.keys(fields).forEach(function (k) {
      all("[data-field='" + k + "']").forEach(function (n) {
        var v = fields[k];
        var row = n.closest("[data-optional]");   // fact rows / sections with no value get hidden
        if (v == null || v === "") { if (row) row.hidden = true; return; }
        n.innerHTML = v;
      });
    });

    // optional link row: "link": { "text": "apps.fainaiasen.com", "url": "https://apps.fainaiasen.com/" }
    all("[data-field='link']").forEach(function (n) {
      var row = n.closest("[data-optional]");
      if (!p.link || !p.link.url) { if (row) row.hidden = true; return; }
      n.innerHTML = "";
      n.appendChild(el("a", { href: p.link.url, text: p.link.text || p.link.url }));
    });

    // cover thumbnail
    all("[data-field='cover']").forEach(function (img) {
      img.src = coverUrl(p);
      img.alt = p.coverAlt || p.title || "";
    });

    // images, full width. Each entry is either a filename ("01.jpg") or an object:
    //   { "src": "01.jpg", "alt": "…",
    //     "title": "…", "text": "…" or ["…", "…"], "link": { "text": "…", "url": "…" } }
    // title / text / link are optional and appear under that image.
    // The first image goes in its own box (phones show it before the brief).
    var firstBox = document.querySelector("[data-render='images-first']");
    var restBox = document.querySelector("[data-render='images']");
    var n = 0;
    (p.images || []).forEach(function (item) {
      var o = typeof item === "string" ? { src: item } : (item || {});
      if (!o.src) return;

      var kids = [el("img", { src: fileUrl(p, o.src), alt: o.alt || "", decoding: "async" })];

      if (o.title || o.text || (o.link && o.link.url)) {
        var cap = el("figcaption", { "class": "project-caption" });
        if (o.title) cap.appendChild(el("h3", { "class": "project-caption__title", html: o.title }));
        if (o.text) cap.appendChild(el("div", { "class": "project-caption__text t-body prose", html: paragraphs(o.text) }));
        if (o.link && o.link.url) {
          cap.appendChild(el("p", { "class": "project-caption__link t-small" }, [
            el("a", { href: o.link.url, text: o.link.text || o.link.url, target: "_blank", rel: "noopener" })
          ]));
        }
        kids.push(cap);
      }

      var fig = el("figure", { "class": "project-image" + (kids.length > 1 ? " has-caption" : "") }, kids);
      var target = (n === 0 && firstBox) ? firstBox : restBox;
      if (target) target.appendChild(fig);
      n += 1;
    });

    // next project
    all("[data-render='next']").forEach(function (a) {
      if (PROJECTS.length < 2) { a.hidden = true; return; }
      a.href = projectUrl(next);
      var t = a.querySelector(".next__title");
      if (t) t.textContent = next.title || next.slug;
    });

    setupViewer();
    body.classList.add("is-ready");
  }

  /* ---------- image viewer: tap an image to see it almost full screen ----------
     Arrows / swipe to move between images, × / Esc / swipe down / browser Back to close.
     The controls sit on top of the picture and turn black or white depending on
     what's underneath them. */

  function setupViewer() {
    var imgs = all("[data-render='images-first'] img, [data-render='images'] img");
    if (!imgs.length) return;

    var ICON = {
      close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
      prev:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
      next:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
    };

    var box = el("div", { "class": "viewer", role: "dialog", "aria-modal": "true", "aria-label": "Image viewer", hidden: "" });
    box.innerHTML =
      '<div class="viewer__stage"><img class="viewer__img" alt=""></div>' +
      '<div class="viewer__frame">' +
        '<button class="viewer__close viewer__ctl" type="button" aria-label="Close">' + ICON.close + '</button>' +
        '<button class="viewer__prev viewer__ctl" type="button" aria-label="Previous image">' + ICON.prev + '</button>' +
        '<p class="viewer__meta viewer__ctl t-small"><span class="viewer__count"></span><span class="viewer__title"></span></p>' +
        '<button class="viewer__next viewer__ctl" type="button" aria-label="Next image">' + ICON.next + '</button>' +
      '</div>';
    document.body.appendChild(box);

    var stage = box.querySelector(".viewer__stage");
    var frame = box.querySelector(".viewer__frame");
    var big = box.querySelector(".viewer__img");
    var count = box.querySelector(".viewer__count");
    var title = box.querySelector(".viewer__title");
    var prevBtn = box.querySelector(".viewer__prev");
    var nextBtn = box.querySelector(".viewer__next");
    var closeBtn = box.querySelector(".viewer__close");
    var ctls = all(".viewer__ctl");
    var current = -1, opener = null, pushed = false;

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext && canvas.getContext("2d", { willReadFrequently: true });

    function captionOf(img) {
      var fig = img.closest("figure");
      var t = fig && fig.querySelector(".project-caption__title");
      return t ? t.textContent : "";
    }

    // lay the controls over the picture itself, wherever it ends up on screen
    function placeFrame() {
      var r = big.getBoundingClientRect();
      frame.style.left = r.left + "px";
      frame.style.top = r.top + "px";
      frame.style.width = r.width + "px";
      frame.style.height = r.height + "px";
    }

    // read how light the picture is under each control: dark -> white controls
    function setTones() {
      ctls.forEach(function (c) { c.classList.remove("on-dark"); });
      if (!ctx || !big.naturalWidth) return;
      try {
        var w = 96, h = Math.max(1, Math.round(96 * big.naturalHeight / big.naturalWidth));
        canvas.width = w; canvas.height = h;
        ctx.drawImage(big, 0, 0, w, h);
        var ir = big.getBoundingClientRect();
        ctls.forEach(function (c) {
          if (c.style.visibility === "hidden") return;
          var cr = c.getBoundingClientRect();
          var x0 = Math.max(0, Math.floor((cr.left - ir.left) / ir.width * w));
          var y0 = Math.max(0, Math.floor((cr.top - ir.top) / ir.height * h));
          var x1 = Math.min(w, Math.ceil((cr.right - ir.left) / ir.width * w));
          var y1 = Math.min(h, Math.ceil((cr.bottom - ir.top) / ir.height * h));
          if (x1 <= x0 || y1 <= y0) return;
          var d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data, sum = 0, n = 0;
          for (var k = 0; k < d.length; k += 4) {
            sum += 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]; n++;
          }
          if (n && sum / n < 140) c.classList.add("on-dark");
        });
      } catch (e) { /* image can't be read: controls stay black, with their soft halo */ }
    }

    function refresh() { placeFrame(); setTones(); }
    big.addEventListener("load", function () { if (current > -1) refresh(); });
    window.addEventListener("resize", function () { if (current > -1) refresh(); });

    function show(i) {
      if (i < 0 || i >= imgs.length) return;
      current = i;
      big.src = imgs[i].currentSrc || imgs[i].src;
      big.alt = imgs[i].alt || "";
      count.textContent = (i + 1) + " / " + imgs.length;
      var t = captionOf(imgs[i]);
      title.textContent = t;
      title.hidden = !t;
      prevBtn.style.visibility = i > 0 ? "visible" : "hidden";
      nextBtn.style.visibility = i < imgs.length - 1 ? "visible" : "hidden";
      if (big.complete && big.naturalWidth) refresh();
      [i - 1, i + 1].forEach(function (k) { if (imgs[k]) { var pre = new Image(); pre.src = imgs[k].src; } });
    }

    function open(i) {
      opener = imgs[i];
      box.hidden = false;
      document.documentElement.classList.add("viewer-open");
      show(i);
      requestAnimationFrame(function () { box.classList.add("is-open"); refresh(); });
      // so the phone's Back gesture closes the viewer instead of leaving the page
      try { history.pushState({ viewer: true }, ""); pushed = true; } catch (e) { pushed = false; }
      closeBtn.focus({ preventScroll: true });
    }

    function hide() {
      box.classList.remove("is-open");
      box.hidden = true;
      document.documentElement.classList.remove("viewer-open");
      current = -1;
      if (opener) opener.focus({ preventScroll: true });
    }

    function close() {
      if (current < 0) return;
      if (pushed) { pushed = false; history.back(); }   // popstate below does the hiding
      else hide();
    }

    window.addEventListener("popstate", function () {
      if (current > -1) { pushed = false; hide(); }
    });

    imgs.forEach(function (img, i) {
      img.classList.add("is-zoomable");
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "Enlarge image" + (img.alt ? ": " + img.alt : ""));
      img.addEventListener("click", function () { open(i); });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
      });
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", function () { show(current - 1); });
    nextBtn.addEventListener("click", function () { show(current + 1); });

    // tap the empty space around the picture to close
    stage.addEventListener("click", function (e) { if (e.target !== big) close(); });

    document.addEventListener("keydown", function (e) {
      if (current < 0) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
      else if (e.key === "Tab") {           // keep keyboard focus inside the viewer
        var f = [closeBtn, prevBtn, nextBtn].filter(function (b) { return b.style.visibility !== "hidden"; });
        var k = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });

    // swipe: left / right to move, down to close
    var sx = 0, sy = 0, tracking = false;
    box.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
    });
  }
})();
