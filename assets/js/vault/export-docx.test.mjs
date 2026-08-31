import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as docx from 'docx';
import { blocksToDocxDocument, blocksToDocxBlob } from './export-docx.js';

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('throws a clear error when docx is not available', () => {
  assert.throws(() => blocksToDocxDocument([{ kind: 'thematicBreak' }], undefined), /docx library is not loaded/);
});

test('builds a Document instance for a heading + paragraph', () => {
  const blocks = [
    { kind: 'heading', level: 1, runs: [{ text: 'Title' }] },
    { kind: 'paragraph', runs: [{ text: 'Body ' }, { bold: true, text: 'bold' }] },
  ];
  const document = blocksToDocxDocument(blocks, docx);
  assert.ok(document instanceof docx.Document);
});

test('handles every block kind without throwing', () => {
  const blocks = [
    { kind: 'heading', level: 2, runs: [{ text: 'H' }] },
    { kind: 'paragraph', runs: [{ text: 'P' }] },
    { kind: 'blockquote', blocks: [{ kind: 'paragraph', runs: [{ text: 'Q' }] }] },
    { kind: 'codeBlock', lang: 'js', text: 'const x = 1;\nconst y = 2;' },
    {
      kind: 'list',
      ordered: true,
      items: [{ runs: [{ text: 'Item one' }], children: [] }, { runs: [{ text: 'Item two' }], children: [] }],
    },
    { kind: 'thematicBreak' },
    {
      kind: 'table',
      header: [{ runs: [{ text: 'A' }] }, { runs: [{ text: 'B' }] }],
      rows: [[{ runs: [{ text: '1' }] }, { runs: [{ text: '2' }] }]],
      align: ['left', 'right'],
    },
    {
      kind: 'image',
      mime: 'image/png',
      dataUrl: TINY_PNG,
      xPx: 48,
      yPx: 24,
      wPx: 120,
      hPx: 80,
    },
  ];
  assert.doesNotThrow(() => blocksToDocxDocument(blocks, docx));
});

test('builds a floating ImageRun for an image block', () => {
  const block = { kind: 'image', mime: 'image/png', dataUrl: TINY_PNG, xPx: 10, yPx: 20, wPx: 64, hPx: 64 };
  const document = blocksToDocxDocument([block], docx);
  assert.ok(document instanceof docx.Document);
});

test('an image block produces a non-empty .docx Blob', async () => {
  const block = { kind: 'image', mime: 'image/png', dataUrl: TINY_PNG, xPx: 0, yPx: 0, wPx: 32, hPx: 32 };
  const blob = await blocksToDocxBlob([block], docx);
  assert.ok(blob.size > 0);
});

test('handles a nested list', () => {
  const blocks = [
    {
      kind: 'list',
      ordered: false,
      items: [
        {
          runs: [{ text: 'Parent' }],
          children: [{ kind: 'list', ordered: false, items: [{ runs: [{ text: 'Child' }], children: [] }] }],
        },
      ],
    },
  ];
  assert.doesNotThrow(() => blocksToDocxDocument(blocks, docx));
});

test('produces a non-empty Blob via blocksToDocxBlob', async () => {
  const blocks = [{ kind: 'paragraph', runs: [{ text: 'Hello, world.' }] }];
  const blob = await blocksToDocxBlob(blocks, docx);
  assert.ok(blob.size > 0);
});

test('blocksToDocxBlob throws a clear error when docx is not available', async () => {
  await assert.rejects(() => blocksToDocxBlob([{ kind: 'thematicBreak' }], undefined), /docx library is not loaded/);
});
