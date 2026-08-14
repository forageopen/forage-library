import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderText } from './render-text.js';

test('splits blank-line-separated blocks into paragraphs', () => {
  const out = renderText('First para.\n\nSecond para.');
  assert.equal(out, '<div class="vault-content vault-content--plain"><p>First para.</p><p>Second para.</p></div>');
});

test('keeps single newlines inside a paragraph as line breaks', () => {
  const out = renderText('Line one.\nLine two.');
  assert.equal(out, '<div class="vault-content vault-content--plain"><p>Line one.<br>Line two.</p></div>');
});

test('escapes HTML-significant characters', () => {
  const out = renderText('<script>alert(1)</script> & "quotes"');
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(out.includes('&amp;'));
  assert.ok(out.includes('&quot;quotes&quot;'));
});

test('handles empty input without throwing', () => {
  const out = renderText('');
  assert.equal(out, '<div class="vault-content vault-content--plain"><p></p></div>');
});
