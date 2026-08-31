import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  createCatalogView,
  _resetCatalogCache,
  stripFrontmatter,
  zipEntriesFor,
  fmtBytes,
  fmtDate,
  allTags,
} from './catalog-view.js';

/* ---------- pure helpers ---------- */

test('stripFrontmatter removes a leading --- fence, keeps the body', () => {
  const src = '---\nname: x\ndescription: >\n  multi\n  line\n---\n# Heading\n\nBody.\n';
  assert.equal(stripFrontmatter(src), '# Heading\n\nBody.\n');
});

test('stripFrontmatter is a no-op when there is no fence', () => {
  assert.equal(stripFrontmatter('# Just a heading\n'), '# Just a heading\n');
});

test('zipEntriesFor rebases every file under <slug>/', () => {
  const entry = {
    slug: 'code-cleaner',
    files: [
      { path: 'vault/Research/Agents/code-cleaner/code-cleaner.md' },
      { path: 'vault/Research/Agents/code-cleaner/refs/notes.md' },
    ],
  };
  assert.deepEqual(zipEntriesFor(entry), [
    { url: 'vault/Research/Agents/code-cleaner/code-cleaner.md', name: 'code-cleaner/code-cleaner.md' },
    { url: 'vault/Research/Agents/code-cleaner/refs/notes.md', name: 'code-cleaner/refs/notes.md' },
  ]);
});

test('fmtBytes / fmtDate', () => {
  assert.equal(fmtBytes(512), '512 B');
  assert.equal(fmtBytes(2048), '2.0 KB');
  assert.equal(fmtDate('2026-08-31'), 'Aug 31, 2026');
  assert.equal(fmtDate(''), '');
});

test('allTags is the sorted union across entries', () => {
  assert.deepEqual(allTags([{ tags: ['b', 'a'] }, { tags: ['a', 'c'] }, {}]), ['a', 'b', 'c']);
});

/* ---------- DOM render ---------- */

const FIXTURE = {
  generatedAt: '2026-08-31T00:00:00Z',
  sections: {
    skills: [
      { type: 'skill', slug: 'anti-dma', title: 'Anti-DMA', description: 'Detect rhetoric.', tags: ['rhetoric', 'debate'], github: null, primary: 'vault/Research/Skills/anti-dma/SKILL.md', files: [{ path: 'vault/Research/Skills/anti-dma/SKILL.md', ext: 'md', bytes: 100 }], totalBytes: 100, updated: '2026-08-01' },
      { type: 'skill', slug: 'work-style', title: 'Work Style', description: 'Be the builder.', tags: ['workflow'], github: null, primary: 'vault/Research/Skills/work-style/SKILL.md', files: [{ path: 'vault/Research/Skills/work-style/SKILL.md', ext: 'md', bytes: 80 }], totalBytes: 80, updated: '2026-08-02' },
    ],
    agents: [],
    commands: [],
  },
};

function setupDom() {
  const dom = new JSDOM('<!doctype html><body><div id="pane"></div></body>', { url: 'http://localhost/' });
  const { window } = dom;
  for (const k of ['window', 'document', 'history', 'location']) {
    Object.defineProperty(global, k, { value: window[k], configurable: true, writable: true });
  }
  global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  return window.document.getElementById('pane');
}

function fakeFetch(map) {
  return (url) => Promise.resolve({
    ok: url in map,
    status: url in map ? 200 : 404,
    statusText: url in map ? 'OK' : 'Not Found',
    json: () => Promise.resolve(map[url]),
    text: () => Promise.resolve(map[url]),
  });
}

test('render() builds the tab strip, tag chips and card grid for a section', async () => {
  _resetCatalogCache();
  const pane = setupDom();
  const view = createCatalogView(pane, { fetchImpl: fakeFetch({ 'vault/Research/catalog.json': FIXTURE }) });
  await view.render('skills');

  assert.equal(pane.className, 'vault-pane-content vault-pane-content--catalog');
  const tabs = pane.querySelectorAll('.forage-cat-tab');
  assert.equal(tabs.length, 3);
  assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
  assert.match(tabs[0].textContent, /Skills · 2/);

  assert.deepEqual([...pane.querySelectorAll('.forage-cat-chip')].map((c) => c.dataset.tag), ['debate', 'rhetoric', 'workflow']);
  assert.equal(pane.querySelectorAll('.forage-cat-card').length, 2);
  view.destroy();
});

test('tag filter narrows the grid; toggling it off restores', async () => {
  _resetCatalogCache();
  const pane = setupDom();
  const view = createCatalogView(pane, { fetchImpl: fakeFetch({ 'vault/Research/catalog.json': FIXTURE }) });
  await view.render('skills');

  pane.querySelector('.forage-cat-chip[data-tag="workflow"]').click();
  assert.deepEqual([...pane.querySelectorAll('.forage-cat-card')].map((c) => c.dataset.slug), ['work-style']);
  pane.querySelector('.forage-cat-chip[data-tag="workflow"]').click();
  assert.equal(pane.querySelectorAll('.forage-cat-card').length, 2);
  view.destroy();
});

test('empty section renders a "coming soon" state, not a grid', async () => {
  _resetCatalogCache();
  const pane = setupDom();
  const view = createCatalogView(pane, { fetchImpl: fakeFetch({ 'vault/Research/catalog.json': FIXTURE }) });
  await view.render('commands');
  assert.equal(pane.querySelector('.forage-catalog-grid'), null);
  assert.match(pane.querySelector('.forage-cat-empty').textContent, /coming soon/i);
  view.destroy();
});

test('clicking a card opens the drawer; scrim click closes it', async () => {
  _resetCatalogCache();
  const pane = setupDom();
  const md = '---\nname: anti-dma\n---\n# Anti-DMA\n\nBody text here.\n';
  const view = createCatalogView(pane, {
    fetchImpl: fakeFetch({ 'vault/Research/catalog.json': FIXTURE, 'vault/Research/Skills/anti-dma/SKILL.md': md }),
  });
  await view.render('skills');

  pane.querySelector('.forage-cat-card[data-slug="anti-dma"]').click();
  const drawer = pane.querySelector('[data-drawer]');
  assert.equal(drawer.hidden, false);
  assert.match(drawer.querySelector('h2').textContent, /Anti-DMA/);
  assert.match(location.hash, /#catalog=skills\/anti-dma/);

  await new Promise((r) => setTimeout(r, 5)); // let the doc fetch resolve
  assert.ok(pane.querySelector('.forage-cat-viewer'));
  assert.ok(pane.querySelector('.forage-cat-btn.is-disabled')); // GitHub coming soon

  pane.querySelector('[data-scrim]').click();
  assert.equal(drawer.hidden, true);
  view.destroy();
});

test('destroy() removes the delegated listeners', async () => {
  _resetCatalogCache();
  const pane = setupDom();
  const view = createCatalogView(pane, { fetchImpl: fakeFetch({ 'vault/Research/catalog.json': FIXTURE }) });
  await view.render('skills');
  view.destroy();
  pane.querySelector('.forage-cat-card').click(); // must not throw / open a drawer
  assert.equal(pane.querySelector('[data-drawer]').hidden, true);
});
