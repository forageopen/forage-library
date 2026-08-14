/**
 * export.js
 *
 * .html export: wrap the currently-rendered content HTML in a minimal
 * standalone document with inlined CSS, then trigger a download via a
 * Blob + temporary <a download> link — ported from Noted's
 * src/export/html.ts. No dependency needed.
 */

const STANDALONE_PALETTES = {
  sakura: { bg: '#fff0f5', fg: '#4a0e2e', muted: '#8a4a63', border: '#f3c6d6', codeBg: '#f8e1ea', linkColor: '#c2185b' },
  cherry: { bg: '#141316', fg: '#ece7ea', muted: '#a99aa1', border: '#2c262a', codeBg: '#1c181c', linkColor: '#ff5ec2' },
  'forest-brew': { bg: '#212e1e', fg: '#acc54e', muted: '#8fa968', border: '#3a4a34', codeBg: '#263424', linkColor: '#c3db6e' },
  'tea-mist': { bg: '#cad1ab', fg: '#242f21', muted: '#56604e', border: '#b9c293', codeBg: '#d2d8b7', linkColor: '#242f21' },
  blueberry: { bg: '#4b4f76', fg: '#babcd3', muted: '#9799b5', border: '#5a5e82', codeBg: '#3e2038', linkColor: '#acbadb' },
  kokoblu: { bg: '#31221d', fg: '#a7bdd7', muted: '#8c97a3', border: '#4a3a34', codeBg: '#362621', linkColor: '#c3d3e6' },
  dubai: { bg: '#2a1613', fg: '#abc44f', muted: '#8fa168', border: '#43302a', codeBg: '#301f1a', linkColor: '#c3d876' },
};

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function withExtension(name, ext) {
  const base = name.replace(/\.[^./\\]+$/, '');
  return `${base || 'vault-export'}.${ext}`;
}

function standaloneCss(theme) {
  const palette = STANDALONE_PALETTES[theme] || STANDALONE_PALETTES.sakura;
  const { bg, fg, muted, border, codeBg, linkColor } = palette;
  return `
body { background: ${bg}; color: ${fg}; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.6; margin: 0; padding: 2rem; }
.vault-export-content { max-width: 46rem; margin: 0 auto; }
.vault-export-content h1, .vault-export-content h2, .vault-export-content h3 { line-height: 1.25; }
.vault-export-content a { color: ${linkColor}; }
.vault-export-content blockquote { border-left: 4px solid ${border}; margin: 1rem 0; padding: 0.25rem 1rem; color: ${muted}; }
.vault-export-content code { background: ${codeBg}; padding: 0.15em 0.35em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
.vault-export-content pre { background: ${codeBg}; padding: 1rem; overflow-x: auto; border-radius: 6px; }
.vault-export-content pre code { background: none; padding: 0; }
.vault-export-content table { border-collapse: collapse; width: 100%; }
.vault-export-content th, .vault-export-content td { border: 1px solid ${border}; padding: 0.4rem 0.6rem; }
.vault-export-content hr { border: none; border-top: 1px solid ${border}; }
`.trim();
}

/** Pure: build a standalone HTML document string. */
export function buildStandaloneHtml(title, bodyHtml, theme) {
  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${standaloneCss(theme)}
</style>
</head>
<body>
<article class="vault-export-content">
${bodyHtml}
</article>
</body>
</html>
`;
}

/** DOM: trigger a browser download of `content` as `filename`. */
export function downloadBlob(filename, content, mime, doc = document) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  doc.body.appendChild(link);
  link.click();
  doc.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** DOM: build + download the standalone .html export. */
export function exportHtml(title, bodyHtml, theme, doc = document) {
  const html = buildStandaloneHtml(title, bodyHtml, theme);
  downloadBlob(withExtension(title, 'html'), html, 'text/html', doc);
}

/** DOM: download the original Markdown/plain-text source as-is (only
 * meaningful for .md/.txt files — the caller is responsible for only
 * offering this when source text is actually available). */
export function exportMarkdownSource(title, sourceText, doc = document) {
  downloadBlob(withExtension(title, 'md'), sourceText, 'text/markdown', doc);
}
