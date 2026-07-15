#!/usr/bin/env node
/**
 * Reads the 4 brand catalogue JSONs and generates individual HTML detail pages
 * under san-pham/thiet-bi-ve-sinh/{category-slug}/{product-slug}.html
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data/products');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates/sanitary-detail.html');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'san-pham/thiet-bi-ve-sinh');
const ROOT_FROM_DETAIL = '../../..';
const LISTING_FROM_DETAIL = '../index.html';
const LISTING_FROM_TATCA = '../tat-ca.html';

const BRANDS = [
  { file: 'catalogue-caesar-06-2026.json', brand: 'Caesar' },
  { file: 'catalogue-toto-2026.json', brand: 'TOTO' },
  { file: 'catalogue-inax-2026.json', brand: 'INAX' },
  { file: 'catalogue-t1-2026-sc.json', brand: 'Viglacera' },
];

const CATEGORY_NAME_MAP = {
  'ban-cau-thong-minh': 'Bàn cầu thông minh',
  'ban-cau-dien-tu': 'Bàn cầu điện tử',
  'nap-ban-cau-dien-tu': 'Nắp bàn cầu điện tử',
  'nap-rua-dien-tu': 'Nắp rửa điện tử',
  'nap-rua-co': 'Nắp rửa cơ',
  'nap-ban-cau-co': 'Nắp bàn cầu cơ',
  'ban-cau-mot-khoi': 'Bàn cầu một khối',
  'ban-cau-hai-khoi': 'Bàn cầu hai khối',
  'ban-cau-cong-cong': 'Bàn cầu công cộng',
  'ban-cau-treo-tuong': 'Bàn cầu treo tường',
  'ban-cau-xa-cam-ung': 'Bàn cầu xả cảm ứng',
  'phu-kien-ban-cau': 'Phụ kiện bàn cầu',
  'lavabo-tu': 'Lavabo tủ',
  'chau-dat-ban': 'Chậu đặt bàn',
  'chau-duong-ban': 'Chậu dương bàn',
  'chau-am-ban': 'Chậu âm bàn',
  'chau-ban-da': 'Chậu bàn đá',
  'chau-cerafine': 'Chậu Cerafine',
  'chau-treo-tuong': 'Chậu treo tường',
  'chau-rua-chen': 'Chậu rửa chén',
  'chau-rua-tich-hop': 'Chậu rửa tích hợp',
  'chau-rua': 'Chậu rửa',
  'bon-tieu': 'Bồn tiểu',
  'voi-bep': 'Vòi bếp',
  'voi-lanh': 'Vòi lạnh',
  'voi-chau-cam-ung': 'Vòi chậu cảm ứng',
  'voi-chau-cao': 'Vòi chậu cao',
  'voi-chau': 'Vòi chậu',
  'voi-rua-bat': 'Vòi rửa bát',
  'voi-bon-tam': 'Vòi bồn tắm',
  'sen-tam': 'Sen tắm',
  'bon-tam': 'Bồn tắm',
  'phu-kien': 'Phụ kiện',
  'chan-chau': 'Chân chậu',
  'ga-thoat-san': 'Ga thoát sàn',
};

// Sorted longest-first so we match the most specific prefix
const CATEGORY_PREFIXES = Object.keys(CATEGORY_NAME_MAP).sort((a, b) => b.length - a.length);

const SUMMARY_FIELDS = [
  ['Danh mục', 'category'],
  ['Loại sản phẩm', 'Loại sản phẩm'],
  ['Thương hiệu', 'Thương hiệu'],
  ['Kích thước', 'Kích thước', 'Kích thước (D x R x C)'],
  ['Công nghệ', 'Công nghệ', 'Tính năng'],
  ['Kiểu xả', 'Kiểu xả', 'Hệ thống xả'],
  ['Giá', 'Giá'],
];

const EXCLUDED_INFO_KEYS = new Set(['Lượt xem', 'Số lượng']);

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
      return { slug: prefix, label: CATEGORY_NAME_MAP[prefix] };
    }
  }
  return { slug: catKey, label: catKey.replace(/-/g, ' ') };
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
    rows.push(`<p><b>${escapeHtml(key.toUpperCase())}</b>: ${escapeHtml(value)}</p>`);
  });

  return rows.join('\n            ');
}

function metaDescription(product, info, category, brand) {
  const code = valueFromInfo(info, ['Mã sản phẩm']);
  const titleHasCode = code && product.title.toLowerCase().includes(code.toLowerCase());
  const type = category.label;
  return cleanText(`${product.title}${code && !titleHasCode ? ` ${code}` : ''} — ${type}${brand ? ` thương hiệu ${brand}` : ''} tại Lavatile.`).slice(0, 155);
}

function leadText(product, info, category, brand) {
  const type = valueFromInfo(info, ['Loại sản phẩm']) || category.label;
  const size = valueFromInfo(info, ['Kích thước', 'Kích thước (D x R x C)']);
  const parts = [brand && `thương hiệu ${brand}`, size && `kích thước ${size}`].filter(Boolean);
  return parts.length ? `${type} ${parts.join(', ')}.` : `Sản phẩm ${type.toLowerCase()} tại Lavatile.`;
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
        const description = cleanText(product.description) || leadText(product, info, category, brand);

        if (!images.length) missingImages += 1;
        if (!valueFromInfo(info, ['Mã sản phẩm'])) missingCode += 1;

        const outputName = `${slug}.html`;
        const outputPath = path.join(outputDir, outputName);

        // Determine the listing URL based on depth — tat-ca.html is at same level as category dirs
        const listingUrl = path.relative(outputDir, path.join(OUTPUT_ROOT, 'tat-ca.html'));

        fs.writeFileSync(outputPath, renderTemplate(template, {
          PAGE_TITLE: `${escapeHtml(product.title)} | Lavatile`,
          META_DESCRIPTION: escapeHtml(metaDescription(product, info, category, brand)),
          ROOT: ROOT_FROM_DETAIL,
          PRODUCT_CODE: escapeHtml(code),
          PRODUCT_TITLE: escapeHtml(product.title),
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

  console.log(`\nDone. Generated ${totalProducts} sanitary product detail pages.`);
  console.log(`Products without images: ${missingImages}`);
  console.log(`Products without explicit SKU: ${missingCode}`);
}

main();
