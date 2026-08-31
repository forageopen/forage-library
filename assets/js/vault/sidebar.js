const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Lucide icon path data (lucide.dev, ISC) — same 24x24 stroked convention as
   the inline SVGs in index.html, so the sidebar reads as one icon set with
   the ribbon. */
const ICON_PATHS = {
  chevron: ['m9 18 6-6-6-6'],
  folder: ['M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'],
  folderOpen: ['m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2'],
  /* Catalog-section glyphs (Skills / Agents / Commands) — keyed to the
     manifest node's `icon` field (set by scripts/generate-manifest.mjs). */
  sparkles: [
    'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z',
    'M20 3v4', 'M22 5h-4', 'M4 17v2', 'M5 18H3',
  ],
  bot: ['M12 8V4H8', 'M4 8h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z', 'M2 14h2', 'M20 14h2', 'M15 13v2', 'M9 13v2'],
  terminal: ['m7 11 2-2-2-2', 'M11 13h4', 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeIcon(name, className) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  for (const d of ICON_PATHS[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

/* Pure: 'yyyy-mm-dd' (the manifest's `date` field) -> 'Mon D, YYYY'. Ported
   from ribbon.js's article-date formatter so both surfaces read the same
   way. Falls back to the raw string for anything non-ISO rather than
   throwing, since a malformed manifest shouldn't break the whole tree. */
export function formatDate(raw) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return raw;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return `${MONTHS[month]} ${day}, ${year}`;
}

/* Pure: a folder node with nothing to show. These render greyed-out and
   inert — no chevron, no toggle — so they're visibly distinct from a
   collapsed folder that does have contents. */
export function isEmptyFolder(node) {
  return node.type === 'folder' && (!node.children || node.children.length === 0);
}

/* Paths that should sit at the top of their sibling list, in this order,
   ahead of the manifest's alphabetical ordering. Applied at every level. */
export const PINNED_PATHS = [
  'vault/00-welcome-note.md',
  'vault/About Us/What is Forage Library.md',
  // The Research catalog sections, in a deliberate order (manifest order is
  // alphabetical: Agents, Commands, Skills).
  'vault/Research/Skills',
  'vault/Research/Agents',
  'vault/Research/Commands',
];

/* Pure: reorder a folder's (or the root's) children so pinned entries come
   first in PINNED_PATHS order; everything else keeps its manifest order
   (Array.sort is stable). */
export function orderSiblings(children) {
  const rank = (c) => {
    const i = PINNED_PATHS.indexOf(c.path);
    return i === -1 ? PINNED_PATHS.length : i;
  };
  return [...children].sort((a, b) => rank(a) - rank(b));
}

/* Optional per-folder glyph, keyed by the folder's manifest name (its
   on-disk directory name). When set it replaces the generic Lucide folder
   icon. Folders whose directory name already carries an emoji prefix
   ("📊 Slides", "📝 Articles") get their glyph that way instead. */
const FOLDER_ICONS = {
  'About Us': '🏛️',
  'Case Studies': '🔍',
  Frameworks: '🧩',
  Guides: '🧭',
  Research: '🔬',
};

function fillFolderIcon(container, node, withOpenState) {
  const emoji = FOLDER_ICONS[node.name];
  if (emoji) {
    const span = document.createElement('span');
    span.className = 'vault-tree-folder-emoji';
    span.textContent = emoji;
    span.setAttribute('aria-hidden', 'true');
    container.appendChild(span);
    return;
  }
  container.appendChild(makeIcon('folder', withOpenState ? 'vault-tree-folder-icon-closed' : undefined));
  if (withOpenState) container.appendChild(makeIcon('folderOpen', 'vault-tree-folder-icon-open'));
}

function renderFolder(node) {
  const li = document.createElement('li');
  li.className = 'vault-tree-folder';

  const name = document.createElement('span');
  name.className = 'vault-tree-folder-name';
  name.textContent = node.name;

  const folderIcon = document.createElement('span');
  folderIcon.className = 'vault-tree-folder-icon';

  if (isEmptyFolder(node)) {
    li.classList.add('vault-tree-folder--empty');
    const label = document.createElement('div');
    label.className = 'vault-tree-folder-label';
    fillFolderIcon(folderIcon, node, false);
    label.append(folderIcon, name);
    li.appendChild(label);
    return li;
  }

  li.classList.add('vault-tree-folder--collapsed');
  const label = document.createElement('button');
  label.type = 'button';
  label.className = 'vault-tree-folder-label';
  label.setAttribute('aria-expanded', 'false');

  fillFolderIcon(folderIcon, node, true);
  label.append(makeIcon('chevron', 'vault-tree-chevron'), folderIcon, name);
  li.appendChild(label);

  const ul = document.createElement('ul');
  ul.className = 'vault-tree-children';
  orderSiblings(node.children).forEach((child) => ul.appendChild(renderNode(child)));
  li.appendChild(ul);

  label.addEventListener('click', () => {
    const collapsed = li.classList.toggle('vault-tree-folder--collapsed');
    label.setAttribute('aria-expanded', String(!collapsed));
  });
  return li;
}

/* A `type: "catalog"` node (Research/Skills | Agents | Commands): one
   clickable row with a Lucide glyph that opens the card dashboard in the
   active pane. The individual entries never appear in the tree — they
   live in the dashboard — so this is a leaf, not a collapsible folder. */
function renderCatalogNode(node) {
  const li = document.createElement('li');
  li.className = 'vault-tree-file';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vault-tree-catalog-btn';
  button.dataset.catalogType = node.catalogType;
  button.dataset.path = node.path;
  button.append(makeIcon(node.icon || 'sparkles'), document.createTextNode(node.name));
  li.appendChild(button);
  return li;
}

function renderNode(node) {
  if (node.type === 'folder') return renderFolder(node);
  if (node.type === 'catalog') return renderCatalogNode(node);

  const li = document.createElement('li');
  li.className = 'vault-tree-file';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vault-tree-file-btn';
  button.textContent = node.title;
  button.dataset.path = node.path;
  button.dataset.name = node.name;
  if (node.date) button.title = `Published ${formatDate(node.date)}`;
  li.appendChild(button);
  return li;
}

export async function initSidebar(root, onOpen, onOpenCatalog = () => {}, fetchImpl = fetch) {
  root.innerHTML = '<div class="vault-status vault-status--loading">Loading vault…</div>';
  let manifest;
  try {
    const res = await fetchImpl('vault/manifest.json');
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    manifest = await res.json();
  } catch (err) {
    root.innerHTML = `<div class="vault-status vault-status--error">Couldn't load vault index: ${err.message}</div>`;
    return null;
  }

  const ul = document.createElement('ul');
  ul.className = 'vault-tree';
  orderSiblings(manifest.children || []).forEach((child) => ul.appendChild(renderNode(child)));
  root.innerHTML = '';
  root.appendChild(ul);

  root.addEventListener('click', (e) => {
    const catalogBtn = e.target.closest('.vault-tree-catalog-btn');
    if (catalogBtn) {
      onOpenCatalog(catalogBtn.dataset.catalogType, catalogBtn.dataset.path);
      return;
    }
    const btn = e.target.closest('.vault-tree-file-btn');
    if (btn) onOpen(btn.dataset.path, btn.dataset.name);
  });

  return {
    /* Mark `path` as the open doc/catalog: one persistent highlight in the
       tree, plus un-collapse its ancestor folders so it's actually
       visible. In split view this tracks the most recently opened one. */
    setActive(path) {
      let target = null;
      root.querySelectorAll('.vault-tree-file-btn, .vault-tree-catalog-btn').forEach((btn) => {
        if (btn.dataset.path === path) {
          btn.setAttribute('aria-current', 'page');
          target = btn;
        } else {
          btn.removeAttribute('aria-current');
        }
      });
      if (!target) return;
      let folder = target.closest('.vault-tree-folder');
      while (folder) {
        folder.classList.remove('vault-tree-folder--collapsed');
        const label = folder.querySelector(':scope > .vault-tree-folder-label');
        if (label && label.tagName === 'BUTTON') label.setAttribute('aria-expanded', 'true');
        folder = folder.parentElement && folder.parentElement.closest('.vault-tree-folder');
      }
    },
  };
}
