/**
 * sw.js
 *
 * Offline app-shell cache, opt-in via the "make this site offline" button
 * (assets/js/offline.js wires it). Not auto-registered on any visit —
 * registration only happens when a visitor explicitly clicks, so "no
 * surprise background network activity" holds. Ported from Noted's
 * src/sw.ts, adapted to this repo's file layout (root landing page +
 * /vault/ instead of a single-page app).
 *
 * Lives at the SITE ROOT (not e.g. assets/js/sw.js) — load-bearing, not
 * stylistic: a service worker's own script location caps the max scope it
 * can ever control to that script's directory, unless the server sends a
 * `Service-Worker-Allowed` header, which GitHub Pages does not. Registering
 * from assets/js/ would cap the scope to assets/js/, unable to control
 * /vault/ at all.
 *
 * Precache paths are resolved against `registration.scope`, not hardcoded
 * absolute paths, so this stays correct whether deployed at the repo root,
 * under a GitHub Pages project subpath, or in local dev.
 *
 * Strategy: cache-first for the precached app shell (this repo's own
 * HTML/CSS/JS + the CDN rendering libraries, which the shell cannot
 * function without), network passthrough for everything else — matches
 * Noted's own scope exactly: an app-shell cache, not a general offline
 * data cache. Individual vault content files a visitor hasn't already
 * loaded are NOT precached (the vault can grow arbitrarily as files are
 * added — precaching all of it would mean re-fetching the whole vault on
 * every deploy) and so are not guaranteed available offline unless the
 * browser's own HTTP cache already has them.
 */

const CACHE_NAME = 'forage-shell-v1';

const SHELL_PATHS = [
  '',
  'index.html',
  'assets/css/forage.css',
  'assets/js/ribbon.js',
  'assets/js/visitor-counter.js',
  'assets/js/offline.js',
  'sw.js',
  'vault/',
  'vault/index.html',
  'vault/manifest.json',
  'assets/js/vault/app.js',
  'assets/js/vault/dropzone.js',
  'assets/js/vault/export.js',
  'assets/js/vault/render-core.js',
  'assets/js/vault/render-docx.js',
  'assets/js/vault/render-markdown.js',
  'assets/js/vault/render-text.js',
  'assets/js/vault/renderers.js',
  'assets/js/vault/sanitize.js',
  'assets/js/vault/sidebar.js',
  'assets/js/vault/sidenote-store.js',
  'assets/js/vault/split-view.js',
  'assets/js/vault/viewer-pane.js',
  'assets/js/vault/pptx/extract-slide.js',
  'assets/js/vault/pptx/render-pptx.js',
  'assets/js/vault/pptx/render-slides.js',
];

/* CDN rendering libraries — cross-origin, but jsdelivr sends
   access-control-allow-origin: *, so these fetch as normal (non-opaque)
   "cors" responses that the Cache API can store and later serve. Pinned
   to the exact versions vault/index.html loads. */
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/marked@18.0.9/lib/marked.umd.js',
  'https://cdn.jsdelivr.net/npm/mammoth@1.12.1/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.4.13/dist/purify.min.js',
];

function shellUrls() {
  return SHELL_PATHS.map((path) => new URL(path, self.registration.scope).href);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(shellUrls());
      await cache.addAll(CDN_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return fetch(event.request);
    })()
  );
});
