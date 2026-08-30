import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampZoom,
  readStoredZoom,
  writeStoredZoom,
  readStoredDark,
  writeStoredDark,
  isDocDarkReadyMessage,
  DOC_DARK_IFRAME_ADDON,
  DOC_DARK_FILTER,
  DOC_DARK_READY_MESSAGE,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_DEFAULT,
} from './doc-view.js';

/* A minimal localStorage stand-in; `throws: true` makes every call blow up,
   to exercise the try/catch fallbacks. */
function fakeStorage(initial = {}, { throws = false } = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k) { if (throws) throw new Error('nope'); return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { if (throws) throw new Error('nope'); map.set(k, String(v)); },
    _map: map,
  };
}

test('clampZoom keeps an in-range value, snapped to the step', () => {
  assert.equal(clampZoom(1), 1);
  assert.equal(clampZoom(1.5), 1.5);
  assert.equal(clampZoom(1.23), 1.2);
});

test('clampZoom clamps out-of-range values to the min/max', () => {
  assert.equal(clampZoom(0.1), ZOOM_MIN);
  assert.equal(clampZoom(9), ZOOM_MAX);
});

test('clampZoom falls back to the default for unusable input', () => {
  assert.equal(clampZoom(NaN), ZOOM_DEFAULT);
  assert.equal(clampZoom('abc'), ZOOM_DEFAULT);
  assert.equal(clampZoom(undefined), ZOOM_DEFAULT);
});

test('readStoredZoom returns the default when nothing is stored', () => {
  assert.equal(readStoredZoom(fakeStorage()), ZOOM_DEFAULT);
});

test('readStoredZoom reads and clamps a stored value', () => {
  assert.equal(readStoredZoom(fakeStorage({ 'forage-vault-zoom': '1.5' })), 1.5);
  assert.equal(readStoredZoom(fakeStorage({ 'forage-vault-zoom': '99' })), ZOOM_MAX);
  assert.equal(readStoredZoom(fakeStorage({ 'forage-vault-zoom': 'junk' })), ZOOM_DEFAULT);
});

test('readStoredZoom survives a throwing storage', () => {
  assert.equal(readStoredZoom(fakeStorage({}, { throws: true })), ZOOM_DEFAULT);
});

test('writeStoredZoom round-trips through readStoredZoom', () => {
  const s = fakeStorage();
  writeStoredZoom(s, 1.4);
  assert.equal(readStoredZoom(s), 1.4);
});

test('writeStoredZoom swallows a throwing storage', () => {
  assert.doesNotThrow(() => writeStoredZoom(fakeStorage({}, { throws: true }), 1.5));
});

test('dark mode defaults off and round-trips', () => {
  const s = fakeStorage();
  assert.equal(readStoredDark(s), false);
  writeStoredDark(s, true);
  assert.equal(readStoredDark(s), true);
  writeStoredDark(s, false);
  assert.equal(readStoredDark(s), false);
});

test('readStoredDark survives a throwing storage', () => {
  assert.equal(readStoredDark(fakeStorage({}, { throws: true })), false);
});

test('isDocDarkReadyMessage recognises the frame\'s ready ping and nothing else', () => {
  assert.equal(isDocDarkReadyMessage({ source: DOC_DARK_READY_MESSAGE }), true);
  assert.equal(isDocDarkReadyMessage(null), false);
  assert.equal(isDocDarkReadyMessage({}), false);
  assert.equal(isDocDarkReadyMessage({ source: 'something-else' }), false);
});

test('DOC_DARK_IFRAME_ADDON is a self-contained style+script carrying the filter', () => {
  assert.match(DOC_DARK_IFRAME_ADDON, /<style>[\s\S]*<\/style>/);
  assert.match(DOC_DARK_IFRAME_ADDON, /<script>[\s\S]*<\/script>/);
  assert.ok(DOC_DARK_IFRAME_ADDON.includes(DOC_DARK_FILTER));
  assert.ok(DOC_DARK_IFRAME_ADDON.includes('forage-dark'));
});
