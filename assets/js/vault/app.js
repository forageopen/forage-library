import { createViewerPane } from './viewer-pane.js';
import { initSidebar } from './sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
  const paneEl = document.querySelector('.vault-pane');
  const pane = createViewerPane(paneEl);

  initSidebar(document.querySelector('[data-vault-sidebar]'), (path, name) => {
    pane.openVaultFile(path, name);
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="toggle-sidenote"]')) {
      pane.toggleSidenote();
    }
  });
});
