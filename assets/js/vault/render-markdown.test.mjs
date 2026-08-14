import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from './render-markdown.js';

const identityDOMPurify = { sanitize: (html) => html };

test('parses markdown via the injected marked library and restyles the output', () => {
  const fakeMarked = { parse: (md) => `<h1>${md.replace(/^#\s*/, '')}</h1>` };
  const out = renderMarkdown('# Title', fakeMarked, identityDOMPurify);
  assert.equal(out, '<div class="vault-content"><h1>Title</h1></div>');
});

test('throws a clear error when marked is not available', () => {
  assert.throws(() => renderMarkdown('# Title', undefined, identityDOMPurify), /marked library is not loaded/);
});

test('throws a clear error when DOMPurify is not available', () => {
  const fakeMarked = { parse: (md) => md };
  assert.throws(() => renderMarkdown('# Title', fakeMarked, undefined), /DOMPurify library is not loaded/);
});

test('passes marked output through the injected sanitizer before restyling', () => {
  const fakeMarked = { parse: () => '<p>raw</p><script>evil()</script>' };
  const strippingDOMPurify = { sanitize: (html) => html.replace(/<script.*?<\/script>/, '') };
  const out = renderMarkdown('ignored', fakeMarked, strippingDOMPurify);
  assert.equal(out, '<div class="vault-content"><p>raw</p></div>');
});
