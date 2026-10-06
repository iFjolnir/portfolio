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

    body.classList.add("is-ready");
  }
})();
