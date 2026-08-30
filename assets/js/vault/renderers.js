import { renderMarkdown } from './render-markdown.js';
import { renderText } from './render-text.js';
import { renderDocx } from './render-docx.js';
import { renderPptx } from './pptx/render-pptx.js';
import { renderPdf } from './render-pdf.js';
import { renderSpreadsheet } from './render-spreadsheet.js';
import { renderImage } from './render-image.js';

const TEXT_DECODER = new TextDecoder('utf-8');

export const SUPPORTED_EXTENSIONS = ['md', 'txt', 'docx', 'pptx', 'pdf', 'xlsx', 'csv', 'jpg', 'jpeg', 'png', 'html', 'htm'];

export function extensionOf(filename) {
  const match = /\.([^.]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : '';
}

/* `deps.onProgress(fraction, label)` — optional; fraction is 0..1 or null
   (indeterminate). Only the deck renderers (PDF pages, PPTX slides) drive
   it, since they're the ones with a slow per-item loop worth showing a bar
   for; every other type renders in one shot. */
export async function renderFile(filename, arrayBuffer, deps = {}) {
  const ext = extensionOf(filename);
  const {
    renderMarkdown: md = renderMarkdown,
    renderText: txt = renderText,
    renderDocx: docx = renderDocx,
    renderPptx: pptx = renderPptx,
    renderPdf: pdf = renderPdf,
    renderSpreadsheet: sheet = renderSpreadsheet,
    renderImage: image = renderImage,
  } = deps;

  switch (ext) {
    case 'md':
      return { kind: 'prose', html: md(TEXT_DECODER.decode(arrayBuffer)) };
    case 'txt':
      return { kind: 'prose', html: txt(TEXT_DECODER.decode(arrayBuffer)) };
    case 'docx':
      return { kind: 'prose', html: await docx(arrayBuffer) };
    case 'pptx':
      return { kind: 'deck', html: await pptx(arrayBuffer, undefined, deps.onProgress) };
    case 'pdf':
      return { kind: 'deck', html: await pdf(arrayBuffer, { onProgress: deps.onProgress }) };
    case 'xlsx':
    case 'csv':
      return { kind: 'prose', html: sheet(arrayBuffer, filename) };
    case 'jpg':
    case 'jpeg':
    case 'png':
      return { kind: 'image', html: image(arrayBuffer, filename) };
    case 'html':
    case 'htm':
      /* Raw, unmodified, *unsanitized* source — deliberately not run
         through sanitize.js. Safe only because the caller renders 'iframe'
         kind into a sandboxed <iframe sandbox="allow-scripts"> (no
         allow-same-origin) via srcdoc rather than innerHTML, so the loaded
         HTML can't read/write anything in this app's own origin no matter
         what it contains — ported from Noted's src/file-loader.ts
         (see its ADR-011 reference) rather than flattening to sanitized
         Markdown, which would throw away the CSS/SVG-driven layout that
         makes a hand-authored .html file worth opening as HTML at all. */
      return { kind: 'iframe', html: TEXT_DECODER.decode(arrayBuffer) };
    default:
      throw new Error(`Unsupported file type: .${ext || 'unknown'}`);
  }
}
