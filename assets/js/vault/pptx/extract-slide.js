/* Extracts a Forage-restyled slide model {title, subtitle, bullets, images}
   from one slide's raw XML plus its resolved media map. No zip/file I/O
   here, so it's testable with plain XML strings — the caller (render-pptx.js)
   handles unzipping and media resolution. */

function getParser() {
  const Impl = globalThis.DOMParser;
  if (!Impl) throw new Error('extractSlide: DOMParser is not available');
  return new Impl();
}

function textOfParagraph(pEl) {
  const runs = Array.from(pEl.getElementsByTagName('a:t'));
  return runs.map((t) => t.textContent).join('').trim();
}

function placeholderType(spEl) {
  const ph = spEl.getElementsByTagName('p:ph')[0];
  return ph ? ph.getAttribute('type') : null;
}

function shapeParagraphs(spEl) {
  const txBody = spEl.getElementsByTagName('p:txBody')[0];
  if (!txBody) return [];
  return Array.from(txBody.getElementsByTagName('a:p'))
    .map(textOfParagraph)
    .filter(Boolean);
}

function shapeImages(spEl, mediaMap) {
  const blips = Array.from(spEl.getElementsByTagName('a:blip'));
  return blips
    .map((blip) => blip.getAttribute('r:embed'))
    .filter(Boolean)
    .map((relId) => mediaMap[relId])
    .filter(Boolean);
}

export function extractSlide(slideXml, mediaMap = {}) {
  const doc = getParser().parseFromString(slideXml, 'application/xml');
  const spTree = doc.getElementsByTagName('p:spTree')[0];
  const shapes = spTree ? Array.from(spTree.getElementsByTagName('p:sp')) : [];
  const pics = spTree ? Array.from(spTree.getElementsByTagName('p:pic')) : [];

  let title = null;
  let subtitle = null;
  const bullets = [];

  for (const sp of shapes) {
    const type = placeholderType(sp);
    const paragraphs = shapeParagraphs(sp);
    if (paragraphs.length === 0) continue;
    if (type === 'title' || type === 'ctrTitle') {
      title = paragraphs.join(' ');
    } else if (type === 'subTitle') {
      subtitle = paragraphs.join(' ');
    } else {
      bullets.push(...paragraphs);
    }
  }

  const images = [];
  for (const pic of pics) {
    images.push(...shapeImages(pic, mediaMap));
  }

  return { title, subtitle, bullets, images };
}
