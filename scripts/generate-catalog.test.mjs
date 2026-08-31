import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parseFrontmatter,
  slugify,
  pickPrimary,
  collectFiles,
  buildSection,
  generateCatalog,
} from './generate-catalog.mjs';

function tmp() {
  return mkdtempSync(path.join(tmpdir(), 'catalog-test-'));
}

test('slugify kebab-cases a title', () => {
  assert.equal(slugify('  Anti-DMA SKILL '), 'anti-dma-skill');
  assert.equal(slugify('OB/GYN Custodian'), 'ob-gyn-custodian');
});

test('parseFrontmatter reads plain key: value', () => {
  const fm = parseFrontmatter('---\nname: foo\ndescription: A short thing.\n---\n# Body\n');
  assert.equal(fm.name, 'foo');
  assert.equal(fm.description, 'A short thing.');
});

test('parseFrontmatter joins a folded (>) block scalar into one line', () => {
  const text = [
    '---',
    'name: bar',
    'description: >',
    '  Deploy this whenever the user',
    '  wants something done.',
    '  Trigger on "do it".',
    'model: sonnet',
    '---',
    'body',
  ].join('\n');
  const fm = parseFrontmatter(text);
  assert.equal(fm.description, 'Deploy this whenever the user wants something done. Trigger on "do it".');
  assert.equal(fm.model, 'sonnet');
});

test('parseFrontmatter keeps newlines for a literal (|) block scalar', () => {
  const fm = parseFrontmatter('---\ndescription: |\n  line one\n  line two\n---\n');
  assert.equal(fm.description, 'line one\nline two');
});

test('parseFrontmatter parses inline and dash lists', () => {
  const a = parseFrontmatter('---\ntags: [x, "y", z]\n---\n');
  assert.deepEqual(a.tags, ['x', 'y', 'z']);
  const b = parseFrontmatter('---\ntags:\n  - one\n  - two\n---\n');
  assert.deepEqual(b.tags, ['one', 'two']);
});

test('parseFrontmatter returns {} with no frontmatter fence', () => {
  assert.deepEqual(parseFrontmatter('# Just a heading\n'), {});
});

test('pickPrimary: forage.primary wins, then SKILL.md, then <slug>.md, then non-doc .md', () => {
  const dir = tmp();
  const files = [
    { path: 'x/PLAN.md' }, { path: 'x/README.md' }, { path: 'x/thing.md' }, { path: 'x/SKILL.md' },
  ];
  assert.equal(pickPrimary(dir, files, 'thing', { primary: 'thing.md' }).path, 'x/thing.md');
  assert.equal(pickPrimary(dir, files, 'thing', {}).path, 'x/SKILL.md');
  assert.equal(pickPrimary(dir, files.filter((f) => !f.path.endsWith('SKILL.md')), 'thing', {}).path, 'x/thing.md');
  assert.equal(
    pickPrimary(dir, [{ path: 'x/PLAN.md' }, { path: 'x/README.md' }, { path: 'x/agent-def.md' }], 'nomatch', {}).path,
    'x/agent-def.md',
  );
  rmSync(dir, { recursive: true, force: true });
});

test('collectFiles walks recursively and drops sidecars/junk', () => {
  const dir = tmp();
  mkdirSync(path.join(dir, 'references'));
  writeFileSync(path.join(dir, 'SKILL.md'), 'x');
  writeFileSync(path.join(dir, 'forage.json'), '{}');
  writeFileSync(path.join(dir, '.gitkeep'), '');
  writeFileSync(path.join(dir, 'references', 'notes.md'), 'y');
  const files = collectFiles(dir);
  const names = files.map((f) => f.path.split('/').pop()).sort();
  assert.deepEqual(names, ['SKILL.md', 'notes.md']);
  rmSync(dir, { recursive: true, force: true });
});

test('buildSection: bundle vs lone .md, forage.json merge, sorting', () => {
  const root = tmp();
  const sec = path.join(root, 'Agents');
  mkdirSync(sec, { recursive: true });

  mkdirSync(path.join(sec, 'code-cleaner'));
  writeFileSync(path.join(sec, 'code-cleaner', 'code-cleaner.md'), '---\nname: code-cleaner\ndescription: Audits code.\n---\n');
  writeFileSync(path.join(sec, 'code-cleaner', 'README.md'), 'readme');
  writeFileSync(path.join(sec, 'code-cleaner', 'forage.json'), JSON.stringify({ title: 'Code Cleaner', tags: ['audit'], primary: 'code-cleaner.md' }));

  writeFileSync(path.join(sec, 'obgyn-custodian.md'), '---\nname: obgyn-custodian\ndescription: Reviews clinical relevance.\n---\n');
  writeFileSync(path.join(sec, 'obgyn-custodian.forage.json'), JSON.stringify({ title: 'OB/GYN Custodian', tags: ['review'], github: null }));

  const entries = buildSection(sec, { type: 'agent' });
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((e) => e.slug), ['code-cleaner', 'obgyn-custodian']); // title-sorted

  const cc = entries[0];
  assert.equal(cc.title, 'Code Cleaner');
  assert.equal(cc.description, 'Audits code.');
  assert.deepEqual(cc.tags, ['audit']);
  assert.equal(cc.files.length, 2);
  assert.ok(cc.primary.endsWith('code-cleaner/code-cleaner.md'));

  const ob = entries[1];
  assert.equal(ob.files.length, 1);
  assert.equal(ob.github, null);
  rmSync(root, { recursive: true, force: true });
});

test('buildSection returns [] for a missing section dir', () => {
  assert.deepEqual(buildSection(path.join(tmp(), 'nope'), { type: 'command' }), []);
});

test('generateCatalog produces all three section keys', () => {
  const root = tmp();
  for (const d of ['Skills', 'Agents', 'Commands']) mkdirSync(path.join(root, d), { recursive: true });
  mkdirSync(path.join(root, 'Skills', 's1'));
  writeFileSync(path.join(root, 'Skills', 's1', 'SKILL.md'), '---\nname: s1\ndescription: One.\n---\n');
  const catalog = generateCatalog(root);
  assert.deepEqual(Object.keys(catalog.sections).sort(), ['agents', 'commands', 'skills']);
  assert.equal(catalog.sections.skills.length, 1);
  assert.equal(catalog.sections.commands.length, 0);
  assert.equal(catalog.sections.skills[0].slug, 's1');
  rmSync(root, { recursive: true, force: true });
});
