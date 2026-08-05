# Forage Library

Forkable, HTML-first knowledge repository. HTML is the canonical layer — every article is a permanent, version-controlled file. PDF is generated from it automatically. Nothing here depends on a closed platform or a paid CMS.

## One-time setup (do this before the first push)

1. Create the GitHub repo (see "Push this" below) — or publish directly from GitHub Desktop.
2. In the repo, go to **Settings → Pages → Source**, set it to **GitHub Actions**. This is the only manual step. Without it the deploy job has nowhere to publish to.

## The vibe-writing loop

1. Copy `templates/article-template.html` into `articles/`, `frameworks/`, or `courses/`, rename it.
2. Write. No forced structure — the template is a minimal skeleton (ribbon + page + base typography). Reuse `.workflow` / `.card` / `.questions` / `.footer` / `.signature` if useful, or just write plain `h1`/`h2`/`p`/`ul`. Copy the `.page` block again for a second sheet. Embed charts as inline SVG or images in `assets/images/`.
3. Add one `<li>` link to it in `index.html`.
4. Commit and push (or let GitHub Desktop do it).

Push triggers everything else: a headless-Chromium pass exports every article to a matching `.pdf` (this is what actually fixes the alignment problem — see "Why the old PDF export broke" below), commits those PDFs back to the repo, and deploys the whole site to GitHub Pages. No online converter, no manual export step, ever again.

## Repository structure

```
forage-library/
├── index.html
├── articles/            one HTML file per piece, PDF sits next to it after first push
├── frameworks/
├── courses/
├── templates/
│   └── article-template.html
├── assets/
│   ├── css/forage.css   shared stylesheet — palette, ribbon, print rules
│   ├── js/ribbon.js     ribbon interactions
│   └── images/
├── scripts/
│   └── export-pdfs.mjs  the PDF export script
└── .github/workflows/publish.yml   CI: export PDFs → deploy Pages
```

## The ribbon

Every page gets the same top bar: title flush left; on the right, the published date, a Share button, a Copy Link icon, a light/dark toggle, and a kebab menu (Copy link / Copy page content / Export).

"Export" tries to open the pre-built `.pdf` next to the page first. If that doesn't exist yet (e.g. previewing locally before the first push), it falls back to the browser's native print dialog — which, because the print stylesheet is already correct, still produces a clean A4 PDF.

## Light / dark mode

Light is the default. The toggle button sets `data-theme` on `<html>` and remembers the choice in `localStorage` (`forage-theme`) — persists across pages and visits. A small inline script in `<head>`, before the stylesheet loads, applies the saved theme immediately so there's no flash of the wrong mode. PDFs always render light regardless of the reader's toggle state — `@media print` forces it, since that's what prints cleanly.

Tokens are CSS custom properties in `assets/css/forage.css` (`:root` = light, `html[data-theme="dark"]` = dark). Palette is lifted from the "Generative AI Documentation Process" sample — teal `#167D6B` / blue `#2596be` on white for light, lightened teal `#35c9ac` / blue `#4fb3d9` on near-black for dark. Not the Forage brand-skill tokens — that's parked for now per your instruction.

## Why the old PDF export broke

Online HTML-to-PDF converters use their own rendering engines, and most of them handle `@page` sizing, `break-before`/`break-after`, and custom fonts inconsistently — that's the actual cause of the alignment drift, not the HTML being wrong. `scripts/export-pdfs.mjs` drives real headless Chromium instead — the same engine as Chrome's own "Print to PDF" — so what renders in a browser is exactly what ships as the PDF. Deterministic, no manual step, runs on every push.

## License

CC BY-NC-SA 4.0 — see `LICENSE`. Standing decision now: every Forage repo under `github.com/forageopen` uses this license, full stop — not MIT. MIT lets anyone fork and resell the content commercially, which cuts against treating it as monetizable IP.

## Fork First

Fork it, change the palette in `assets/css/forage.css`, delete the sample article, start writing. No build step, no dependency beyond Node + Puppeteer for the PDF export (and that only runs in CI unless you want a local PDF preview).

## Push this

If not publishing directly from GitHub Desktop:

```bash
cd forage-library
git remote add origin https://github.com/forageopen/forage-library.git
git branch -M main
git push -u origin main
```

Then do the Pages source step above. First push will take a minute longer than normal — that's Puppeteer downloading Chromium in the Action runner.
