/* Scroll-triggered motion for the welcome screen.
 *
 * As each block scrolls into the pane it "decodes": every text element
 * (headline, kicker, section titles, body copy, tagline) cycles its
 * characters through random glyphs then locks to the real text,
 * staggered across the string; the buttons, cards, chips and diagrams
 * fade-and-rise in a short stagger so nothing sits there static from the
 * first paint. Mimics motion.dev's scramble-text-stagger + staggered-grid
 * examples with plain requestAnimationFrame + IntersectionObserver — no
 * library. Fully skipped under prefers-reduced-motion: the screen then
 * renders exactly as its plain markup.
 *
 * The observer is rooted on the viewport (root: null) — that fires on a
 * scroll in ANY ancestor, so it works whether the pane's own scroll area
 * scrolls (desktop) or the whole page does (the stacked <=900px layout).
 */

const GLYPHS = '<>-_\\/[]{}=+*^?#·—•~:;';

const TEXT_SEL = [
  '.vault-welcome-kicker',
  '.vault-welcome-hero h1',
  '.vault-welcome-lede',
  '.vault-welcome-hint',
  '.vault-welcome-sec-title',
  '.vault-welcome-sec-intro',
  '.vault-welcome-tagline',
].join(', ');

const REVEAL_SEL = [
  '.vault-welcome-rule',
  '.vault-welcome-btn',
  '.vault-welcome-card',
  '.vault-welcome-diagram',
  '.vault-welcome-chip',
].join(', ');

const SKIP_CHARS = new Set([' ', '\n', '\t', ' ']);

function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

function randGlyph() {
  return GLYPHS[(Math.random() * GLYPHS.length) | 0];
}

/* Cycle each character through random glyphs, then lock it to the real
   one — staggered from the left, or from the centre out (`from: 'center'`,
   the headline). The per-character stagger auto-scales to `duration`, so a
   long paragraph resolves in the same split second as a short title
   instead of crawling. Whitespace never scrambles. */
function scrambleText(el, { from = 'left', duration = 420 } = {}) {
  const text = el.dataset.motionText || el.textContent;
  el.dataset.motionText = text;
  const n = text.length;
  const centre = (n - 1) / 2;
  const hold = Math.min(140, duration * 0.4); // how long each char churns before locking
  const spread = Math.max(1, duration - hold);

  const dist = [];
  let maxDist = 1;
  for (let i = 0; i < n; i++) {
    const d = from === 'center' ? Math.abs(i - centre) : i;
    dist.push(d);
    if (d > maxDist) maxDist = d;
  }
  const perDist = spread / maxDist;
  const t0 = performance.now();

  el.setAttribute('aria-label', text); // screen readers read the real text, not the churn
  el.style.opacity = '1';

  requestAnimationFrame(function frame(now) {
    if (!el.isConnected) return;
    const t = now - t0;
    let out = '';
    for (let i = 0; i < n; i++) {
      const ch = text[i];
      if (SKIP_CHARS.has(ch)) out += ch;
      else out += t - dist[i] * perDist >= hold ? ch : randGlyph();
    }
    el.textContent = out;
    if (t < duration) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = text;
      el.removeAttribute('aria-label');
    }
  });
}

/* Run one group's entrance: scramble its text top-to-bottom, then bring
   its visuals up in a short stagger (grid-ish, by DOM order). Idempotent
   per group. `extra` carries reveal targets that live outside the group
   node (the <hr> after the hero). */
function revealGroup(group, extra = []) {
  if (group.dataset.motionDone) return;
  group.dataset.motionDone = '1';

  group.querySelectorAll('[data-motion="text"]').forEach((el, i) => {
    const headline = el.dataset.motionFrom === 'center';
    setTimeout(
      () => scrambleText(el, { from: headline ? 'center' : 'left', duration: headline ? 620 : 400 }),
      i * 40,
    );
  });

  [...group.querySelectorAll('[data-motion="reveal"]'), ...extra].forEach((el, i) => {
    el.style.transitionDelay = `${70 + i * 40}ms`;
    requestAnimationFrame(() => el.classList.add('vault-welcome-in'));
  });
}

export function initWelcomeMotion(root) {
  if (!root || reducedMotion()) return null;
  root.classList.add('vault-welcome--motion');

  root.querySelectorAll(TEXT_SEL).forEach((el) => { el.dataset.motion = 'text'; });
  root.querySelectorAll(REVEAL_SEL).forEach((el) => { el.dataset.motion = 'reveal'; });
  const headline = root.querySelector('.vault-welcome-hero h1');
  if (headline) headline.dataset.motionFrom = 'center';

  const hero = root.querySelector('.vault-welcome-hero');
  const rule = root.querySelector('.vault-welcome-rule');
  const sections = [...root.querySelectorAll('.vault-welcome-section')];

  // The hero is above the fold — run it straight away.
  if (hero) revealGroup(hero, rule ? [rule] : []);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      revealGroup(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  sections.forEach((section) => io.observe(section));

  return { destroy: () => io.disconnect() };
}
