import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slidesToHtml } from './render-slides.js';

test('renders a title-only slide', () => {
  const html = slidesToHtml([{ title: 'Forage Library', subtitle: 'Adam Rosman', bullets: [], images: [] }]);
  assert.ok(html.includes('<h2 class="vault-slide-title">Forage Library</h2>'));
  assert.ok(html.includes('<p class="vault-slide-subtitle">Adam Rosman</p>'));
});

test('renders bullets as a list', () => {
  const html = slidesToHtml([{ title: 'Agenda', subtitle: null, bullets: ['One', 'Two'], images: [] }]);
  assert.ok(html.includes('<ul class="vault-slide-bullets"><li>One</li><li>Two</li></ul>'));
});

test('renders images', () => {
  const html = slidesToHtml([{ title: null, subtitle: null, bullets: [], images: ['data:image/png;base64,AAAA'] }]);
  assert.ok(html.includes('<img class="vault-slide-image" src="data:image/png;base64,AAAA" alt="">'));
});

test('escapes text content', () => {
  const html = slidesToHtml([{ title: '<script>', subtitle: null, bullets: [], images: [] }]);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('renders one .vault-slide section per slide, and no dot rail', () => {
  const html = slidesToHtml([
    { title: 'A', subtitle: null, bullets: [], images: [] },
    { title: 'B', subtitle: null, bullets: [], images: [] },
  ]);
  const sections = html.match(/class="vault-slide"/g) || [];
  assert.equal(sections.length, 2);
  assert.ok(!html.includes('vault-slide-rail'));
  assert.ok(!html.includes('vault-slide-dot'));
});
