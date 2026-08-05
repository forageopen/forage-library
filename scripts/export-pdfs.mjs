#!/usr/bin/env node
/**
 * export-pdfs.mjs
 *
 * Walks articles/, frameworks/, courses/ and prints every .html file to a
 * sibling .pdf using headless Chromium — the same rendering engine as
 * Chrome's native "Print to PDF". This replaces third-party HTML-to-PDF
 * converters, which frequently mishandle @page rules, break-before/after,
 * and custom fonts, causing the alignment problems this script exists to
 * kill.
 *
 * Run manually:   npm run export-pdfs
 * Run in CI:       see .github/workflows/publish.yml
 */

import puppeteer from 'puppeteer';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIRS = ['articles', 'frameworks', 'courses'];

function findHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...findHtmlFiles(full));
    } else if (entry.toLowerCase().endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const targets = CONTENT_DIRS
    .map((dir) => path.join(ROOT, dir))
    .filter((full) => existsSync(full))
    .flatMap(findHtmlFiles);

  if (targets.length === 0) {
    console.log('No HTML files found to export.');
    return;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.emulateMediaType('print');

    for (const file of targets) {
      const url = pathToFileURL(file).href;
      await page.goto(url, { waitUntil: 'networkidle0' });
      const pdfPath = file.replace(/\.html?$/i, '.pdf');
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });
      console.log('Exported:', path.relative(ROOT, pdfPath));
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
