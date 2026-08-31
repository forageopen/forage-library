/* First-load welcome screen for the initial pane.
 *
 * Shown once per browser (localStorage 'forage-welcome-seen') in place of
 * the empty dropzone. Dismissed by:
 *   - "Start exploring"  → reveal the normal dropzone / new-note picker
 *   - "See Welcome Note" → open vault/00-welcome-note.md (caller wires this)
 *   - opening any file from the sidebar (caller calls dismiss())
 * The closing "Explore" button does NOT dismiss — it pulses the sidebar to
 * point a first-time visitor at the folder list.
 *
 * Add ?welcome to the URL to force it back for testing after it's been seen.
 * All styling lives in forage.css (.vault-welcome*), token-based, so it
 * follows every theme.
 */

const SEEN_KEY = 'forage-welcome-seen';

const ARROW = '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>';
const NOTE_ICON =
  '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>';
const COMPASS = '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>';

function stroke(paths) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

const WELCOME_HTML = `
  <div class="vault-welcome-hero">
    <div class="vault-welcome-kicker">Forage Library</div>
    <h1>The world is yours.<br>Go forage.</h1>
    <p class="vault-welcome-lede">An open collection of research, frameworks, and working knowledge &mdash; on AI, data rights, technology, and learning how to learn. There is no syllabus. Start with a question and follow the trail.</p>
    <div class="vault-welcome-cta">
      <button type="button" class="vault-welcome-btn vault-welcome-btn--primary" data-welcome-start>${stroke(ARROW)} Start exploring</button>
      <button type="button" class="vault-welcome-btn vault-welcome-btn--ghost" data-welcome-note>${stroke(NOTE_ICON)} See Welcome Note</button>
    </div>
    <p class="vault-welcome-hint">Start exploring opens the file picker &amp; a blank note &middot; See Welcome Note opens the note from Adam</p>
  </div>

  <hr class="vault-welcome-rule">

  <section class="vault-welcome-section">
    <div class="vault-welcome-sec-title">A library built for agency</div>
    <p class="vault-welcome-sec-intro">Knowledge should not leave you waiting for the next lesson. Forage is for people who want to explore, understand, and act.</p>
    <div class="vault-welcome-cards">
      <div class="vault-welcome-card">
        <div class="vault-welcome-card-icon">${stroke('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')}</div>
        <h3>Research openly</h3>
        <p>Find research, references, frameworks, and hard-won practical notes across AI, technology, data rights, and ethical learning.</p>
      </div>
      <div class="vault-welcome-card">
        <div class="vault-welcome-card-icon">${stroke('<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M6.8 7.7 10.4 15.9M17.2 7.7 13.6 15.9M7.5 6h9"/>')}</div>
        <h3>Build with intelligent systems</h3>
        <p>Use agentic tools to investigate ideas, connect information, test possibilities, and move from a thought to something real.</p>
      </div>
      <div class="vault-welcome-card">
        <div class="vault-welcome-card-icon">${stroke('<path d="M12 3v18M7 21h10M6 6h12M6 6l-3 6a3 3 0 0 0 6 0Zm12 0-3 6a3 3 0 0 0 6 0ZM12 6 6 4M12 6l6-2"/>')}</div>
        <h3>Play by the rules</h3>
        <p>Understand the systems around you &mdash; their constraints, incentives, and boundaries &mdash; before you decide how to move within them.</p>
      </div>
      <div class="vault-welcome-card">
        <div class="vault-welcome-card-icon">${stroke('<path d="M4 20h16"/><rect x="5" y="13" width="3.5" height="7"/><rect x="10.25" y="9" width="3.5" height="11"/><rect x="15.5" y="5" width="3.5" height="15"/>')}</div>
        <h3>Build your capacity</h3>
        <p>Start from what you can do now. Skills, judgment, and tools compound over time.</p>
      </div>
    </div>
  </section>

  <section class="vault-welcome-section">
    <div class="vault-welcome-sec-title">Learn at your pace</div>
    <p class="vault-welcome-sec-intro">There is no prescribed route. You might arrive with a question, follow a reference, open a dataset, or disappear down an unexpected rabbit hole &mdash; that is part of the point. Go deeper when curiosity pulls you in; move on when it does not; come back when you are ready.</p>
    <div class="vault-welcome-diagram">
      <svg viewBox="0 0 680 190" role="img" aria-label="A branching path: Question leads to Research, then Framework, Experiment, Insight, with a rabbit-hole branch">
        <defs>
          <marker id="vw-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path class="vw-arrowhead" d="M0 0 10 5 0 10z"/></marker>
        </defs>
        <g class="vw-edge" stroke-width="2" marker-end="url(#vw-ah)">
          <path d="M96 95 H150"/>
          <path d="M246 95 H300"/>
          <path d="M396 95 C 430 95, 430 50, 470 50"/>
          <path d="M396 95 C 430 95, 430 140, 470 140"/>
          <path d="M566 50 C 600 50, 600 95, 620 95" opacity="0.5"/>
        </g>
        <g text-anchor="middle">
          <rect class="vw-node-accent" x="20" y="78" width="76" height="34" rx="8"/><text class="vw-label-accent" x="58" y="99">Question</text>
          <rect class="vw-node" x="150" y="78" width="96" height="34" rx="8"/><text class="vw-label" x="198" y="99">Research</text>
          <rect class="vw-node" x="300" y="78" width="96" height="34" rx="8"/><text class="vw-label" x="348" y="99">Framework</text>
          <rect class="vw-node" x="470" y="33" width="96" height="34" rx="8"/><text class="vw-label" x="518" y="54">Experiment</text>
          <rect class="vw-node" x="470" y="123" width="96" height="34" rx="8"/><text class="vw-label" x="518" y="144">Rabbit hole</text>
          <rect class="vw-node-accent" x="620" y="78" width="56" height="34" rx="8"/><text class="vw-label-accent" x="648" y="99">Insight</text>
        </g>
      </svg>
    </div>
  </section>

  <section class="vault-welcome-section">
    <div class="vault-welcome-sec-title">Where intelligent systems fit</div>
    <p class="vault-welcome-sec-intro">Agentic systems can search, organise, analyse, and prototype alongside you. Forage explores how they become working partners &mdash; without giving up judgment, ownership, or responsibility.</p>
    <div class="vault-welcome-diagram">
      <svg viewBox="0 0 680 200" role="img" aria-label="A loop: you to agent to tools to knowledge to action, and result back through reflection to you">
        <defs>
          <marker id="vw-ah2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path class="vw-arrowhead" d="M0 0 10 5 0 10z"/></marker>
        </defs>
        <g class="vw-edge" stroke-width="2" marker-end="url(#vw-ah2)">
          <path d="M92 55 H150"/>
          <path d="M232 55 H290"/>
          <path d="M372 55 H430"/>
          <path d="M512 55 H545 C 560 55, 560 70, 560 90 L 560 118"/>
        </g>
        <g class="vw-edge-accent" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#vw-ah2)">
          <path d="M470 150 H 120 C 100 150, 100 120, 100 90 L 100 76"/>
        </g>
        <g text-anchor="middle">
          <rect class="vw-node-accent" x="24" y="38" width="68" height="34" rx="8"/><text class="vw-label-accent" x="58" y="59">You</text>
          <rect class="vw-node" x="150" y="38" width="82" height="34" rx="8"/><text class="vw-label" x="191" y="59">Agent</text>
          <rect class="vw-node" x="290" y="38" width="82" height="34" rx="8"/><text class="vw-label" x="331" y="59">Tools</text>
          <rect class="vw-node" x="430" y="38" width="82" height="34" rx="8"/><text class="vw-label" x="471" y="59">Knowledge</text>
          <rect class="vw-node" x="519" y="120" width="82" height="34" rx="8"/><text class="vw-label" x="560" y="141">Action</text>
          <rect class="vw-node-muted" x="410" y="133" width="90" height="34" rx="8"/><text class="vw-label-muted" x="455" y="154">Result</text>
          <text class="vw-label-muted" x="250" y="190">result &rarr; reflection &rarr; you</text>
        </g>
      </svg>
    </div>
    <p class="vault-welcome-tagline">Human curiosity. Machine leverage. Personal agency.</p>
  </section>

  <section class="vault-welcome-section">
    <div class="vault-welcome-sec-title">Open by design</div>
    <p class="vault-welcome-sec-intro">Knowledge grows when people can inspect it, question it, reuse it, and build on it. Everything here is meant to be taken and used.</p>
    <div class="vault-welcome-chips">
      <button type="button" class="vault-welcome-chip" data-welcome-soon>Inspect</button>
      <button type="button" class="vault-welcome-chip" data-welcome-soon>Fork</button>
      <button type="button" class="vault-welcome-chip" data-welcome-soon>Adapt</button>
      <button type="button" class="vault-welcome-chip" data-welcome-soon>Contribute</button>
    </div>
  </section>

  <section class="vault-welcome-section vault-welcome-section--closing">
    <div class="vault-welcome-sec-title">Start foraging</div>
    <div class="vault-welcome-cta">
      <button type="button" class="vault-welcome-btn vault-welcome-btn--primary" data-welcome-pulse>${stroke(COMPASS)} Explore</button>
      <button type="button" class="vault-welcome-btn vault-welcome-btn--ghost" data-welcome-note>${stroke(NOTE_ICON)} See Welcome Note</button>
    </div>
  </section>
`;

function hasSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch (e) {
    /* private mode / storage disabled — the screen just shows again next visit */
  }
}

/* Mounts the welcome screen into `paneMainEl` (hiding its dropzone) unless
 * it's already been seen. Returns { dismiss } — call dismiss() when a file
 * is opened by other means — or null when nothing was shown.
 *
 *   onSeeWelcomeNote(): open vault/00-welcome-note.md
 *   sidebarEl: the <nav> to pulse from the closing "Explore" button
 */
export function initWelcome(paneMainEl, { onSeeWelcomeNote, sidebarEl } = {}) {
  if (!paneMainEl) return null;
  const forced = new URLSearchParams(location.search).has('welcome');
  if (hasSeen() && !forced) return null;

  const dropzone = paneMainEl.querySelector('[data-vault-dropzone]');
  const el = document.createElement('div');
  el.className = 'vault-welcome';
  el.setAttribute('data-vault-welcome', '');
  el.innerHTML = WELCOME_HTML;
  paneMainEl.prepend(el);
  if (dropzone) dropzone.hidden = true;

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    markSeen();
    el.remove();
    if (dropzone) dropzone.hidden = false;
  }

  el.querySelector('[data-welcome-start]')?.addEventListener('click', dismiss);

  el.querySelectorAll('[data-welcome-note]').forEach((btn) => {
    btn.addEventListener('click', () => {
      dismiss();
      onSeeWelcomeNote?.();
    });
  });

  el.querySelector('[data-welcome-pulse]')?.addEventListener('click', () => {
    if (!sidebarEl) return;
    sidebarEl.classList.remove('vault-sidebar--pulse');
    void sidebarEl.offsetWidth; // restart the animation if it's mid-run
    sidebarEl.classList.add('vault-sidebar--pulse');
    setTimeout(() => sidebarEl.classList.remove('vault-sidebar--pulse'), 1500);
  });

  let toastTimer = 0;
  el.querySelectorAll('[data-welcome-soon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      let toast = el.querySelector('.vault-welcome-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'vault-welcome-toast';
        toast.textContent = 'Coming soon';
        el.appendChild(toast);
      }
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.remove(), 1600);
    });
  });

  return { dismiss };
}
