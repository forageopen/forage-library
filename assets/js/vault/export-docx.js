/**
 * export-docx.js
 *
 * .docx export via the `docx` package — ported from Noted's
 * src/export/docx.ts. This file's only job is turning the shared IR
 * (document-model.js) into real `docx` package objects (Table/TableRow/
 * TableCell, numbered/bulleted Paragraphs, etc.) — the "IR -> docx.js"
 * mapping is defined exactly once, in `blocksToDocxContent` below.
 *
 * `docxLib` is injectable (defaults to the CDN-loaded `globalThis.docx`
 * UMD global), matching every other CDN-consuming renderer in this repo,
 * so tests can inject the real `docx` npm package instead.
 */

const FONT_FAMILY = 'Calibri';
const CODE_FONT_FAMILY = 'Consolas';
const BODY_SIZE = 22; // 11pt
const HEADING_SIZES = { 1: 32, 2: 28, 3: 26, 4: 24, 5: 22, 6: 22 };

const BODY_SPACING = { line: 276, lineRule: 'auto', after: 200 };
const HEADING_SPACING = { before: 240, after: 120 };
const LIST_INDENT = { left: 720, hanging: 360 };
const LIST_LEVEL_STEP = 360;
const BLOCKQUOTE_INDENT = { left: 720 };

function normalizeHex(color) {
  if (color.startsWith('#')) return color.slice(1);
  const rgb = color.match(/\d+/g);
  if (rgb && rgb.length >= 3) {
    return rgb.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  }
  return 'FFFF00';
}

/** Pure: build the docx object-model for IR blocks, given the injected
 * `docx` library. Returns { document, toBlob } where `toBlob()` is async
 * (docx.Packer.toBlob is async). Split out this way so the pure
 * IR -> object-model mapping is testable without needing a real Blob
 * environment. */
export function blocksToDocxDocument(blocks, docxLib = globalThis.docx) {
  if (!docxLib) throw new Error('blocksToDocxDocument: docx library is not loaded');
  const {
    AlignmentType, BorderStyle, Document, HeadingLevel, Paragraph,
    ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
  } = docxLib;

  const CODE_SHADING = { type: ShadingType.CLEAR, fill: 'F3F4F6', color: 'auto' };
  const HEADING_LEVELS = [
    HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
  ];

  function runToTextRun(run, size) {
    return new TextRun({
      text: run.text,
      font: run.code ? CODE_FONT_FAMILY : FONT_FAMILY,
      size,
      bold: run.bold,
      italics: run.italics,
      underline: run.underline ? {} : undefined,
      strike: run.strike,
      shading: run.highlight ? { fill: normalizeHex(run.highlight) } : undefined,
      style: run.href ? 'Hyperlink' : undefined,
    });
  }

  function emptyRunFallback(runs) {
    return runs.length > 0 ? runs : [{ text: '' }];
  }

  function inlineRunsToTextRuns(runs, size) {
    return emptyRunFallback(runs).map((run) => runToTextRun(run, size));
  }

  function headingParagraph(level, runs) {
    return new Paragraph({
      heading: HEADING_LEVELS[level - 1],
      alignment: AlignmentType.LEFT,
      spacing: HEADING_SPACING,
      children: inlineRunsToTextRuns(runs, HEADING_SIZES[level]),
    });
  }

  function paragraphParagraph(runs, extra = {}) {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: BODY_SPACING,
      children: inlineRunsToTextRuns(runs, BODY_SIZE),
      ...extra,
    });
  }

  function listItemParagraphs(item, ordered, level) {
    const indent = { left: LIST_INDENT.left + level * LIST_LEVEL_STEP, hanging: LIST_INDENT.hanging };
    const own = new Paragraph({
      numbering: { reference: ordered ? 'vault-numbered-list' : 'vault-bullet-list', level },
      alignment: AlignmentType.LEFT,
      spacing: BODY_SPACING,
      indent,
      children: inlineRunsToTextRuns(item.runs, BODY_SIZE),
    });
    const nested = [];
    for (const child of item.children) {
      if (child.kind === 'list') {
        nested.push(...listBlockParagraphs(child, level + 1));
      } else {
        nested.push(...blockToParagraphs(child));
      }
    }
    return [own, ...nested];
  }

  function listBlockParagraphs(block, level) {
    const out = [];
    for (const item of block.items) {
      out.push(...listItemParagraphs(item, block.ordered, level));
    }
    return out;
  }

  function codeBlockParagraph(text) {
    const lines = text.split('\n');
    const children = [];
    lines.forEach((line, i) => {
      children.push(new TextRun({
        text: line, font: CODE_FONT_FAMILY, size: BODY_SIZE, shading: CODE_SHADING,
        break: i > 0 ? 1 : undefined,
      }));
    });
    return new Paragraph({ alignment: AlignmentType.LEFT, spacing: BODY_SPACING, children });
  }

  function thematicBreakParagraph() {
    return new Paragraph({
      spacing: BODY_SPACING,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' } },
      children: [],
    });
  }

  function alignmentType(align) {
    if (align === 'center') return AlignmentType.CENTER;
    if (align === 'right') return AlignmentType.RIGHT;
    if (align === 'left') return AlignmentType.LEFT;
    return undefined;
  }

  function tableCellFromIr(cell, align) {
    return new TableCell({
      width: { size: 100, type: WidthType.AUTO },
      children: [paragraphParagraph(cell.runs, { alignment: alignmentType(align) })],
    });
  }

  function tableFromIr(block) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: block.header.map((cell, i) => tableCellFromIr(cell, block.align[i] ?? null)),
    });
    const bodyRows = block.rows.map(
      (row) => new TableRow({ children: row.map((cell, i) => tableCellFromIr(cell, block.align[i] ?? null)) })
    );
    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] });
  }

  function blockquoteParagraphs(block) {
    const out = [];
    for (const inner of block.blocks) {
      if (inner.kind === 'paragraph' || inner.kind === 'heading') {
        const runs = inner.runs.map((r) => ({ ...r, italics: r.italics ?? true }));
        out.push(paragraphParagraph(runs, { indent: BLOCKQUOTE_INDENT }));
      } else {
        out.push(...blockToParagraphs(inner));
      }
    }
    return out;
  }

  function blockToParagraphs(block) {
    switch (block.kind) {
      case 'heading':
        return [headingParagraph(block.level, block.runs)];
      case 'paragraph':
        return [paragraphParagraph(block.runs)];
      case 'blockquote':
        return blockquoteParagraphs(block);
      case 'codeBlock':
        return [codeBlockParagraph(block.text)];
      case 'list':
        return listBlockParagraphs(block, 0);
      case 'thematicBreak':
        return [thematicBreakParagraph()];
      case 'table':
        return [];
      default:
        return [];
    }
  }

  function blocksToDocxContent(blks) {
    const content = [];
    for (const block of blks) {
      if (block.kind === 'table') {
        content.push(tableFromIr(block));
      } else {
        content.push(...blockToParagraphs(block));
      }
    }
    return content;
  }

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_FAMILY, size: BODY_SIZE },
          paragraph: { spacing: BODY_SPACING },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'vault-numbered-list',
          levels: Array.from({ length: 6 }, (_, level) => ({
            level, format: 'decimal', text: '%1.', alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: LIST_INDENT.left + level * LIST_LEVEL_STEP, hanging: LIST_INDENT.hanging } } },
          })),
        },
        {
          reference: 'vault-bullet-list',
          levels: Array.from({ length: 6 }, (_, level) => ({
            level, format: 'bullet', text: '•', alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: LIST_INDENT.left + level * LIST_LEVEL_STEP, hanging: LIST_INDENT.hanging } } },
          })),
        },
      ],
    },
    sections: [{ children: blocksToDocxContent(blocks) }],
  });

  return document;
}

/** DOM: build a .docx Blob for the given IR blocks. */
export async function blocksToDocxBlob(blocks, docxLib = globalThis.docx) {
  if (!docxLib) throw new Error('blocksToDocxBlob: docx library is not loaded');
  const document = blocksToDocxDocument(blocks, docxLib);
  return docxLib.Packer.toBlob(document);
}
