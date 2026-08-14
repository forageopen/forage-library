import { initSidebar } from './sidebar.js';
import { initSplitView } from './split-view.js';
import { initResizeHandle } from './resize.js';

document.addEventListener('DOMContentLoaded', () => {
  const panesEl = document.querySelector('[data-vault-panes]');
  const template = document.querySelector('[data-vault-pane-template]');
  const splitView = initSplitView(panesEl, template);

  initSidebar(document.querySelector('[data-vault-sidebar]'), (path, name) => {
    splitView.getActivePane().openVaultFile(path, name);
  });

  initResizeHandle(document.querySelector('[data-resize="sidebar"]'), document.querySelector('[data-vault-sidebar]'), {
    storageKey: 'forage-vault-sidebar-width',
    defaultWidth: 240,
    direction: 1, // sidebar sits on the left; dragging right grows it
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="toggle-sidenote"]')) {
      splitView.getActivePane().toggleSidenote();
    }
    if (e.target.closest('[data-action="open-split"]')) {
      splitView.openInSplit();
    }
    if (e.target.closest('[data-action="export-html"]')) {
      splitView.getActivePane().exportHtml();
    }
    if (e.target.closest('[data-action="export-pdf"]')) {
      splitView.getActivePane().exportPdf();
    }
    if (e.target.closest('[data-action="export-markdown"]')) {
      splitView.getActivePane().exportMarkdown();
    }
    if (e.target.closest('[data-action="export-docx"]')) {
      splitView.getActivePane().exportDocx();
    }
    if (e.target.closest('[data-action="export-json"]')) {
      splitView.getActivePane().exportJson();
    }
    if (e.target.closest('[data-action="new-note"]')) {
      splitView.getActivePane().startNewNote();
    }
  });
});
