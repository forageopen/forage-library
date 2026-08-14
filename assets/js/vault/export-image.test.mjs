import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickJpegScale, pageFileName } from './export-image.js';

test('pickJpegScale uses the max scale for a normal-sized document', () => {
  assert.equal(pickJpegScale(800, 1200), 3);
});

test('pickJpegScale shrinks the scale so a huge document stays under the dimension cap', () => {
  const scale = pickJpegScale(4000, 3000, { maxScale: 3, maxDimension: 6000 });
  assert.equal(scale, 1.5); // 6000 / 4000
});

test('pickJpegScale never returns less than 1x', () => {
  const scale = pickJpegScale(20000, 100, { maxScale: 3, maxDimension: 6000 });
  assert.equal(scale, 1);
});

test('pickJpegScale falls back to maxScale when dimensions are missing', () => {
  assert.equal(pickJpegScale(0, 0), 3);
});

test('pageFileName pads to the width of the total for under 10 pages', () => {
  assert.equal(pageFileName(3, 7), 'page-3');
});

test('pageFileName zero-pads for a two-digit total', () => {
  assert.equal(pageFileName(3, 12), 'page-03');
  assert.equal(pageFileName(12, 12), 'page-12');
});
