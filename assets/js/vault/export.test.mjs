import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withExtension, buildStandaloneHtml } from './export.js';

test('withExtension replaces an existing extension', () => {
  assert.equal(withExtension('Report.md', 'html'), 'Report.html');
});

test('withExtension adds an extension when there is none', () => {
  assert.equal(withExtension('Report', 'html'), 'Report.html');
});

test('withExtension falls back to a default base name for an empty title', () => {
  assert.equal(withExtension('', 'html'), 'vault-export.html');
});

test('buildStandaloneHtml embeds the title, theme, and body content', () => {
  const html = buildStandaloneHtml('My Title', '<h1>Hi</h1>', 'cherry');
  assert.match(html, /<title>My Title<\/title>/);
  assert.match(html, /data-theme="cherry"/);
  assert.match(html, /<h1>Hi<\/h1>/);
});

test('buildStandaloneHtml escapes the title but not the body', () => {
  const html = buildStandaloneHtml('<script>x</script>', '<p>safe already</p>', 'sakura');
  assert.match(html, /<title>&lt;script&gt;x&lt;\/script&gt;<\/title>/);
  assert.match(html, /<p>safe already<\/p>/);
});

test('buildStandaloneHtml falls back to the sakura palette for an unknown theme', () => {
  const html = buildStandaloneHtml('T', '<p>x</p>', 'not-a-real-theme');
  assert.match(html, /background: #fff0f5/);
});
