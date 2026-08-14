import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { sanitizeHtml } from './sanitize.js';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

test('strips script tags', () => {
  const out = sanitizeHtml('<p>hi</p><script>alert(1)</script>', DOMPurify);
  assert.ok(!out.includes('<script'));
  assert.ok(out.includes('<p>hi</p>'));
});

test('strips inline event handler attributes', () => {
  const out = sanitizeHtml('<img src="x" onerror="alert(1)">', DOMPurify);
  assert.ok(!out.includes('onerror'));
});

test('strips javascript: URIs', () => {
  const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>', DOMPurify);
  assert.ok(!out.includes('javascript:'));
});

test('preserves normal structural/formatting markup', () => {
  const out = sanitizeHtml('<h1>Title</h1><p>Body <strong>bold</strong></p><ul><li>item</li></ul>', DOMPurify);
  assert.equal(out, '<h1>Title</h1><p>Body <strong>bold</strong></p><ul><li>item</li></ul>');
});

test('throws a clear error when DOMPurify is not available', () => {
  assert.throws(() => sanitizeHtml('<p>x</p>', undefined), /DOMPurify library is not loaded/);
});
