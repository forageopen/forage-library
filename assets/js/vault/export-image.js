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
