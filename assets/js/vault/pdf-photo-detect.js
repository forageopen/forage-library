/**
 * pdf-photo-detect.js
 *
 * Pure helpers for "which parts of a rendered PDF page are photographs" —
 * used by render-pdf.js's extractPhotoRegions() so PDF dark mode can invert
 * the page ground / text / vector art but leave real raster photos in their
 * true colours (see viewer-pane.js ensurePdfPhotoOverlays / forage.css).
 *
 * No pdf.js or DOM dependency in here: the caller feeds in the operator
 * list arrays, the OPS enum, and per-image pixel stats it measured from the
 * decoded bitmap. Everything a threshold or a matrix so it stays testable.
 */

/* An image counts as a "photo" (keep true colour) when it's mostly opaque
   AND has real tonal variety. Rasterised text / flat graphics that some
   decks embed as images instead of glyphs come through as ~85% transparent
   with essentially one ink colour, so they fail both checks and invert
   along with the rest of the page. Measured on a real design deck:
   background photo = 0% transparent / 26+ quantised colours; every
   text-as-image strip = ~83% transparent / 2 colours. */
export const PHOTO_MIN_OPAQUE_FRACTION = 0.5;
export const PHOTO_MIN_QUANT_COLORS = 8;

export function classifyImageStats({ opaqueFraction, quantColors }) {
  return (
    Number.isFinite(opaqueFraction) &&
    Number.isFinite(quantColors) &&
    opaqueFraction >= PHOTO_MIN_OPAQUE_FRACTION &&
    quantColors > PHOTO_MIN_QUANT_COLORS
  );
}

/* Quantise one RGBA buffer into a coarse (4 bit/channel) colour set and an
   opaque-pixel fraction — the two numbers classifyImageStats wants. Kept
   here (rather than inline in render-pdf.js) so the exact bucketing is
   pinned by a test. `data` is a Uint8ClampedArray/Uint8Array of RGBA. */
export function imageStatsFromRgba(data) {
  const colors = new Set();
  let opaque = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    n++;
    if (data[i + 3] >= 16) opaque++;
    colors.add(((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4));
  }
  return { opaqueFraction: n ? opaque / n : 0, quantColors: colors.size };
}

/* 2D affine matrices in pdf.js form: [a, b, c, d, e, f] means
   x' = a·x + c·y + e ,  y' = b·x + d·y + f. */
export function matMul(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

export function applyPoint(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/* An image XObject is painted onto the unit square [0,1]×[0,1] under the
   current transform; this returns its axis-aligned bounding box in device
   pixels once the viewport transform is folded in. */
export function deviceRectFromCtm(ctm, viewportTransform) {
  const m = matMul(viewportTransform, ctm);
  const pts = [
    applyPoint(m, 0, 0),
    applyPoint(m, 1, 0),
    applyPoint(m, 0, 1),
    applyPoint(m, 1, 1),
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/* Walk an operator list, tracking the CTM through save/restore/transform
   and form-XObject nesting, and return one entry per image-paint op with
   its device-space rect. `ops` is the subset of pdf.js's OPS enum this
   needs (save, restore, transform, paintFormXObjectBegin,
   paintFormXObjectEnd, and the image-paint ops). Image-mask ops are
   deliberately excluded — a 1-bit stencil is a glyph/icon, not a photo. */
export function collectImageDraws({ fnArray, argsArray, ops, viewportTransform }) {
  const imagePaintOps = new Set(
    [ops.paintImageXObject, ops.paintInlineImageXObject, ops.paintImageXObjectRepeat].filter(
      (v) => v != null
    )
  );
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const out = [];
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];
    if (fn === ops.save) {
      stack.push(ctm.slice());
    } else if (fn === ops.restore) {
      ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (fn === ops.transform) {
      ctm = matMul(ctm, args);
    } else if (fn === ops.paintFormXObjectBegin) {
      stack.push(ctm.slice());
      if (Array.isArray(args && args[0])) ctm = matMul(ctm, args[0]);
    } else if (fn === ops.paintFormXObjectEnd) {
      ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (imagePaintOps.has(fn)) {
      out.push({ opIndex: i, objId: args && args[0], ...deviceRectFromCtm(ctm, viewportTransform) });
    }
  }
  return out;
}

/* Clamp a device rect to the page box and express it as percentages, so it
   maps onto the displayed <img> at whatever scale it ends up shown. Rects
   that fall entirely outside, or collapse to nothing, return null. */
export function rectToPercent(rect, pageWidth, pageHeight) {
  const x0 = Math.max(0, Math.min(pageWidth, rect.x));
  const y0 = Math.max(0, Math.min(pageHeight, rect.y));
  const x1 = Math.max(0, Math.min(pageWidth, rect.x + rect.w));
  const y1 = Math.max(0, Math.min(pageHeight, rect.y + rect.h));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w < 1 || h < 1) return null;
  return {
    xPct: (x0 / pageWidth) * 100,
    yPct: (y0 / pageHeight) * 100,
    wPct: (w / pageWidth) * 100,
    hPct: (h / pageHeight) * 100,
  };
}
