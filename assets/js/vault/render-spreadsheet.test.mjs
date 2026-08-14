import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { renderSpreadsheet } from './render-spreadsheet.js';

const identityDOMPurify = { sanitize: (html) => html };

function workbookFromRows(sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

test('renders a single-sheet workbook as a table, without a sheet heading', () => {
  const buffer = workbookFromRows({ Sheet1: [['Name', 'Age'], ['Ada', 36]] });
  const out = renderSpreadsheet(buffer, 'people.xlsx', { XLSX, DOMPurify: identityDOMPurify });
  assert.doesNotMatch(out, /<h2>/);
  assert.match(out, /<th>Name<\/th><th>Age<\/th>/);
  assert.match(out, /<td>Ada<\/td><td>36<\/td>/);
});

test('renders each sheet of a multi-sheet workbook under its own heading', () => {
  const buffer = workbookFromRows({
    Income: [['Month', 'Total'], ['Jan', 100]],
    Expenses: [['Month', 'Total'], ['Jan', 40]],
  });
  const out = renderSpreadsheet(buffer, 'budget.xlsx', { XLSX, DOMPurify: identityDOMPurify });
  assert.match(out, /<h2>Income<\/h2>/);
  assert.match(out, /<h2>Expenses<\/h2>/);
});

test('parses .csv content the same way as .xlsx', () => {
  const csv = new TextEncoder().encode('Name,Age\nAda,36\n').buffer;
  const out = renderSpreadsheet(csv, 'people.csv', { XLSX, DOMPurify: identityDOMPurify });
  assert.match(out, /<th>Name<\/th><th>Age<\/th>/);
  assert.match(out, /<td>Ada<\/td><td>36<\/td>/);
});

test('escapes HTML-significant characters in cell values', () => {
  const buffer = workbookFromRows({ Sheet1: [['Note'], ['<img src=x onerror=alert(1)>']] });
  const out = renderSpreadsheet(buffer, 'notes.xlsx', { XLSX, DOMPurify: identityDOMPurify });
  assert.doesNotMatch(out, /<img/);
  assert.match(out, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('wraps output in a vault-content container, same as other renderers', () => {
  const buffer = workbookFromRows({ Sheet1: [['A'], ['1']] });
  const out = renderSpreadsheet(buffer, 'a.xlsx', { XLSX, DOMPurify: identityDOMPurify });
  assert.match(out, /^<div class="vault-content">/);
});

test('throws a clear error when XLSX is not loaded', () => {
  assert.throws(() => renderSpreadsheet(new ArrayBuffer(0), 'a.xlsx', { DOMPurify: identityDOMPurify }), /XLSX library is not loaded/);
});
