import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDocx } from './render-docx.js';

const identityDOMPurify = { sanitize: (html) => html };

test('converts via the injected mammoth library and restyles the output', async () => {
  const fakeMammoth = {
    convertToHtml: async ({ arrayBuffer }) => ({ value: `<p>len:${arrayBuffer.byteLength}</p>`, messages: [] }),
  };
  const out = await renderDocx(new ArrayBuffer(4), fakeMammoth, identityDOMPurify);
  assert.equal(out, '<div class="vault-content"><p>len:4</p></div>');
});

test('throws a clear error when mammoth is not available', async () => {
  await assert.rejects(() => renderDocx(new ArrayBuffer(0), undefined, identityDOMPurify), /mammoth library is not loaded/);
});

test('throws a clear error when DOMPurify is not available', async () => {
  const fakeMammoth = { convertToHtml: async () => ({ value: '<p>x</p>', messages: [] }) };
  await assert.rejects(() => renderDocx(new ArrayBuffer(0), fakeMammoth, undefined), /DOMPurify library is not loaded/);
});

test('passes mammoth output through the injected sanitizer before restyling', async () => {
  const fakeMammoth = { convertToHtml: async () => ({ value: '<p>raw</p><script>evil()</script>', messages: [] }) };
  const strippingDOMPurify = { sanitize: (html) => html.replace(/<script.*?<\/script>/, '') };
  const out = await renderDocx(new ArrayBuffer(0), fakeMammoth, strippingDOMPurify);
  assert.equal(out, '<div class="vault-content"><p>raw</p></div>');
});
