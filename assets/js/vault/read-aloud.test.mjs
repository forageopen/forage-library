import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { tokenizeWords, wordDelay, READ_WPM } from './read-aloud.js';

function root(html) {
  const dom = new JSDOM(`<div class="vault-content">${html}</div>`);
  return dom.window.document.querySelector('.vault-content');
}

test('tokenizeWords wraps every word in a span, preserving order', () => {
  const el = root('<p>The quick brown fox</p>');
  const words = tokenizeWords(el);
  assert.deepEqual(words.map((w) => w.textContent), ['The', 'quick', 'brown', 'fox']);
  assert.ok(words.every((w) => w.classList.contains('vault-read-word')));
});

test('tokenizeWords keeps whitespace and surrounding markup intact', () => {
  const el = root('<p>hello <strong>bold</strong> world</p>');
  tokenizeWords(el);
  assert.equal(el.querySelector('p').textContent, 'hello bold world');
  assert.equal(el.querySelectorAll('strong .vault-read-word').length, 1);
});

test('tokenizeWords skips text inside <pre> and <code>', () => {
  const el = root('<p>real words</p><pre><code>const x = 1</code></pre>');
  const words = tokenizeWords(el);
  assert.deepEqual(words.map((w) => w.textContent), ['real', 'words']);
  assert.equal(el.querySelector('pre').textContent, 'const x = 1');
});

test('tokenizeWords spans across multiple block elements in document order', () => {
  const el = root('<h1>Title Here</h1><p>Body text</p>');
  const words = tokenizeWords(el);
  assert.deepEqual(words.map((w) => w.textContent), ['Title', 'Here', 'Body', 'text']);
});

test('wordDelay: sentence-final punctuation dwells longest, then clause, then long word', () => {
  const base = 60000 / READ_WPM;
  assert.equal(wordDelay('word', base), base);
  assert.ok(wordDelay('clause,', base) > base);
  assert.ok(wordDelay('sentence.', base) > wordDelay('clause,', base));
  assert.ok(wordDelay('extraordinary', base) > base);
  assert.ok(wordDelay('extraordinary', base) < wordDelay('clause,', base));
});
