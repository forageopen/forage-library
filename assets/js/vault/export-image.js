/**
 * export-image.js
 *
 * .jpeg export: renders the currently-viewed content to a raster image via
 * html2canvas, at the highest resolution that's still safe to allocate.
 * There's no true super-resolution upscaling happening here — client-side
 * AI upscaling is out of scope for a static site — "best quality" means
 * capturing at a high device-pixel multiplier instead of the 1x a plain
 * screenshot would give you, which is what actually determines how crisp
 * the exported image looks.
 */

const DEFAULT_MAX_SCALE = 3;
const DEFAULT_MAX_DIMENSION = 6000; // guards against a canvas too large for the browser to allocate

/** Pure: pick a scale factor for html2canvas given the element's natural
 * size — caps at `maxScale` normally, but shrinks for a large document so
 * width*scale/height*scale never exceeds `maxDimension`. */
export function pickJpegScale(width, height, { maxScale = DEFAULT_MAX_SCALE, maxDimension = DEFAULT_MAX_DIMENSION } = {}) {
  if (!width || !height) return maxScale;
  const limit = maxDimension / Math.max(width, height);
  return Math.max(1, Math.min(maxScale, limit));
}

/** DOM: render `element` to a JPEG Blob via the injected html2canvas. */
export async function elementToJpegBlob(element, html2canvasLib = globalThis.html2canvas, quality = 0.95) {
  if (!html2canvasLib) throw new Error('elementToJpegBlob: html2canvas library is not loaded');
  const scale = pickJpegScale(element.scrollWidth, element.scrollHeight);
  const backgroundColor = getComputedStyle(element).backgroundColor || '#ffffff';
  const canvas = await html2canvasLib(element, { scale, backgroundColor, useCORS: true });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob produced no data'))), 'image/jpeg', quality);
  });
}

/** DOM: re-encode an already-rendered <img> (a PDF page) as a JPEG Blob by
 * drawing it onto a canvas at its own natural resolution — cheaper and
 * crisper than routing it back through html2canvas, since it's already a
 * finished raster image and doesn't need re-layout/re-paint. White
 * backing fill first: PDF page PNGs have no transparency, but JPEG has no
 * alpha channel at all, so any edge antialiasing would otherwise composite
 * onto black. */
export async function imageElementToJpegBlob(imgEl, quality = 0.95) {
  await imgEl.decode().catch(() => {});
  const canvas = document.createElement('canvas');
  canvas.width = imgEl.naturalWidth;
  canvas.height = imgEl.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(imgEl, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob produced no data'))), 'image/jpeg', quality);
  });
}

/** Pure: zero-padded "page-N" filename stem, width matched to the total
 * count (page-1..page-9 for under 10 pages, page-01..page-10 for 10-99,
 * and so on) so filenames still sort correctly in a file browser. */
export function pageFileName(current, total) {
  const width = String(total).length;
  return `page-${String(current).padStart(width, '0')}`;
}

/** DOM: JPEG-encode every slide in a deck (PDF pages, PPTX slides) as its
 * own page — the "one long image" complaint — reporting progress via
 * `onProgress(current, total)` as each page finishes, for a progress-bar
 * UI. A slide that's purely an already-rendered image (every PDF page)
 * uses the cheaper direct re-encode; anything else (a PPTX slide with
 * title/bullets) goes through html2canvas like a normal element. */
export async function slidesToJpegBlobs(slides, onProgress) {
  const blobs = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const onlyImg = slide.children.length === 1 && slide.firstElementChild.tagName === 'IMG' ? slide.firstElementChild : null;
    blobs.push(onlyImg ? await imageElementToJpegBlob(onlyImg) : await elementToJpegBlob(slide));
    if (onProgress) onProgress(i + 1, slides.length);
  }
  return blobs;
}
