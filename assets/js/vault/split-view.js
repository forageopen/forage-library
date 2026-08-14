import { createViewerPane } from './viewer-pane.js';

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
    openInSplit() {
      if (panes.length >= 2) return;
      panesContainer.classList.add('vault-panes--split');
      activePane = addClonedPane();
    },
  };
}
