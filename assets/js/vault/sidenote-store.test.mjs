import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyForPath, getNote, setNote } from './sidenote-store.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

test('keyForPath namespaces the path so it cannot collide with other localStorage keys', () => {
  assert.equal(keyForPath('vault/Welcome/note.md'), 'forage-vault-sidenote:vault/Welcome/note.md');
});

test('getNote returns an empty string when nothing is stored', () => {
  assert.equal(getNote(fakeStorage(), 'vault/a.md'), '');
});

test('setNote then getNote round-trips the text', () => {
  const storage = fakeStorage();
  setNote(storage, 'vault/a.md', 'my thoughts');
  assert.equal(getNote(storage, 'vault/a.md'), 'my thoughts');
});

test('setNote with empty text removes the stored entry', () => {
  const storage = fakeStorage();
  setNote(storage, 'vault/a.md', 'temp');
  setNote(storage, 'vault/a.md', '');
  assert.equal(getNote(storage, 'vault/a.md'), '');
});

test('notes for different files are independent', () => {
  const storage = fakeStorage();
  setNote(storage, 'vault/a.md', 'A');
  setNote(storage, 'vault/b.md', 'B');
  assert.equal(getNote(storage, 'vault/a.md'), 'A');
  assert.equal(getNote(storage, 'vault/b.md'), 'B');
});
