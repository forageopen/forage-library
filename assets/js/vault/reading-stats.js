/* Pure word-count / reading-time helpers for the per-pane stats bar. */

export function wordCount(text) {
  const trimmed = (text || '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** 200 words/minute is the commonly-cited average adult silent-reading
 * speed (the same figure Medium's "X min read" badge is built on) —
 * always rounds up to at least 1 minute once there's any text at all. */
export function readingTimeMinutes(words, wordsPerMinute = 200) {
  if (words <= 0) return 0;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

/** Pure: "1,234 words · 7 min read", or null when there's no text yet (the
 * caller hides the stats bar in that case rather than showing "0 words"). */
export function formatReadingStats(text, wordsPerMinute = 200) {
  const words = wordCount(text);
  if (words === 0) return null;
  const minutes = readingTimeMinutes(words, wordsPerMinute);
  return `${words.toLocaleString()} words · ${minutes} min read`;
}

/** Pure: "3/12 pages" — the PDF viewer's stats-bar fallback, since a PDF
 * page is a rendered image with no text to count words in. `current` is
 * 1-based. Returns null for a document with no pages (caller hides the
 * bar the same way it does for zero words). */
export function formatPageStats(current, total) {
  if (!total) return null;
  return `${current}/${total} pages`;
}
