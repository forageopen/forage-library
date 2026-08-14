import { restyleContentHtml } from './render-core.js';
import { sanitizeHtml } from './sanitize.js';

export async function renderDocx(arrayBuffer, mammothLib = globalThis.mammoth, DOMPurifyLib = globalThis.DOMPurify) {
  if (!mammothLib) throw new Error('renderDocx: mammoth library is not loaded');
  const result = await mammothLib.convertToHtml({ arrayBuffer });
  return restyleContentHtml(sanitizeHtml(result.value, DOMPurifyLib));
}
