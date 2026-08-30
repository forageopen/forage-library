/**
 * document-model.js
 *
 * The shared document Intermediate Representation (IR) for the vault's
 * structural exporters (.docx, .json) — ported from Noted's
 * src/document-model.ts. Both exporters need "what is this document
 * actually made of" (headings/paragraphs/lists/tables/code blocks), not
 * "what does it look like rendered" (that's what .html/.pdf export use
 * the live DOM/print pipeline for instead — see export.js).
 *
 * Two ways to reach the IR, matching what the vault viewer actually has
 * for each file type (vault-viewer has no Edit tab, unlike Noted, so only
 * the "freshly loaded" half of Noted's original two paths applies):
 *  - .md/.txt: build the IR from `marked.lexer()`'s token tree
 *    (`blocksFromTokens`) — marked has already done the actual parsing
 *    (tables, code fences with language, nested lists, link hrefs), so
 *    this module walks its token tree faithfully rather than
 *    re-deriving structure with its own heuristics.
 *  - .docx: walk the already-rendered, sanitized content DOM instead
 *    (`blocksFromElement`) — mammoth's HTML output is what's on screen,
 *    so that's the IR source rather than re-fetching/re-parsing the
 *    original .docx bytes.
 *
 * Both paths converge on the same IR (Block[] / InlineRun[]). Exactly
 * one place maps this IR onto docx.js constructs (export-docx.js) and
 * one place serializes it to JSON (export.js's blocksToJson) — so
 * "heading / paragraph / bold / italic / list / table / code / quote"
 * semantics are defined exactly once, regardless of which path produced
 * the IR or which exporter consumes it.
 *
 * IR shape (documented in lieu of TypeScript's types, since this file is
 * plain JS to match the rest of assets/js/vault/ — no build step):
 *   InlineRun   = { text, bold?, italics?, underline?, strike?, code?,
 *                   highlight?, href? }
 *   TableCell   = { runs: InlineRun[] }
 *   ListItem    = { runs: InlineRun[], children: Block[] }
 *   Block       = { kind: 'heading', level: 1-6, runs }
 *               | { kind: 'paragraph', runs }
 *               | { kind: 'blockquote', blocks: Block[] }
 *               | { kind: 'codeBlock', lang?, text }
 *               | { kind: 'list', ordered, items: ListItem[] }
 *               | { kind: 'table', header: TableCell[], rows: TableCell[][], align }
 *               | { kind: 'thematicBreak' }
 */

// ---------------------------------------------------------------------
// Path 1: Markdown token tree (marked.lexer output) -> Block[]
// ---------------------------------------------------------------------

/** Pure: convert marked's token tree into the shared IR. */
export function blocksFromTokens(tokens) {
  const blocks = [];
  for (const token of tokens) {
    appendTokenBlocks(token, blocks);
  }
  return blocks;
}

function appendTokenBlocks(token, blocks) {
  switch (token.type) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, token.depth));
      blocks.push({ kind: 'heading', level, runs: inlineTokensToRuns(token.tokens ?? []) });
      break;
    }
    case 'paragraph': {
      blocks.push({ kind: 'paragraph', runs: inlineTokensToRuns(token.tokens ?? []) });
      break;
    }
    case 'list': {
      blocks.push(listTokenToBlock(token));
      break;
    }
    case 'blockquote': {
      blocks.push({ kind: 'blockquote', blocks: blocksFromTokens(token.tokens ?? []) });
      break;
    }
    case 'code': {
      blocks.push({ kind: 'codeBlock', lang: token.lang || undefined, text: token.text });
      break;
    }
    case 'table': {
      blocks.push({
        kind: 'table',
        header: token.header.map((cell) => ({ runs: inlineTokensToRuns(cell.tokens ?? []) })),
        rows: token.rows.map((row) => row.map((cell) => ({ runs: inlineTokensToRuns(cell.tokens ?? []) }))),
        align: token.align.map((a) => a ?? null),
      });
      break;
    }
    case 'hr': {
      blocks.push({ kind: 'thematicBreak' });
      break;
    }
    case 'space':
      break;
    default: {
      const text = 'text' in token && typeof token.text === 'string' ? token.text : token.raw;
      if (text && text.trim().length > 0) {
        blocks.push({ kind: 'paragraph', runs: [{ text }] });
      }
    }
  }
}

function listTokenToBlock(list) {
  return {
    kind: 'list',
    ordered: list.ordered === true,
    items: list.items.map(listItemToIr),
  };
}

function listItemToIr(item) {
  const inline = [];
  const children = [];
  for (const child of item.tokens ?? []) {
    if (child.type === 'list') {
      children.push(listTokenToBlock(child));
    } else if (child.type === 'text') {
      if (child.tokens && child.tokens.length > 0) {
        inline.push(...child.tokens);
      } else {
        inline.push(child);
      }
    } else if (child.type === 'space') {
      // Blank line between a loose item's own paragraphs — no IR content.
    } else {
      appendTokenBlocks(child, children);
    }
  }
  return { runs: inlineTokensToRuns(inline), children };
}

function inlineTokensToRuns(tokens, formatting = {}) {
  const runs = [];
  for (const token of tokens) {
    switch (token.type) {
      case 'strong':
        runs.push(...inlineTokensToRuns(token.tokens, { ...formatting, bold: true }));
        break;
      case 'em':
        runs.push(...inlineTokensToRuns(token.tokens, { ...formatting, italics: true }));
        break;
      case 'del':
        runs.push(...inlineTokensToRuns(token.tokens, { ...formatting, strike: true }));
        break;
      case 'codespan':
        runs.push({ ...formatting, code: true, text: token.text });
        break;
      case 'link': {
        runs.push(...inlineTokensToRuns(token.tokens, { ...formatting, href: token.href }));
        break;
      }
      case 'text': {
        if (token.tokens && token.tokens.length > 0) {
          runs.push(...inlineTokensToRuns(token.tokens, formatting));
        } else {
          runs.push({ ...formatting, text: token.text });
        }
        break;
      }
      case 'br':
        runs.push({ ...formatting, text: '\n' });
        break;
      default: {
        if ('text' in token && typeof token.text === 'string') {
          runs.push({ ...formatting, text: token.text });
        }
      }
    }
  }
  return runs;
}

// ---------------------------------------------------------------------
// Path 2: rendered content DOM -> Block[]
// ---------------------------------------------------------------------

const HEADING_TAGS = { H1: 1, H2: 2, H3: 3, H4: 4, H5: 5, H6: 6 };

const BLOCK_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'DIV',
  'BLOCKQUOTE', 'UL', 'OL', 'HR', 'PRE', 'TABLE',
]);

/** Walk a rendered content element (e.g. the .vault-content div mammoth's
 * sanitized/restyled output was assigned into) into the shared IR.
 *
 * childNodes, not children: a contenteditable editor (the "new note"
 * path) commonly leaves the first typed line as a bare text node — or
 * bare <b>/<a>/<span> inline nodes — directly under root, with only
 * later lines wrapped in <div>s. Iterating elements only silently
 * dropped that first line from every export. Consecutive inline/text
 * nodes are buffered and flushed as one paragraph whenever a real block
 * element (or the end of the list) is reached. */
export function blocksFromElement(root) {
  const blocks = [];
  let inlineBuffer = [];

  const flushInline = () => {
    if (inlineBuffer.length === 0) return;
    const wrap = root.ownerDocument.createElement('div');
    for (const node of inlineBuffer) wrap.appendChild(node.cloneNode(true));
    const runs = elementInlineRuns(wrap, {});
    if (runs.some((r) => r.text.trim().length > 0)) {
      blocks.push({ kind: 'paragraph', runs });
    }
    inlineBuffer = [];
  };

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === 1 && BLOCK_TAGS.has(node.tagName)) {
      flushInline();
      appendElementBlocks(node, blocks);
    } else if (node.nodeType === 1 || node.nodeType === 3) {
      inlineBuffer.push(node);
    }
  }
  flushInline();

  if (blocks.length === 0 && (root.textContent ?? '').trim().length > 0) {
    blocks.push({ kind: 'paragraph', runs: elementInlineRuns(root, {}) });
  }
  return blocks;
}

function appendElementBlocks(el, blocks) {
  const tag = el.tagName;
  if (tag in HEADING_TAGS) {
    blocks.push({ kind: 'heading', level: HEADING_TAGS[tag], runs: elementInlineRuns(el, {}) });
    return;
  }
  if (tag === 'P' || tag === 'DIV') {
    const runs = elementInlineRuns(el, {});
    if (runs.some((r) => r.text.trim().length > 0)) {
      blocks.push({ kind: 'paragraph', runs });
    }
    return;
  }
  if (tag === 'BLOCKQUOTE') {
    const inner = [];
    for (const child of Array.from(el.children)) {
      appendElementBlocks(child, inner);
    }
    if (inner.length === 0) {
      const runs = elementInlineRuns(el, {});
      if (runs.some((r) => r.text.trim().length > 0)) inner.push({ kind: 'paragraph', runs });
    }
    blocks.push({ kind: 'blockquote', blocks: inner });
    return;
  }
  if (tag === 'UL' || tag === 'OL') {
    blocks.push(listElementToBlock(el));
    return;
  }
  if (tag === 'HR') {
    blocks.push({ kind: 'thematicBreak' });
    return;
  }
  if (tag === 'PRE') {
    const codeEl = el.querySelector('code');
    const langMatch = codeEl?.className.match(/language-(\S+)/);
    blocks.push({
      kind: 'codeBlock',
      lang: langMatch?.[1],
      text: (codeEl ?? el).textContent ?? '',
    });
    return;
  }
  if (tag === 'TABLE') {
    blocks.push(tableElementToBlock(el));
    return;
  }
  if (el.children.length > 0) {
    for (const child of Array.from(el.children)) {
      appendElementBlocks(child, blocks);
    }
  } else {
    const text = el.textContent ?? '';
    if (text.trim().length > 0) {
      blocks.push({ kind: 'paragraph', runs: [{ text }] });
    }
  }
}

function listElementToBlock(el) {
  const ordered = el.tagName === 'OL';
  const items = [];
  for (const li of Array.from(el.children)) {
    if (li.tagName !== 'LI') continue;
    const nestedLists = Array.from(li.children).filter((c) => c.tagName === 'UL' || c.tagName === 'OL');
    const clone = li.cloneNode(true);
    for (const nested of Array.from(clone.children)) {
      if (nested.tagName === 'UL' || nested.tagName === 'OL') clone.removeChild(nested);
    }
    const runs = elementInlineRuns(clone, {});
    const children = nestedLists.map((nested) => listElementToBlock(nested));
    items.push({ runs, children });
  }
  return { kind: 'list', ordered, items };
}

function tableElementToBlock(el) {
  const rowsEls = Array.from(el.querySelectorAll('tr'));
  const header = [];
  const rows = [];
  const align = [];
  let headerCaptured = false;
  for (const tr of rowsEls) {
    const cellEls = Array.from(tr.children).filter((c) => c.tagName === 'TH' || c.tagName === 'TD');
    if (!headerCaptured && cellEls.length > 0 && cellEls.every((c) => c.tagName === 'TH')) {
      for (const cell of cellEls) {
        header.push({ runs: elementInlineRuns(cell, {}) });
        align.push(cellAlignment(cell));
      }
      headerCaptured = true;
      continue;
    }
    rows.push(cellEls.map((cell) => ({ runs: elementInlineRuns(cell, {}) })));
  }
  return { kind: 'table', header, rows, align };
}

function cellAlignment(cell) {
  const style = cell.style?.textAlign;
  if (style === 'left' || style === 'center' || style === 'right') return style;
  const attr = cell.getAttribute('align');
  if (attr === 'left' || attr === 'center' || attr === 'right') return attr;
  return null;
}

function elementInlineRuns(el, formatting) {
  const runs = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      const text = node.textContent ?? '';
      if (text.length > 0) runs.push({ ...formatting, text });
      continue;
    }
    if (node.nodeType !== 1 /* ELEMENT_NODE */) continue;
    const child = node;
    const next = { ...formatting };
    const tag = child.tagName;
    if (tag === 'B' || tag === 'STRONG') next.bold = true;
    if (tag === 'I' || tag === 'EM') next.italics = true;
    if (tag === 'U') next.underline = true;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next.strike = true;
    if (tag === 'CODE') next.code = true;
    if (tag === 'A') {
      const href = child.getAttribute('href');
      if (href) next.href = href;
    }
    const bg = child.style?.backgroundColor;
    if (bg) next.highlight = bg;
    if (tag === 'BR') {
      runs.push({ ...formatting, text: '\n' });
      continue;
    }
    runs.push(...elementInlineRuns(child, next));
  }
  return runs;
}
