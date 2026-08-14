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

  /* Sidebar collapse — a single icon in the ribbon, independent of the
     resize handle (collapsing hides the sidebar entirely; resizing only
     changes its width while visible). Persisted so a visitor's choice
     survives reloads, same as the resize widths. */
  const sidebarToggleBtn = document.querySelector('[data-action="toggle-sidebar"]');
  const sidebarEl = document.querySelector('[data-vault-sidebar]');
  if (sidebarToggleBtn && sidebarEl) {
    let collapsed = false;
    try { collapsed = localStorage.getItem('forage-vault-sidebar-collapsed') === '1'; } catch (err) { /* ignore */ }
    const applyCollapsed = (next) => {
      collapsed = next;
      sidebarEl.hidden = collapsed;
      sidebarToggleBtn.setAttribute('aria-expanded', String(!collapsed));
      try { localStorage.setItem('forage-vault-sidebar-collapsed', collapsed ? '1' : '0'); } catch (err) { /* ignore */ }
    };
    applyCollapsed(collapsed);
    sidebarToggleBtn.addEventListener('click', () => applyCollapsed(!collapsed));
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="toggle-sidenote"]')) {
      splitView.getActivePane().toggleSidenote();
    }
    const splitMenuItem = e.target.closest('[data-action="open-split"]');
    if (splitMenuItem) {
      splitView.toggleSplit();
      splitMenuItem.textContent = splitView.isSplit() ? 'Close split' : 'Open in split';
    }
    // Export: applies to every open pane (both tabs in split view) for
    // the file-download formats, since each pane can hold a different
    // file. PDF is the one exception — window.print() renders the whole
    // visible page in one pass (the print stylesheet already un-stacks
    // every open pane), so calling it once already covers all panes;
    // calling it per-pane would just queue up duplicate print dialogs.
    if (e.target.closest('[data-action="export-html"]')) {
      splitView.getAllPanes().forEach((pane) => pane.exportHtml());
    }
    if (e.target.closest('[data-action="export-pdf"]')) {
      splitView.getActivePane().exportPdf();
    }
    if (e.target.closest('[data-action="export-markdown"]')) {
      splitView.getAllPanes().forEach((pane) => pane.exportMarkdown());
    }
    if (e.target.closest('[data-action="export-docx"]')) {
      splitView.getAllPanes().forEach((pane) => pane.exportDocx());
    }
    if (e.target.closest('[data-action="export-json"]')) {
      splitView.getAllPanes().forEach((pane) => pane.exportJson());
    }
    if (e.target.closest('[data-action="new-note"]')) {
      splitView.getActivePane().startNewNote();
    }
  });
});
