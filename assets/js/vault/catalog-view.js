/* Research catalog dashboard — the card grid + detail drawer that renders
   in place of the normal file viewer when a `type: "catalog"` sidebar
   node (Skills / Agents / Commands) is opened. Data comes from
   vault/Research/catalog.json (scripts/generate-catalog.mjs); the primary
   .md of an entry is fetched on demand for the Code/Preview panel, and a
   bundle is zipped client-side for download.

   Variant "B" from design/catalog-previews/: a container-query card grid
   (1-5 columns off the *pane* width, each card also restyling off its own
   width) + a slide-in detail drawer. */

import { renderMarkdown } from './render-markdown.js';
import { downloadBlob } from './export.js';

const CATALOG_URL = 'vault/Research/catalog.json';

export const SECTION_META = {
  skills: { label: 'Skills', type: 'Skill', icon: 'sparkles' },
  agents: { label: 'Agents', type: 'Agent', icon: 'bot' },
  commands: { label: 'Commands', type: 'Command', icon: 'terminal' },
};

/* Lucide icons (lucide.dev, ISC) — same 24x24 stroke convention as the
   sidebar's ICON_PATHS and the ribbon SVGs. */
const ICONS = {
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  terminal: '<path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
};
function icon(name) {
  return `<svg class="forage-cat-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* One shared fetch of catalog.json across every pane / re-render. */
let catalogPromise = null;
/** Test-only: drop the shared catalog.json fetch cache. */
export function _resetCatalogCache() { catalogPromise = null; }
function loadCatalog(fetchImpl = fetch) {
  if (!catalogPromise) {
    catalogPromise = fetchImpl(CATALOG_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .catch((err) => { catalogPromise = null; throw err; });
  }
  return catalogPromise;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : (iso || '');
}
export function fmtBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
export function stripFrontmatter(text) {
  return String(text).replace(/^﻿?---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, '');
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function allTags(entries) {
  const set = new Set();
  entries.forEach((e) => (e.tags || []).forEach((t) => set.add(t)));
  return [...set].sort();
}

/* The files to bundle for download, and the path each takes inside the
   zip — everything under `<slug>/…` so an unzip drops a ready folder. */
export function zipEntriesFor(entry) {
  const marker = `/${entry.slug}/`;
  return entry.files.map((f) => {
    const i = f.path.indexOf(marker);
    const name = i === -1 ? f.path.split('/').pop() : f.path.slice(i + 1);
    return { url: f.path, name };
  });
}

export function createCatalogView(contentEl, { onOpenFile, fetchImpl = fetch } = {}) {
  let data = null;
  let section = 'skills';
  const activeTags = new Set();
  let openSlug = null;
  let viewMode = 'preview';       // 'code' | 'preview'
  let openKey = null;             // which bundle file is shown in the drawer
  const docCache = new Map();     // file path -> raw text
  let clickHandler = null;
  let keyHandler = null;
  let destroyed = false;

  function entriesFor(sec) {
    const list = (data && data.sections && data.sections[sec]) || [];
    if (!activeTags.size) return list;
    return list.filter((e) => [...activeTags].some((t) => (e.tags || []).includes(t)));
  }
  function findEntry(slug) {
    return ((data && data.sections && data.sections[section]) || []).find((e) => e.slug === slug) || null;
  }

  async function fetchDoc(url) {
    if (docCache.has(url)) return docCache.get(url);
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const text = await res.text();
    docCache.set(url, text);
    return text;
  }

  function writeHash() {
    const h = openSlug ? `#catalog=${section}/${openSlug}` : `#catalog=${section}`;
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  /* ---------- markup ---------- */

  function cardHtml(entry) {
    const meta = SECTION_META[section];
    return `<article class="forage-cat-card" data-slug="${esc(entry.slug)}" tabindex="0" role="button">
      <div class="forage-cat-card-body">
        <div class="forage-cat-banner">
          <span class="forage-cat-type">${meta.type}</span>${icon(meta.icon)}
        </div>
        <div class="forage-cat-card-inner">
          <div class="forage-cat-card-title">${esc(entry.title)}</div>
          <p class="forage-cat-card-desc">${esc(entry.description || '')}</p>
          <div class="forage-cat-card-tags">${(entry.tags || []).map((t) => `<span class="forage-cat-pill">${esc(t)}</span>`).join('')}</div>
          <div class="forage-cat-card-meta">
            <span>${entry.files.length} file${entry.files.length > 1 ? 's' : ''}</span>
            <span>${fmtBytes(entry.totalBytes)}</span>
            <span class="forage-cat-card-date">updated ${fmtDate(entry.updated)}</span>
          </div>
        </div>
      </div>
    </article>`;
  }

  function gridHtml() {
    const entries = entriesFor(section);
    const meta = SECTION_META[section];
    if (!entries.length) {
      const empty = ((data && data.sections && data.sections[section]) || []).length === 0
        ? `${meta.label} — coming soon`
        : 'Nothing matches that filter';
      return `<div class="forage-cat-empty">${icon(meta.icon)}<p>${empty}</p></div>`;
    }
    return `<div class="forage-catalog-grid">${entries.map(cardHtml).join('')}</div>`;
  }

  function shellHtml() {
    const tabs = Object.entries(SECTION_META).map(([key, m]) => {
      const n = ((data && data.sections && data.sections[key]) || []).length;
      return `<button class="forage-cat-tab" data-section="${key}" aria-selected="${key === section}" title="${m.label}">${icon(m.icon)}<span class="forage-cat-tab-lbl">${m.label} · ${n}</span></button>`;
    }).join('');
    const tags = allTags((data && data.sections && data.sections[section]) || []);
    const chips = tags.length
      ? `<div class="forage-catalog-tags">${tags.map((t) => `<button class="forage-cat-chip" data-tag="${esc(t)}" aria-pressed="${activeTags.has(t)}">${esc(t)}</button>`).join('')}</div>`
      : '';
    return `<div class="forage-catalog">
      <div class="forage-catalog-tabs" role="tablist">${tabs}</div>
      ${chips}
      <div class="forage-catalog-body" data-grid>${gridHtml()}</div>
    </div>
    <div class="forage-cat-scrim" data-scrim hidden></div>
    <div class="forage-cat-drawer" data-drawer role="dialog" aria-modal="true" hidden></div>`;
  }

  function viewerHtml(entry, raw) {
    const key = openKey || entry.primary;
    const fname = key.split('/').pop();
    let body;
    if (viewMode === 'code') {
      body = `<pre class="forage-cat-code"><code>${esc(raw)}</code></pre>`;
    } else {
      try {
        body = renderMarkdown(stripFrontmatter(raw));
      } catch (err) {
        body = `<div class="vault-content"><p>Preview unavailable — ${esc(err.message)}</p></div>`;
      }
    }
    const long = raw.length > 2600;
    return `<div class="forage-cat-viewer">
      <div class="forage-cat-viewer-head">
        <div class="forage-cat-seg">
          <button data-mode="code" aria-selected="${viewMode === 'code'}">${icon('code')} Code</button>
          <button data-mode="preview" aria-selected="${viewMode === 'preview'}">${icon('eye')} Preview</button>
        </div>
        <span class="forage-cat-fname">${esc(fname)}</span>
        <span class="forage-cat-spacer"></span>
        <button class="forage-cat-btn" data-copy>${icon('copy')}<span>Copy</span></button>
      </div>
      <div class="forage-cat-viewer-body${long ? ' is-clamped' : ''}" data-vbody>${body}</div>
      ${long ? `<div class="forage-cat-expandbar"><button data-toggleclamp>${icon('chevron')} Show full document</button></div>` : ''}
    </div>`;
  }

  function fileListHtml(entry) {
    if (entry.files.length < 2) return '';
    const key = openKey || entry.primary;
    return `<div class="forage-cat-filelist">
      <div class="forage-cat-filelist-h">${entry.files.length} files in this bundle</div>
      ${entry.files.map((f) => `<button class="forage-cat-filerow${f.path === key ? ' is-active' : ''}" data-file="${esc(f.path)}">${icon('file')} <span>${esc(f.path.split('/').slice(-2).join('/'))}</span><span class="forage-cat-fbytes">${fmtBytes(f.bytes)}</span></button>`).join('')}
    </div>`;
  }

  async function renderDrawer() {
    const drawer = contentEl.querySelector('[data-drawer]');
    const scrim = contentEl.querySelector('[data-scrim]');
    const entry = findEntry(openSlug);
    if (!entry) { closeDrawer(); return; }
    const meta = SECTION_META[section];
    const ghBtn = entry.github
      ? `<a class="forage-cat-btn" href="${esc(entry.github)}" target="_blank" rel="noopener">${icon('github')} View on GitHub</a>`
      : `<span class="forage-cat-btn is-disabled" aria-disabled="true" title="Each entry gets its own repo in a later stage">${icon('github')} GitHub · coming soon</span>`;

    drawer.innerHTML = `
      <div class="forage-cat-drawer-banner">
        <button class="forage-cat-drawer-close" data-close aria-label="Close">${icon('x')}</button>
        <span class="forage-cat-type">${meta.type}</span>
        <h2>${esc(entry.title)}</h2>
        <p>${esc(entry.description || '')}</p>
      </div>
      <div class="forage-cat-drawer-scroll">
        <div class="forage-cat-drawer-tags">${(entry.tags || []).map((t) => `<span class="forage-cat-pill">${esc(t)}</span>`).join('')}</div>
        <div class="forage-cat-actions">
          <button class="forage-cat-btn forage-cat-btn--primary" data-download>${icon('download')} Download ${entry.files.length > 1 ? '.zip' : '.md'}</button>
          ${ghBtn}
        </div>
        ${fileListHtml(entry)}
        <div data-viewer-slot><div class="forage-cat-viewer-loading">Loading ${esc((openKey || entry.primary).split('/').pop())}…</div></div>
        <div class="forage-cat-drawer-foot">Updated ${fmtDate(entry.updated)} · ${fmtBytes(entry.totalBytes)} total</div>
      </div>`;
    scrim.hidden = false;
    drawer.hidden = false;
    requestAnimationFrame(() => { scrim.classList.add('show'); drawer.classList.add('show'); });

    const url = openKey || entry.primary;
    try {
      const raw = await fetchDoc(url);
      if (destroyed || openSlug !== entry.slug) return;
      const slot = drawer.querySelector('[data-viewer-slot]');
      if (slot) slot.innerHTML = viewerHtml(entry, raw);
    } catch (err) {
      const slot = drawer.querySelector('[data-viewer-slot]');
      if (slot) slot.innerHTML = `<div class="forage-cat-viewer-loading">Couldn't load — ${esc(err.message)}</div>`;
    }
  }

  function openDrawer(slug) {
    openSlug = slug;
    openKey = null;
    viewMode = 'preview';
    writeHash();
    renderDrawer();
  }
  function closeDrawer() {
    const drawer = contentEl.querySelector('[data-drawer]');
    const scrim = contentEl.querySelector('[data-scrim]');
    if (drawer) { drawer.classList.remove('show'); drawer.hidden = true; drawer.innerHTML = ''; }
    if (scrim) { scrim.classList.remove('show'); scrim.hidden = true; }
    openSlug = null;
    writeHash();
  }

  function refreshGrid() {
    const host = contentEl.querySelector('[data-grid]');
    if (host) host.innerHTML = gridHtml();
    contentEl.querySelectorAll('.forage-cat-chip').forEach((c) => {
      c.setAttribute('aria-pressed', String(activeTags.has(c.dataset.tag)));
    });
  }

  async function doDownload(entry) {
    if (entry.files.length < 2) {
      const raw = await fetchDoc(entry.primary);
      downloadBlob(entry.primary.split('/').pop(), raw, 'text/markdown');
      return;
    }
    const JSZipLib = globalThis.JSZip;
    if (!JSZipLib) return;
    const zip = new JSZipLib();
    for (const { url, name } of zipEntriesFor(entry)) {
      const res = await fetchImpl(url);
      zip.file(name, await res.blob());
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(`${entry.slug}.zip`, blob, 'application/zip');
  }

  /* ---------- events ---------- */

  function onClick(e) {
    const tabBtn = e.target.closest('[data-section]');
    if (tabBtn) {
      section = tabBtn.dataset.section;
      activeTags.clear();
      openSlug = null;
      renderShell();
      writeHash();
      return;
    }
    const chip = e.target.closest('[data-tag]');
    if (chip) {
      const t = chip.dataset.tag;
      activeTags.has(t) ? activeTags.delete(t) : activeTags.add(t);
      refreshGrid();
      return;
    }
    if (e.target.closest('[data-scrim]') || e.target.closest('[data-close]')) { closeDrawer(); return; }

    const entry = findEntry(openSlug);
    if (entry && e.target.closest('[data-drawer]')) {
      const modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) { viewMode = modeBtn.dataset.mode; renderDrawer(); return; }
      const fileBtn = e.target.closest('[data-file]');
      if (fileBtn) {
        const path = fileBtn.dataset.file;
        if (path === entry.primary) openKey = null; else openKey = path;
        renderDrawer();
        return;
      }
      if (e.target.closest('[data-toggleclamp]')) {
        const vb = contentEl.querySelector('[data-vbody]');
        const btn = e.target.closest('[data-toggleclamp]');
        const clamped = vb.classList.toggle('is-clamped');
        btn.innerHTML = icon('chevron') + (clamped ? ' Show full document' : ' Collapse');
        btn.querySelector('svg').style.transform = clamped ? '' : 'rotate(180deg)';
        return;
      }
      if (e.target.closest('[data-copy]')) {
        const btn = e.target.closest('[data-copy]');
        copyToClipboard(docCache.get(openKey || entry.primary) || '', btn);
        return;
      }
      if (e.target.closest('[data-download]')) { doDownload(entry); return; }
      return;
    }

    const card = e.target.closest('.forage-cat-card');
    if (card) openDrawer(card.dataset.slug);
  }

  function onKeydown(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('forage-cat-card')) {
      e.preventDefault();
      openDrawer(e.target.dataset.slug);
    }
  }
  function onDocKeydown(e) {
    if (e.key === 'Escape' && openSlug && contentEl.isConnected) closeDrawer();
  }

  function renderShell() {
    contentEl.innerHTML = shellHtml();
  }

  return {
    async render(sectionKey = 'skills', slug = null) {
      section = SECTION_META[sectionKey] ? sectionKey : 'skills';
      openSlug = null;
      activeTags.clear();
      contentEl.className = 'vault-pane-content vault-pane-content--catalog';
      contentEl.innerHTML = '<div class="forage-cat-loading">Loading catalog…</div>';
      try {
        data = await loadCatalog(fetchImpl);
      } catch (err) {
        contentEl.innerHTML = `<div class="forage-cat-loading">Couldn't load the catalog — ${esc(err.message)}</div>`;
        return;
      }
      if (destroyed) return;
      renderShell();
      if (!clickHandler) {
        clickHandler = onClick;
        keyHandler = onKeydown;
        contentEl.addEventListener('click', clickHandler);
        contentEl.addEventListener('keydown', keyHandler);
        // Escape must work even when focus is on <body> (e.g. after a
        // deep-link auto-opens the drawer) — so it goes on document.
        document.addEventListener('keydown', onDocKeydown);
      }
      if (slug) openDrawer(slug); else writeHash();
    },
    destroy() {
      destroyed = true;
      if (clickHandler) contentEl.removeEventListener('click', clickHandler);
      if (keyHandler) contentEl.removeEventListener('keydown', keyHandler);
      document.removeEventListener('keydown', onDocKeydown);
      clickHandler = keyHandler = null;
    },
  };
}

function copyToClipboard(text, btn) {
  const done = () => {
    if (!btn) return;
    const prev = btn.innerHTML;
    btn.innerHTML = icon('check') + '<span>Copied</span>';
    btn.classList.add('is-done');
    setTimeout(() => { btn.innerHTML = prev; btn.classList.remove('is-done'); }, 1400);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else {
    fallback();
  }
  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    ta.remove();
  }
}
