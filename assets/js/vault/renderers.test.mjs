import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderFile, extensionOf, SUPPORTED_EXTENSIONS } from './renderers.js';

const textEncoder = new TextEncoder();

test('extensionOf lowercases and strips the leading dot', () => {
  assert.equal(extensionOf('Report.DOCX'), 'docx');
  assert.equal(extensionOf('noext'), '');
});

test('SUPPORTED_EXTENSIONS lists all twelve handled types', () => {
  assert.deepEqual(SUPPORTED_EXTENSIONS, ['md', 'txt', 'docx', 'pptx', 'pdf', 'xlsx', 'csv', 'jpg', 'jpeg', 'png', 'html', 'htm']);
});

test('dispatches .md to the markdown renderer as prose', async () => {
  const buffer = textEncoder.encode('# Hi').buffer;
  const result = await renderFile('note.md', buffer, { renderMarkdown: (text) => `<h1>${text}</h1>` });
  assert.deepEqual(result, { kind: 'prose', html: '<h1># Hi</h1>' });
});

test('dispatches .txt to the text renderer as prose', async () => {
  const buffer = textEncoder.encode('hello').buffer;
  const result = await renderFile('note.txt', buffer, { renderText: (text) => `<p>${text}</p>` });
  assert.deepEqual(result, { kind: 'prose', html: '<p>hello</p>' });
});

test('dispatches .docx to the docx renderer as prose', async () => {
  const result = await renderFile('report.docx', new ArrayBuffer(0), { renderDocx: async () => '<p>doc</p>' });
  assert.deepEqual(result, { kind: 'prose', html: '<p>doc</p>' });
});

test('dispatches .pptx to the pptx renderer as a deck', async () => {
  const result = await renderFile('deck.pptx', new ArrayBuffer(0), { renderPptx: async () => '<section></section>' });
  assert.deepEqual(result, { kind: 'deck', html: '<section></section>' });
});

test('dispatches .pdf to the pdf renderer as a deck', async () => {
  const result = await renderFile('scan.pdf', new ArrayBuffer(0), { renderPdf: async () => '<section></section>' });
  assert.deepEqual(result, { kind: 'deck', html: '<section></section>' });
});

test('dispatches .xlsx to the spreadsheet renderer as prose', async () => {
  const result = await renderFile('data.xlsx', new ArrayBuffer(0), { renderSpreadsheet: (buf, name) => `<table data-name="${name}"></table>` });
  assert.deepEqual(result, { kind: 'prose', html: '<table data-name="data.xlsx"></table>' });
});

test('dispatches .csv to the spreadsheet renderer as prose', async () => {
  const result = await renderFile('data.csv', new ArrayBuffer(0), { renderSpreadsheet: (buf, name) => `<table data-name="${name}"></table>` });
  assert.deepEqual(result, { kind: 'prose', html: '<table data-name="data.csv"></table>' });
});

test('dispatches .jpg/.jpeg/.png to the image renderer as an image', async () => {
  const deps = { renderImage: (buf, name) => `<img data-name="${name}">` };
  assert.deepEqual(await renderFile('photo.jpg', new ArrayBuffer(0), deps), { kind: 'image', html: '<img data-name="photo.jpg">' });
  assert.deepEqual(await renderFile('photo.jpeg', new ArrayBuffer(0), deps), { kind: 'image', html: '<img data-name="photo.jpeg">' });
  assert.deepEqual(await renderFile('photo.png', new ArrayBuffer(0), deps), { kind: 'image', html: '<img data-name="photo.png">' });
});

test('dispatches .html/.htm to an unmodified iframe payload, not sanitized/parsed', async () => {
  const source = '<!doctype html><html><body><style>*{margin:0}</style><h1>Hi</h1></body></html>';
  const buffer = textEncoder.encode(source).buffer;
  assert.deepEqual(await renderFile('doc.html', buffer, {}), { kind: 'iframe', html: source });
  assert.deepEqual(await renderFile('doc.htm', buffer, {}), { kind: 'iframe', html: source });
});

test('throws a clear error for an unsupported extension', async () => {
  await assert.rejects(() => renderFile('image.gif', new ArrayBuffer(0), {}), /Unsupported file type: \.gif/);
});
