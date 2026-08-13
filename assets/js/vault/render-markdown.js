import { restyleContentHtml } from './render-core.js';

export function renderMarkdown(markdownText, markedLib = globalThis.marked) {
  if (!markedLib) throw new Error('renderMarkdown: marked library is not loaded');
  const html = markedLib.parse(markdownText);
  return restyleContentHtml(html);
}
