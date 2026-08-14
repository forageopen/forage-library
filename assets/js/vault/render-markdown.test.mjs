import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from './render-markdown.js';

test('parses markdown via the injected marked library and restyles the output', () => {
  const fakeMarked = { parse: (md) => `<h1>${md.replace(/^#\s*/, '')}</h1>` };
  const out = renderMarkdown('# Title', fakeMarked);
  assert.equal(out, '<div class="vault-content"><h1>Title</h1></div>');
});

test('throws a clear error when marked is not available', () => {
  assert.throws(() => renderMarkdown('# Title', undefined), /marked library is not loaded/);
});
