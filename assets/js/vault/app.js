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
  const sidebarToggleBtn = document.querySelector('[data-action="toggle-sidebar"]');

  let sidebarApi = null;

  // Resize handle first — it stamps the sidebar's inline `width`, which the
  // collapse animation below reads to know how far to slide it off-screen.
  initResizeHandle(document.querySelector('[data-resize="sidebar"]'), sidebarEl, {
    storageKey: 'forage-vault-sidebar-width',
    defaultWidth: 240,
    direction: 1, // sidebar sits on the left; dragging right grows it
  });

  /* Sidebar collapse — toggled by the ribbon's Forage-logo icon, and also
     used by the welcome screen (which starts the sidebar collapsed and
     slides it back in once the visitor picks a direction). Animated on
     `margin-left`, not `width`: resize.js drives `width` on every drag
     frame, so a width transition would rubber-band the drag — margin-left
     is untouched by resize. Deliberately NOT persisted: every landing
     shows the full list, so a visitor needn't remember collapsing it. */
  let sidebarCollapsed = false;
  let sidebarExpandedWidth = 240;
  function setSidebarCollapsed(next, { animate = false } = {}) {
    if (!sidebarEl) return;
    if (next && !sidebarCollapsed) sidebarExpandedWidth = sidebarEl.offsetWidth || sidebarExpandedWidth;
    sidebarCollapsed = next;
    if (animate) {
      sidebarEl.classList.add('vault-sidebar--animating');
      sidebarEl.addEventListener('transitionend', function done(e) {
        if (e.propertyName !== 'margin-left') return;
        sidebarEl.classList.remove('vault-sidebar--animating');
        sidebarEl.removeEventListener('transitionend', done);
      });
    }
    sidebarEl.style.marginLeft = sidebarCollapsed ? `-${sidebarExpandedWidth}px` : '';
    sidebarEl.classList.toggle('vault-sidebar--collapsed', sidebarCollapsed);
    sidebarEl.inert = sidebarCollapsed;
    sidebarToggleBtn?.setAttribute('aria-expanded', String(!sidebarCollapsed));
  }
  /* Slide the sidebar in if it's hidden; optionally follow with the accent
     pulse a beat later (once the slide has settled) — the welcome screen's
     "Explore" button, pointing a first-time visitor at the folder list. */
  function revealSidebar({ pulse = false } = {}) {
    if (sidebarCollapsed) setSidebarCollapsed(false, { animate: true });
    if (!pulse || !sidebarEl) return;
    setTimeout(() => {
      sidebarEl.classList.remove('vault-sidebar--pulse');
      void sidebarEl.offsetWidth; // restart the animation if it's mid-run
      sidebarEl.classList.add('vault-sidebar--pulse');
      setTimeout(() => sidebarEl.classList.remove('vault-sidebar--pulse'), 1500);
    }, 380);
  }
  setSidebarCollapsed(false);
  sidebarToggleBtn?.addEventListener('click', () => setSidebarCollapsed(!sidebarCollapsed, { animate: true }));

  /* First-load welcome screen — sits in the initial pane in place of the
     empty dropzone until the visitor picks a direction. While it's up the
     sidebar is collapsed; any exit (Start exploring, See Welcome Note,
     opening a file, a #catalog= deep link) slides it back in, and the
     closing "Explore" button slides it in + pulses without dismissing. */
  const welcome = initWelcome(document.querySelector('.vault-pane .vault-pane-main'), {
    onDismiss: () => revealSidebar(),
    onExplore: () => revealSidebar({ pulse: true }),
    onSeeWelcomeNote() {
      splitView.getActivePane().openVaultFile(WELCOME_NOTE_PATH, WELCOME_NOTE_NAME);
      sidebarApi?.setActive(WELCOME_NOTE_PATH);
    },
  });
  if (welcome) setSidebarCollapsed(true); // hidden only while the welcome screen shows

  /* welcome?.dismiss() fires onDismiss → revealSidebar(); when there's no
     welcome screen a manual logo-collapse is left alone on purpose. */
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
