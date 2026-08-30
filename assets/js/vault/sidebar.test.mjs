import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, isEmptyFolder, orderRootChildren, WELCOME_NOTE_PATH } from './sidebar.js';

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

test('orderRootChildren pins the welcome note first, keeping the rest in order', () => {
  const folder = { type: 'folder', path: 'vault/Frameworks' };
  const welcome = { type: 'file', path: WELCOME_NOTE_PATH };
  const other = { type: 'file', path: 'vault/notes.md' };
  assert.deepEqual(orderRootChildren([folder, welcome, other]), [welcome, folder, other]);
  assert.deepEqual(orderRootChildren([folder, other]), [folder, other]);
});
