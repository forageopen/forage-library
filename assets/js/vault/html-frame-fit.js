/**
 * html-frame-fit.js
 *
 * Pure scale math for "fit to width" .html viewing (see viewer-pane.js) —
 * a fixed-layout hand-authored .html file (e.g. a print-style page with
 * width:210mm) would otherwise just overflow its pane and force a
 * horizontal scrollbar, unlike every other viewer here (PDF/PPTX included)
 * which always fills the pane's width. The sandboxed iframe has no way to
 * report its own intrinsic content size to the parent except via
 * postMessage — no allow-same-origin means contentDocument is unreadable
 * from here — so the iframe is pinned to its natural pixel size and
 * visually scaled down/up with a CSS transform instead of relying on the
 * framed document reflowing itself.
 */

/** Pure: scale factor so `naturalWidth` never exceeds `containerWidth` —
 * i.e. shrinks a too-wide fixed-layout document down to eliminate
 * horizontal overflow/scrolling, but never zooms a document up past its
 * own authored size. A genuinely fluid/responsive page's measured
 * `naturalWidth` is indistinguishable from its current container width
 * (nothing overflows to reveal a narrower intrinsic size), so capping at
 * 1 also keeps this a no-op for those rather than guessing a zoom level
 * from an unreliable signal. */
export function computeFitScale(containerWidth, naturalWidth) {
  if (!naturalWidth || naturalWidth <= 0 || !containerWidth || containerWidth <= 0) return 1;
  return Math.min(1, containerWidth / naturalWidth);
}

/** Pure: is this a size-report message from our own html frame? Guards
 * against unrelated postMessage traffic (browser extensions, other
 * frames on the page) being mistaken for a real measurement. */
export function isHtmlFrameSizeMessage(data) {
  return !!data && data.source === 'forage-html-frame'
    && typeof data.width === 'number' && data.width > 0
    && typeof data.height === 'number' && data.height > 0;
}

/** The script appended to a loaded .html file's srcdoc — view-only, never
 * appended to the raw bytes offered for re-download (see openSource /
 * exportHtml in viewer-pane.js). Measures the framed document's real
 * content size *once*, on load, and reports it to the parent so it can
 * compute the fit-to-width scale above. Runs inside the sandbox
 * (allow-scripts is granted), posted with '*' since a sandboxed frame
 * with no allow-same-origin has an opaque origin and can't target the
 * parent's real one by name.
 *
 * Deliberately does NOT listen for the frame's own 'resize' event — the
 * parent pins this frame to the reported natural size (see
 * handleHtmlFrameMessage in viewer-pane.js), which fires 'resize' inside
 * the frame again; re-posting off that would ping-pong indefinitely on
 * sub-pixel jitter, which has been observed to hang the tab.
 *
 * A single post on 'load' turned out not to be enough: the first
 * measurement can land before layout settles (a too-narrow width) or
 * before the parent pane has finished building and is listening — the
 * latter shows up when a doc is opened right after a sidebar folder
 * expands. So it re-measures a handful of times across the first second
 * instead, posting *only when the measured size actually changed* — the
 * parent dedupes identical sizes too, so this can't ping-pong with the
 * frame-pinning, and the retry count is hard-capped. */
export const HTML_FRAME_MEASURE_SCRIPT = `
<script>(function () {
  var lastKey = '';
  var tries = 0;
  function measure() {
    var docEl = document.documentElement;
    var body = document.body;
    var width = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
    var height = Math.max(docEl.scrollHeight, body ? body.scrollHeight : 0);
    if (width > 0 && height > 0) {
      var key = width + 'x' + height;
      if (key !== lastKey) {
        lastKey = key;
        parent.postMessage({ source: 'forage-html-frame', width: width, height: height }, '*');
      }
    }
    tries += 1;
    if (tries < 8) setTimeout(measure, tries < 4 ? 50 : 200);
  }
  if (document.readyState === 'complete') measure();
  else window.addEventListener('load', measure);
})();</script>
`;
