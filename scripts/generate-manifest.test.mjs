import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildTree, prettifyFilename, deriveTitle, deriveDate } from './generate-manifest.mjs';

test('prettifyFilename turns kebab/snake case into Title Case', () => {
  assert.equal(prettifyFilename('my-cool_note.md'), 'My Cool Note');
});

test('deriveTitle reads the first H1 from markdown content', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vault-test-'));
  const file = path.join(dir, 'note.md');
  writeFileSync(file, '# Real Title\n\nBody text.\n');
  assert.equal(deriveTitle(file, 'md', 'note.md'), 'Real Title');
  rmSync(dir, { recursive: true, force: true });
});

test('deriveTitle falls back to the prettified filename when there is no H1', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vault-test-'));
  const file = path.join(dir, 'no-heading.md');
  writeFileSync(file, 'Just a paragraph, no heading.\n');
  assert.equal(deriveTitle(file, 'md', 'no-heading.md'), 'No Heading');
  rmSync(dir, { recursive: true, force: true });
});

test('deriveTitle uses the prettified filename for non-markdown types', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vault-test-'));
  const file = path.join(dir, 'quarterly-notes.txt');
  writeFileSync(file, 'irrelevant');
  assert.equal(deriveTitle(file, 'txt', 'quarterly-notes.txt'), 'Quarterly Notes');
  rmSync(dir, { recursive: true, force: true });
});

test('deriveDate returns an ISO yyyy-mm-dd date', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vault-test-'));
  const file = path.join(dir, 'note.md');
  writeFileSync(file, 'x');
  assert.match(deriveDate(file), /^\d{4}-\d{2}-\d{2}$/);
  rmSync(dir, { recursive: true, force: true });
});

test('buildTree builds a nested folder/file tree, skipping unsupported extensions', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vault-test-'));
  mkdirSync(path.join(dir, 'Sub'));
  writeFileSync(path.join(dir, 'Sub', 'a.md'), '# A\n');
  writeFileSync(path.join(dir, 'ignored.gif'), 'not text');
  const tree = buildTree(dir, '');
  assert.equal(tree.length, 1);
  const folder = tree.find((n) => n.type === 'folder');
  const skipped = tree.find((n) => n.name === 'ignored.gif');
  assert.equal(folder.name, 'Sub');
  assert.equal(folder.children[0].fileType, 'md');
  assert.equal(folder.children[0].title, 'A');
  assert.equal(skipped, undefined);
  rmSync(dir, { recursive: true, force: true });
});

test('buildTree includes .jpg/.jpeg/.png files, tagged with their fileType', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vault-test-'));
  writeFileSync(path.join(dir, 'photo.jpg'), 'not real image bytes');
  writeFileSync(path.join(dir, 'photo.jpeg'), 'not real image bytes');
  writeFileSync(path.join(dir, 'photo.png'), 'not real image bytes');
  const tree = buildTree(dir, '');
  assert.deepEqual(tree.map((n) => n.fileType).sort(), ['jpeg', 'jpg', 'png']);
  rmSync(dir, { recursive: true, force: true });
});

test('buildTree excludes manifest.json from the root of the tree', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vault-test-'));
  writeFileSync(path.join(dir, 'manifest.json'), '{}');
  writeFileSync(path.join(dir, 'note.md'), '# Note\n');
  const tree = buildTree(dir, '');
  assert.equal(tree.length, 1);
  assert.equal(tree[0].name, 'note.md');
  rmSync(dir, { recursive: true, force: true });
});
