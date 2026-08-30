/* pdf.js 6.x ships ESM-only — no UMD/global build for a classic <script>
   tag — so unlike the other CDN libraries in this app it's loaded via
   dynamic import() rather than a pinned <script integrity="..."> tag.
   Dynamic import() has no browser-standard way to attach a Subresource
   Integrity hash yet; the exact pinned version baked into this URL is the
   substitute — jsdelivr serves immutable content per version, so this
   URL's contents can never silently change. Loaded lazily (only when a
   PDF is actually opened) since the library is large and most visits
   never touch one.

   The WORKER script, unlike the main library, is vendored into this repo
   (assets/vendor/pdf.worker.min.mjs) rather than pointed at the CDN:
   `new Worker(url)` throws a SecurityError for a cross-origin URL — that
   restriction applies to Worker construction itself, independent of the
   target's CORS headers, unlike `import()` or `fetch()`. Without a
   same-origin worker, page.render() hangs forever instead of erroring
   (pdf.js's own fallback doesn't trigger cleanly here). Resolved against
   this module's own URL (not the page's), so it keeps working regardless
   of which page imports it or what subpath the site is deployed under. */
const PDFJS_VERSION = '6.2.108';
const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;
const WORKER_SRC = new URL('../../vendor/pdf.worker.min.mjs', import.meta.url).href;

let pdfjsLibPromise = null;

function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import(`${PDFJS_BASE}/pdf.min.mjs`).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
      return lib;
    });
  }
  return pdfjsLibPromise;
}

/* Renders every page to a canvas at 2x scale (crisp on retina displays
   without the browser upscaling a 1x raster) and embeds each as a
   data-URL <img> — reusing the exact deck markup the PPTX viewer already
   produces, since "one page at a time" is the same shape of UI either
   way. No dot rail: the stats bar's "x/y pages" (see reading-stats.js)
   already tells you where you are, scroll-synced, without the redundant
   bullet indicator. */
export async function renderPdf(arrayBuffer, deps = {}) {
  const pdfjsLib = deps.pdfjsLib || (await loadPdfjs());
  const createCanvas = deps.createCanvas || ((w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  });
  // (fraction 0..1 or null, label) — see renderFile in renderers.js. The
  // per-page render loop below is the slow part (one 2x canvas raster per
  // page), so that's what the bar tracks.
  const onProgress = deps.onProgress || (() => {});

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  loadingTask.onProgress = ({ loaded, total }) => {
    onProgress(total ? loaded / total : null, 'Reading PDF…');
  };
  const pdf = await loadingTask.promise;
  onProgress(0, `Rendering page 1 of ${pdf.numPages}`);

  const slides = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    slides.push(
      `<section class="vault-slide" data-slide-index="${i - 1}"><img class="vault-slide-image" src="${canvas.toDataURL('image/png')}" alt="Page ${i}"></section>`
    );
    onProgress(i / pdf.numPages, `Rendering page ${i} of ${pdf.numPages}`);
  }

  return `<div class="vault-content vault-deck">${slides.join('')}</div>`;
}
