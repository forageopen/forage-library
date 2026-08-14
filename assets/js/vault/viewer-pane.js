import { renderFile, SUPPORTED_EXTENSIONS, extensionOf } from './renderers.js';
import { getNote, setNote } from './sidenote-store.js';
import { initDropzone } from './dropzone.js';
import {
  exportHtml as downloadStandaloneHtml,
  exportMarkdownSource,
  exportJson,
  exportPlainText as downloadPlainText,
  exportCsv as downloadCsv,
  withExtension,
  downloadBlob,
} from './export.js';
import { elementToJpegBlob } from './export-image.js';
import { blocksToDocxBlob } from './export-docx.js';
import { blocksFromTokens, blocksFromElement } from './document-model.js';
import { initResizeHandle } from './resize.js';
import { highlightSwatchesHtml } from './highlight-colors.js';
import { contrastTextColor } from './contrast.js';
import { formatReadingStats, formatPageStats } from './reading-stats.js';

const TEXT_DECODER = new TextDecoder('utf-8');
const MARKDOWN_SOURCE_EXTENSIONS = new Set(['md', 'txt']);
const NEW_DOCUMENT_NAME = 'Untitled.docx';

function editorToolbarHtml() {
  return `
  <div class="vault-editor-toolbar">
    <select class="vault-editor-format" data-editor-format title="Paragraph style" aria-label="Paragraph style">
      <option value="P">Body</option>
      <option value="H1">Heading 1</option>
      <option value="H2">Heading 2</option>
      <option value="H3">Heading 3</option>
    </select>
    <button type="button" class="vault-editor-btn" data-cmd="bold" aria-label="Bold" title="Bold"><b>B</b></button>
    <button type="button" class="vault-editor-btn" data-cmd="italic" aria-label="Italic" title="Italic"><i>I</i></button>
    <button type="button" class="vault-editor-btn" data-cmd="underline" aria-label="Underline" title="Underline"><u>U</u></button>
    <button type="button" class="vault-editor-btn" data-cmd="strikeThrough" aria-label="Strikethrough" title="Strikethrough"><s>S</s></button>
    <span class="vault-editor-highlights">${highlightSwatchesHtml('vault-editor-highlight')}</span>
  </div>
`;
}

/* Applies a highlighter color plus an auto-picked, high-contrast text
   color in the same stroke — a plain hiliteColor left text unreadable
   against several of the 18 palette colors (e.g. black text on Charcoal).
   "none" resets both: transparent background, and text color back to
   whatever the surrounding element already resolves to (its computed
   `color`), rather than leaving a stale forced foreColor behind.

   `hiliteColor` is unreliable unless `styleWithCSS` is turned on first —
   without it, Chrome silently no-ops instead of wrapping the selection,
   inconsistently depending on prior execCommand calls in the same
   document. It's switched back off immediately after, rather than left
   on: document-model.js's DOCX/JSON export looks for literal `<b>`/`<i>`
   tags (see blocksFromElement), which is what Bold/Italic already produce
   with styleWithCSS off — leaving it on would make later Bold/Italic
   clicks emit `<span style="font-weight:bold">` instead, silently
   breaking export fidelity for anything typed after a highlight. */
function applyHighlight(hex, targetEl) {
  document.execCommand('styleWithCSS', false, true);
  if (hex === 'none') {
    document.execCommand('hiliteColor', false, 'transparent');
    document.execCommand('foreColor', false, getComputedStyle(targetEl).color);
  } else {
    document.execCommand('hiliteColor', false, hex);
    document.execCommand('foreColor', false, contrastTextColor(hex));
  }
  document.execCommand('styleWithCSS', false, false);
}

/* Which slide/page is "current" while scrolling a deck — the last one
   whose top has crossed the vertical midpoint of the scroll container.
   Used for the PDF viewer's "x/y pages" stat, since a PDF page has no
   text to derive a word count from. */
function currentSlideIndex(container, slides) {
  const containerTop = container.getBoundingClientRect().top;
  const midpoint = container.clientHeight / 2;
  let index = 0;
  slides.forEach((slide, i) => {
    if (slide.getBoundingClientRect().top - containerTop < midpoint) index = i;
  });
  return index;
}

export function createViewerPane(paneEl) {
  const dropzone = paneEl.querySelector('[data-vault-dropzone]');
  const contentEl = paneEl.querySelector('[data-vault-pane-content]');
  const paneMain = paneEl.querySelector('.vault-pane-main');
  const sidenoteEl = paneEl.querySelector('[data-vault-sidenote]');
  const sidenoteInput = paneEl.querySelector('[data-vault-sidenote-input]');
  const sidenoteToolbar = paneEl.querySelector('[data-vault-sidenote-toolbar]');
  const sidenoteHighlights = paneEl.querySelector('[data-vault-sidenote-highlights]');
  const sidenoteResizeHandle = paneEl.querySelector('[data-resize="sidenote"]');
  const headerEl = paneEl.querySelector('[data-vault-pane-header]');
  const nameEl = paneEl.querySelector('[data-vault-pane-name]');
  const exportMenuBtn = paneEl.querySelector('[data-action="pane-export-menu"]');
  const exportMenu = paneEl.querySelector('.vault-pane-export-menu');
  const statsBar = paneEl.querySelector('[data-vault-pane-stats-bar]');
  const statsEl = paneEl.querySelector('[data-vault-pane-stats]');

  if (sidenoteHighlights) sidenoteHighlights.innerHTML = highlightSwatchesHtml('vault-sidenote-highlight');

  let currentPath = null;
  let currentName = null;
  let currentSourceText = null; // only set for .md/.txt — the raw source, for "export as Markdown"

  function updateHeader() {
    if (!headerEl) return;
    headerEl.hidden = !currentName;
    if (nameEl) nameEl.textContent = currentName || '';
  }

  /* Word count / reading time bar — reads whatever's actually on screen
     (`innerText`, so it reflects rendered text, not markup) rather than
     tracking a separate copy of the content. Hidden entirely when there's
     no text yet, same convention as the header. PDFs are the exception:
     a page is a rendered image with no text to count, so it shows
     "x/y pages" instead, tracking scroll position through the deck. */
  function updateStats() {
    if (!statsBar || !statsEl) return;
    if (!currentName) {
      statsBar.hidden = true;
      return;
    }
    if (extensionOf(currentName) === 'pdf') {
      const slides = Array.from(contentEl.querySelectorAll('.vault-slide'));
      const stats = paneMain ? formatPageStats(currentSlideIndex(paneMain, slides) + 1, slides.length) : null;
      statsBar.hidden = !stats;
      statsEl.textContent = stats || '';
      return;
    }
    const editorBody = contentEl.querySelector('.vault-editor-body');
    const stats = formatReadingStats((editorBody || contentEl).innerText);
    statsBar.hidden = !stats;
    statsEl.textContent = stats || '';
  }

  function showContent() {
    dropzone.hidden = true;
    contentEl.hidden = false;
  }

  function renderLoading(name) {
    showContent();
    contentEl.className = 'vault-pane-content';
    contentEl.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'vault-status vault-status--loading';
    div.textContent = `Loading ${name}…`;
    contentEl.appendChild(div);
  }

  function renderError(name, message) {
    showContent();
    contentEl.className = 'vault-pane-content';
    contentEl.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'vault-status vault-status--error';
    div.textContent = `Couldn't open ${name}: ${message}`;
    contentEl.appendChild(div);
  }

  async function openSource(name, arrayBuffer, path) {
    renderLoading(name);
    try {
      const result = await renderFile(name, arrayBuffer);
      contentEl.innerHTML = result.html;
      contentEl.className = 'vault-pane-content vault-pane-content--' + result.kind;
      currentPath = path;
      currentName = name;
      currentSourceText = MARKDOWN_SOURCE_EXTENSIONS.has(extensionOf(name))
        ? TEXT_DECODER.decode(arrayBuffer)
        : null;
      if (sidenoteInput) {
        try {
          sidenoteInput.innerHTML = getNote(localStorage, currentPath);
        } catch (err) {
          sidenoteInput.innerHTML = '';
        }
      }
      updateHeader();
      /* For a PDF deck, the "x/y pages" stat depends on each page image's
         real rendered height (see currentSlideIndex) — computing it before
         the images decode would measure them all at ~0 height, collapsing
         every page's top to nearly the same offset and always reporting
         the last one. img.decode() waits for that to finish first. */
      if (extensionOf(name) === 'pdf') {
        const imgs = Array.from(contentEl.querySelectorAll('img'));
        await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
      }
      updateStats();
    } catch (err) {
      currentPath = null;
      currentName = null;
      currentSourceText = null;
      renderError(name, err.message);
      updateHeader();
      updateStats();
    }
  }

  async function openVaultFile(path, name) {
    renderLoading(name);
    try {
      const res = await fetch(path);
      if (!res.ok) {
        renderError(name, `${res.status} ${res.statusText}`);
        return;
      }
      const arrayBuffer = await res.arrayBuffer();
      await openSource(name, arrayBuffer, path);
    } catch (err) {
      renderError(name, err.message);
    }
  }

  async function openLocalFile(file) {
    const ext = extensionOf(file.name);
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      renderError(file.name, `unsupported file type — use one of: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }
    renderLoading(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      await openSource(file.name, arrayBuffer, 'local:' + file.name);
    } catch (err) {
      renderError(file.name, err.message);
    }
  }

  /* Compute the structural IR (document-model.js) for the currently-loaded
     file, when possible — only .md (from its raw source, via marked's
     token tree) and .docx (from the already-rendered, sanitized content
     DOM) have a meaningful IR; everything else returns null and .docx/.json
     export are simply not offered for those. */
  function getBlocks() {
    if (!currentName) return null;
    const ext = extensionOf(currentName);
    if (ext === 'md' && currentSourceText !== null) {
      if (!globalThis.marked) return null;
      return blocksFromTokens(globalThis.marked.lexer(currentSourceText));
    }
    if (ext === 'docx') {
      const root = contentEl.querySelector('.vault-content');
      return root ? blocksFromElement(root) : null;
    }
    return null;
  }

  /* Toolbar buttons are focusable by default, so a plain click steals
     focus from the contenteditable BEFORE the click handler runs —
     collapsing whatever text was selected, so the command below ends up
     applying to nothing. preventDefault on mousedown (not click) stops
     the browser from shifting focus at all, so the selection the user
     made in the editor is still there when execCommand runs. */
  contentEl.addEventListener('mousedown', (e) => {
    if (e.target.closest('.vault-editor-toolbar button')) e.preventDefault();
  });

  /* Main-pane document editor toolbar — event-delegated on contentEl
     itself (rather than bound at creation time) since the toolbar's
     markup is injected fresh each time startNewNote() runs. */
  contentEl.addEventListener('click', (e) => {
    const editorBody = contentEl.querySelector('.vault-editor-body');
    if (!editorBody) return;
    const cmdBtn = e.target.closest('[data-cmd]');
    if (cmdBtn) {
      editorBody.focus();
      document.execCommand(cmdBtn.dataset.cmd);
      return;
    }
    const highlightBtn = e.target.closest('[data-highlight]');
    if (highlightBtn) {
      editorBody.focus();
      applyHighlight(highlightBtn.dataset.highlight, editorBody);
    }
  });

  contentEl.addEventListener('change', (e) => {
    const formatSelect = e.target.closest('[data-editor-format]');
    if (!formatSelect) return;
    const editorBody = contentEl.querySelector('.vault-editor-body');
    if (!editorBody) return;
    editorBody.focus();
    document.execCommand('formatBlock', false, formatSelect.value);
  });

  /* Editable document title ("Untitled.docx") — click to rename, save on
     blur. `focusout` (not `blur`) since blur doesn't bubble, and this is
     delegated on contentEl the same way the toolbar is, since the title
     element is only ever created fresh inside startNewNote(). Enter saves
     immediately too, rather than inserting a newline into a title. */
  contentEl.addEventListener('focusout', (e) => {
    const titleEl = e.target.closest('[data-editor-title]');
    if (!titleEl) return;
    const typed = titleEl.textContent.trim();
    currentName = typed || currentName || NEW_DOCUMENT_NAME;
    titleEl.textContent = currentName;
    updateHeader();
    updateStats();
  });
  contentEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('[data-editor-title]')) {
      e.preventDefault();
      e.target.blur();
    }
  });

  /* Live word count while typing in the main-pane editor — the stats bar
     would otherwise only reflect the state at open/save time. */
  contentEl.addEventListener('input', (e) => {
    if (e.target.closest('.vault-editor-body')) updateStats();
  });

  initDropzone(dropzone, openLocalFile);

  /* Keeps the PDF "x/y pages" stat in sync while scrolling through the
     deck. No-ops for every other format (updateStats() only reads scroll
     position when a PDF is open), so this is cheap to leave attached. */
  if (paneMain) {
    paneMain.addEventListener('scroll', () => {
      if (currentName && extensionOf(currentName) === 'pdf') updateStats();
    });
  }

  if (sidenoteInput) {
    sidenoteInput.addEventListener('input', () => {
      if (currentPath) {
        try {
          setNote(localStorage, currentPath, sidenoteInput.innerHTML);
        } catch (err) {
          // Persistence is best-effort; ignore storage failures.
        }
      }
    });
  }

  /* Sidenote rich-text toolbar — Bold/Italic/Underline/Strikethrough plus
     an 18-color highlighter palette, ported from Noted's Edit tab (scoped
     to this one toolbar rather than Noted's full paragraph-style picker).
     execCommand is deprecated but still the only DOM API for driving a
     contenteditable region — the same tradeoff Noted's own Edit tab makes. */
  if (sidenoteToolbar && sidenoteInput) {
    // Same focus/selection-preservation fix as the editor toolbar above.
    sidenoteToolbar.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) e.preventDefault();
    });
    sidenoteToolbar.addEventListener('click', (e) => {
      const cmdBtn = e.target.closest('[data-cmd]');
      if (cmdBtn) {
        sidenoteInput.focus();
        document.execCommand(cmdBtn.dataset.cmd);
        sidenoteInput.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      const highlightBtn = e.target.closest('[data-highlight]');
      if (highlightBtn) {
        sidenoteInput.focus();
        applyHighlight(highlightBtn.dataset.highlight, sidenoteInput);
        sidenoteInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  if (sidenoteResizeHandle && sidenoteEl) {
    initResizeHandle(sidenoteResizeHandle, sidenoteEl, {
      storageKey: 'forage-vault-sidenote-width',
      defaultWidth: 260,
      direction: -1, // sidenote sits on the right; dragging left grows it
    });
  }

  function setExportMenuOpen(open) {
    if (!exportMenu || !exportMenuBtn) return;
    exportMenu.hidden = !open;
    exportMenuBtn.setAttribute('aria-expanded', String(open));
  }

  /* Per-pane header — lives inside this pane's own DOM subtree, so every
     action here is inherently scoped to THIS pane, not "whichever pane is
     active" (the old global-kebab behavior the user found confusing in
     split view). */
  if (headerEl) {
    headerEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="pane-sidenote"]')) {
        if (sidenoteEl) sidenoteEl.hidden = !sidenoteEl.hidden;
        return;
      }
      if (e.target.closest('[data-action="pane-export-menu"]')) {
        e.stopPropagation();
        setExportMenuOpen(exportMenu ? exportMenu.hidden : false);
        return;
      }
      if (e.target.closest('[data-action="pane-export-html"]')) { api.exportHtml(); setExportMenuOpen(false); return; }
      if (e.target.closest('[data-action="pane-export-pdf"]')) { api.exportPdf(); setExportMenuOpen(false); return; }
      if (e.target.closest('[data-action="pane-export-markdown"]')) { api.exportMarkdown(); setExportMenuOpen(false); return; }
      if (e.target.closest('[data-action="pane-export-docx"]')) { api.exportDocx(); setExportMenuOpen(false); return; }
      if (e.target.closest('[data-action="pane-export-json"]')) { api.exportJson(); setExportMenuOpen(false); return; }
      if (e.target.closest('[data-action="pane-export-text"]')) { api.exportText(); setExportMenuOpen(false); return; }
      if (e.target.closest('[data-action="pane-export-csv"]')) { api.exportCsv(); setExportMenuOpen(false); return; }
      if (e.target.closest('[data-action="pane-export-jpeg"]')) { api.exportJpeg(); setExportMenuOpen(false); return; }
      if (e.target.closest('[data-action="pane-close"]')) {
        api.closeFile();
        return;
      }
    });
    document.addEventListener('click', (e) => {
      if (exportMenu && !exportMenu.hidden && !exportMenu.contains(e.target) && e.target !== exportMenuBtn && !exportMenuBtn.contains(e.target)) {
        setExportMenuOpen(false);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && exportMenu && !exportMenu.hidden) setExportMenuOpen(false);
    });
  }

  const api = {
    el: paneEl,
    openVaultFile,
    openLocalFile,
    toggleSidenote() {
      if (sidenoteEl) sidenoteEl.hidden = !sidenoteEl.hidden;
    },
    /* "…or click to start a new note" in the dropzone — opens a blank,
       editable document directly in the MAIN pane (same place an opened
       file renders), not the Sidenote panel — Sidenote stays exactly as
       it was, untouched, whatever it was already showing. `currentPath`
       is deliberately left alone too, so Sidenote's own file-scoped
       identity doesn't shift just because the main content did. */
    startNewNote() {
      showContent();
      currentName = NEW_DOCUMENT_NAME;
      currentSourceText = null;
      contentEl.className = 'vault-pane-content vault-pane-content--editor';
      contentEl.innerHTML = editorToolbarHtml()
        + `<div class="vault-editor-title" contenteditable="true" data-editor-title>${NEW_DOCUMENT_NAME}</div>`
        + '<div class="vault-content vault-editor-body" contenteditable="true" data-placeholder="Start typing…"></div>';
      const body = contentEl.querySelector('.vault-editor-body');
      if (body) body.focus();
      updateHeader();
      updateStats();
    },
    /* Clears this pane back to its empty, default state — the "no clarity
       how to get back to the picker" gap the user flagged. Sidenote is
       left exactly as-is (same rationale as startNewNote: closing the
       main content shouldn't disturb an independent panel). */
    closeFile() {
      currentPath = null;
      currentName = null;
      currentSourceText = null;
      contentEl.hidden = true;
      contentEl.innerHTML = '';
      contentEl.className = 'vault-pane-content';
      dropzone.hidden = false;
      updateHeader();
      updateStats();
    },
    exportHtml() {
      if (!currentName) return;
      const editorBody = contentEl.querySelector('.vault-editor-body');
      const html = editorBody ? editorBody.outerHTML : contentEl.innerHTML;
      const theme = document.documentElement.getAttribute('data-theme') || 'sakura';
      downloadStandaloneHtml(currentName, html, theme);
    },
    exportPdf() {
      if (!currentName) return;
      window.print();
    },
    exportMarkdown() {
      if (!currentName || currentSourceText === null) return;
      exportMarkdownSource(currentName, currentSourceText);
    },
    async exportDocx() {
      const blocks = getBlocks();
      if (!blocks) return;
      const blob = await blocksToDocxBlob(blocks);
      downloadBlob(withExtension(currentName, 'docx'), blob, blob.type);
    },
    exportJson() {
      const blocks = getBlocks();
      if (!blocks) return;
      exportJson(currentName, blocks);
    },
    /* Plain-text export: strips all formatting down to what the browser's
       own text layout already computed (`innerText`, not `textContent` —
       it collapses to visible line breaks the way a reader would expect,
       instead of running every block together). */
    exportText() {
      if (!currentName) return;
      const editorBody = contentEl.querySelector('.vault-editor-body');
      const text = (editorBody || contentEl).innerText;
      downloadPlainText(currentName, text);
    },
    /* CSV export: exports the first <table> found in the rendered content
       — works for a spreadsheet view (.xlsx/.csv), and for any markdown/
       docx table too, all from the same rendered DOM rather than needing
       format-specific extraction logic. No-ops when there's no table. */
    exportCsv() {
      if (!currentName) return;
      const table = contentEl.querySelector('table');
      if (!table) return;
      const rows = Array.from(table.rows).map((row) => Array.from(row.cells).map((cell) => cell.textContent.trim()));
      downloadCsv(currentName, rows);
    },
    /* JPEG export: rasterizes whatever's currently on screen via
       html2canvas, at the highest resolution that's safe to allocate (see
       export-image.js) — not true AI upscaling, just a high-DPI capture. */
    async exportJpeg() {
      if (!currentName) return;
      const target = contentEl.querySelector('.vault-editor-body') || contentEl;
      try {
        const blob = await elementToJpegBlob(target);
        downloadBlob(withExtension(currentName, 'jpg'), blob, blob.type);
      } catch (err) {
        // html2canvas missing, or the capture failed — no-op, same as
        // every other export method when its precondition isn't met.
      }
    },
  };

  return api;
}
