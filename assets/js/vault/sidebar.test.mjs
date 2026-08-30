import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, isEmptyFolder, orderSiblings, PINNED_PATHS } from './sidebar.js';

test('formatDate renders an ISO date as "Mon D, YYYY"', () => {
  assert.equal(formatDate('2026-08-14'), 'Aug 14, 2026');
});

test('formatDate falls back to the raw string for non-ISO input', () => {
  assert.equal(formatDate('not-a-date'), 'not-a-date');
});

test('isEmptyFolder is true only for a folder with no children', () => {
  assert.equal(isEmptyFolder({ type: 'folder', name: 'Guides', children: [] }), true);
  assert.equal(isEmptyFolder({ type: 'folder', name: 'Guides' }), true);
  assert.equal(isEmptyFolder({ type: 'folder', children: [{ type: 'file' }] }), false);
  assert.equal(isEmptyFolder({ type: 'file', title: 'Note' }), false);
});

test('orderSiblings floats pinned paths to the top in PINNED_PATHS order, keeping the rest stable', () => {
  const folder = { type: 'folder', path: 'vault/Frameworks' };
  const welcome = { type: 'file', path: PINNED_PATHS[0] };
  const intro = { type: 'file', path: PINNED_PATHS[1] };
  const other = { type: 'file', path: 'vault/notes.md' };
  assert.deepEqual(orderSiblings([other, folder, welcome]), [welcome, other, folder]);
  assert.deepEqual(orderSiblings([other, intro, folder, welcome]), [welcome, intro, other, folder]);
  assert.deepEqual(orderSiblings([folder, other]), [folder, other]);
});
