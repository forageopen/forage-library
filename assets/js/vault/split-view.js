import { createViewerPane } from './viewer-pane.js';
import { initResizeHandle } from './resize.js';

export function initSplitView(panesContainer, template) {
  const panes = [];

  function wrapExisting(paneEl) {
    const pane = createViewerPane(paneEl);
    panes.push(pane);
    return pane;
  }

  function addClonedPane() {
    const fragment = template.content.cloneNode(true);
    const paneEl = fragment.querySelector('.vault-pane');
    panesContainer.appendChild(paneEl);
    return wrapExisting(paneEl);
  }

  let activePane = wrapExisting(panesContainer.querySelector('.vault-pane'));

  panesContainer.addEventListener('click', (e) => {
    const paneEl = e.target.closest('.vault-pane');
    if (paneEl) {
      const match = panes.find((p) => p.el === paneEl);
      if (match) activePane = match;
    }
  });

  return {
    getActivePane: () => activePane,
    getAllPanes: () => panes.slice(),
    openInSplit() {
      if (panes.length >= 2) return;
      panesContainer.classList.add('vault-panes--split');

      // Insert a drag handle between the two panes so their split isn't
      // locked 50/50 — resizing sets the FIRST pane's width directly (the
      // second pane keeps flex:1 and fills whatever's left).
      const firstPaneEl = panes[0].el;
      const handle = document.createElement('div');
      handle.className = 'vault-resize-handle';
      handle.dataset.resize = 'split';
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-orientation', 'vertical');
      handle.setAttribute('aria-label', 'Resize panes');
      handle.tabIndex = 0;
      panesContainer.insertBefore(handle, firstPaneEl.nextSibling);

      activePane = addClonedPane();

      const containerWidth = panesContainer.getBoundingClientRect().width;
      initResizeHandle(handle, firstPaneEl, {
        storageKey: 'forage-vault-split-pane-width',
        defaultWidth: Math.round(containerWidth / 2),
        min: 200,
        max: Math.max(200, Math.round(containerWidth - 200)),
        direction: 1,
      });
    },
  };
}
