import { renderMarkdown } from './render-markdown.js';
import { renderText } from './render-text.js';
import { renderDocx } from './render-docx.js';
import { renderPptx } from './pptx/render-pptx.js';

const TEXT_DECODER = new TextDecoder('utf-8');

export const SUPPORTED_EXTENSIONS = ['md', 'txt', 'docx', 'pptx'];

export function extensionOf(filename) {
  const match = /\.([^.]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : '';
}

export async function renderFile(filename, arrayBuffer, deps = {}) {
  const ext = extensionOf(filename);
  const {
    renderMarkdown: md = renderMarkdown,
    renderText: txt = renderText,
    renderDocx: docx = renderDocx,
    renderPptx: pptx = renderPptx,
  } = deps;

  switch (ext) {
    case 'md':
      return { kind: 'prose', html: md(TEXT_DECODER.decode(arrayBuffer)) };
    case 'txt':
      return { kind: 'prose', html: txt(TEXT_DECODER.decode(arrayBuffer)) };
    case 'docx':
      return { kind: 'prose', html: await docx(arrayBuffer) };
    case 'pptx':
      return { kind: 'deck', html: await pptx(arrayBuffer) };
    default:
      throw new Error(`Unsupported file type: .${ext || 'unknown'}`);
  }
}
