function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MIME_BY_EXTENSION = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

/* Pure: raw image bytes -> a base64 data: URL. Chunks the byte->char
   conversion — String.fromCharCode(...bytes) blows the call stack once
   the argument list gets past tens of thousands of entries — rather than
   spreading the whole buffer in one call. */
function toDataUrl(arrayBuffer, mime) {
  const bytes = new Uint8Array(arrayBuffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return `data:${mime};base64,${base64}`;
}

/* A raw .jpg/.jpeg/.png has nothing to parse — the file's bytes ARE the
   content. Reuses the exact single-slide deck markup the PDF/PPTX viewers
   already produce (a data-URL <img> inside a .vault-slide) so it picks up
   the same full-bleed image styling and JPEG-export handling for free,
   instead of a one-off image layout. A data: URL (not a blob: URL) so the
   "Export as HTML" standalone doc — which just copies this markup's
   innerHTML verbatim — still shows the image when opened outside the app. */
export function renderImage(arrayBuffer, filename, deps = {}) {
  const ext = /\.([^.]+)$/.exec(filename)?.[1]?.toLowerCase() || '';
  const mime = MIME_BY_EXTENSION[ext] || 'image/jpeg';
  const dataUrl = (deps.toDataUrl || toDataUrl)(arrayBuffer, mime);
  return `<div class="vault-content vault-deck"><section class="vault-slide" data-slide-index="0"><img class="vault-slide-image" src="${dataUrl}" alt="${escapeHtml(filename)}"></section></div>`;
}
