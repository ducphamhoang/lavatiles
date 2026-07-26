#!/usr/bin/env node
/**
 * Generate article detail pages from data/articles.json
 * Usage: node tools/generate-news-pages.js
 *
 * Reads structured article data and outputs:
 *   tin-tuc/{slug}.html  — article detail pages
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'articles.json');
const OUTPUT_DIR = path.join(ROOT, 'tin-tuc');

// Ensure output dir exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Load data
const articles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

if (!Array.isArray(articles)) {
  console.error('ERROR: data/articles.json must be an array');
  process.exit(1);
}

// ============================================================
// TEMPLATES
// ============================================================

function renderHead(article) {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${article.title} — Lavatiles</title>
  <meta name="description" content="${(article.description || article.lead || '').replace(/"/g, '&quot;').substring(0, 200)}">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/news-detail.css">
</head>
<body>
  <div data-site-header data-site-root=".." data-active-nav="news"></div>
  <main class="main" id="main">`;
}

function renderFooter() {
  return `</main>
  <div data-site-footer data-site-root=".."></div>
  <button type="button" id="scrollTop" aria-label="Scroll to top">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  </button>
  <script src="../js/site-chrome.js"></script>
  <script src="../js/main.js"></script>
  <script src="../js/ui-feedback.js"></script>
</body>
</html>`;
}

// ============================================================
// BLOCK RENDERERS
// ============================================================

function renderBlock(block, slug) {
  switch (block.type) {
    case 'block-image':
      return renderBlockImage(block, slug);
    case 'block-paragraph_block':
      return renderBlockParagraph(block, slug);
    case 'block-paragraph_special':
      return renderBlockParagraphSpecial(block, slug);
    case 'block-image_two_column':
      return renderBlockImageTwoColumn(block, slug);
    case 'block-image_text_two_column':
      return renderBlockImageTextTwoColumn(block, slug);
    case 'block-images_text_two_column':
      return renderBlockImagesTextTwoColumn(block, slug);
    case 'block-image_text_color_two_column':
      return renderBlockImageTextColorTwoColumn(block, slug);
    default:
      console.warn('  [WARN] Unknown block type: ' + block.type);
      return '';
  }
}

function imgPath(slug, filename) {
  return `../assets/images/news/${slug}/${filename}`;
}

function renderBlockImage(block, slug) {
  var caption = block.caption ? '<span class="img-alt">' + escapeHtml(block.caption) + '</span>' : '';
  return '<div class="block-image">\n' +
    '<div class="row">\n<div class="col-12">\n' +
    '<figure>\n' +
    '<img src="' + imgPath(slug, block.src) + '" alt="' + escapeHtml(block.alt || '') + '" loading="lazy">\n' +
    caption +
    '</figure>\n' +
    '</div>\n</div>\n</div>';
}

function renderBlockParagraph(block, slug) {
  var heading = block.heading
    ? '<h2>' + block.heading + '</h2>\n'
    : '';
  return '<div class="block-paragraph_block">\n' +
    heading +
    block.content + '\n' +
    '</div>';
}

function renderBlockParagraphSpecial(block, slug) {
  return '<div class="block-paragraph_special">\n' +
    '<section class="section-collection-inspiration-content">\n' +
    '<div class="container">\n<div class="row">\n<div class="col-lg-8 col-12">\n<div class="inner-content">\n' +
    block.content + '\n' +
    '</div>\n</div>\n</div>\n</div>\n</section>\n</div>';
}

function renderBlockImageTwoColumn(block, slug) {
  var imgs = block.images.map(function(img) {
    return '<div class="' + (img.colClass || 'col-8') + '">\n' +
      '<div class="pic thumbnail-image mb-0">\n' +
      '<img src="' + imgPath(slug, img.src) + '" alt="' + escapeHtml(img.alt || '') + '" loading="lazy">\n' +
      (img.caption ? '<span class="img-alt">' + escapeHtml(img.caption) + '</span>\n' : '') +
      '</div>\n</div>';
  }).join('\n');

  return '<div class="block-image_two_column">\n' +
    '<section class="section-collection-inspiration-content">\n' +
    '<div class="container">\n<div class="row">\n' +
    imgs +
    '</div>\n</div>\n</section>\n</div>';
}

function renderBlockImageTextTwoColumn(block, slug) {
  var imageCol = '<div class="col-lg-8">\n' +
    '<div class="pic thumbnail-image">\n' +
    '<img src="' + imgPath(slug, block.image.src) + '" alt="' + escapeHtml(block.image.alt || '') + '" loading="lazy">\n' +
    '<span class="img-alt">' + escapeHtml(block.image.caption || '') + '</span>\n' +
    '</div>\n</div>';

  var textCol = '<div class="order-0 order-lg-0 d-flex col-lg-4 align-items-center">\n' +
    '<div class="inner-content">\n' +
    block.content + '\n' +
    '</div>\n</div>';

  var order = block.reverse
    ? imageCol + '\n' + textCol
    : textCol + '\n' + imageCol;

  return '<div class="block-image_text_two_column">\n' +
    '<section class="section-collection-inspiration-content">\n' +
    '<div class="container">\n<div class="row">\n' +
    order +
    '</div>\n</div>\n</section>\n</div>';
}

function renderBlockImagesTextTwoColumn(block, slug) {
  var cols = block.columns.map(function(col) {
    if (col.type === 'image') {
      return '<div class="col-6 col-lg-4">\n' +
        '<div class="pic thumbnail-image">\n' +
        '<img src="' + imgPath(slug, col.src) + '" alt="' + escapeHtml(col.alt || '') + '" loading="lazy">\n' +
        '<span class="img-alt">' + escapeHtml(col.caption || '') + '</span>\n' +
        '</div>\n</div>';
    } else {
      return '<div class="col-lg-4 col-12 d-flex align-items-center">\n' +
        '<div class="inner-content">\n' +
        col.content + '\n' +
        '</div>\n</div>';
    }
  }).join('\n');

  return '<div class="block-images_text_two_column">\n' +
    '<section class="section-collection-inspiration-content">\n' +
    '<div class="container">\n<div class="row">\n' +
    cols +
    '</div>\n</div>\n</section>\n</div>';
}

function renderBlockImageTextColorTwoColumn(block, slug) {
  return '<div class="block-image_text_color_two_column">\n' +
    '<section class="section-collection-inspiration-content section-collection-inspiration-content-style-1">\n' +
    '<div class="content-absolute">\n<div class="container">\n<div class="row">\n' +
    '<div class="col-lg-6 col-12">\n<div class="inner-content pe-lg-5">\n' +
    block.content + '\n' +
    '</div>\n</div>\n<div class="col-lg-6 col-12"></div>\n' +
    '</div>\n</div>\n</div>\n' +
    '<div class="container">\n<div class="row">\n' +
    '<div class="col-lg-6 col-12"></div>\n' +
    '<div class="col-lg-6 col-12">\n<div class="pic thumbnail-image">\n' +
    '<img src="' + imgPath(slug, block.image.src) + '" alt="' + escapeHtml(block.image.alt || '') + '" loading="lazy">\n' +
    '<span class="img-alt">' + escapeHtml(block.image.caption || '') + '</span>\n' +
    '</div>\n</div>\n</div>\n</div>\n' +
    '</section>\n</div>';
}

// ============================================================
// PAGE RENDERERS
// ============================================================

function renderTemplateA(article) {
  var blocks = (article.blocks || []).map(function(b) { return renderBlock(b, article.slug); }).join('\n\n');

  return renderHead(article) + `
<section class="section-post-detail">
  <div class="container">
    <div class="post-detail-wrapper">
      <div class="post-detail-header">
        <div class="post-category">
          <a href="../tin-tuc.html?category_id=${article.category_id}">${article.category_name}</a>
        </div>
        <h1 class="post-title">${article.title}</h1>
        <ul class="post-meta">
          <li>${article.date}</li>
        </ul>
        ${article.lead ? '<div class="short-content">' + article.lead + '</div>' : ''}
      </div>
      <div class="post-detail-body">
${blocks}
      </div>
    </div>
  </div>
</section>
` + renderRelated(article) + renderFooter();
}

function renderTemplateB(article) {
  var blocks = (article.blocks || []).map(function(b) { return renderBlock(b, article.slug); }).join('\n\n');

  var heroImages = '';
  if (article.heroImages && article.heroImages.length) {
    heroImages = '<div class="row">\n';
    article.heroImages.forEach(function(img, i) {
      if (i === 0) {
        // First image takes col-12 col-lg-8 with object-fit-3-4
        heroImages += '<div class="col-12 col-lg-8 flex-column-space-between">\n';
        heroImages += '<div class="pic thumbnail-image mb-3">\n';
        heroImages += '<div class="object-fit object-fit-3-4">\n';
        heroImages += '<img src="' + imgPath(article.slug, img.src) + '" alt="' + escapeHtml(img.alt || '') + '" loading="lazy">\n';
        heroImages += '</div>\n</div>\n</div>\n';
      } else {
        // Second image takes col-12 col-lg-4
        if (i === 1) {
          heroImages += '<div class="col-12 col-lg-4 flex-column-space-between">\n';
          heroImages += '<div class="pic thumbnail-image d-lg-block d-none">\n';
          heroImages += '<div class="object-fit object-fit-1-1">\n';
          heroImages += '<img src="' + imgPath(article.slug, img.src) + '" alt="' + escapeHtml(img.alt || '') + '" loading="lazy">\n';
          heroImages += '</div>\n</div>\n</div>\n';
        }
      }
    });
    heroImages += '</div>\n';
  }

  return renderHead(article) + `
<section class="section-post-detail pt-0">
  <section class="section-blog-detail-header">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <div class="meta">
            <h4 class="category">${article.category_name}</h4>
            <span class="time">${article.date}</span>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-12 col-lg-4 flex-column-space-between">
          <h2 class="title">${article.title}</h2>
          ${article.thumbnail ? '<div class="pic thumbnail-image d-lg-block d-none">\n<div class="object-fit object-fit-1-1">\n<img src="' + imgPath(article.slug, article.thumbnail) + '" alt="' + escapeHtml(article.title) + '" loading="lazy">\n</div>\n</div>' : ''}
        </div>
        <div class="col-12 col-lg-8 flex-column-space-between">
          ${heroImages}
          ${article.lead ? '<h5 class="sub">' + article.lead + '</h5>' : ''}
        </div>
      </div>
    </div>
  </section>
  <div class="post-detail-body">
    <div class="container">
${blocks}
    </div>
  </div>
</section>
` + renderRelated(article) + renderFooter();
}

function renderRelated(article) {
  if (!article.related || !article.related.length) return '';

  var cards = article.related.map(function(r) {
    var href = r.link || '#' + r.slug;
    return '<div class="related-card">\n' +
      '<a href="' + href + '">\n' +
      (r.image ? '<div class="related-card-img">\n<img src="' + imgPath(article.slug, r.image) + '" alt="" loading="lazy">\n</div>' : '') +
      '<div class="related-card-body">\n' +
      '<div class="post-category"><a>' + escapeHtml(r.category || '') + '</a></div>\n' +
      '<h4>' + escapeHtml(r.title) + '</h4>\n' +
      '<div class="news-date">' + escapeHtml(r.date || '') + '</div>\n' +
      '</div>\n</a>\n</div>';
  }).join('\n');

  return `<section class="section-posts-related">
  <div class="container">
    <h3 class="section-title">Xem thêm các bài viết khác</h3>
    <div class="posts-related-grid">
${cards}
    </div>
  </div>
</section>`;
}

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// MAIN
// ============================================================

var count = 0;
articles.forEach(function(article) {
  if (!article.slug) {
    console.warn('  [SKIP] Article without slug');
    return;
  }

  var template = article.template || 'A';
  var html;

  if (template === 'B') {
    html = renderTemplateB(article);
  } else {
    html = renderTemplateA(article);
  }

  var filePath = path.join(OUTPUT_DIR, article.slug + '.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  count++;
  console.log('  [OK] ' + filePath);
});

console.log('\nDone! Generated ' + count + ' article pages.');
