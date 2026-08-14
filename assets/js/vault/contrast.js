/* Pure WCAG contrast helpers — used to auto-pick black or white text over
   a highlighter background so highlighted text stays readable regardless
   of which of the 18 colors was picked. */

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pure: '#000000' or '#ffffff' — whichever has the higher WCAG contrast
 * ratio against `backgroundHex`. Rule of thumb is black, but darker
 * highlight colors need white to stay legible. */
export function contrastTextColor(backgroundHex) {
  const bgLuminance = relativeLuminance(hexToRgb(backgroundHex));
  const blackContrast = contrastRatio(bgLuminance, 0);
  const whiteContrast = contrastRatio(bgLuminance, 1);
  return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
}
