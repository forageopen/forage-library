import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHRASES, GENERIC, inferPhase, createPhraseRotator } from './loading-phrases.js';

const POOLS = ['load', 'render', 'export', 'compress', 'generic'];

test('every pool has at least 20 unique, lowercase gerund phrases', () => {
  for (const key of POOLS) {
    const pool = PHRASES[key];
    assert.ok(Array.isArray(pool), `${key} pool exists`);
    assert.ok(pool.length >= 20, `${key} has >= 20 (got ${pool.length})`);
    assert.equal(new Set(pool).size, pool.length, `${key} has no duplicates`);
    for (const w of pool) {
      assert.equal(typeof w, 'string');
      assert.ok(w.length > 0 && w === w.toLowerCase(), `"${w}" is non-empty lowercase`);
    }
  }
});

test('GENERIC is the generic pool', () => {
  assert.equal(GENERIC, PHRASES.generic);
});

test('inferPhase maps the strings the renderers actually report', () => {
  assert.equal(inferPhase('Exporting page 3 of 10…'), 'export');
  assert.equal(inferPhase('Rendering page 1 of 5'), 'render');
  assert.equal(inferPhase('Analysing page 2 of 5'), 'render');
  assert.equal(inferPhase('Reading PDF…'), 'load');
  assert.equal(inferPhase('Downloading 47%'), 'load');
  assert.equal(inferPhase(`Opening deck.pdf…`), 'load');
  assert.equal(inferPhase('Loading vault…'), 'load');
  assert.equal(inferPhase('Compressing…'), 'compress');
  assert.equal(inferPhase(''), 'generic');
  assert.equal(inferPhase(undefined), 'generic');
});

test('rotator never repeats a phrase twice in a row, across refills', () => {
  const seen = [];
  const r = createPhraseRotator({ onWord: (w) => seen.push(w), random: mulberry32(1) });
  r.setPhase('render');
  for (let i = 0; i < 200; i++) r.next();
  for (let i = 1; i < seen.length; i++) {
    assert.notEqual(seen[i], seen[i - 1], `repeat at ${i}: ${seen[i]}`);
  }
  // and it actually drew from the render pool
  assert.ok(seen.every((w) => PHRASES.render.includes(w)));
});

test('a genuine phase change swaps the word immediately and to the new pool', () => {
  let current = null;
  const r = createPhraseRotator({ onWord: (w) => { current = w; }, random: mulberry32(7) });
  r.setPhase('load');
  assert.ok(PHRASES.load.includes(current), 'emitted a load word on setPhase');
  const beforeSwap = current;
  r.setPhase('export');
  assert.ok(PHRASES.export.includes(current), 'switched to an export word');
  assert.notEqual(current, beforeSwap);
  // re-setting the same phase is a no-op (no emit)
  const held = current;
  r.setPhase('export');
  assert.equal(current, held);
});

test('start()/stop() manage a single interval without throwing', () => {
  const r = createPhraseRotator({ onWord: () => {}, intervalMs: 10_000, random: mulberry32(3) });
  r.setPhase('load');
  r.start();
  r.start(); // idempotent
  r.stop();
  r.stop(); // idempotent
});

/* Tiny seeded PRNG so the shuffle is deterministic in tests. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
