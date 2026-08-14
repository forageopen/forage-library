import { renderFile, SUPPORTED_EXTENSIONS, extensionOf } from './renderers.js';
import { getNote, setNote } from './sidenote-store.js';
import { initDropzone } from './dropzone.js';

export function createViewerPane(paneEl) {
  const dropzone = paneEl.querySelector('[data-vault-dropzone]');
  const contentEl = paneEl.querySelector('[data-vault-pane-content]');
  const sidenoteEl = paneEl.querySelector('[data-vault-sidenote]');
  const sidenoteInput = paneEl.querySelector('[data-vault-sidenote-input]');

  let currentPath = null;

  function showContent() {
    dropzone.hidden = true;
    contentEl.hidden = false;
  }

  function renderLoading(name) {
    showContent();
    contentEl.className = 'vault-pane-content';
    contentEl.innerHTML = `<div class="vault-status vault-status--loading">Loading ${name}…</div>`;
  }

  function renderError(name, message) {
    showContent();
    contentEl.className = 'vault-pane-content';
    contentEl.innerHTML = `<div class="vault-status vault-status--error">Couldn't open ${name}: ${message}</div>`;
  }

  async function openSource(name, arrayBuffer, path) {
    renderLoading(name);
    try {
      const result = await renderFile(name, arrayBuffer);
      contentEl.innerHTML = result.html;
      contentEl.className = 'vault-pane-content vault-pane-content--' + result.kind;
      currentPath = path;
      if (sidenoteInput) sidenoteInput.value = getNote(localStorage, currentPath);
    } catch (err) {
      currentPath = null;
      renderError(name, err.message);
    }
  }

  async function openVaultFile(path, name) {
    const res = await fetch('../' + path);
    if (!res.ok) {
      renderLoading(name);
      renderError(name, `${res.status} ${res.statusText}`);
      return;
    }
    const arrayBuffer = await res.arrayBuffer();
    await openSource(name, arrayBuffer, path);
  }

  async function openLocalFile(file) {
    const ext = extensionOf(file.name);
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      renderError(file.name, `unsupported file type — use one of: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }
    const arrayBuffer = await file.arrayBuffer();
    await openSource(file.name, arrayBuffer, 'local:' + file.name);
  }

  initDropzone(dropzone, openLocalFile);

  if (sidenoteInput) {
    sidenoteInput.addEventListener('input', () => {
      if (currentPath) setNote(localStorage, currentPath, sidenoteInput.value);
    });
  }

  return {
    el: paneEl,
    openVaultFile,
    openLocalFile,
    toggleSidenote() {
      if (sidenoteEl) sidenoteEl.hidden = !sidenoteEl.hidden;
    },
  };
}
