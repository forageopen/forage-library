function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slideToHtml(slide, index) {
  const parts = [`<section class="vault-slide" data-slide-index="${index}">`];
  if (slide.title) parts.push(`<h2 class="vault-slide-title">${escapeHtml(slide.title)}</h2>`);
  if (slide.subtitle) parts.push(`<p class="vault-slide-subtitle">${escapeHtml(slide.subtitle)}</p>`);
  if (slide.bullets.length) {
    parts.push('<ul class="vault-slide-bullets">');
    for (const bullet of slide.bullets) parts.push(`<li>${escapeHtml(bullet)}</li>`);
    parts.push('</ul>');
  }
  for (const image of slide.images) {
    parts.push(`<img class="vault-slide-image" src="${image}" alt="">`);
  }
  parts.push('</section>');
  return parts.join('');
}

export function slidesToHtml(slides) {
  const deck = slides.map(slideToHtml).join('');
  return `<div class="vault-content vault-deck">${deck}</div>`;
}
