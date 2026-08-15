import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderImage } from './render-image.js';

const fakeToDataUrl = (arrayBuffer, mime) => `data:${mime};base64,FAKE`;

test('wraps the image in a single-slide deck, same markup shape as PDF/PPTX', () => {
  const out = renderImage(new ArrayBuffer(4), 'photo.png', { toDataUrl: fakeToDataUrl });
  assert.match(out, /^<div class="vault-content vault-deck">/);
  assert.match(out, /<section class="vault-slide" data-slide-index="0">/);
});

test('picks image/png for a .png file', () => {
  const out = renderImage(new ArrayBuffer(4), 'photo.png', { toDataUrl: fakeToDataUrl });
  assert.match(out, /src="data:image\/png;base64,FAKE"/);
});

test('picks image/jpeg for .jpg and .jpeg files', () => {
  assert.match(renderImage(new ArrayBuffer(4), 'photo.jpg', { toDataUrl: fakeToDataUrl }), /src="data:image\/jpeg;base64,FAKE"/);
  assert.match(renderImage(new ArrayBuffer(4), 'photo.jpeg', { toDataUrl: fakeToDataUrl }), /src="data:image\/jpeg;base64,FAKE"/);
});

test('escapes HTML-significant characters in the filename used as alt text', () => {
  const out = renderImage(new ArrayBuffer(4), '<script>.png', { toDataUrl: fakeToDataUrl });
  assert.doesNotMatch(out, /alt="<script>/);
  assert.match(out, /alt="&lt;script&gt;\.png"/);
});

test('default encoder produces a real base64 data URL without an injected deps.toDataUrl', () => {
  const bytes = new Uint8Array([137, 80, 78, 71]);
  const out = renderImage(bytes.buffer, 'photo.png');
  assert.match(out, /^<div class="vault-content vault-deck"><section class="vault-slide" data-slide-index="0"><img class="vault-slide-image" src="data:image\/png;base64,[A-Za-z0-9+/=]+" alt="photo\.png"><\/section><\/div>$/);
});
