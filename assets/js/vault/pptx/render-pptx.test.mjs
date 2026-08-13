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

test('builds a slide-position rail with one dot per slide', async () => {
  const buffer = await buildSamplePptx();
  const html = await renderPptx(buffer, JSZip);
  const dots = html.match(/vault-slide-dot/g) || [];
  assert.equal(dots.length, 2);
});

test('throws a clear error when JSZip is not available', async () => {
  await assert.rejects(() => renderPptx(new ArrayBuffer(0), undefined), /JSZip library is not loaded/);
});
