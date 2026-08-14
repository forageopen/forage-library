import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import { blocksFromTokens, blocksFromElement } from './document-model.js';

// --- blocksFromTokens (real marked.lexer output) ---

test('converts a heading and paragraph into IR blocks', () => {
  const tokens = marked.lexer('# Title\n\nSome **bold** text.');
  const blocks = blocksFromTokens(tokens);
  assert.deepEqual(blocks[0], { kind: 'heading', level: 1, runs: [{ text: 'Title' }] });
  assert.equal(blocks[1].kind, 'paragraph');
  assert.deepEqual(blocks[1].runs, [{ text: 'Some ' }, { bold: true, text: 'bold' }, { text: ' text.' }]);
});

test('converts an unordered list, including nested lists', () => {
  const tokens = marked.lexer('- One\n- Two\n  - Nested\n- Three');
  const blocks = blocksFromTokens(tokens);
  assert.equal(blocks[0].kind, 'list');
  assert.equal(blocks[0].ordered, false);
  assert.equal(blocks[0].items.length, 3);
  assert.deepEqual(blocks[0].items[0].runs, [{ text: 'One' }]);
  assert.equal(blocks[0].items[1].children[0].kind, 'list');
  assert.deepEqual(blocks[0].items[1].children[0].items[0].runs, [{ text: 'Nested' }]);
});

test('converts a fenced code block, preserving the language', () => {
  const tokens = marked.lexer('```js\nconst x = 1;\n```');
  const blocks = blocksFromTokens(tokens);
  assert.deepEqual(blocks[0], { kind: 'codeBlock', lang: 'js', text: 'const x = 1;' });
});

test('converts a table with alignment', () => {
  const tokens = marked.lexer('| A | B |\n|:--|--:|\n| 1 | 2 |');
  const blocks = blocksFromTokens(tokens);
  assert.equal(blocks[0].kind, 'table');
  assert.deepEqual(blocks[0].align, ['left', 'right']);
  assert.deepEqual(blocks[0].header[0].runs, [{ text: 'A' }]);
  assert.deepEqual(blocks[0].rows[0][0].runs, [{ text: '1' }]);
});

test('converts a blockquote and a thematic break', () => {
  const tokens = marked.lexer('> quoted\n\n---');
  const blocks = blocksFromTokens(tokens);
  assert.equal(blocks[0].kind, 'blockquote');
  assert.equal(blocks[0].blocks[0].kind, 'paragraph');
  assert.equal(blocks[1].kind, 'thematicBreak');
});

test('converts a link into a run with href', () => {
  const tokens = marked.lexer('[text](https://example.com)');
  const blocks = blocksFromTokens(tokens);
  assert.deepEqual(blocks[0].runs, [{ href: 'https://example.com', text: 'text' }]);
});

// --- blocksFromElement (real jsdom DOM) ---

function elementFromHtml(html) {
  const dom = new JSDOM(`<div id="root">${html}</div>`);
  return dom.window.document.getElementById('root');
}

test('walks headings and paragraphs from rendered content', () => {
  const el = elementFromHtml('<h2>Section</h2><p>Body text.</p>');
  const blocks = blocksFromElement(el);
  assert.deepEqual(blocks[0], { kind: 'heading', level: 2, runs: [{ text: 'Section' }] });
  assert.deepEqual(blocks[1], { kind: 'paragraph', runs: [{ text: 'Body text.' }] });
});

test('walks bold/italic/code inline formatting', () => {
  const el = elementFromHtml('<p><strong>bold</strong> and <em>italic</em> and <code>code</code></p>');
  const blocks = blocksFromElement(el);
  assert.deepEqual(blocks[0].runs, [
    { bold: true, text: 'bold' },
    { text: ' and ' },
    { italics: true, text: 'italic' },
    { text: ' and ' },
    { code: true, text: 'code' },
  ]);
});

test('walks a table into header/rows/align', () => {
  const el = elementFromHtml('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>');
  const blocks = blocksFromElement(el);
  assert.equal(blocks[0].kind, 'table');
  assert.deepEqual(blocks[0].header[0].runs, [{ text: 'A' }]);
  assert.deepEqual(blocks[0].rows[0][1].runs, [{ text: '2' }]);
});

test('walks a nested list', () => {
  const el = elementFromHtml('<ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>');
  const blocks = blocksFromElement(el);
  assert.equal(blocks[0].kind, 'list');
  assert.equal(blocks[0].items.length, 2);
  assert.equal(blocks[0].items[1].children[0].kind, 'list');
  assert.deepEqual(blocks[0].items[1].children[0].items[0].runs, [{ text: 'Nested' }]);
});

test('walks a code block, preserving a language- class', () => {
  const el = elementFromHtml('<pre><code class="language-python">x = 1</code></pre>');
  const blocks = blocksFromElement(el);
  assert.deepEqual(blocks[0], { kind: 'codeBlock', lang: 'python', text: 'x = 1' });
});
