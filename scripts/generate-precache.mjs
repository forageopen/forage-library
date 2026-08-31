#!/usr/bin/env node
/**
 * generate-precache.mjs
 *
 * Rewrites the PRECACHE block in sw.js so the offline app-shell cache
 * always matches what the site actually ships. The old hand-maintained
 * SHELL_PATHS / CDN_URLS lists drifted badly out of date as modules were
 * added (viewer-pane.js alone statically imports ~13 files that were
 * never in the list), which meant "Available offline" would light up but
 * the app failed to boot with a cold cache.
 *
 * Sources of truth:
 *   - every web asset under assets/ (js, css, fonts, icons, vendor)
 *   - index.html's own <script src> / <link href> tags (the CDN libs)
 *   - render-pdf.js's pinned pdf.js version (loaded via dynamic import)
 *   - the handful of root files the shell needs (index.html, sw.js,
 *     vault/manifest.json, and the scope root itself)
 *
 * Run manually:  npm run generate-precache
 * Run in CI:     see .github/workflows/publish.yml (alongside the manifest)
 *
 * The generated list is committed, exactly like vault/manifest.json — its
 * inputs (assets/, index.html) are all present in a normal checkout, so a
 * local run produces the same result CI would.
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

const BEGIN_MARKER = '// PRECACHE:BEGIN';
const END_MARKER = '// PRECACHE:END';

/* Web assets that belong in an app-shell cache. Deliberately an allowlist:
   it keeps license text (assets/fonts/*.txt), source maps, READMEs, etc.
   out of the precache. */
const ASSET_EXTENSIONS = new Set([
  '.js', '.mjs', '.css', '.svg', '.ttf', '.woff', '.woff2',
  '.png', '.jpg', '.jpeg', '.webp', '.ico', '.webmanifest',
]);

/* Directories under assets/ whose contents form the shell. */
const ASSET_DIRS = ['css', 'js', 'fonts', 'icons', 'vendor'];

/* Root-level files (relative to the SW scope) the shell can't work
   without. '' is the scope root itself — the URL a bare visit resolves
   to — which the SW serves from cache on an offline navigation. */
const ROOT_SHELL_PATHS = ['', 'index.html', 'sw.js', 'vault/manifest.json', 'vault/Research/catalog.json'];

function walkFiles(absDir, relBase, out) {
  for (const name of readdirSync(absDir).sort((a, b) => a.localeCompare(b))) {
    const abs = path.join(absDir, name);
    const rel = relBase ? `${relBase}/${name}` : name;
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walkFiles(abs, rel, out);
    } else if (
      ASSET_EXTENSIONS.has(path.extname(name).toLowerCase()) &&
      !/\.test\.m?js$/i.test(name)
    ) {
      out.push(rel);
    }
  }
  return out;
}

/** Repo-relative POSIX paths for every same-origin file in the app shell. */
export function collectShellPaths(root = ROOT) {
  const paths = [...ROOT_SHELL_PATHS];
  for (const dir of ASSET_DIRS) {
    const abs = path.join(root, 'assets', dir);
    try {
      if (statSync(abs).isDirectory()) {
        walkFiles(abs, `assets/${dir}`, paths);
      }
    } catch {
      /* dir may not exist (e.g. no assets/vendor yet) — skip */
    }
  }
  return dedupe(paths);
}

/**
 * Absolute https:// URLs from index.html's <script src> and <link href>
 * tags only — NOT <a href> (the footer links out to GitHub, goatcounter,
 * etc., which are not app-shell resources).
 */
export function extractCdnUrls(indexHtml) {
  const urls = [];
  const tagRe = /<(script|link)\b[^>]*?\b(?:src|href)\s*=\s*["'](https:\/\/[^"']+)["'][^>]*>/gi;
  let m;
  while ((m = tagRe.exec(indexHtml)) !== null) urls.push(m[2]);
  return dedupe(urls);
}

/**
 * The pdf.js entry point. It's loaded by render-pdf.js via dynamic
 * import() (pdf.js 6.x is ESM-only), not a <script> tag, so it isn't
 * caught by extractCdnUrls. The worker is vendored (assets/vendor/), so
 * it's already covered by collectShellPaths.
 */
export function extractPdfjsUrls(renderPdfSource) {
  const version = /PDFJS_VERSION\s*=\s*["']([^"']+)["']/.exec(renderPdfSource);
  if (!version) return [];
  return [`https://cdn.jsdelivr.net/npm/pdfjs-dist@${version[1]}/build/pdf.min.mjs`];
}

/** The full ordered, de-duped precache list: same-origin shell, then CDN. */
export function buildPrecacheList(root = ROOT) {
  const indexHtml = readFileSync(path.join(root, 'index.html'), 'utf8');
  const renderPdf = safeRead(path.join(root, 'assets/js/vault/render-pdf.js'));
  return dedupe([
    ...collectShellPaths(root),
    ...extractCdnUrls(indexHtml),
    ...extractPdfjsUrls(renderPdf),
  ]);
}

/** Replace the array literal between the PRECACHE markers in sw.js. */
export function injectIntoServiceWorker(swSource, entries) {
  const begin = swSource.indexOf(BEGIN_MARKER);
  const end = swSource.indexOf(END_MARKER);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error('sw.js is missing the PRECACHE:BEGIN / PRECACHE:END markers');
  }
  const body = [
    BEGIN_MARKER,
    '// Generated by scripts/generate-precache.mjs — do not edit by hand.',
    '// Run `npm run generate-precache` after adding assets or CDN scripts.',
    'const PRECACHE_ENTRIES = [',
    ...entries.map((e) => `  ${JSON.stringify(e)},`),
    '];',
    END_MARKER,
  ].join('\n');
  return swSource.slice(0, begin) + body + swSource.slice(end + END_MARKER.length);
}

function dedupe(list) {
  return [...new Set(list)];
}

function safeRead(absPath) {
  try {
    return readFileSync(absPath, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  const swPath = path.join(ROOT, 'sw.js');
  const entries = buildPrecacheList(ROOT);
  const updated = injectIntoServiceWorker(readFileSync(swPath, 'utf8'), entries);
  writeFileSync(swPath, updated);
  console.log(`Wrote ${entries.length} precache entries to ${path.relative(ROOT, swPath)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
