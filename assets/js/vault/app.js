import { initSidebar } from './sidebar.js';
import { initSplitView } from './split-view.js';
import { initResizeHandle } from './resize.js';
import { initWelcome } from './welcome.js';

const WELCOME_NOTE_PATH = 'vault/00-welcome-note.md';
const WELCOME_NOTE_NAME = '00-welcome-note.md';

document.addEventListener('DOMContentLoaded', () => {
  const panesEl = document.querySelector('[data-vault-panes]');
  const template = document.querySelector('[data-vault-pane-template]');
  const splitView = initSplitView(panesEl, template);

  const sidebarEl = document.querySelector('[data-vault-sidebar]');

  let sidebarApi = null;

  /* First-load welcome screen — sits in the initial pane in place of the
     empty dropzone until the visitor picks a direction. "See Welcome Note"
     opens the note; opening anything from the sidebar dismisses it too. */
  const welcome = initWelcome(document.querySelector('.vault-pane .vault-pane-main'), {
    sidebarEl,
    onSeeWelcomeNote() {
      splitView.getActivePane().openVaultFile(WELCOME_NOTE_PATH, WELCOME_NOTE_NAME);
      sidebarApi?.setActive(WELCOME_NOTE_PATH);
    },
  });

  const openCatalog = (catalogType, path) => {
    welcome?.dismiss();
    splitView.getActivePane().openCatalog(catalogType);
    if (path) sidebarApi?.setActive(path);
  };

  initSidebar(
    sidebarEl,
    (path, name) => {
      welcome?.dismiss();
      // Opening a normal file leaves any #catalog= deep link stale — clear
      // it so a reload doesn't jump back to the dashboard.
      if (location.hash.startsWith('#catalog=')) history.replaceState(null, '', location.pathname + location.search);
      splitView.getActivePane().openVaultFile(path, name);
      sidebarApi?.setActive(path);
    },
    (catalogType, path) => openCatalog(catalogType, path),
  ).then((api) => {
    sidebarApi = api;
    // Honour a deep link like #catalog=agents or #catalog=agents/code-cleaner
    // on first load, and on any later hashchange.
    const routeHash = () => {
      const m = /^#catalog=([a-z]+)(?:\/([^/?#]+))?/.exec(location.hash);
      if (m) {
        welcome?.dismiss();
        splitView.getActivePane().openCatalog(m[1], m[2] ? decodeURIComponent(m[2]) : null);
        sidebarApi?.setActive(`vault/Research/${m[1][0].toUpperCase()}${m[1].slice(1)}`);
      }
    };
    routeHash();
    window.addEventListener('hashchange', routeHash);
  });

  initResizeHandle(document.querySelector('[data-resize="sidebar"]'), document.querySelector('[data-vault-sidebar]'), {
    storageKey: 'forage-vault-sidebar-width',
    defaultWidth: 240,
    direction: 1, // sidebar sits on the left; dragging right grows it
  });

  /* Sidebar collapse — a single icon in the ribbon, independent of the
     resize handle (collapsing hides the sidebar entirely; resizing only
     changes its width while visible). Deliberately NOT persisted: every
     landing on the page should show the full list of available docs, so
     a visitor doesn't have to remember they collapsed it last time. The
     toggle still works to collapse/expand within the current session. */
  const sidebarToggleBtn = document.querySelector('[data-action="toggle-sidebar"]');
  if (sidebarToggleBtn && sidebarEl) {
    let collapsed = false;
    const applyCollapsed = (next) => {
      collapsed = next;
      sidebarEl.hidden = collapsed;
      sidebarToggleBtn.setAttribute('aria-expanded', String(!collapsed));
    };
    applyCollapsed(collapsed);
    sidebarToggleBtn.addEventListener('click', () => applyCollapsed(!collapsed));
  }

  // Export and Sidenote are now per-pane header controls (each button
  // lives inside its own pane's DOM subtree, so it's inherently scoped to
  // that pane) — only the split-view toggle and "start a new note" stay
  // global, since they act on "whichever pane you last clicked into."
  document.addEventListener('click', (e) => {
    const splitMenuItem = e.target.closest('[data-action="open-split"]');
    if (splitMenuItem) {
      splitView.toggleSplit();
      splitMenuItem.textContent = splitView.isSplit() ? 'Close split' : 'Open in split';
    }
    if (e.target.closest('[data-action="new-note"]')) {
      splitView.getActivePane().startNewNote();
    }
  });

  /* Clicking the ribbon, or a blank part of the nav pane (not a file
     link — that already re-highlights its target pane on its own),
     deselects the active-pane highlight in split view. It stays purely
     visual: `activePane` itself doesn't change, so sidebar opens and
     "new note" keep landing in the same pane until the user clicks into
     a pane again. */
  const ribbonEl = document.querySelector('.ribbon');
  document.addEventListener('click', (e) => {
    const inRibbon = ribbonEl && ribbonEl.contains(e.target);
    const inBlankSidebar = sidebarEl && sidebarEl.contains(e.target)
      && !e.target.closest('.vault-tree-file-btn') && !e.target.closest('.vault-tree-catalog-btn');
    if (inRibbon || inBlankSidebar) splitView.clearActiveHighlight();
  });
});
