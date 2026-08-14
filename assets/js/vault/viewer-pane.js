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
      if (sidenoteInput) {
        try {
          sidenoteInput.value = getNote(localStorage, currentPath);
        } catch (err) {
          sidenoteInput.value = '';
        }
      }
    } catch (err) {
      currentPath = null;
      renderError(name, err.message);
    }
  }

  async function openVaultFile(path, name) {
    renderLoading(name);
    try {
      const res = await fetch('../' + path);
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

  initDropzone(dropzone, openLocalFile);

  if (sidenoteInput) {
    sidenoteInput.addEventListener('input', () => {
      if (currentPath) {
        try {
          setNote(localStorage, currentPath, sidenoteInput.value);
        } catch (err) {
          // Persistence is best-effort; ignore storage failures.
        }
      }
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
