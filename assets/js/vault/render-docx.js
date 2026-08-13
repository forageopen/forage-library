import { restyleContentHtml } from './render-core.js';

export async function renderDocx(arrayBuffer, mammothLib = globalThis.mammoth) {
  if (!mammothLib) throw new Error('renderDocx: mammoth library is not loaded');
  const result = await mammothLib.convertToHtml({ arrayBuffer });
  return restyleContentHtml(result.value);
}
