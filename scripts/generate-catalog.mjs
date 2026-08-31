#!/usr/bin/env node
/**
 * generate-catalog.mjs
 *
 * Walks vault/Research/{Skills,Agents,Commands}/ and writes
 * vault/Research/catalog.json — the metadata index the Research dashboard
 * (assets/js/vault/catalog-view.js) reads to render its card grid.
 *
 * An entry is either a **bundle** (a folder: SKILL.md or the agent's .md
 * plus companion files) or a **lone .md** (a single-file agent). Each may
 * carry a sidecar `forage.json` (in the bundle dir) or `<name>.forage.json`
 * (next to a lone file) with catalog-only metadata — tags, a display
 * title, a GitHub URL, an explicit primary-file name — so the published
 * Skill/Agent files themselves stay pristine and installable as-is.
 *
 * catalog.json holds metadata only, never file bodies: the dashboard
 * fetches a primary .md on demand and zips a bundle client-side.
 *
 * Run manually:  npm run generate-catalog
 * Run in CI:     see .github/workflows/publish.yml (alongside the manifest)
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROOT, VAULT_DIR, deriveDate, prettifyFilename } from './generate-manifest.mjs';

export const RESEARCH_DIR = path.join(VAULT_DIR, 'Research');

export const SECTIONS = [
  { dir: 'Skills', key: 'skills', type: 'skill' },
  { dir: 'Agents', key: 'agents', type: 'agent' },
  { dir: 'Commands', key: 'commands', type: 'command' },
];

/* Files that live in a bundle but are never its primary entry point. */
const NON_PRIMARY_RE = /^(readme|plan|changelog|contributing|license|todo)\b|-template|^example-|\.thresholds\./i;
/* Sidecars + junk that never appear in the published file list. */
const SKIP_FILE_RE = /^(\.gitkeep|\.ds_store|thumbs\.db)$|\.forage\.json$/i;

export function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Minimal YAML-frontmatter reader — just enough for Claude Code
 * skill/agent frontmatter. Handles `key: value`, quoted strings,
 * `[a, b]` / `- item` lists, and block scalars (`key: >` folded,
 * `key: |` literal). Returns {} when there's no frontmatter fence.
 */
export function parseFrontmatter(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---\s*(\r?\n|$)/.exec(text);
  if (!m) return {};
  const lines = m[1].split(/\r?\n/);
  const out = {};
  let lastKey = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*$/.test(line)) continue;

    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && lastKey) {
      if (!Array.isArray(out[lastKey])) out[lastKey] = [];
      out[lastKey].push(unquote(listItem[1]));
      continue;
    }

    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    let rest = kv[2];
    lastKey = key;

    const block = /^([|>])([+-]?)\s*$/.exec(rest);
    if (block) {
      const collected = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (/^\s*$/.test(lines[j])) { collected.push(''); continue; }
        if (/^\s/.test(lines[j])) { collected.push(lines[j]); continue; }
        break;
      }
      i = j - 1;
      const indent = Math.min(
        ...collected.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length),
      );
      const dedented = collected.map((l) => l.slice(indent));
      out[key] = (block[1] === '>'
        ? dedented.join(' ').replace(/\s+/g, ' ')
        : dedented.join('\n')
      ).trim();
      continue;
    }

    if (/^\[.*\]$/.test(rest.trim())) {
      out[key] = rest.trim().slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
      continue;
    }
    out[key] = unquote(rest.trim());
  }
  return out;
}

function unquote(s) {
  const t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function readJsonIfExists(absPath) {
  try {
    return JSON.parse(readFileSync(absPath, 'utf8'));
  } catch {
    return {};
  }
}

/** Repo-relative POSIX path for a file inside vault/. */
function relPath(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

/** Every non-sidecar file in a bundle, recursively. */
export function collectFiles(dirAbs) {
  const out = [];
  const walk = (abs) => {
    for (const name of readdirSync(abs).sort((a, b) => a.localeCompare(b))) {
      if (name === '.git' || name === 'node_modules') continue;
      const p = path.join(abs, name);
      const st = statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      if (name === 'forage.json' || SKIP_FILE_RE.test(name)) continue;
      out.push({ path: relPath(p), ext: path.extname(name).replace('.', '').toLowerCase(), bytes: st.size });
    }
  };
  walk(dirAbs);
  return out;
}

/** Pick the entry-point file of a bundle. dirAbs is absolute; files are {path,…}. */
export function pickPrimary(dirAbs, files, slug, forage) {
  const byBase = (base) => files.find((f) => f.path.split('/').pop().toLowerCase() === base.toLowerCase());
  if (forage.primary) {
    const hit = byBase(forage.primary);
    if (hit) return hit;
  }
  const skill = byBase('SKILL.md');
  if (skill) return skill;
  const named = byBase(`${slug}.md`);
  if (named) return named;
  const mds = files.filter((f) => f.path.toLowerCase().endsWith('.md'));
  const frontMatch = mds.find((f) => {
    let text = '';
    try { text = readFileSync(path.join(ROOT, f.path), 'utf8'); } catch { return false; }
    const fm = parseFrontmatter(text);
    return fm.name && slugify(fm.name) === slug;
  });
  if (frontMatch) return frontMatch;
  const real = mds.find((f) => !NON_PRIMARY_RE.test(f.path.split('/').pop()));
  return real || mds[0] || files[0];
}

function buildEntry({ type, childAbs, isDir }) {
  const name = path.basename(childAbs);
  let slug, files, forage, primary;

  if (isDir) {
    slug = name;
    forage = readJsonIfExists(path.join(childAbs, 'forage.json'));
    files = collectFiles(childAbs);
    if (!files.length) return null;
    primary = pickPrimary(childAbs, files, slug, forage);
  } else {
    slug = name.replace(/\.md$/i, '');
    forage = readJsonIfExists(path.join(path.dirname(childAbs), `${slug}.forage.json`));
    const st = statSync(childAbs);
    files = [{ path: relPath(childAbs), ext: 'md', bytes: st.size }];
    primary = files[0];
  }

  const primaryAbs = path.join(ROOT, primary.path);
  const fm = parseFrontmatter(readFileSync(primaryAbs, 'utf8'));
  const title = forage.title || (fm.name && prettifyFilename(fm.name)) || prettifyFilename(slug);
  const description = (forage.description || fm.description || '').trim();
  const tags = Array.isArray(forage.tags) ? forage.tags.map(String) : [];

  return {
    type,
    slug,
    title,
    description,
    tags,
    github: forage.github ?? null,
    featured: Boolean(forage.featured),
    primary: primary.path,
    files,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    updated: latestDate(files),
  };
}

function latestDate(files) {
  const dates = files.map((f) => deriveDate(path.join(ROOT, f.path))).filter(Boolean).sort();
  return dates[dates.length - 1] || new Date().toISOString().slice(0, 10);
}

export function buildSection(sectionDirAbs, { type }) {
  let names;
  try {
    names = readdirSync(sectionDirAbs).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
  const entries = [];
  for (const name of names) {
    if (name.startsWith('.') || name === 'forage.json' || name.endsWith('.forage.json')) continue;
    const childAbs = path.join(sectionDirAbs, name);
    const st = statSync(childAbs);
    if (st.isDirectory()) {
      const e = buildEntry({ type, childAbs, isDir: true });
      if (e) entries.push(e);
    } else if (/\.md$/i.test(name)) {
      entries.push(buildEntry({ type, childAbs, isDir: false }));
    }
  }
  entries.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
  return entries;
}

export function generateCatalog(researchDir = RESEARCH_DIR) {
  const sections = {};
  for (const s of SECTIONS) {
    sections[s.key] = buildSection(path.join(researchDir, s.dir), s);
  }
  // No generatedAt — keeping the output deterministic means CI only
  // commits catalog.json back when an entry actually changed, same as
  // vault/manifest.json.
  return { sections };
}

function main() {
  const catalog = generateCatalog();
  const outPath = path.join(RESEARCH_DIR, 'catalog.json');
  writeFileSync(outPath, JSON.stringify(catalog, null, 2) + '\n');
  const counts = Object.entries(catalog.sections).map(([k, v]) => `${v.length} ${k}`).join(', ');
  console.log(`Wrote ${path.relative(ROOT, outPath)} (${counts})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
