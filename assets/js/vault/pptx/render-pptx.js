import { extractSlide } from './extract-slide.js';
import { slidesToHtml } from './render-slides.js';

const MIME_BY_EXT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp' };

function slideNumber(filename) {
  const match = /slide(\d+)\.xml$/.exec(filename);
  return match ? Number(match[1]) : 0;
}

async function fileToDataUri(zipEntry, filename) {
  const bytes = await zipEntry.async('base64');
  const ext = filename.split('.').pop().toLowerCase();
  const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
  return `data:${mime};base64,${bytes}`;
}

async function resolveMediaMap(zip, slidePath) {
  const relsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
  const relsFile = zip.file(relsPath);
  if (!relsFile) return {};
  const relsXmlText = await relsFile.async('string');
  const DOMParserImpl = globalThis.DOMParser;
  if (!DOMParserImpl) throw new Error('renderPptx: DOMParser is not available');
  const relsDoc = new DOMParserImpl().parseFromString(relsXmlText, 'application/xml');
  const relationships = Array.from(relsDoc.getElementsByTagName('Relationship'));
  const map = {};
  for (const rel of relationships) {
    const target = rel.getAttribute('Target');
    if (!target || !/\.(png|jpe?g|gif|bmp)$/i.test(target)) continue;
    const mediaPath = 'ppt/media/' + target.split('/').pop();
    const mediaFile = zip.file(mediaPath);
    if (!mediaFile) continue;
    map[rel.getAttribute('Id')] = await fileToDataUri(mediaFile, mediaPath);
  }
  return map;
}

export async function renderPptx(arrayBuffer, JSZipLib = globalThis.JSZip, onProgress = null) {
  if (!JSZipLib) throw new Error('renderPptx: JSZip library is not loaded');
  const report = onProgress || (() => {}); // (fraction 0..1 or null, label)
  const zip = await JSZipLib.loadAsync(arrayBuffer);
  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const slides = [];
  report(0, `Rendering slide 1 of ${slidePaths.length}`);
  for (const slidePath of slidePaths) {
    const xml = await zip.file(slidePath).async('string');
    const mediaMap = await resolveMediaMap(zip, slidePath);
    slides.push(extractSlide(xml, mediaMap));
    report(slides.length / slidePaths.length, `Rendering slide ${slides.length} of ${slidePaths.length}`);
  }
  return slidesToHtml(slides);
}
