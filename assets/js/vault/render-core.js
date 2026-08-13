/* Shared restyle layer — wraps HTML produced by marked/mammoth with
   Forage's own typography classes so md/docx content look consistent
   regardless of source format. Pure string transform (no DOM), so it
   runs the same in Node tests and the browser. */

export function restyleContentHtml(html) {
  const withWrappedTables = html.replace(
    /<table[\s\S]*?<\/table>/g,
    (tableHtml) => `<div class="vault-table-wrap">${tableHtml}</div>`
  );
  return `<div class="vault-content">${withWrappedTables}</div>`;
}
