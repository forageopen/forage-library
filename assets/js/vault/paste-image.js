/**
 * paste-image.js
 *
 * Paste a clipboard image (e.g. Windows Snipping Tool, which drops a PNG on
 * the clipboard) into the main-pane note editor as a *floating* image —
 * Word's "In Front of Text" wrap: absolutely positioned over the text
 * layer, text never reflowed, freely draggable and resized with
 * aspect-locked corner handles. There is no ribbon/toolbar button — Ctrl+V
 * into the editor body is the only entry point (see the `paste` listener in
 * viewer-pane.js).
 *
 * The pasted node is a direct child `<img data-forage-float>` of
 * `.vault-editor-body`, carrying its geometry inline (`left`/`top`/`width`
 * in px, `height:auto`). Inline geometry means `editorBody.outerHTML`
 * round-trips it for HTML export unchanged, html2canvas captures it for
 * JPEG export, and `blocksFromElement` (document-model.js) can lift it into
 * the shared IR for .docx export as a floating `ImageRun`.
 *
 * Split into pure helpers (tested in paste-image.test.mjs) and one DOM
 * controller (`createFloatImageController`) — the controller is DOM glue in
 * the same "no unit test, same as resize.js/dropzone.js" category.
 */

/* 96 dpi: the CSS reference pixel is 1/96 in, an EMU is 1/914400 in. `docx`
   converts an ImageRun's px `transformation` to EMU internally at this same
   factor, but a floating image's position `offset` must be given in EMU
   directly. */
export const EMU_PER_PX = 9525;

/** Smallest a resize handle will let an image get, in px (either axis). */
export const MIN_SIZE = 24;

/** How much of a dragged image must stay inside the editor body, in px. */
export const KEEP_VISIBLE = 32;

/** Pure: CSS px -> EMU (English Metric Units), rounded. */
export function pxToEmu(px) {
  return Math.round((Number(px) || 0) * EMU_PER_PX);
}

/**
 * Pure: `data:image/png;base64,AAAA…` -> `{ mime, bytes: Uint8Array }`.
 * Throws for anything that isn't a base64 `data:` URL — the editor only
 * ever writes base64 data URLs into a float image's `src`, so a non-match
 * is a real bug, not an input to tolerate.
 */
export function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl || '');
  if (!match) throw new Error('parseDataUrl: expected a base64 data: URL');
  const mime = match[1];
  const binary = typeof atob === 'function'
    ? atob(match[2])
    : Buffer.from(match[2], 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { mime, bytes };
}

/** DOM: a Blob/File -> its base64 `data:` URL, via FileReader. */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Pure: new width/height for an aspect-locked corner drag. `corner` is
 * `nw|ne|sw|se`; `dx`/`dy` are the mouse delta from drag start. The axis
 * with the larger delta drives, the other dimension follows the original
 * aspect ratio, and neither axis is allowed below MIN_SIZE.
 */
export function aspectLockedResize(startW, startH, dx, dy, corner) {
  const aspect = startW / startH || 1;
  const signX = corner === 'ne' || corner === 'se' ? 1 : -1;
  const signY = corner === 'sw' || corner === 'se' ? 1 : -1;
  let width;
  let height;
  if (Math.abs(dx) >= Math.abs(dy)) {
    width = startW + signX * dx;
    height = width / aspect;
  } else {
    height = startH + signY * dy;
    width = height * aspect;
  }
  if (width < MIN_SIZE) { width = MIN_SIZE; height = width / aspect; }
  if (height < MIN_SIZE) { height = MIN_SIZE; width = height * aspect; }
  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Pure: pull a proposed `{x,y}` (px, top-left of the image) back so at
 * least KEEP_VISIBLE px of the image stays inside a `hostW × hostH` box.
 */
export function clampFloatPosition({ x, y, w, h, hostW, hostH }) {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  return {
    x: clamp(x, KEEP_VISIBLE - w, hostW - KEEP_VISIBLE),
    y: clamp(y, KEEP_VISIBLE - h, hostH - KEEP_VISIBLE),
  };
}

/**
 * Pure: on-screen placement -> the `new ImageRun({...})` options for a
 * floating "In Front of Text" image (minus `data`, which the caller adds
 * from `parseDataUrl`). `docxLib` is injected so this is testable with the
 * real `docx` package, matching export-docx.js.
 *
 * The px offset from the editor body's top-left is mapped to an offset from
 * the Word text column / anchor paragraph's top-left. That's an
 * approximation — the editor has no page-margin model — but it keeps a
 * pasted screenshot roughly where the user left it. `wrap: NONE` +
 * `behindDocument: false` is exactly Word's "In Front of Text".
 */
export function imageRunArgsFromPlacement({ mime, xPx, yPx, wPx, hPx }, docxLib) {
  if (!docxLib) throw new Error('imageRunArgsFromPlacement: docx library is not loaded');
  const { HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType } = docxLib;
  return {
    type: mime === 'image/png' ? 'png' : 'jpg',
    transformation: { width: Math.round(wPx), height: Math.round(hPx) },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: pxToEmu(xPx) },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: pxToEmu(yPx) },
      wrap: { type: TextWrappingType.NONE },
      behindDocument: false,
      allowOverlap: true,
    },
  };
}

/**
 * DOM glue: manage selection + drag + aspect-locked resize for the
 * `<img data-forage-float>` children of `editorBody`. The selection outline
 * and its four corner handles live in `overlayHost` (the
 * `.vault-pane-content--editor` div), deliberately OUTSIDE `editorBody` —
 * so they never appear in `editorBody.outerHTML` (HTML export), in the
 * html2canvas capture of `.vault-editor-body` (JPEG export), or in the IR
 * walk of `.vault-content`.
 *
 * `onChange` is called after every completed move/resize so the caller can
 * refresh stats / export-menu state (viewer-pane.js fires a synthetic
 * `input` event).
 *
 * Every listener is scoped to `editorBody` / `overlayHost` / (only during
 * an active drag) `document`, so a second pane's controller in split view
 * doesn't double-fire — the `document` drag listeners exist only while one
 * image is actually being dragged.
 */
export function createFloatImageController(editorBody, overlayHost, { onChange } = {}) {
  let selected = null;
  let overlay = null;
  let drag = null;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'vault-float-selection';
    overlay.setAttribute('data-html2canvas-ignore', 'true');
    for (const corner of ['nw', 'ne', 'sw', 'se']) {
      const handle = document.createElement('div');
      handle.className = 'vault-float-handle';
      handle.dataset.corner = corner;
      overlay.appendChild(handle);
    }
    overlay.addEventListener('mousedown', onHandleDown);
    overlayHost.appendChild(overlay);
  }

  function refresh() {
    if (!selected || !overlay) return;
    if (!selected.isConnected) { deselect(); return; }
    const imgRect = selected.getBoundingClientRect();
    const hostRect = overlayHost.getBoundingClientRect();
    overlay.style.left = `${imgRect.left - hostRect.left}px`;
    overlay.style.top = `${imgRect.top - hostRect.top}px`;
    overlay.style.width = `${imgRect.width}px`;
    overlay.style.height = `${imgRect.height}px`;
  }

  function select(img) {
    selected = img;
    if (!overlay) buildOverlay();
    overlay.hidden = false;
    refresh();
  }

  function deselect() {
    selected = null;
    if (overlay) overlay.hidden = true;
  }

  function onImgDown(e) {
    const img = e.target.closest && e.target.closest('img[data-forage-float]');
    if (!img) return;
    e.preventDefault(); // don't drop a caret into the contenteditable
    img.draggable = false; // belt-and-suspenders vs. native image drag
    select(img);
    startDrag(e, 'move', null);
  }

  /* A native drag-and-drop of the image (or of a text selection that
     started on it) would steal the pointer before onMove ever runs — kill
     it for anything inside the editor. */
  function onDragStart(e) {
    if (e.target && e.target.closest && e.target.closest('img[data-forage-float]')) {
      e.preventDefault();
    }
  }

  function onHandleDown(e) {
    const handle = e.target.closest('.vault-float-handle');
    if (!handle || !selected) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e, 'resize', handle.dataset.corner);
  }

  function startDrag(e, mode, corner) {
    const rect = selected.getBoundingClientRect();
    // A transparent full-window shield so mousemove keeps landing on this
    // document even when the pointer crosses an adjacent iframe pane in
    // split view — the same trick resize.js uses for pane drags.
    const shield = document.createElement('div');
    shield.className = 'vault-resize-overlay';
    document.body.appendChild(shield);
    drag = {
      mode,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: parseFloat(selected.style.left) || 0,
      startTop: parseFloat(selected.style.top) || 0,
      startW: rect.width,
      startH: rect.height,
      shield,
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function onMove(e) {
    if (!drag || !selected) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.mode === 'move') {
      const pos = clampFloatPosition({
        x: drag.startLeft + dx,
        y: drag.startTop + dy,
        w: drag.startW,
        h: drag.startH,
        hostW: editorBody.clientWidth,
        hostH: editorBody.clientHeight,
      });
      selected.style.left = `${Math.round(pos.x)}px`;
      selected.style.top = `${Math.round(pos.y)}px`;
    } else {
      const { width, height } = aspectLockedResize(drag.startW, drag.startH, dx, dy, drag.corner);
      selected.style.width = `${width}px`;
      selected.style.height = 'auto';
      // Keep the corner opposite the one being dragged pinned in place.
      if (drag.corner === 'nw' || drag.corner === 'ne') {
        selected.style.top = `${Math.round(drag.startTop + (drag.startH - height))}px`;
      }
      if (drag.corner === 'nw' || drag.corner === 'sw') {
        selected.style.left = `${Math.round(drag.startLeft + (drag.startW - width))}px`;
      }
    }
    refresh();
  }

  function onUp() {
    if (!drag) return;
    drag.shield.remove();
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    drag = null;
    if (onChange) onChange();
  }

  function onDocDown(e) {
    if (!selected) return;
    if (e.target.closest && e.target.closest('img[data-forage-float]')) return;
    if (overlay && overlay.contains(e.target)) return;
    deselect();
  }

  function onKey(e) {
    if (e.key === 'Escape' && selected) deselect();
  }

  const mo = new MutationObserver(() => {
    if (selected && !selected.isConnected) deselect();
    else refresh();
  });

  editorBody.addEventListener('mousedown', onImgDown);
  editorBody.addEventListener('dragstart', onDragStart);
  document.addEventListener('mousedown', onDocDown, true);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', refresh);
  mo.observe(editorBody, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

  return {
    select,
    deselect,
    refresh,
    destroy() {
      deselect();
      if (drag) {
        drag.shield.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        drag = null;
      }
      if (overlay) { overlay.remove(); overlay = null; }
      editorBody.removeEventListener('mousedown', onImgDown);
      editorBody.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('mousedown', onDocDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', refresh);
      mo.disconnect();
    },
  };
}
