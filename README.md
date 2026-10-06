# fainaiasen.com

Plain HTML, one stylesheet, one script, no build step.
Run it with Live Server (or any server). Project data is loaded from JSON,
which browsers block when a page is opened by double-clicking.

## What's where

```
index.html                 Home
work/index.html            All work, with filters
work/project/index.html    THE project template (every project page is this file)
info/index.html            About + CV
projects/list.json         Disciplines + the order of projects
projects/<folder>/         One folder per project:
    project.json           its text
    cover.jpg              its cover (used on Home, Work and the project page)
    01.jpg, 02.jpg …       its images
assets/style.css           All styling
assets/site.js             Loads and fills everything (no need to touch)
```

## Add a project

1. Copy `projects/example-project` and rename the folder, e.g. `hideout-menus`.
2. Edit its `project.json` and swap in your images.
3. Add `"hideout-menus"` to the `projects` list in `projects/list.json`.

The page lives at `/work/project/?p=hideout-menus`.

## project.json fields

| field | |
|---|---|
| `title`, `category`, `year` | shown on cards and the project page |
| `discipline` | one of the keys in `list.json`, used by the filters |
| `selected` | `true` = also on the home page |
| `client`, `service` | fact rows; leave out to hide the row |
| `link` | `{ "text": "...", "url": "https://..." }`, optional "Live" row |
| `intro` | the sticky sentence; `<span class="fade">…</span>` for the grey half |
| `brief`, `did` | a string, or `["paragraph", "paragraph"]` |
| `cover` | optional, if the cover isn't called `cover.jpg` |
| `coverAlt` | description of the cover for screen readers |
| `images` | `["01.jpg", "02.jpg"]`, or `{ "src": "02.jpg", "alt": "..." }`. Full width, in order |

JSON is strict: double quotes everywhere, commas between items, no comma after the last one.
If a project doesn't show up, the browser console (F12) names the file with the typo.

## Images

About 2000px wide, JPG quality ~80. Keep each under ~500 KB.
