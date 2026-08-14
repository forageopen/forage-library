import { renderFile, SUPPORTED_EXTENSIONS, extensionOf } from './renderers.js';
import { getNote, setNote } from './sidenote-store.js';
import { initDropzone } from './dropzone.js';
import { exportHtml as downloadStandaloneHtml, exportMarkdownSource, exportJson, withExtension, downloadBlob } from './export.js';
import { blocksToDocxBlob } from './export-docx.js';
import { blocksFromTokens, blocksFromElement } from './document-model.js';
import { initResizeHandle } from './resize.js';

const TEXT_DECODER = new TextDecoder('utf-8');
const MARKDOWN_SOURCE_EXTENSIONS = new Set(['md', 'txt']);
const NEW_DOCUMENT_NAME = 'Untitled.docx';

const EDITOR_TOOLBAR_HTML = `
  <div class="vault-editor-toolbar">
    <button type="button" class="vault-editor-btn" data-cmd="bold" aria-label="Bold"><b>B</b></button>
    <button type="button" class="vault-editor-btn" data-cmd="italic" aria-label="Italic"><i>I</i></button>
    <button type="button" class="vault-editor-btn" data-cmd="underline" aria-label="Underline"><u>U</u></button>
    <button type="button" class="vault-editor-btn" data-cmd="strikeThrough" aria-label="Strikethrough"><s>S</s></button>
    <span class="vault-editor-highlights">
      <button type="button" class="vault-editor-highlight" data-highlight="#fff3a3" style="background:#fff3a3" aria-label="Yellow highlight"></button>
      <button type="button" class="vault-editor-highlight" data-highlight="#ffd6d6" style="background:#ffd6d6" aria-label="Red highlight"></button>
      <button type="button" class="vault-editor-highlight" data-highlight="#d6ffe0" style="background:#d6ffe0" aria-label="Green highlight"></button>
      <button type="button" class="vault-editor-highlight vault-editor-highlight--none" data-highlight="none" aria-label="Remove highlight">✕</button>
    </span>
  </div>
`;

export function createViewerPane(paneEl) {
  const dropzone = paneEl.querySelector('[data-vault-dropzone]');
  const contentEl = paneEl.querySelector('[data-vault-pane-content]');
  const sidenoteEl = paneEl.querySelector('[data-vault-sidenote]');
  const sidenoteInput = paneEl.querySelector('[data-vault-sidenote-input]');
  const sidenoteToolbar = paneEl.querySelector('[data-vault-sidenote-toolbar]');
  const sidenoteResizeHandle = paneEl.querySelector('[data-resize="sidenote"]');

  let currentPath = null;
  let currentName = null;
  let currentSourceText = null; // only set for .md/.txt — the raw source, for "export as Markdown"

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
    } catch (err) {
      currentPath = null;
      currentName = null;
      currentSourceText = null;
      renderError(name, err.message);
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
     DOM) have a meaningful IR; .txt/.pptx return null and .docx/.json
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
      document.execCommand('hiliteColor', false, highlightBtn.dataset.highlight === 'none' ? 'transparent' : highlightBtn.dataset.highlight);
    }
  });

  initDropzone(dropzone, openLocalFile);

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
     a small highlighter palette, ported from Noted's Edit tab (scoped to
     this one toolbar rather than Noted's full paragraph-style picker).
     execCommand is deprecated but still the only DOM API for driving a
     contenteditable region — the same tradeoff Noted's own Edit tab makes. */
  if (sidenoteToolbar && sidenoteInput) {
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
        const color = highlightBtn.dataset.highlight === 'none' ? 'transparent' : highlightBtn.dataset.highlight;
        document.execCommand('hiliteColor', false, color);
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

  return {
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
      contentEl.innerHTML = EDITOR_TOOLBAR_HTML
        + `<div class="vault-editor-title">${NEW_DOCUMENT_NAME}</div>`
        + '<div class="vault-content vault-editor-body" contenteditable="true" data-placeholder="Start typing…"></div>';
      const body = contentEl.querySelector('.vault-editor-body');
      if (body) body.focus();
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
  };
}
