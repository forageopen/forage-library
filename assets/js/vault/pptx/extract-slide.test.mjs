import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { extractSlide } from './extract-slide.js';

before(() => {
  globalThis.DOMParser = DOMParser;
});

const NS = `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;

function slideXml(spTreeInner) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld ${NS}><p:cSld><p:spTree>${spTreeInner}</p:spTree></p:cSld></p:sld>`;
}

test('extracts a title + subtitle slide', () => {
  const xml = slideXml(`
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Forage Library</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="subTitle"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Adam Rosman</a:t></a:r></a:p></p:txBody></p:sp>
  `);
  const slide = extractSlide(xml, {});
  assert.equal(slide.title, 'Forage Library');
  assert.equal(slide.subtitle, 'Adam Rosman');
  assert.deepEqual(slide.bullets, []);
  assert.deepEqual(slide.images, []);
});

test('extracts a title + bulleted body slide, joining multi-run paragraphs', () => {
  const xml = slideXml(`
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
      <p:txBody><a:p><a:r><a:t>Agenda</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr>
      <p:txBody>
        <a:p><a:r><a:t>First </a:t></a:r><a:r><a:t>point</a:t></a:r></a:p>
        <a:p><a:r><a:t>Second point</a:t></a:r></a:p>
      </p:txBody></p:sp>
  `);
  const slide = extractSlide(xml, {});
  assert.equal(slide.title, 'Agenda');
  assert.deepEqual(slide.bullets, ['First point', 'Second point']);
});

test('resolves an embedded image via the media map', () => {
  const xml = slideXml(`
    <p:pic><p:blipFill><a:blip r:embed="rId2"/></p:blipFill></p:pic>
  `);
  const slide = extractSlide(xml, { rId2: 'data:image/png;base64,AAAA' });
  assert.deepEqual(slide.images, ['data:image/png;base64,AAAA']);
});

test('ignores images with no matching media map entry', () => {
  const xml = slideXml(`<p:pic><p:blipFill><a:blip r:embed="rIdMissing"/></p:blipFill></p:pic>`);
  const slide = extractSlide(xml, {});
  assert.deepEqual(slide.images, []);
});

test('returns nulls/empties for a slide with no recognizable content', () => {
  const xml = slideXml('');
  const slide = extractSlide(xml, {});
  assert.equal(slide.title, null);
  assert.equal(slide.subtitle, null);
  assert.deepEqual(slide.bullets, []);
  assert.deepEqual(slide.images, []);
});
