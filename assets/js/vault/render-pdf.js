/* pdf.js 6.x ships ESM-only — no UMD/global build for a classic <script>
   tag — so unlike the other CDN libraries in this app it's loaded via
   dynamic import() rather than a pinned <script integrity="..."> tag.
   Dynamic import() has no browser-standard way to attach a Subresource
   Integrity hash yet; the exact pinned version baked into this URL is the
   substitute — jsdelivr serves immutable content per version, so this
   URL's contents can never silently change. Loaded lazily (only when a
   PDF is actually opened) since the library is large and most visits
   never touch one. */
const PDFJS_VERSION = '6.2.108';
const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;

let pdfjsLibPromise = null;

function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import(`${PDFJS_BASE}/pdf.min.mjs`).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;
      return lib;
    });
  }
  return pdfjsLibPromise;
}

/* Renders every page to a canvas at 2x scale (crisp on retina displays
   without the browser upscaling a 1x raster) and embeds each as a
   data-URL <img> — reusing the exact deck/slide-rail markup the PPTX
   viewer already produces, since "one page at a time with a position
   rail" is the same shape of UI either way. */
export async function renderPdf(arrayBuffer, deps = {}) {
  const pdfjsLib = deps.pdfjsLib || (await loadPdfjs());
  const createCanvas = deps.createCanvas || ((w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  });

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const slides = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    slides.push(
      `<section class="vault-slide" data-slide-index="${i - 1}"><img class="vault-slide-image" src="${canvas.toDataURL('image/png')}" alt="Page ${i}"></section>`
    );
  }

  const rail = pdf.numPages > 1
    ? `<div class="vault-slide-rail" role="tablist">${slides
        .map((_, i) => `<span class="vault-slide-dot" data-slide-index="${i}"></span>`)
        .join('')}</div>`
    : '';
  return `<div class="vault-content vault-deck">${slides.join('')}</div>${rail}`;
}
