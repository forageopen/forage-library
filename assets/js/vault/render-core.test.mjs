import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restyleContentHtml } from './render-core.js';

test('wraps output in a vault-content container', () => {
  const out = restyleContentHtml('<p>Hello</p>');
  assert.equal(out, '<div class="vault-content"><p>Hello</p></div>');
});

test('wraps each table for horizontal-scroll on small screens', () => {
  const out = restyleContentHtml('<p>Before</p><table><tr><td>1</td></tr></table><p>After</p>');
  assert.equal(
    out,
    '<div class="vault-content"><p>Before</p><div class="vault-table-wrap"><table><tr><td>1</td></tr></table></div><p>After</p></div>'
  );
});

test('wraps multiple tables independently', () => {
  const out = restyleContentHtml('<table><tr><td>A</td></tr></table><table><tr><td>B</td></tr></table>');
  const wraps = out.match(/vault-table-wrap/g) || [];
  assert.equal(wraps.length, 2);
});
