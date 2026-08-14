import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { renderPptx } from './render-pptx.js';

before(() => {
  globalThis.DOMParser = DOMParser;
});

const NS = `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;

function slideXml(spTreeInner) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS}><p:cSld><p:spTree>${spTreeInner}</p:spTree></p:cSld></p:sld>`;
}

function relsXml(relId, target) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/>
</Relationships>`;
}

async function buildSamplePptx() {
  const zip = new JSZip();
  zip.file('ppt/slides/slide1.xml', slideXml(`
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Forage Library</a:t></a:r></a:p></p:txBody></p:sp>
  `));
  zip.file('ppt/slides/slide2.xml', slideXml(`
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Agenda</a:t></a:r></a:p></p:txBody></p:sp>
    <p:pic><p:blipFill><a:blip r:embed="rId1"/></p:blipFill></p:pic>
  `));
  zip.file('ppt/slides/_rels/slide2.xml.rels', relsXml('rId1', '../media/image1.png'));
  zip.file('ppt/media/image1.png', 'fake-png-bytes');
  return zip.generateAsync({ type: 'arraybuffer' });
}

test('renders slides in numeric order with title text', async () => {
  const buffer = await buildSamplePptx();
  const html = await renderPptx(buffer, JSZip);
  const firstIndex = html.indexOf('Forage Library');
  const secondIndex = html.indexOf('Agenda');
  assert.ok(firstIndex > -1 && secondIndex > -1);
  assert.ok(firstIndex < secondIndex);
});

test('resolves and embeds an image referenced by a slide', async () => {
  const buffer = await buildSamplePptx();
  const html = await renderPptx(buffer, JSZip);
  assert.match(html, /<img class="vault-slide-image" src="data:image\/png;base64,[^"]+"/);
});

test('renders no slide-position dot rail', async () => {
  const buffer = await buildSamplePptx();
  const html = await renderPptx(buffer, JSZip);
  assert.ok(!html.includes('vault-slide-rail'));
  assert.ok(!html.includes('vault-slide-dot'));
});

test('throws a clear error when JSZip is not available', async () => {
  await assert.rejects(() => renderPptx(new ArrayBuffer(0), undefined), /JSZip library is not loaded/);
});

async function buildPptxWithMultipleSlides() {
  const zip = new JSZip();
  // Add slides with numbers that would sort differently lexicographically vs numerically
  zip.file('ppt/slides/slide1.xml', slideXml(`
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Slide One</a:t></a:r></a:p></p:txBody></p:sp>
  `));
  zip.file('ppt/slides/slide2.xml', slideXml(`
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Slide Two</a:t></a:r></a:p></p:txBody></p:sp>
  `));
  zip.file('ppt/slides/slide3.xml', slideXml(`
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Slide Three</a:t></a:r></a:p></p:txBody></p:sp>
  `));
  zip.file('ppt/slides/slide10.xml', slideXml(`
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Slide Ten</a:t></a:r></a:p></p:txBody></p:sp>
  `));
  zip.file('ppt/slides/slide11.xml', slideXml(`
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Slide Eleven</a:t></a:r></a:p></p:txBody></p:sp>
  `));
  return zip.generateAsync({ type: 'arraybuffer' });
}

test('renders slides in numeric order (not lexicographic) with double-digit slide numbers', async () => {
  const buffer = await buildPptxWithMultipleSlides();
  const html = await renderPptx(buffer, JSZip);

  // Verify all slides are present
  const slideOneIdx = html.indexOf('Slide One');
  const slideTwoIdx = html.indexOf('Slide Two');
  const slideThreeIdx = html.indexOf('Slide Three');
  const slideTenIdx = html.indexOf('Slide Ten');
  const slideElevenIdx = html.indexOf('Slide Eleven');

  assert.ok(slideOneIdx > -1, 'Slide One should be present');
  assert.ok(slideTwoIdx > -1, 'Slide Two should be present');
  assert.ok(slideThreeIdx > -1, 'Slide Three should be present');
  assert.ok(slideTenIdx > -1, 'Slide Ten should be present');
  assert.ok(slideElevenIdx > -1, 'Slide Eleven should be present');

  // Verify numeric order: 1 < 2 < 3 < 10 < 11
  assert.ok(slideOneIdx < slideTwoIdx, 'Slide One should come before Slide Two');
  assert.ok(slideTwoIdx < slideThreeIdx, 'Slide Two should come before Slide Three');
  assert.ok(slideThreeIdx < slideTenIdx, 'Slide Three should come before Slide Ten (tests numeric, not lexicographic sort)');
  assert.ok(slideTenIdx < slideElevenIdx, 'Slide Ten should come before Slide Eleven');
});
