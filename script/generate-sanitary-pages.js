#!/usr/bin/env node
/**
 * Reads the 4 brand catalogue JSONs and generates individual HTML detail pages
 * under san-pham/thiet-bi-ve-sinh/{category-slug}/{product-slug}.html
 */

const fs = require('fs');
const path = require('path');
const {
  CATEGORY_LABELS,
  categoryInfo,
  categoryForProduct,
  flattenTotoTree,
} = require('../scripts/toto-category-map');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data/products');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates/sanitary-detail.html');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'san-pham/thiet-bi-ve-sinh');
const ROOT_FROM_DETAIL = '../../..';
const TOTO_TREE_PATH = path.join(ROOT_DIR, 'data/product/new-toto/products-tree.json');

const BRANDS = [
  { file: 'catalogue-caesar-06-2026.json', brand: 'Caesar' },
  { file: 'catalogue-toto-2026.json', brand: 'TOTO' },
  { file: 'catalogue-inax-2026.json', brand: 'INAX' },
  { file: 'catalogue-t1-2026-sc.json', brand: 'Viglacera' },
];

// Sorted longest-first so we match the most specific prefix
const CATEGORY_PREFIXES = Object.keys(CATEGORY_LABELS).sort((a, b) => b.length - a.length);

const SUMMARY_FIELDS = [
  ['Danh mục', 'category'],
  ['Loại sản phẩm', 'Loại sản phẩm'],
  ['Thương hiệu', 'Thương hiệu'],
  ['Kích thước', 'Kích thước', 'Kích thước (D x R x C)'],
  ['Công nghệ', 'Công nghệ', 'Tính năng'],
  ['Kiểu xả', 'Kiểu xả', 'Hệ thống xả'],
  ['Giá', 'Giá'],
];

const EXCLUDED_INFO_KEYS = new Set(['Lượt xem', 'Số lượng', 'URL']);

function cleanText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseCategory(catKey) {
  for (const prefix of CATEGORY_PREFIXES) {
    if (catKey.startsWith(prefix)) {
      return categoryInfo(prefix);
    }
  }
  return categoryInfo(catKey);
}

function valueFromInfo(info, keys) {
  for (const key of keys) {
    const value = cleanText(info[key]);
    if (value) return value;
  }
  return '';
}

function productImages(images) {
  const seen = new Set();
  return (images || []).filter((image) => {
    const src = cleanText(image);
    if (!src || seen.has(src)) return false;
    seen.add(src);
    if (!/\.(?:avif|webp|png|jpe?g)(?:$|\?)/i.test(src)) return false;
    if (/logo|favicon|apple-touch-icon|zalo|icon|captcha|qrcode|qr-code|\/qr[-_0-9]/i.test(src)) return false;
    return true;
  }).slice(0, 6);
}

function galleryMarkup(product, images) {
  if (!images.length) {
    return [
      '<div class="pfd-stage" role="group" aria-label="Thư viện hình sản phẩm" aria-busy="false">',
      '<div class="pfd-stage-fallback">',
      '<span>Hình ảnh đang được cập nhật.</span>',
      '</div>',
      '</div>',
    ].join('\n          ');
  }

  const title = escapeHtml(product.title);
  const stageImages = images.map((image, index) => {
    const activeClass = index === 0 ? ' is-active' : '';
    const loading = index === 0 ? 'eager' : 'lazy';
    return `<img class="pfd-stage-image${activeClass}" data-pane-image="product" src="${escapeHtml(image)}" alt="${title}" loading="${loading}" decoding="async">`;
  }).join('\n            ');

  const thumbs = images.map((image, index) => {
    const activeClass = index === 0 ? ' is-active' : '';
    const selected = index === 0 ? 'true' : 'false';
    const tabindex = index === 0 ? '0' : '-1';
    return [
      `<button class="pfd-thumb${activeClass}" type="button" role="tab" data-thumb-target="product" aria-selected="${selected}" tabindex="${tabindex}" aria-label="Hiển thị hình sản phẩm ${index + 1}">`,
      `<img src="${escapeHtml(image)}" alt="">`,
      `<span class="sr-only">Hình sản phẩm ${index + 1}</span>`,
      '</button>',
    ].join('\n              ');
  }).join('\n            ');

  return [
    '<div class="pfd-stage" role="group" aria-label="Thư viện hình sản phẩm" aria-busy="true">',
    stageImages,
    '<div class="pfd-stage-fallback" hidden>',
    '<span>Hình ảnh đang được cập nhật.</span>',
    '</div>',
    '</div>',
    '<div class="pfd-thumbs" role="tablist" aria-label="Chọn hình sản phẩm">',
    thumbs,
    '</div>',
  ].join('\n          ');
}

function summaryAttributes(product, info, category, brand) {
  return SUMMARY_FIELDS.map(([label, ...keys]) => {
    let value;
    if (keys[0] === 'category') {
      value = category.label;
    } else if (keys[0] === 'Thương hiệu') {
      value = brand;
    } else {
      value = valueFromInfo(info, keys);
    }
    if (!value) return '';
    return [
      '<div class="pfd-attribute">',
      `<span class="pfd-attribute-label">${escapeHtml(label)}</span>`,
      `<span>${escapeHtml(value)}</span>`,
      '</div>',
    ].join('\n            ');
  }).filter(Boolean).join('\n          ');
}

function detailPanel(info, category) {
  const FIELD_PRIORITY = [
    'Mã sản phẩm',
    'Loại sản phẩm',
    'Thương hiệu',
    'Giá',
    'Dòng sản phẩm',
    'Công nghệ',
    'Kích thước',
    'Kích thước (D x R x C)',
    'Kiểu xả',
    'Hệ thống xả',
    'Lưu lượng xả',
    'Tâm thoát',
    'Áp lực nước',
    'Tính năng',
    'Chuẩn chống nước',
    'Nguồn điện',
  ];

  const keys = [
    ...FIELD_PRIORITY,
    ...Object.keys(info).filter((key) => !FIELD_PRIORITY.includes(key)),
  ];
  const rows = [];
  const seen = new Set();

  rows.push(`<p><b>DANH MỤC</b>: ${escapeHtml(category.label)}</p>`);
  keys.forEach((key) => {
    if (seen.has(key) || EXCLUDED_INFO_KEYS.has(key)) return;
    seen.add(key);
    const value = cleanText(info[key]);
    if (!value) return;
    if (key === 'Kích cỡ' && value === valueFromInfo(info, ['Kích thước', 'Kích thước (D x R x C)'])) return;
    if (key === 'Giá bản lẻ đề xuất' && value === valueFromInfo(info, ['Giá'])) return;
    rows.push(`<p><b>${escapeHtml(key.toUpperCase())}</b>: ${escapeHtml(value)}</p>`);
  });

  return rows.join('\n            ');
}

function productDisplayTitle(product, info) {
  const code = valueFromInfo(info, ['Mã sản phẩm']);
  const title = cleanText(product.title);
  const titleHasCode = code && title.toLowerCase().includes(code.toLowerCase());
  return cleanText(`${title}${code && !titleHasCode ? ` ${code}` : ''}`);
}

function metaDescription(product, info, category, brand) {
  const title = productDisplayTitle(product, info);
  const type = category.label;
  return cleanText(`${title} — ${type}${brand ? ` thương hiệu ${brand}` : ''} tại Lavatiles.`).slice(0, 155);
}

function leadText(product, info, category, brand) {
  const type = valueFromInfo(info, ['Loại sản phẩm']) || category.label;
  const size = valueFromInfo(info, ['Kích thước', 'Kích thước (D x R x C)']);
  const parts = [brand && `thương hiệu ${brand}`, size && `kích thước ${size}`].filter(Boolean);
  return parts.length ? `${type} ${parts.join(', ')}.` : `Sản phẩm ${type.toLowerCase()} tại Lavatiles.`;
}

function renderTemplate(template, replacements) {
  return Object.entries(replacements).reduce((html, [key, value]) => {
    return html.replaceAll(`{{${key}}}`, value);
  }, template);
}

function main() {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  let totalProducts = 0;
  let missingImages = 0;
  let missingCode = 0;

  for (const { file, brand } of BRANDS) {
    if (brand === 'TOTO' && fs.existsSync(TOTO_TREE_PATH)) continue;
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  Skipping ${file}: not found`);
      continue;
    }

    const data = readJson(filePath);
    console.log(`\nProcessing ${brand} (${file})`);

    for (const [catKey, products] of Object.entries(data)) {
      const category = parseCategory(catKey);
      const outputDir = path.join(OUTPUT_ROOT, category.slug);
      fs.mkdirSync(outputDir, { recursive: true });

      for (const [slug, product] of Object.entries(products)) {
        const info = product.product_info || {};
        const code = valueFromInfo(info, ['Mã sản phẩm']) || slug;
        const images = productImages(product.images);
        const description = code;

        if (!images.length) missingImages += 1;
        if (!valueFromInfo(info, ['Mã sản phẩm'])) missingCode += 1;

        const outputName = `${slug}.html`;
        const outputPath = path.join(outputDir, outputName);

        // Category detail pages sit one level below the sanitary index.
        const listingUrl = path.relative(outputDir, path.join(OUTPUT_ROOT, 'index.html'));

        fs.writeFileSync(outputPath, renderTemplate(template, {
          PAGE_TITLE: `${escapeHtml(productDisplayTitle(product, info))} | Lavatiles`,
          META_DESCRIPTION: escapeHtml(metaDescription(product, info, category, brand)),
          ROOT: ROOT_FROM_DETAIL,
          PRODUCT_CODE: escapeHtml(code),
          PRODUCT_TITLE: escapeHtml(productDisplayTitle(product, info)),
          CATEGORY_LABEL: escapeHtml(category.label),
          LISTING_URL: listingUrl,
          GALLERY: galleryMarkup(product, images),
          DESCRIPTION: escapeHtml(description),
          LEAD: escapeHtml(leadText(product, info, category, brand)),
          ATTRIBUTES: summaryAttributes(product, info, category, brand),
          DETAIL_PANEL: detailPanel(info, category),
          SHARE_URL: encodeURIComponent(`https://vietceramics.com/san-pham/thiet-bi-ve-sinh/${category.slug}/${slug}/`),
        }), 'utf8');

        totalProducts += 1;
      }
    }
  }

  if (fs.existsSync(TOTO_TREE_PATH)) {
    console.log('\nProcessing TOTO (crawled product tree)');
    const data = readJson(TOTO_TREE_PATH);
    const totoProducts = flattenTotoTree(data);
    const totoSlugs = new Set(totoProducts.map(({ slug }) => slug));
    const expectedPaths = new Set(totoProducts.map(({ slug, category }) => `${category.slug}/${slug}.html`));

    // Remove stale TOTO copies left behind when a SKU changes canonical category.
    for (const categoryEntry of fs.readdirSync(OUTPUT_ROOT, { withFileTypes: true })) {
      if (!categoryEntry.isDirectory()) continue;
      const categoryDir = path.join(OUTPUT_ROOT, categoryEntry.name);
      for (const fileEntry of fs.readdirSync(categoryDir, { withFileTypes: true })) {
        if (!fileEntry.isFile() || !fileEntry.name.endsWith('.html')) continue;
        const relativePath = `${categoryEntry.name}/${fileEntry.name}`;
        const slug = fileEntry.name.slice(0, -5);
        if (totoSlugs.has(slug) && !expectedPaths.has(relativePath)) {
          fs.unlinkSync(path.join(categoryDir, fileEntry.name));
        }
      }
    }

    for (const { slug, product, sourceCategories, category } of totoProducts) {
      const info = product.product_info || {};
      const images = productImages(product.images);
      const code = valueFromInfo(info, ['Mã sản phẩm']) || slug;
      const description = code;
      const outputDir = path.join(OUTPUT_ROOT, category.slug);
      const outputPath = path.join(outputDir, `${slug}.html`);
      fs.mkdirSync(outputDir, { recursive: true });

      if (!images.length) missingImages += 1;
      if (!valueFromInfo(info, ['Mã sản phẩm'])) missingCode += 1;

      const listingUrl = path.relative(outputDir, path.join(OUTPUT_ROOT, 'index.html'));
      fs.writeFileSync(outputPath, renderTemplate(template, {
        PAGE_TITLE: `${escapeHtml(productDisplayTitle(product, info))} | Lavatiles`,
        META_DESCRIPTION: escapeHtml(metaDescription(product, info, category, 'TOTO')),
        ROOT: ROOT_FROM_DETAIL,
        PRODUCT_CODE: escapeHtml(code),
        PRODUCT_TITLE: escapeHtml(productDisplayTitle(product, info)),
        CATEGORY_LABEL: escapeHtml(category.label),
        LISTING_URL: listingUrl,
        GALLERY: galleryMarkup(product, images),
        DESCRIPTION: escapeHtml(description),
        LEAD: escapeHtml(leadText(product, info, category, 'TOTO')),
        ATTRIBUTES: summaryAttributes(product, info, category, 'TOTO'),
        DETAIL_PANEL: detailPanel(info, category),
        SHARE_URL: encodeURIComponent(`https://vietceramics.com/san-pham/thiet-bi-ve-sinh/${category.slug}/${slug}/`),
      }), 'utf8');

      totalProducts += 1;
      if (sourceCategories.length === 0) console.warn(`  ${slug}: no source categories`);
    }
  }

  console.log(`\nDone. Generated ${totalProducts} sanitary product detail pages.`);
  console.log(`Products without images: ${missingImages}`);
  console.log(`Products without explicit SKU: ${missingCode}`);
}

main();
