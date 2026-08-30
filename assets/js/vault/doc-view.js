/**
 * doc-view.js
 *
 * Pure state helpers for the per-pane viewer controls (see viewer-pane.js):
 * a zoom level and an on/off "document dark mode". Both persist in
 * localStorage so a visitor's choice survives reloads — same best-effort,
 * try/catch pattern as resize.js's width persistence.
 *
 * The dark-mode filter itself lives in forage.css
 * (.vault-pane-content--dark); the constants here are exported only so the
 * two stay documented in one place.
 */

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1;

const ZOOM_KEY = 'forage-vault-zoom';
const DARK_KEY = 'forage-vault-dark';

/* A full invert plus a 180deg hue-rotate that lands every hue back where
   it started — so coloured text and diagrams keep their colour while the
   page ground flips from white to black. A full `invert(1)` (rather than a
   softer charcoal) is deliberate: it's the only invert strength that's its
   own exact inverse, so raster images can be flipped straight back to
   their true colours by applying the same filter a second time (see the
   img/picture/video rule in DOC_DARK_IFRAME_ADDON) — a partial invert
   double-applied washes contrast out instead of cancelling.

   Dark mode only applies to rendered .html/.htm files. The filter is
   injected *inside* the sandboxed iframe (DOC_DARK_IFRAME_ADDON) rather
   than set on the host element from the parent: a `hue-rotate` on the
   parent side forces the whole composited layer — including any
   continuously-animating content in the framed doc — to re-rasterise on
   the CPU every frame, which pegs the renderer. Applied to `html` from
   *within* the frame it stays GPU-composited and the framed doc's own
   animations keep running at full frame rate. */
export const DOC_DARK_FILTER = 'invert(1) hue-rotate(180deg)';

/* postMessage envelope the parent sends the framed doc to flip dark mode,
   and the "I'm listening now" ping the framed doc sends back on load so
   the parent can push the current state without racing the frame's own
   load timing. */
export const DOC_DARK_MESSAGE = 'forage-doc-dark';
export const DOC_DARK_READY_MESSAGE = 'forage-doc-dark-ready';

/** Appended to a rendered .html/.htm file's srcdoc (after
 * HTML_FRAME_MEASURE_SCRIPT), same "view-only, never touches the bytes
 * offered for re-download" contract as the measure script. A <style> that
 * only bites when <html> carries the `forage-dark` class, plus a tiny
 * listener that toggles that class on the parent's message and announces
 * itself once on load. Runs inside `sandbox="allow-scripts"`.
 *
 * The second rule re-applies the same filter to raster media (img,
 * picture, video, canvas, SVG <image>) — invert(1) is its own inverse, so
 * this cancels the page-level flip and leaves photos/screenshots in their
 * true colours. Authors can opt any other element out with
 * `data-forage-keep-color`. */
export const DOC_DARK_IFRAME_ADDON = `
<style>
html.forage-dark { background: #000 !important; filter: ${DOC_DARK_FILTER}; }
html.forage-dark :is(img, picture, video, canvas, image, [data-forage-keep-color]) { filter: ${DOC_DARK_FILTER}; }
</style>
<script>(function () {
  function apply(on) { document.documentElement.classList.toggle('forage-dark', !!on); }
  window.addEventListener('message', function (e) {
    if (e.data && e.data.source === '${DOC_DARK_MESSAGE}') apply(e.data.on);
  });
  function announce() { parent.postMessage({ source: '${DOC_DARK_READY_MESSAGE}' }, '*'); }
  if (document.readyState === 'complete') announce();
  else window.addEventListener('load', announce);
})();</script>
`;

/** Pure: is this the framed doc telling us its dark-mode listener is live? */
export function isDocDarkReadyMessage(data) {
  return !!data && data.source === DOC_DARK_READY_MESSAGE;
}

/** Pure: coerce any input to a valid zoom factor — finite, within
 * [ZOOM_MIN, ZOOM_MAX], snapped to ZOOM_STEP. Anything unusable
 * (NaN, non-number, absent) falls back to ZOOM_DEFAULT. Accepts either a
 * factor (1.5) or a whole-percent slider value (150) — values > ZOOM_MAX*...
 * no: callers pass a factor; the slider handler divides by 100 first. */
export function clampZoom(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return ZOOM_DEFAULT;
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
  const snapped = Math.round(clamped / ZOOM_STEP) * ZOOM_STEP;
  // Round to 2dp to shed floating-point noise from the division above.
  return Math.round(snapped * 100) / 100;
}

export function readStoredZoom(storage) {
  try {
    const raw = storage.getItem(ZOOM_KEY);
    if (raw === null) return ZOOM_DEFAULT;
    const n = Number(raw);
    if (!Number.isFinite(n)) return ZOOM_DEFAULT;
    return clampZoom(n);
  } catch (err) {
    return ZOOM_DEFAULT;
  }
}

export function writeStoredZoom(storage, value) {
  try {
    storage.setItem(ZOOM_KEY, String(clampZoom(value)));
  } catch (err) {
    // Best-effort; a change that can't persist still applies this session.
  }
}

export function readStoredDark(storage) {
  try {
    return storage.getItem(DARK_KEY) === '1';
  } catch (err) {
    return false;
  }
}

export function writeStoredDark(storage, on) {
  try {
    storage.setItem(DARK_KEY, on ? '1' : '0');
  } catch (err) {
    // Best-effort — see writeStoredZoom.
  }
}
