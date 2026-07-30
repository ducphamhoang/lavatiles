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
  flattenCaesarTree,
} = require('../scripts/toto-category-map');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data/products');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates/sanitary-detail.html');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'san-pham/thiet-bi-ve-sinh');
const ROOT_FROM_DETAIL = '../../..';
const TOTO_TREE_PATH = path.join(ROOT_DIR, 'data/product/new-toto/products-tree.json');
const INAX_TREE_PATH = path.join(ROOT_DIR, 'data/product/new-inax/products-tree.json');
const CAESAR_TREE_PATH = path.join(ROOT_DIR, 'data/product/new-caesar/products-tree.json');
const INAX_CATEGORY_MAP = {
  'shower-toilet': 'ban-cau-thong-minh',
  toilet: 'ban-cau',
  basin: 'chau-rua',
  shower: 'voi-chau',
  bathtub: 'bon-tam',
  urinal: 'bon-tieu',
  accessories: 'phu-kien',
  'bathroom-faucet': 'voi-chau',
  'kitchent-faucet': 'voi-bep',
  'bidet-sanitary-ware': 'nap-rua-dien-tu',
};

const BRANDS = [
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

function removeInaxHotline(value) {
  return String(value == null ? '' : value)
    .replace(/\s*-?\s*Hotline(?: tư vấn(?: và bảo hành(?: chính hãng)?|))?:?\s*1800\s*6633/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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

function productImagesForPage(images, dataRoot, outputDir) {
  return productImages(images).map((image) => {
    if (/^(https?:|\/)/i.test(image)) return image;
    const absolute = path.resolve(dataRoot, image);
    return path.relative(outputDir, absolute).replace(/\\/g, '/');
  });
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

  return removeInaxHotline(rows.join('\n            '));
}

function inaxDetailPanel(product) {
  const html = product.description_html || '';
  const match = html.match(/<h2[^>]*>\s*Thông số kỹ thuật.*?<\/h2>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
  if (match) {
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const rows = [];
    let tr;
    while ((tr = trRegex.exec(match[1])) !== null) {
      const cells = [];
      let td;
      const trInner = tr[1];
      while ((td = tdRegex.exec(trInner)) !== null) {
        cells.push(cleanText(td[1].replace(/<[^>]+>/g, '')));
      }
      if (cells.length >= 2 && !(cells[0].toLowerCase() === 'tiêu chí' && cells[1].toLowerCase() === 'thông tin')) {
        rows.push(`<p><b>${escapeHtml(cells[0].toUpperCase())}</b>: ${cells[1]}</p>`);
      }
    }
    if (rows.length) return removeInaxHotline(rows.join('\n            '));
  }
  const info = product.product_info || {};
  const rows = [];
  const seen = new Set();
  const categoryLabel = cleanText(info['Loại sản phẩm'] || '');
  if (categoryLabel) {
    rows.push(`<p><b>DANH MỤC</b>: ${escapeHtml(categoryLabel)}</p>`);
  }
  ['Mã sản phẩm', 'Depth', 'Height', 'Width'].forEach((key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const value = cleanText(info[key]);
    if (!value || key === 'URL') return;
    const label = key === 'Mã sản phẩm' ? 'Mã sản phẩm' : key === 'Depth' ? 'Kích thước (Sâu)' : key === 'Height' ? 'Kích thước (Cao)' : key === 'Width' ? 'Kích thước (Rộng)' : key;
    rows.push(`<p><b>${escapeHtml(label.toUpperCase())}</b>: ${escapeHtml(value)}</p>`);
  });
  const simpleParagraph = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((paragraph) => paragraph[1])
    .find((content) => /\S/.test(content) && !/<(?:a|img|iframe)\b/i.test(content));
  if (simpleParagraph) {
    const pContent = simpleParagraph;
    const brParts = pContent.split(/<br\s*\/?>/i);
    brParts.forEach((part) => {
      const text = cleanText(part);
      if (text && text.length > 5) rows.push(`<p>${escapeHtml(text)}</p>`);
    });
  }
  return removeInaxHotline(rows.join('\n            '));
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

function inaxDescription(product) {
  const html = cleanText(product.description_html || '');
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => cleanText(match[1].replace(/<[^>]+>/g, '')))
    .filter((text) => text.length > 20);
  const source = paragraphs[0] || cleanText(product.description || '');
  if (!source) return '';

  const sentence = source.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  if (sentence && sentence.length >= 60 && sentence.length <= 280) return sentence;
  return source.length > 280 ? `${source.slice(0, 277).replace(/\s+\S*$/, '')}...` : source;
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
          SHARE_URL: '#',
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
        SHARE_URL: '#',
      }), 'utf8');

      totalProducts += 1;
      if (sourceCategories.length === 0) console.warn(`  ${slug}: no source categories`);
    }
  }

  if (fs.existsSync(INAX_TREE_PATH)) {
    console.log('\nProcessing INAX (crawled product tree)');
    const data = readJson(INAX_TREE_PATH);
    const products = new Map();
    for (const [sourceCategory, entries] of Object.entries(data)) {
      for (const [slug, product] of Object.entries(entries || {})) {
        if (!products.has(slug)) products.set(slug, { slug, product, sourceCategory });
      }
    }

    for (const { slug, product, sourceCategory } of products.values()) {
      const categorySlug = INAX_CATEGORY_MAP[sourceCategory] || 'phu-kien';
      const category = categoryInfo(categorySlug);
      const info = product.product_info || {};
      const code = valueFromInfo(info, ['Mã sản phẩm']) || slug;
      const outputDir = path.join(OUTPUT_ROOT, category.slug);
      const outputPath = path.join(outputDir, `${slug}.html`);
      const images = productImagesForPage(product.images, path.dirname(INAX_TREE_PATH), outputDir);
      const description = inaxDescription(product) || code;
      fs.mkdirSync(outputDir, { recursive: true });

      if (!images.length) missingImages += 1;
      if (!valueFromInfo(info, ['Mã sản phẩm'])) missingCode += 1;

      const listingUrl = path.relative(outputDir, path.join(OUTPUT_ROOT, 'index.html'));
      fs.writeFileSync(outputPath, renderTemplate(template, {
        PAGE_TITLE: `${escapeHtml(productDisplayTitle(product, info))} | Lavatiles`,
        META_DESCRIPTION: escapeHtml(metaDescription(product, info, category, 'INAX')),
        ROOT: ROOT_FROM_DETAIL,
        PRODUCT_CODE: escapeHtml(code),
        PRODUCT_TITLE: escapeHtml(productDisplayTitle(product, info)),
        CATEGORY_LABEL: escapeHtml(category.label),
        LISTING_URL: listingUrl,
        GALLERY: galleryMarkup(product, images),
        DESCRIPTION: escapeHtml(description),
          LEAD: escapeHtml(description),
        ATTRIBUTES: summaryAttributes(product, info, category, 'INAX'),
        DETAIL_PANEL: inaxDetailPanel(product),
        SHARE_URL: '#',
      }), 'utf8');
      totalProducts += 1;
    }
  }

  if (fs.existsSync(CAESAR_TREE_PATH)) {
    console.log('\nProcessing Caesar (crawled product tree)');
    const data = readJson(CAESAR_TREE_PATH);
    const products = flattenCaesarTree(data);

    for (const { slug, product, sourceCategories, category } of products) {
      const info = product.product_info || {};
      const code = valueFromInfo(info, ['Mã sản phẩm']) || slug;
      const outputDir = path.join(OUTPUT_ROOT, category.slug);
      const outputPath = path.join(outputDir, `${slug}.html`);
      const images = productImagesForPage(product.images, path.dirname(CAESAR_TREE_PATH), outputDir);
      const description = cleanText(product.description) || code;
      fs.mkdirSync(outputDir, { recursive: true });

      if (!images.length) missingImages += 1;
      if (!valueFromInfo(info, ['Mã sản phẩm'])) missingCode += 1;

      const listingUrl = path.relative(outputDir, path.join(OUTPUT_ROOT, 'index.html'));
      fs.writeFileSync(outputPath, renderTemplate(template, {
        PAGE_TITLE: `${escapeHtml(productDisplayTitle(product, info))} | Lavatiles`,
        META_DESCRIPTION: escapeHtml(metaDescription(product, info, category, 'Caesar')),
        ROOT: ROOT_FROM_DETAIL,
        PRODUCT_CODE: escapeHtml(code),
        PRODUCT_TITLE: escapeHtml(productDisplayTitle(product, info)),
        CATEGORY_LABEL: escapeHtml(category.label),
        LISTING_URL: listingUrl,
        GALLERY: galleryMarkup(product, images),
        DESCRIPTION: escapeHtml(description),
        LEAD: escapeHtml(leadText(product, info, category, 'Caesar')),
        ATTRIBUTES: summaryAttributes(product, info, category, 'Caesar'),
        DETAIL_PANEL: detailPanel(info, category),
        SHARE_URL: '#',
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
