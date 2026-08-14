import { createViewerPane } from './viewer-pane.js';
import { initResizeHandle } from './resize.js';

export function initSplitView(panesContainer, template) {
  const panes = [];
  let splitHandle = null;

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

  function openSplit() {
    if (panes.length >= 2) return;
    panesContainer.classList.add('vault-panes--split');

    // Insert a drag handle between the two panes so their split isn't
    // locked 50/50 — resizing sets the FIRST pane's width directly (the
    // second pane keeps flex:1 and fills whatever's left).
    const firstPaneEl = panes[0].el;
    splitHandle = document.createElement('div');
    splitHandle.className = 'vault-resize-handle';
    splitHandle.dataset.resize = 'split';
    splitHandle.setAttribute('role', 'separator');
    splitHandle.setAttribute('aria-orientation', 'vertical');
    splitHandle.setAttribute('aria-label', 'Resize panes');
    splitHandle.tabIndex = 0;
    panesContainer.insertBefore(splitHandle, firstPaneEl.nextSibling);

    activePane = addClonedPane();

    const containerWidth = panesContainer.getBoundingClientRect().width;
    initResizeHandle(splitHandle, firstPaneEl, {
      storageKey: 'forage-vault-split-pane-width',
      defaultWidth: Math.round(containerWidth / 2),
      min: 200,
      max: Math.max(200, Math.round(containerWidth - 200)),
      direction: 1,
    });
  }

  /* Closes the split back down to one pane — always removes the SECOND
     (dynamically-added) pane, keeping the first/original one, regardless
     of which pane was last active. Simpler and more predictable than
     trying to decide which of two equally-valid panes should "win." */
  function closeSplit() {
    if (panes.length < 2) return;
    const removed = panes.pop();
    removed.el.remove();
    if (splitHandle) {
      splitHandle.remove();
      splitHandle = null;
    }
    panesContainer.classList.remove('vault-panes--split');
    panes[0].el.style.width = ''; // inline width from resizing is inert now, but clear it for cleanliness
    activePane = panes[0];
  }

  return {
    getActivePane: () => activePane,
    getAllPanes: () => panes.slice(),
    isSplit: () => panes.length >= 2,
    openInSplit: openSplit,
    closeSplit,
    toggleSplit() {
      if (panes.length >= 2) closeSplit();
      else openSplit();
    },
  };
}
