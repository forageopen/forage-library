import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDocx } from './render-docx.js';

test('converts via the injected mammoth library and restyles the output', async () => {
  const fakeMammoth = {
    convertToHtml: async ({ arrayBuffer }) => ({ value: `<p>len:${arrayBuffer.byteLength}</p>`, messages: [] }),
  };
  const out = await renderDocx(new ArrayBuffer(4), fakeMammoth);
  assert.equal(out, '<div class="vault-content"><p>len:4</p></div>');
});

test('throws a clear error when mammoth is not available', async () => {
  await assert.rejects(() => renderDocx(new ArrayBuffer(0), undefined), /mammoth library is not loaded/);
});
