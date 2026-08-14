/* 18-color highlighter palette — expanded from the original 3 (yellow/red/
   green) per user request. Spans light pastels through a couple of darker
   tones (Brown, Gray, Charcoal) specifically so contrastTextColor() (see
   contrast.js) actually has cases where it needs to pick white instead of
   the black-text rule of thumb. */
export const HIGHLIGHT_COLORS = [
  { hex: '#fff3a3', label: 'Yellow' },
  { hex: '#ffe08a', label: 'Amber' },
  { hex: '#ffc98a', label: 'Orange' },
  { hex: '#ffb3a7', label: 'Coral' },
  { hex: '#ffb3b3', label: 'Red' },
  { hex: '#ffb3d9', label: 'Pink' },
  { hex: '#ff9ad1', label: 'Magenta' },
  { hex: '#d9b3ff', label: 'Purple' },
  { hex: '#c299ff', label: 'Violet' },
  { hex: '#a9c9ff', label: 'Blue' },
  { hex: '#a3e4ff', label: 'Sky' },
  { hex: '#9af0e6', label: 'Cyan' },
  { hex: '#a3fff0', label: 'Teal' },
  { hex: '#d6ffe0', label: 'Green' },
  { hex: '#e2ff9a', label: 'Lime' },
  { hex: '#c9a37a', label: 'Brown' },
  { hex: '#cfcfcf', label: 'Gray' },
  { hex: '#4d4d4d', label: 'Charcoal' },
];

/** Pure: build the swatch buttons (18 colors + "remove highlight") for a
 * highlight toolbar. `btnClass` is the per-toolbar button class (e.g.
 * "vault-sidenote-highlight" or "vault-editor-highlight") — the "none"
 * button additionally gets `${btnClass}--none`, matching the existing
 * modifier-class convention in forage.css. */
export function highlightSwatchesHtml(btnClass) {
  const swatches = HIGHLIGHT_COLORS.map(
    ({ hex, label }) =>
      `<button type="button" class="${btnClass}" data-highlight="${hex}" style="background:${hex}" aria-label="${label} highlight" title="${label} highlight"></button>`
  ).join('');
  const none = `<button type="button" class="${btnClass} ${btnClass}--none" data-highlight="none" aria-label="Remove highlight" title="Remove highlight">✕</button>`;
  return swatches + none;
}
