import { restyleContentHtml } from './render-core.js';
import { sanitizeHtml } from './sanitize.js';

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Pure: a SheetJS worksheet -> an HTML <table> string. Reads rows via
   sheet_to_json({header:1}) rather than sheet_to_html so cell values are
   escaped the same way every other renderer here escapes untrusted text,
   instead of trusting SheetJS's own HTML serialization. */
function sheetToTableHtml(sheet, XLSXLib) {
  const rows = XLSXLib.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
  if (!rows.length) return '<p><em>Empty sheet</em></p>';
  const [headerRow, ...bodyRows] = rows;
  const thead = `<thead><tr>${headerRow.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${bodyRows
    .map((row) => `<tr>${headerRow.map((_, i) => `<td>${escapeHtml(row[i] ?? '')}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

/* .xlsx and .csv both go through SheetJS's workbook reader — for CSV, SheetJS
   parses the decoded text as a single-sheet "workbook" so the rest of the
   pipeline (multi-sheet heading + table rendering) is identical either way. */
export function renderSpreadsheet(arrayBuffer, filename, deps = {}) {
  const XLSXLib = deps.XLSX || globalThis.XLSX;
  if (!XLSXLib) throw new Error('renderSpreadsheet: XLSX library is not loaded');
  const isCsv = /\.csv$/i.test(filename);
  const workbook = isCsv
    ? XLSXLib.read(new TextDecoder('utf-8').decode(arrayBuffer), { type: 'string' })
    : XLSXLib.read(arrayBuffer, { type: 'array' });

  const showSheetNames = workbook.SheetNames.length > 1;
  const html = workbook.SheetNames.map((name) => {
    const heading = showSheetNames ? `<h2>${escapeHtml(name)}</h2>` : '';
    return heading + sheetToTableHtml(workbook.Sheets[name], XLSXLib);
  }).join('');

  return restyleContentHtml(sanitizeHtml(html, deps.DOMPurify || globalThis.DOMPurify));
}
