#!/usr/bin/env node
/**
 * generate-manifest.mjs
 *
 * Walks vault/ and writes vault/manifest.json — a tree describing every
 * folder and file so the sidebar can render navigation without server-side
 * directory listing (GitHub Pages is static hosting).
 *
 * Run manually:  npm run generate-manifest
 * Run in CI:     see .github/workflows/publish.yml
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const VAULT_DIR = path.join(ROOT, 'vault');

/* Kept in sync with SUPPORTED_EXTENSIONS in assets/js/vault/renderers.js —
   anything the viewer can render should also be indexable from the vault
   sidebar. .pdf/.xlsx/.csv were previously missing here (viewable if
   opened locally, but invisible in the sidebar for anything committed to
   vault/); .jpg/.jpeg/.png are new. .html/.htm are also new. */
const FILE_TYPES = {
  '.md': 'md', '.docx': 'docx', '.pptx': 'pptx', '.txt': 'txt',
  '.pdf': 'pdf', '.xlsx': 'xlsx', '.csv': 'csv',
  '.jpg': 'jpg', '.jpeg': 'jpeg', '.png': 'png',
  '.html': 'html', '.htm': 'htm',
};

export function prettifyFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, '');
  return base
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function deriveTitle(absPath, fileType, filename) {
  if (fileType === 'md') {
    const content = readFileSync(absPath, 'utf8');
    const match = /^#\s+(.+)$/m.exec(content);
    if (match) return match[1].trim();
  }
  if (fileType === 'html' || fileType === 'htm') {
    const content = readFileSync(absPath, 'utf8');
    const match = /<title[^>]*>([^<]+)<\/title>/i.exec(content);
    if (match) return match[1].trim();
  }
  return prettifyFilename(filename);
}

export function deriveDate(absPath) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', absPath], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch (err) {
    /* not a git repo, file untracked, or git unavailable — fall back below */
  }
  const mtime = statSync(absPath).mtime;
  return mtime.toISOString().slice(0, 10);
}

/* The three Research/ subfolders that render as a card dashboard instead
   of a normal file tree. The sidebar shows a single clickable row per
   section (with the given Lucide icon) — never the individual entries —
   and catalog.json (scripts/generate-catalog.mjs) drives the dashboard. */
const CATALOG_SECTIONS = {
  'Research/Skills': { catalogType: 'skills', icon: 'sparkles' },
  'Research/Agents': { catalogType: 'agents', icon: 'bot' },
  'Research/Commands': { catalogType: 'commands', icon: 'terminal' },
};

export function buildTree(absDir, relDir) {
  const entries = readdirSync(absDir).sort((a, b) => a.localeCompare(b));
  const children = [];
  for (const name of entries) {
    if (relDir === '' && name === 'manifest.json') continue;
    const absPath = path.join(absDir, name);
    const relPath = relDir ? `${relDir}/${name}` : name;
    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      const catalog = CATALOG_SECTIONS[relPath];
      if (catalog) {
        children.push({ name, type: 'catalog', catalogType: catalog.catalogType, icon: catalog.icon, path: `vault/${relPath}` });
        continue;
      }
      children.push({ name, type: 'folder', path: `vault/${relPath}`, children: buildTree(absPath, relPath) });
    } else {
      const ext = path.extname(name).toLowerCase();
      const fileType = FILE_TYPES[ext];
      if (!fileType) continue;
      children.push({
        name,
        type: 'file',
        path: `vault/${relPath}`,
        fileType,
        title: deriveTitle(absPath, fileType, name),
        date: deriveDate(absPath),
      });
    }
  }
  return children;
}

export function generateManifest() {
  return { name: 'vault', type: 'folder', path: 'vault', children: buildTree(VAULT_DIR, '') };
}

function main() {
  const tree = generateManifest();
  const outPath = path.join(VAULT_DIR, 'manifest.json');
  writeFileSync(outPath, JSON.stringify(tree, null, 2) + '\n');
  console.log('Wrote', path.relative(ROOT, outPath));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
