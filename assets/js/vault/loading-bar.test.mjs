import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor } from './loading-bar.js';

test('parseColor reads a #rrggbb token', () => {
  assert.deepEqual(parseColor('#ff0080'), [1, 0, 128 / 255]);
});

test('parseColor expands #rgb shorthand', () => {
  assert.deepEqual(parseColor('#f08'), [1, 0, 136 / 255]);
});

test('parseColor tolerates surrounding whitespace (getPropertyValue often returns it)', () => {
  assert.deepEqual(parseColor('  #000000 '), [0, 0, 0]);
});

test('parseColor falls back to mid-grey for anything not plain hex', () => {
  assert.deepEqual(parseColor(''), [0.5, 0.5, 0.5]);
  assert.deepEqual(parseColor('rgb(1,2,3)'), [0.5, 0.5, 0.5]);
  assert.deepEqual(parseColor(undefined), [0.5, 0.5, 0.5]);
});
