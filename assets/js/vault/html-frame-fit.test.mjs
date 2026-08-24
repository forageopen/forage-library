import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFitScale, isHtmlFrameSizeMessage, HTML_FRAME_MEASURE_SCRIPT } from './html-frame-fit.js';

test('computeFitScale scales a narrower container down', () => {
  assert.equal(computeFitScale(400, 800), 0.5);
});

test('computeFitScale never zooms past the document\'s own authored size', () => {
  assert.equal(computeFitScale(1600, 800), 1);
});

test('computeFitScale falls back to 1 for a missing/zero natural width', () => {
  assert.equal(computeFitScale(400, 0), 1);
  assert.equal(computeFitScale(400, null), 1);
});

test('computeFitScale falls back to 1 for a missing/zero container width', () => {
  assert.equal(computeFitScale(0, 800), 1);
});

test('isHtmlFrameSizeMessage accepts a well-formed size report', () => {
  assert.equal(isHtmlFrameSizeMessage({ source: 'forage-html-frame', width: 800, height: 1200 }), true);
});

test('isHtmlFrameSizeMessage rejects unrelated postMessage traffic', () => {
  assert.equal(isHtmlFrameSizeMessage(null), false);
  assert.equal(isHtmlFrameSizeMessage({}), false);
  assert.equal(isHtmlFrameSizeMessage({ source: 'some-other-widget', width: 800, height: 1200 }), false);
  assert.equal(isHtmlFrameSizeMessage({ source: 'forage-html-frame', width: 0, height: 1200 }), false);
  assert.equal(isHtmlFrameSizeMessage({ source: 'forage-html-frame', width: 800, height: '1200' }), false);
});

test('HTML_FRAME_MEASURE_SCRIPT is a self-contained inline <script> tag', () => {
  assert.match(HTML_FRAME_MEASURE_SCRIPT, /^\s*<script>[\s\S]*<\/script>\s*$/);
  assert.match(HTML_FRAME_MEASURE_SCRIPT, /forage-html-frame/);
});
