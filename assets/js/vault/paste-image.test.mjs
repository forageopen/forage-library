import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as docx from 'docx';
import {
  EMU_PER_PX,
  MIN_SIZE,
  KEEP_VISIBLE,
  pxToEmu,
  parseDataUrl,
  aspectLockedResize,
  clampFloatPosition,
  imageRunArgsFromPlacement,
} from './paste-image.js';

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

// --- pxToEmu ---

test('pxToEmu converts CSS px to EMU at 96 dpi', () => {
  assert.equal(pxToEmu(96), 914400); // 1 inch
  assert.equal(pxToEmu(1), EMU_PER_PX);
  assert.equal(pxToEmu(0), 0);
});

// --- parseDataUrl ---

test('parseDataUrl round-trips the mime and bytes of a base64 data URL', () => {
  const { mime, bytes } = parseDataUrl(TINY_PNG);
  assert.equal(mime, 'image/png');
  assert.ok(bytes instanceof Uint8Array);
  // PNG magic number
  assert.deepEqual(Array.from(bytes.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
});

test('parseDataUrl throws for anything that is not a base64 data URL', () => {
  assert.throws(() => parseDataUrl('not a url'), /base64 data: URL/);
  assert.throws(() => parseDataUrl('data:text/plain,hello'), /base64 data: URL/);
  assert.throws(() => parseDataUrl(''), /base64 data: URL/);
});

// --- aspectLockedResize ---

test('aspectLockedResize keeps the aspect ratio, driven by the larger delta', () => {
  // 2:1 image, dragged mostly horizontally by the SE handle
  assert.deepEqual(aspectLockedResize(200, 100, 100, 10, 'se'), { width: 300, height: 150 });
  // same image, dragged mostly vertically
  assert.deepEqual(aspectLockedResize(200, 100, 10, 100, 'se'), { width: 400, height: 200 });
});

test('aspectLockedResize grows when a NW handle is dragged up-left', () => {
  assert.deepEqual(aspectLockedResize(200, 100, -50, -10, 'nw'), { width: 250, height: 125 });
});

test('aspectLockedResize never returns a side below MIN_SIZE, aspect still kept', () => {
  // Shrinking a 2:1 image past the floor: the short side pins to MIN_SIZE
  // and the long side follows the ratio (so it lands above the floor too).
  const { width, height } = aspectLockedResize(40, 20, -30, 0, 'se');
  assert.equal(height, MIN_SIZE);
  assert.equal(width, MIN_SIZE * 2);
});

// --- clampFloatPosition ---

test('clampFloatPosition leaves an in-bounds position untouched', () => {
  assert.deepEqual(
    clampFloatPosition({ x: 100, y: 80, w: 200, h: 150, hostW: 800, hostH: 600 }),
    { x: 100, y: 80 },
  );
});

test('clampFloatPosition pulls a nearly-offscreen image back to KEEP_VISIBLE', () => {
  const offLeft = clampFloatPosition({ x: -500, y: 10, w: 200, h: 150, hostW: 800, hostH: 600 });
  assert.equal(offLeft.x, KEEP_VISIBLE - 200);
  const offBottom = clampFloatPosition({ x: 10, y: 5000, w: 200, h: 150, hostW: 800, hostH: 600 });
  assert.equal(offBottom.y, 600 - KEEP_VISIBLE);
});

// --- imageRunArgsFromPlacement ---

test('imageRunArgsFromPlacement builds "In Front of Text" floating options', () => {
  const args = imageRunArgsFromPlacement(
    { mime: 'image/png', xPx: 48, yPx: 24, wPx: 300, hPx: 150 },
    docx,
  );
  assert.equal(args.type, 'png');
  assert.deepEqual(args.transformation, { width: 300, height: 150 });
  assert.equal(args.floating.wrap.type, docx.TextWrappingType.NONE);
  assert.equal(args.floating.behindDocument, false);
  assert.equal(args.floating.allowOverlap, true);
  assert.equal(args.floating.horizontalPosition.relative, docx.HorizontalPositionRelativeFrom.COLUMN);
  assert.equal(args.floating.horizontalPosition.offset, pxToEmu(48));
  assert.equal(args.floating.verticalPosition.relative, docx.VerticalPositionRelativeFrom.PARAGRAPH);
  assert.equal(args.floating.verticalPosition.offset, pxToEmu(24));
});

test('imageRunArgsFromPlacement maps a non-png mime to the jpg image type', () => {
  const args = imageRunArgsFromPlacement({ mime: 'image/jpeg', xPx: 0, yPx: 0, wPx: 10, hPx: 10 }, docx);
  assert.equal(args.type, 'jpg');
});

test('imageRunArgsFromPlacement throws a clear error without a docx library', () => {
  assert.throws(
    () => imageRunArgsFromPlacement({ mime: 'image/png', xPx: 0, yPx: 0, wPx: 1, hPx: 1 }, undefined),
    /docx library is not loaded/,
  );
});
