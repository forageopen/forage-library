/* Shared fixture data + helpers for the three catalog UI mockups.
   Preview-only. The real integration generates this shape as
   vault/Research/catalog.json (scripts/generate-catalog.mjs) and fetches
   the .md bodies on demand. */

/* ---------- Lucide icons (lucide.dev, ISC) — 24x24 stroke ---------- */
const L = {
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  terminal: '<path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
};
function icon(name, cls) {
  return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${L[name] || ''}</svg>`;
}
const SECTION_ICON = { skills: 'sparkles', agents: 'bot', commands: 'terminal' };

/* ---------- tiny markdown -> HTML (preview pane only) ---------- */
function mdToHtml(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let html = '', inCode = false, inUl = false, inOl = false, para = [];
  const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const flushLists = () => { if (inUl) { html += '</ul>'; inUl = false; } if (inOl) { html += '</ol>'; inOl = false; } };
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  for (const raw of lines) {
    if (/^```/.test(raw)) {
      if (inCode) { html += '</code></pre>'; inCode = false; }
      else { flushPara(); flushLists(); html += '<pre class="md-pre"><code>'; inCode = true; }
      continue;
    }
    if (inCode) { html += esc(raw) + '\n'; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(raw);
    if (h) { flushPara(); flushLists(); const n = h[1].length; html += `<h${n}>${inline(h[2])}</h${n}>`; continue; }
    const ol = /^\s*\d+\.\s+(.*)$/.exec(raw);
    const ul = /^\s*[-*]\s+(.*)$/.exec(raw);
    if (ol) { flushPara(); if (inUl) { html += '</ul>'; inUl = false; } if (!inOl) { html += '<ol>'; inOl = true; } html += `<li>${inline(ol[1])}</li>`; continue; }
    if (ul) { flushPara(); if (inOl) { html += '</ol>'; inOl = false; } if (!inUl) { html += '<ul>'; inUl = true; } html += `<li>${inline(ul[1])}</li>`; continue; }
    if (/^\s*$/.test(raw)) { flushPara(); flushLists(); continue; }
    para.push(raw.trim());
  }
  if (inCode) html += '</code></pre>';
  flushPara(); flushLists();
  return html;
}

/* ---------- fixture markdown bodies ---------- */
const FORAGE_DOCS = {
  'Skills/write-like-adam/SKILL.md': `---
name: write-like-adam
description: Rewrites or drafts text in Adam's own terse, personal writing style — not generic AI-polished prose. Use whenever Adam asks you to write "in my voice," "how I'd actually say it," "like I'd type it," to make something "sound like me," to draft a quick message/note/DM/caption for him to send as-is, or to strip the AI-sheen off a draft you (or he) already wrote.
---

# Write like Adam

Adam's actual writing - sampled from ~180 of his own ChatGPT prompts and messages across 2023-2026 - is nothing like default AI "casual" writing. It's terser, flatter, less grammatically fussy, and has zero typographic em-dashes (he uses a plain hyphen "-" for that pause instead), zero hedging, zero enthusiasm markers.

Read \`references/voice-profile.md\` before writing anything — it has the full rule set, the two-register split, and verbatim calibration examples.

## How to use this

1. **Figure out which register the task needs.** Transactional/business/technical asks get clipped imperative fragments and low affect. Personal/emotional/reflective content gets longer, run-on, less punctuated, sometimes code-switched prose.
2. **Cut before you add.** Most of the transformation is subtractive: drop articles, drop subject pronouns where the meaning survives, drop hedges, drop transitions, drop the exclamation point, lowercase the sentence-initial "I".
3. **Keep it short.** Adam's own turns are overwhelmingly one line to a few fragments.
4. **Don't manufacture typos or broken grammar for its own sake by default.** His real typos are a byproduct of fast, unedited typing, not a style to imitate performatively.
5. **When in doubt, compress harder.** The single most common failure mode is producing something 80% of the way there and then padding it back out with a connecting clause or a softening phrase.
6. **Use ";" and "-" the way he does.** A semicolon attaches an elaborating clause to the point just made; a hyphen "-" is the pause/aside beat that would otherwise be an em-dash.
7. **Decide if "raw mode" applies.** Turn it on only when Adam asks for "raw"/"unedited"/"how I'd actually type it messily."

## Example transformation

Generic AI draft: "Hey, just wanted to check in — do you think the new brand colors are working well, or should we look at some alternatives? Let me know your thoughts!"

Adam's voice: "new brand colors working or need alternatives? whats your verdict"
`,
  'Skills/forage-slide-builder/SKILL.md': `---
name: forage-slide-builder
description: Turns a rough outline or a raw doc into a Forage-branded slide deck (print-style HTML, one section per slide) matching the house template — Figtree headings, teal accent, generous margins.
---

# Forage slide builder

Use when someone hands you an outline, a transcript, or a wall of notes and wants "a deck." Produces a self-contained HTML deck in the Forage look.

## Steps

1. Segment the source into 6-12 beats. One idea per slide. Kill anything that doesn't survive a one-line summary.
2. For each beat write a **title** (<= 6 words) and **2-4 support points** (<= 14 words each).
3. Emit one \`.slide\` section per beat using the template partial in \`references/template.html\`.
4. Cover slide + closing slide are fixed — only swap the title line.

## Rules

- Never more than 4 bullets on a slide.
- No sub-bullets. If you need them, it's two slides.
- Diagrams as inline SVG, not images.
`,
  'Skills/malay-english-codeswitch/SKILL.md': `---
name: malay-english-codeswitch
description: Rewrites English copy into the natural KL Malay/English code-switch register for a Malaysian audience — not full translation, not rojak-for-its-own-sake.
---

# Malay-English code-switch

For captions, ad copy, community posts aimed at a Malaysian audience where straight English reads cold and straight BM reads stiff.

## How

- Keep the sentence spine English; swap connective and emotive words to Malay (\`memang\`, \`kan\`, \`je\`, \`lah\` sparingly).
- Never machine-translate whole clauses.
- Read it aloud — if it sounds like a textbook or like a meme, it's wrong.
`,
  'Skills/citation-formatter/SKILL.md': `---
name: citation-formatter
description: Normalises a messy list of references into a single citation style (APA 7 default) and flags entries missing required fields.
---

# Citation formatter

Paste a bibliography in any mixed state; get back one consistent style plus a list of what's incomplete.

## Behaviour

1. Detect the likely source type per entry (journal, book, web, report).
2. Reformat to the target style.
3. Emit a **Gaps** section: entries missing DOI, year, publisher, or page range.
`,
  'Skills/retro-synthesizer/SKILL.md': `---
name: retro-synthesizer
description: Reads a project's retrospective notes and git history and writes the structured RETROSPECTIVE-*.md set — bugs and root causes, architecture decisions, process lessons.
---

# Retro synthesizer

Turns scattered session notes into the seven-file retrospective index this repo uses.

## Output files

- \`RETROSPECTIVE-INDEX.md\`
- \`RETROSPECTIVE-BUGS-AND-ROOT-CAUSES.md\`
- \`RETROSPECTIVE-ARCHITECTURE-DECISIONS.md\`
- \`RETROSPECTIVE-PROCESS-AND-COLLABORATION.md\`
- \`RETROSPECTIVE-VERIFICATION-STRATEGY.md\`
- \`RETROSPECTIVE-FEATURE-DELIVERY.md\`
- \`RETROSPECTIVE-ABIM-PROCESS-MAPPING.md\`
`,
  'Agents/code-cleaner/code-cleaner.md': `---
name: code-cleaner
description: Measures a codebase against a fixed quality bar (module token budget, cognitive & cyclomatic complexity, Halstead, CRAP, mutation score, dead/duplicate code) and reports where it stands — and, on explicit request, closes one module's gaps at a time with structural refactors only.
tools: Read, Grep, Glob, Bash, Edit, Write, TodoWrite
model: sonnet
---

You are **code-cleaner**. You do two things and nothing else:

1. **\`audit\`** (default) — measure a codebase against the quality bar and report exactly where it stands. Strictly read-only.
2. **\`fix <module>\`** — close the gaps in **one** named module using structural refactors only.

At the start of **every** run, read the sibling file \`code-cleaner.thresholds.md\`. It holds the numbers, the tiering, and the calibration rationale. If you cannot read the thresholds file, stop and say so — do not proceed from memory.

## Audit output

A table per module: token count, cognitive complexity, cyclomatic, Halstead volume, CRAP score, mutation score if available, plus dead-code and duplicate-block findings. Rank worst-first. Never write a test that asserts expected behaviour.
`,
  'Agents/malaysian-media-law-custodian/malaysian-media-law-custodian.md': `---
name: malaysian-media-law-custodian
description: Virtual legal-partner / custodian for assessing a client's exposure under Malaysian media, speech, content and communications law. Works from the COMMANDER "Malaysian Acts" corpus, treating it as a dated secondary reference, not as the current law.
tools: Read, Grep, Glob, Bash, WebSearch, WebFetch, Write, TodoWrite
model: sonnet
---

You are a **custodian**, not an oracle. You produce risk maps and questions for a lawyer — never "you're fine" verdicts, never final court/police/press copy.

## Every run

1. Load the corpus manifest. Treat the 2006 Acts snapshot as stale — flag every provision that is likely amended.
2. Build a prosecution-element matrix for the allegation or charge.
3. Output: risk map, unknowns, and the questions a Malaysian advocate & solicitor must answer.
`,
  'Agents/xd-to-figma-migrator/xd-to-figma-migrator.md': `---
name: xd-to-figma-migrator
description: Drives the offline Adobe XD to Figma migration tool — reads a .agc bundle, maps artboards and components, and reports what will not survive the round-trip.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You operate the xd-to-figma converter. GUI-only convert; you prepare and verify.

## Steps

1. Inspect the raw \`.agc\` JSON for layout XD already persisted before synthesizing anything.
2. Produce a fidelity report: fonts, blend modes, and vector effects that the approximate SVG preview cannot represent.
`,
  'Agents/fibroid-research-reviewer/fibroid-research-reviewer.md': `---
name: fibroid-research-reviewer
description: Reviews changes in the fibroid-research app against its .ai/ control layer — reads .ai/DEFINITION-OF-DONE.md first, every session, and blocks anything that misses it.
tools: Read, Grep, Glob
model: sonnet
---

Read \`.ai/DEFINITION-OF-DONE.md\` before anything else. Review only against what it states. Governed by the \`.ai/\` control layer, not \`docs/product/\`.
`,
  'Commands/ship-check.md': `---
description: Pre-push checklist — runs tests, regenerates generated files, and lists anything uncommitted that looks generated.
---

Run \`npm test\`. Then \`npm run generate-manifest\` and \`npm run generate-precache\`. Report any diff in generated files and remind me not to commit a partial manifest.
`,
  'Commands/retro.md': `---
description: Append a dated entry to the project retrospective from the current session.
---

Summarise this session into one dated block: what shipped, what broke and why, one process lesson. Append to the matching RETROSPECTIVE-*.md file.
`,
  'Commands/brand-lint.md': `---
description: Check a doc or page against the Forage brand rules — Figtree wordmark only, teal accent, no em-dashes in body copy.
---

Scan the target for: typographic em-dashes in body copy, off-palette accent colours, wordmark set in the wrong face. Report line by line.
`,
};

/* ---------- fixture catalog (shape of vault/Research/catalog.json) ---------- */
function entry(type, slug, title, description, tags, files, updated, github) {
  const base = `${type === 'skill' ? 'Skills' : type === 'agent' ? 'Agents' : 'Commands'}/${slug}`;
  const fileList = files.map((f) => {
    const path = f.lone ? `${base}.md` : `${base}/${f.name}`;
    const key = f.lone ? `${(type === 'skill' ? 'Skills' : type === 'agent' ? 'Agents' : 'Commands')}/${slug}.md` : `${base}/${f.name}`;
    return { path, key, ext: 'md', bytes: (FORAGE_DOCS[key] || '').length || f.bytes || 400 };
  });
  const primaryKey = fileList[0].key;
  return {
    type, slug, title, description, tags,
    github: github || null,
    featured: false,
    primaryKey,
    primary: fileList[0].path,
    files: fileList,
    totalBytes: fileList.reduce((n, f) => n + f.bytes, 0),
    updated,
  };
}

const FORAGE_CATALOG = {
  generatedAt: '2026-08-31T00:00:00Z',
  sections: {
    skills: [
      entry('skill', 'write-like-adam', 'Write like Adam',
        "Rewrites or drafts text in Adam's own terse, personal writing style — not generic AI-polished prose.",
        ['writing', 'voice', 'personal'],
        [{ name: 'SKILL.md' }, { name: 'README.md', bytes: 3200 }, { name: 'references/voice-profile.md', bytes: 10257 }],
        '2026-08-14'),
      entry('skill', 'forage-slide-builder', 'Forage slide builder',
        'Turns a rough outline or a raw doc into a Forage-branded slide deck matching the house template.',
        ['slides', 'design', 'branding'],
        [{ name: 'SKILL.md' }, { name: 'references/template.html', bytes: 2600 }],
        '2026-08-20'),
      entry('skill', 'malay-english-codeswitch', 'Malay-English code-switch',
        'Rewrites English copy into the natural KL Malay/English code-switch register for a Malaysian audience.',
        ['writing', 'malay', 'localization'],
        [{ name: 'SKILL.md' }],
        '2026-08-22'),
      entry('skill', 'citation-formatter', 'Citation formatter',
        'Normalises a messy list of references into a single citation style and flags incomplete entries.',
        ['academic', 'writing', 'references'],
        [{ name: 'SKILL.md' }],
        '2026-07-30'),
      entry('skill', 'retro-synthesizer', 'Retro synthesizer',
        "Reads a project's retrospective notes and git history and writes the structured RETROSPECTIVE-*.md set.",
        ['process', 'documentation', 'retrospective'],
        [{ name: 'SKILL.md' }, { name: 'references/index-template.md', bytes: 1800 }],
        '2026-08-05'),
    ],
    agents: [
      entry('agent', 'code-cleaner', 'code-cleaner',
        'Measures a codebase against a fixed quality bar and reports where it stands; closes one module’s gaps at a time on request.',
        ['code-quality', 'refactor', 'audit', 'reviewer'],
        [{ name: 'code-cleaner.md' }, { name: 'code-cleaner.thresholds.md', bytes: 4100 }, { name: 'output-templates.md', bytes: 2300 }],
        '2026-08-18'),
      entry('agent', 'malaysian-media-law-custodian', 'Malaysian media-law custodian',
        "Legal-partner / custodian for assessing exposure under Malaysian media, speech and communications law.",
        ['legal', 'malaysia', 'media-law', 'custodian', 'advisor'],
        [{ name: 'malaysian-media-law-custodian.md' }, { name: 'client-intake-template.md', bytes: 1900 }, { name: 'output-templates.md', bytes: 3400 }, { name: 'corpus-manifest.md', bytes: 2600 }],
        '2026-08-25'),
      entry('agent', 'xd-to-figma-migrator', 'XD to Figma migrator',
        'Drives the offline Adobe XD to Figma migration tool and reports what will not survive the round-trip.',
        ['design', 'figma', 'migration', 'tooling'],
        [{ name: 'xd-to-figma-migrator.md' }],
        '2026-08-12'),
      entry('agent', 'fibroid-research-reviewer', 'fibroid-research reviewer',
        "Reviews changes in the fibroid-research app against its .ai/ control layer.",
        ['review', 'medical', 'research', 'reviewer'],
        [{ name: 'fibroid-research-reviewer.md' }],
        '2026-08-28'),
    ],
    commands: [
      entry('command', 'ship-check', '/ship-check',
        'Pre-push checklist — runs tests, regenerates generated files, flags anything uncommitted that looks generated.',
        ['ci', 'git', 'process'],
        [{ name: 'ship-check.md', lone: true }],
        '2026-08-19'),
      entry('command', 'retro', '/retro',
        'Append a dated entry to the project retrospective from the current session.',
        ['process', 'documentation'],
        [{ name: 'retro.md', lone: true }],
        '2026-08-19'),
      entry('command', 'brand-lint', '/brand-lint',
        'Check a doc or page against the Forage brand rules.',
        ['branding', 'review'],
        [{ name: 'brand-lint.md', lone: true }],
        '2026-08-21'),
    ],
  },
};

/* ---------- shared helpers ---------- */
const FORAGE_THEMES = ['sakura', 'cherry', 'forest-brew', 'tea-mist', 'blueberry', 'kokoblu', 'dubai'];

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
}
function allTags(entries) {
  const set = new Set();
  entries.forEach((e) => e.tags.forEach((t) => set.add(t)));
  return [...set].sort();
}
function getDoc(key) { return FORAGE_DOCS[key] || `> Preview unavailable for ${key}`; }

function initThemeBar(current) {
  const saved = (() => { try { return localStorage.getItem('forage-theme'); } catch (e) { return null; } })();
  const theme = FORAGE_THEMES.includes(saved) ? saved : 'cherry';
  document.documentElement.setAttribute('data-theme', theme);
  const bar = document.createElement('div');
  bar.className = 'mock-bar';
  bar.innerHTML = `
    <h1>Forage · Research catalog mockups</h1>
    <div class="mock-variant-links">
      <a class="mock-vlink" href="variant-a.html"${current === 'a' ? ' aria-current="page"' : ''}>A · Dense grid</a>
      <a class="mock-vlink" href="variant-b.html"${current === 'b' ? ' aria-current="page"' : ''}>B · Gallery</a>
      <a class="mock-vlink" href="variant-c.html"${current === 'c' ? ' aria-current="page"' : ''}>C · Native index</a>
    </div>
    <label>Theme
      <select>${FORAGE_THEMES.map((t) => `<option value="${t}"${t === theme ? ' selected' : ''}>${t}</option>`).join('')}</select>
    </label>`;
  bar.querySelector('select').addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-theme', e.target.value);
    try { localStorage.setItem('forage-theme', e.target.value); } catch (err) {}
  });
  document.body.prepend(bar);
}

function copyText(text, btn) {
  const done = () => {
    if (!btn) return;
    const old = btn.innerHTML;
    btn.innerHTML = icon('check') + '<span>Copied</span>';
    btn.classList.add('is-done');
    setTimeout(() => { btn.innerHTML = old; btn.classList.remove('is-done'); }, 1400);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallback());
  } else { fallback(); }
  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    ta.remove();
  }
}
