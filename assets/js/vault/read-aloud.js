/**
 * read-aloud.js
 *
 * The pane header "read along" button (see viewer-pane.js) — steps a
 * highlight through a prose document one word at a time at reading speed.
 * Only wired up for genuinely text-based docs (md / txt / docx); the
 * button is hidden for PDF/PPTX/images/HTML.
 *
 * Visual treatment ("reveal", style 12 of the picker): while a session is
 * live the container carries `vault-read-active`, which fades every word
 * not yet read; each word pops to full as the cursor reaches it and the
 * current word flashes the accent colour (all in forage.css).
 *
 * Controls (wired in viewer-pane.js): single click toggles play / pause /
 * resume, a finished pass swaps the icon to replay, and a double click
 * resets to the top.
 */

/** Average adult silent-reading speed to step at. 250 is a touch above
 * the 200 the "x min read" badge uses (reading-stats.js) — it reads
 * comfortably with the per-word pauses below. */
export const READ_WPM = 250;

const SKIP_INSIDE = 'pre, code, script, style';

/** Wrap every word under `root` in `<span class="vault-read-word">`,
 * leaving whitespace and markup untouched, and return the spans in
 * reading (document) order. Text inside <pre>/<code> is left alone.
 * Pure DOM — safe to unit-test with jsdom. */
export function tokenizeWords(root) {
  const doc = root.ownerDocument;
  const NF = (doc.defaultView && doc.defaultView.NodeFilter) || globalThis.NodeFilter;
  const walker = doc.createTreeWalker(root, NF.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NF.FILTER_REJECT;
      if (node.parentElement && node.parentElement.closest(SKIP_INSIDE)) return NF.FILTER_REJECT;
      return NF.FILTER_ACCEPT;
    },
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  const words = [];
  for (const node of textNodes) {
    const frag = doc.createDocumentFragment();
    for (const part of node.nodeValue.split(/(\s+)/)) {
      if (part === '') continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(doc.createTextNode(part));
        continue;
      }
      const span = doc.createElement('span');
      span.className = 'vault-read-word';
      span.textContent = part;
      frag.appendChild(span);
      words.push(span);
    }
    node.parentNode.replaceChild(frag, node);
  }
  return words;
}

/** Milliseconds to dwell on a word: longer after sentence- and
 * clause-final punctuation, and a little longer for long words, so the
 * pass tracks natural reading rhythm rather than a metronome. Pure. */
export function wordDelay(text, msPerWord = 60000 / READ_WPM) {
  const t = text || '';
  if (/[.!?:;]$/.test(t)) return msPerWord * 2.2;
  if (/[,)"'’”]$/.test(t)) return msPerWord * 1.5;
  if (t.length > 9) return msPerWord * 1.35;
  return msPerWord;
}

/** Build a read-along session over `container` (the `.vault-content`
 * element). `onState(state)` fires on every transition with one of
 * 'idle' | 'playing' | 'paused' | 'done' so the caller can update the
 * button icon. Returns { toggle, reset, destroy, state }.
 *
 * destroy() unwraps the word spans and restores the original text, so the
 * document is left exactly as it was found (export / re-render safe). */
export function createReadAloud(container, { wpm = READ_WPM, onState, scrollTarget } = {}) {
  const words = tokenizeWords(container);
  const msPerWord = 60000 / wpm;
  let i = 0;
  let timer = 0;
  let state = 'idle';

  const emit = () => { if (onState) onState(state); };

  /* Follow the cursor only when it has actually left the visible area —
     never re-centre. `block: 'nearest'` is a no-op while the word is on
     screen, so pressing play at the top of a document doesn't jump it. */
  const keepInView = () => {
    const cur = words[i];
    if (!cur) return;
    const box = cur.getBoundingClientRect();
    const view = scrollTarget && scrollTarget.getBoundingClientRect
      ? scrollTarget.getBoundingClientRect()
      : { top: 0, bottom: (container.ownerDocument.defaultView || globalThis).innerHeight };
    if (box.top < view.top || box.bottom > view.bottom) {
      cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const advanceMark = (prev) => {
    if (prev != null && words[prev]) {
      words[prev].classList.remove('vault-read-word--current');
      words[prev].classList.add('vault-read-word--read');
    }
    if (words[i]) words[i].classList.add('vault-read-word--current');
    keepInView();
  };

  const clearMarks = () => {
    for (const w of words) w.classList.remove('vault-read-word--read', 'vault-read-word--current');
  };

  const step = () => {
    if (i >= words.length) return finish();
    advanceMark(i - 1 >= 0 ? i - 1 : null);
    timer = setTimeout(() => { i += 1; step(); }, wordDelay(words[i] ? words[i].textContent : '', msPerWord));
  };

  const finish = () => {
    clearTimeout(timer);
    for (const w of words) {
      w.classList.add('vault-read-word--read');
      w.classList.remove('vault-read-word--current');
    }
    i = words.length;
    state = 'done';
    emit();
  };

  const play = () => {
    if (!words.length) return;
    if (state === 'done') { clearMarks(); i = 0; }
    state = 'playing';
    container.classList.add('vault-read-active');
    emit();
    step();
  };

  const pause = () => {
    clearTimeout(timer);
    state = 'paused';
    emit();
  };

  const reset = () => {
    clearTimeout(timer);
    i = 0;
    state = 'idle';
    clearMarks();
    container.classList.remove('vault-read-active');
    emit();
  };

  const toggle = () => {
    if (state === 'playing') pause();
    else play();
  };

  const destroy = () => {
    clearTimeout(timer);
    container.classList.remove('vault-read-active');
    for (const span of words) {
      span.replaceWith(container.ownerDocument.createTextNode(span.textContent));
    }
    container.normalize();
  };

  emit();
  return { toggle, reset, destroy, get state() { return state; } };
}
