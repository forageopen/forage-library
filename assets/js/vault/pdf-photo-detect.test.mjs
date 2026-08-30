import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyImageStats,
  imageStatsFromRgba,
  matMul,
  applyPoint,
  deviceRectFromCtm,
  collectImageDraws,
  rectToPercent,
} from './pdf-photo-detect.js';

test('classifyImageStats: an opaque, many-coloured image is a photo', () => {
  assert.equal(classifyImageStats({ opaqueFraction: 1, quantColors: 26 }), true);
  assert.equal(classifyImageStats({ opaqueFraction: 0.7, quantColors: 40 }), true);
});

test('classifyImageStats: rasterised text (mostly transparent, ~2 colours) is not a photo', () => {
  assert.equal(classifyImageStats({ opaqueFraction: 0.17, quantColors: 2 }), false);
  assert.equal(classifyImageStats({ opaqueFraction: 0.24, quantColors: 2 }), false);
});

test('classifyImageStats: needs BOTH opacity and colour variety', () => {
  assert.equal(classifyImageStats({ opaqueFraction: 1, quantColors: 3 }), false); // opaque flat fill
  assert.equal(classifyImageStats({ opaqueFraction: 0.3, quantColors: 50 }), false); // colourful cut-out logo
});

test('classifyImageStats: rejects non-finite input', () => {
  assert.equal(classifyImageStats({ opaqueFraction: NaN, quantColors: 20 }), false);
  assert.equal(classifyImageStats({}), false);
});

test('imageStatsFromRgba counts opaque fraction and quantised colours', () => {
  // 4 px: 2 opaque reds, 1 transparent, 1 opaque blue
  const data = new Uint8ClampedArray([
    255, 0, 0, 255,
    250, 5, 5, 255,
    0, 0, 0, 0,
    0, 0, 255, 255,
  ]);
  const { opaqueFraction, quantColors } = imageStatsFromRgba(data);
  assert.equal(opaqueFraction, 0.75);
  assert.equal(quantColors, 3); // the two reds land in different 4-bit buckets, + blue + black(transparent)
});

test('matMul composes affine transforms (translate then scale)', () => {
  const scale2 = [2, 0, 0, 2, 0, 0];
  const move = [1, 0, 0, 1, 10, 20];
  // matMul(scale2, move): apply move first, then scale
  assert.deepEqual(matMul(scale2, move), [2, 0, 0, 2, 20, 40]);
});

test('applyPoint maps a point through a matrix', () => {
  assert.deepEqual(applyPoint([2, 0, 0, 3, 5, 7], 1, 1), [7, 10]);
});

test('deviceRectFromCtm: unit square under a scale+translate CTM', () => {
  const ctm = [100, 0, 0, 50, 20, 200]; // 100x50 image at (20,200) in a y-up space
  const viewport = [1, 0, 0, -1, 0, 400]; // flip y for a 400px-tall page
  const r = deviceRectFromCtm(ctm, viewport);
  assert.equal(Math.round(r.x), 20);
  assert.equal(Math.round(r.w), 100);
  assert.equal(Math.round(r.h), 50);
  assert.equal(Math.round(r.y), 150); // 400 - (200+50)
});

test('collectImageDraws tracks the CTM through save/restore and transform', () => {
  const ops = {
    save: 1, restore: 2, transform: 3,
    paintFormXObjectBegin: 4, paintFormXObjectEnd: 5,
    paintImageXObject: 10, paintInlineImageXObject: 11, paintImageXObjectRepeat: 12,
    paintImageMaskXObject: 20,
  };
  const identityViewport = [1, 0, 0, 1, 0, 0];
  const fnArray = [
    ops.save,                 // push identity
    ops.transform,            // scale 10, move (5,5)
    ops.paintImageXObject,    // image A at that CTM
    ops.paintImageMaskXObject,// a mask — must be ignored
    ops.restore,              // back to identity
    ops.paintImageXObject,    // image B at identity
  ];
  const argsArray = [
    null,
    [10, 0, 0, 10, 5, 5],
    ['imgA', 10, 10],
    ['maskX'],
    null,
    ['imgB', 1, 1],
  ];
  const draws = collectImageDraws({ fnArray, argsArray, ops, viewportTransform: identityViewport });
  assert.equal(draws.length, 2);
  assert.equal(draws[0].objId, 'imgA');
  assert.deepEqual(
    [Math.round(draws[0].x), Math.round(draws[0].y), Math.round(draws[0].w), Math.round(draws[0].h)],
    [5, 5, 10, 10]
  );
  assert.equal(draws[1].objId, 'imgB');
  assert.deepEqual([Math.round(draws[1].x), Math.round(draws[1].w)], [0, 1]);
});

test('collectImageDraws folds in a form-XObject transform and pops it on end', () => {
  const ops = { save: 1, restore: 2, transform: 3, paintFormXObjectBegin: 4, paintFormXObjectEnd: 5, paintImageXObject: 10 };
  const fnArray = [ops.paintFormXObjectBegin, ops.paintImageXObject, ops.paintFormXObjectEnd, ops.paintImageXObject];
  const argsArray = [
    [[1, 0, 0, 1, 100, 0]], // form shifts x by 100
    ['inside', 1, 1],
    null,
    ['outside', 1, 1],
  ];
  const draws = collectImageDraws({ fnArray, argsArray, ops, viewportTransform: [1, 0, 0, 1, 0, 0] });
  assert.equal(Math.round(draws[0].x), 100);
  assert.equal(Math.round(draws[1].x), 0);
});

test('rectToPercent clamps to the page and converts to %', () => {
  assert.deepEqual(rectToPercent({ x: 100, y: 50, w: 200, h: 100 }, 400, 200), {
    xPct: 25, yPct: 25, wPct: 50, hPct: 50,
  });
  // fully outside → null
  assert.equal(rectToPercent({ x: 500, y: 0, w: 50, h: 50 }, 400, 200), null);
  // sub-pixel sliver → null
  assert.equal(rectToPercent({ x: 0, y: 0, w: 0.4, h: 100 }, 400, 200), null);
});
