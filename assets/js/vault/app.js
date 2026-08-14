import { createViewerPane } from './viewer-pane.js';

document.addEventListener('DOMContentLoaded', () => {
  const paneEl = document.querySelector('.vault-pane');
  const pane = createViewerPane(paneEl);

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="toggle-sidenote"]')) {
      pane.toggleSidenote();
    }
  });
});
