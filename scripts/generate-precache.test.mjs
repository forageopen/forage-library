import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  collectShellPaths,
  extractCdnUrls,
  extractPdfjsUrls,
  buildPrecacheList,
  injectIntoServiceWorker,
} from './generate-precache.mjs';

function scaffold() {
  const dir = mkdtempSync(path.join(tmpdir(), 'precache-test-'));
  mkdirSync(path.join(dir, 'assets/js/vault'), { recursive: true });
  mkdirSync(path.join(dir, 'assets/css'), { recursive: true });
  mkdirSync(path.join(dir, 'assets/fonts'), { recursive: true });
  mkdirSync(path.join(dir, 'assets/icons'), { recursive: true });
  mkdirSync(path.join(dir, 'assets/vendor'), { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), '<html></html>');
  writeFileSync(path.join(dir, 'sw.js'), 'x');
  writeFileSync(path.join(dir, 'assets/css/forage.css'), 'body{}');
  writeFileSync(path.join(dir, 'assets/js/vault/app.js'), '// app');
  writeFileSync(path.join(dir, 'assets/js/vault/app.test.mjs'), '// test');
  writeFileSync(path.join(dir, 'assets/fonts/Font.ttf'), 'ttf');
  writeFileSync(path.join(dir, 'assets/fonts/Font-OFL.txt'), 'license');
  writeFileSync(path.join(dir, 'assets/icons/favicon.svg'), '<svg/>');
  writeFileSync(path.join(dir, 'assets/vendor/pdf.worker.min.mjs'), '// worker');
  return dir;
}

test('collectShellPaths includes root shell files, web assets, and the scope root', () => {
  const dir = scaffold();
  const paths = collectShellPaths(dir);
  assert.ok(paths.includes(''));
  assert.ok(paths.includes('index.html'));
  assert.ok(paths.includes('vault/manifest.json'));
  assert.ok(paths.includes('assets/css/forage.css'));
  assert.ok(paths.includes('assets/js/vault/app.js'));
  assert.ok(paths.includes('assets/fonts/Font.ttf'));
  assert.ok(paths.includes('assets/icons/favicon.svg'));
  assert.ok(paths.includes('assets/vendor/pdf.worker.min.mjs'));
  rmSync(dir, { recursive: true, force: true });
});

test('collectShellPaths excludes *.test.mjs and non-asset extensions', () => {
  const dir = scaffold();
  const paths = collectShellPaths(dir);
  assert.ok(!paths.includes('assets/js/vault/app.test.mjs'));
  assert.ok(!paths.some((p) => p.endsWith('-OFL.txt')));
  rmSync(dir, { recursive: true, force: true });
});

test('extractCdnUrls picks up <script src> and <link href>, not <a href>', () => {
  const html = `
    <link rel="stylesheet" href="https://fonts.example/x.css" />
    <script src="https://cdn.example/lib.js" integrity="sha384-x" crossorigin></script>
    <a href="https://github.com/someone">profile</a>
    <a href="https://stats.example">stats</a>
  `;
  assert.deepEqual(extractCdnUrls(html), [
    'https://fonts.example/x.css',
    'https://cdn.example/lib.js',
  ]);
});

test('extractPdfjsUrls builds the pinned pdf.js entry-point URL', () => {
  const src = "const PDFJS_VERSION = '6.2.108';\nconst PDFJS_BASE = `...`;";
  assert.deepEqual(extractPdfjsUrls(src), [
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.min.mjs',
  ]);
});

test('extractPdfjsUrls returns nothing when no version is found', () => {
  assert.deepEqual(extractPdfjsUrls('no version here'), []);
});

test('buildPrecacheList merges shell + CDN + pdf.js and de-dupes', () => {
  const dir = scaffold();
  writeFileSync(
    path.join(dir, 'index.html'),
    '<script src="https://cdn.example/a.js"></script><script src="https://cdn.example/a.js"></script>'
  );
  writeFileSync(
    path.join(dir, 'assets/js/vault/render-pdf.js'),
    "const PDFJS_VERSION = '6.2.108';"
  );
  const list = buildPrecacheList(dir);
  assert.equal(new Set(list).size, list.length, 'no duplicates');
  assert.equal(list.filter((u) => u === 'https://cdn.example/a.js').length, 1);
  assert.ok(list.includes('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.min.mjs'));
  assert.ok(list.indexOf('') < list.indexOf('https://cdn.example/a.js'), 'shell before CDN');
  rmSync(dir, { recursive: true, force: true });
});

test('injectIntoServiceWorker replaces only the marked block', () => {
  const sw = [
    'const CACHE_NAME = "x";',
    '// PRECACHE:BEGIN',
    'const PRECACHE_ENTRIES = [ "stale" ];',
    '// PRECACHE:END',
    'self.addEventListener("install", () => {});',
  ].join('\n');
  const out = injectIntoServiceWorker(sw, ['', 'index.html']);
  assert.ok(out.startsWith('const CACHE_NAME = "x";'));
  assert.ok(out.trimEnd().endsWith('self.addEventListener("install", () => {});'));
  assert.ok(!out.includes('stale'));
  assert.ok(out.includes('"index.html",'));
  assert.equal(out.match(/PRECACHE:BEGIN/g).length, 1);
});

test('injectIntoServiceWorker throws when markers are missing', () => {
  assert.throws(() => injectIntoServiceWorker('no markers here', []), /markers/);
});
