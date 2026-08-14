/**
 * sanitize.js
 *
 * The one place untrusted HTML gets sanitized before it's ever allowed to
 * touch innerHTML. `marked` intentionally passes raw HTML embedded in
 * Markdown source straight through unchanged (a first-class Markdown
 * feature, not an edge case — marked dropped its own `sanitize` option in
 * v5 specifically to push this onto a dedicated sanitizer). Without this
 * step, a Markdown or docx-derived file containing e.g.
 * `<img src=x onerror="...">` would execute arbitrary script in this
 * app's origin the instant it's rendered — including a locally-dropped
 * file nobody else ever touched.
 */

export function sanitizeHtml(html, DOMPurifyLib = globalThis.DOMPurify) {
  if (!DOMPurifyLib) throw new Error('sanitizeHtml: DOMPurify library is not loaded');
  return DOMPurifyLib.sanitize(html);
}
