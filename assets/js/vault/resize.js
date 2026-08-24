/**
 * resize.js
 *
 * Drag-to-resize for the vault's three side-by-side regions (navigation
 * sidebar, main viewer, sidenote panel). Each handle owns one adjacent
 * element's width; widths persist in localStorage so a visitor's chosen
 * layout survives reloads.
 */

const DEFAULT_MIN = 160;
const DEFAULT_MAX = 480;

function readStoredWidth(key, fallback, min, max) {
  try {
    const stored = Number(localStorage.getItem(key));
    if (Number.isFinite(stored) && stored >= min && stored <= max) return stored;
  } catch (err) {
    // Storage unavailable — fall back to the default width.
  }
  return fallback;
}

function writeStoredWidth(key, width) {
  try {
    localStorage.setItem(key, String(Math.round(width)));
  } catch (err) {
    // Best-effort; a resize that can't persist still applies for this session.
  }
}

/**
 * Wires a drag handle that resizes `targetEl`'s width, persisting the
 * result under `storageKey`.
 *
 * `direction` is 1 when dragging right should grow the target (the handle
 * sits on the target's trailing/right edge, e.g. the sidebar), or -1 when
 * dragging left should grow it (the handle sits on the target's
 * leading/left edge, e.g. the sidenote panel, which sits on the right
 * side of the layout).
 */
export function initResizeHandle(handle, targetEl, { storageKey, min = DEFAULT_MIN, max = DEFAULT_MAX, defaultWidth, direction = 1 }) {
  if (!handle || !targetEl) return;

  targetEl.style.width = readStoredWidth(storageKey, defaultWidth, min, max) + 'px';

  let dragging = false;
  let startX = 0;
  let startWidth = 0;
  let overlay = null;

  function clamp(width) {
    return Math.min(max, Math.max(min, width));
  }

  function onMouseMove(e) {
    if (!dragging) return;
    const next = clamp(startWidth + (e.clientX - startX) * direction);
    targetEl.style.width = next + 'px';
  }

  function onMouseUp() {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('vault-resizing');
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    writeStoredWidth(storageKey, targetEl.getBoundingClientRect().width);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startWidth = targetEl.getBoundingClientRect().width;
    document.body.classList.add('vault-resizing');
    /* A pane can hold a raw .html file rendered into an iframe (a genuinely
       separate document) — once the pointer crosses over it mid-drag, the
       iframe's own document starts receiving mousemove instead of this one,
       so the drag stalls/jumps until the pointer leaves it again. A
       transparent overlay above everything (including iframes) keeps every
       mousemove landing on this document for the whole drag. */
    overlay = document.createElement('div');
    overlay.className = 'vault-resize-overlay';
    document.body.appendChild(overlay);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // Keyboard equivalent (arrow keys), for visitors who can't drag.
  handle.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = (e.key === 'ArrowRight' ? 1 : -1) * direction * 16;
    const next = clamp(targetEl.getBoundingClientRect().width + step);
    targetEl.style.width = next + 'px';
    writeStoredWidth(storageKey, next);
  });
}
