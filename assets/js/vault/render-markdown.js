import { restyleContentHtml } from './render-core.js';
import { sanitizeHtml } from './sanitize.js';

export function renderMarkdown(markdownText, markedLib = globalThis.marked, DOMPurifyLib = globalThis.DOMPurify) {
  if (!markedLib) throw new Error('renderMarkdown: marked library is not loaded');
  const html = markedLib.parse(markdownText);
  return restyleContentHtml(sanitizeHtml(html, DOMPurifyLib));
}
