import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIGHLIGHT_COLORS, highlightSwatchesHtml } from './highlight-colors.js';

test('HIGHLIGHT_COLORS has exactly 18 colors, each a valid hex value', () => {
  assert.equal(HIGHLIGHT_COLORS.length, 18);
  for (const { hex } of HIGHLIGHT_COLORS) assert.match(hex, /^#[0-9a-f]{6}$/);
});

test('HIGHLIGHT_COLORS has no duplicate hex values', () => {
  const hexes = HIGHLIGHT_COLORS.map((c) => c.hex);
  assert.equal(new Set(hexes).size, hexes.length);
});

test('highlightSwatchesHtml renders one button per color plus a "remove highlight" button', () => {
  const html = highlightSwatchesHtml('vault-editor-highlight');
  const buttonCount = (html.match(/<button/g) || []).length;
  assert.equal(buttonCount, 19); // 18 colors + none
  assert.match(html, /class="vault-editor-highlight vault-editor-highlight--none"/);
});

test('highlightSwatchesHtml scopes every button to the given class', () => {
  const html = highlightSwatchesHtml('vault-sidenote-highlight');
  assert.doesNotMatch(html, /vault-editor-highlight/);
  assert.match(html, /data-highlight="#fff3a3"/);
});
