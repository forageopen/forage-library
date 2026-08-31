/**
 * loading-phrases.js
 *
 * The playful gerunds the loading bar cycles through while a file opens /
 * renders / exports (see loading-bar.js). The bar shows one of these as its
 * headline — "RIZZING", "PERCOLATING" — and drops the real, informative
 * status ("Rendering page 3 of 12", "Downloading 47%") onto the dim
 * sub-line beneath it. Same spirit as Claude's "newspapering / baking".
 *
 * Pools are phase-keyed. loading-bar.js calls inferPhase() on whatever
 * status text a renderer reports and switches the rotator to the matching
 * pool, so the words stay loosely on-topic (paint/etch verbs while a page
 * renders, box/ship verbs while it exports) without ever claiming to be
 * the actual progress. `generic` is the fallback for anything unrecognised.
 *
 * Pure data + a timer helper — no DOM, no imports — so it unit-tests on
 * its own (loading-phrases.test.mjs) and the precache generator picks it
 * up automatically as another assets/js file.
 */

/* Every entry: a lowercase gerund phrase, unique within its pool, >= 20
   per pool (the test enforces the count). Add freely. */
export const PHRASES = {
  // Opening / downloading / reading the bytes in.
  load: [
    'summoning', 'fetching', 'rummaging', 'foraging', 'unearthing',
    'digging up', 'retrieving', 'conjuring', 'materialising', 'wrangling',
    'coaxing it out', 'corralling', 'hoisting', 'reeling it in', 'dredging up',
    'spelunking', 'excavating', 'prising it open', 'unpacking', 'decanting',
    'unspooling', 'limbering up', 'warming up', 'priming', 'rousing',
    'rolling up sleeves',
  ],
  // Rasterising pages / slides.
  render: [
    'rendering', 'painting', 'sketching', 'limning', 'etching',
    'developing', 'exposing', 'inking', 'screen-printing', 'silkscreening',
    'brushing', 'shading', 'colouring in', 'pixel-pushing', 'rasterising',
    'dithering', 'stippling', 'plating', 'embossing', 'illuminating',
    'gilding', 'frescoing', 'daubing', 'blocking it in', 'cross-hatching',
  ],
  // Writing the export file out.
  export: [
    'exporting', 'packaging', 'crating', 'boxing it up', 'wrapping',
    'parcelling', 'bundling', 'palletising', 'shrink-wrapping', 'sealing',
    'franking', 'posting', 'shipping', 'dispatching', 'bagging',
    'tucking it in', 'stapling', 'collating', 'spooling it out', 'laminating',
    'binding', 'rounding it up', 'kerbside pickup',
  ],
  // Squeezing bytes down.
  compress: [
    'compressing', 'squishing', 'squashing', 'condensing', 'compacting',
    'folding', 'origami-ing', 'vacuum-sealing', 'distilling', 'reducing',
    'cinching', 'wringing it out', 'tamping down', 'shrinking', 'deflating',
    'packing it tight', 'telescoping', 'concertina-ing', 'boiling it down',
    'whittling it down', 'crushing', 'space-bagging',
  ],
  // Anything we can't place.
  generic: [
    'percolating', 'marinating', 'steeping', 'simmering', 'brewing',
    'ruminating', 'noodling', 'mulling it over', 'vibing', 'rizzing',
    'cooking', 'baking', 'proofing', 'fermenting', 'infusing',
    'tinkering', 'faffing about', 'puttering', 'finessing', 'buffing',
    'polishing', 'tightening bolts', 'shuffling papers', 'herding cats',
    'untangling wires', 'consulting the oracle', 'aligning the chakras',
  ],
};

/* A back-compat alias — the plain "no phase" pool. */
export const GENERIC = PHRASES.generic;

/**
 * Best-effort phase for a renderer's status string. Deliberately loose:
 * a miss just means slightly off-topic whimsy, never a wrong claim about
 * progress (the real text still shows on the sub-line).
 */
export function inferPhase(text) {
  const t = String(text || '').toLowerCase();
  if (/export/.test(t)) return 'export';
  if (/compress|zip|shrink|optimi[sz]/.test(t)) return 'compress';
  if (/render|analy[sz]|drawing|rasteri[sz]/.test(t)) return 'render';
  if (/load|download|open|fetch|read/.test(t)) return 'load';
  return 'generic';
}

function shuffle(arr, random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * A word ticker. `onWord(phrase)` fires once per tick (and once
 * synchronously on a genuine setPhase change). Never emits the same
 * phrase twice in a row, including across a pool refill or a phase swap.
 *
 *   const r = createPhraseRotator({ onWord: w => label.textContent = w });
 *   r.setPhase('load'); r.start();      // ... later ...
 *   r.setPhase('render');               // switches word immediately
 *   r.stop();                           // clears the interval
 *
 * `random` is injectable for tests. `next()` is exposed for the same.
 */
export function createPhraseRotator({ onWord, intervalMs = 2000, random = Math.random } = {}) {
  let phase = 'generic';
  let queue = [];
  let last = null;
  let timer = 0;

  function refill() {
    queue = shuffle((PHRASES[phase] || GENERIC).slice(), random);
    // Don't let a refill (or phase swap) repeat the word already on screen.
    if (queue.length > 1 && queue[0] === last) queue.push(queue.shift());
  }

  function next() {
    if (!queue.length) refill();
    last = queue.shift();
    if (typeof onWord === 'function') onWord(last);
    return last;
  }

  function setPhase(nextPhase) {
    const p = PHRASES[nextPhase] ? nextPhase : 'generic';
    if (p === phase) return;
    phase = p;
    queue = [];
    next(); // a real phase change swaps the visible word right away
  }

  function start() {
    if (timer) return;
    if (last === null) next();
    timer = setInterval(next, intervalMs);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = 0; }
  }

  return { setPhase, next, start, stop };
}
