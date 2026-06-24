const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const RAW_DATA_DIR = path.join(ROOT_DIR, 'data/products');
const CANONICAL_DATA_DIR = path.join(RAW_DATA_DIR, 'canonical');
const DATA_DIR = fs.existsSync(path.join(CANONICAL_DATA_DIR, 'products-tree.json')) ? CANONICAL_DATA_DIR : RAW_DATA_DIR;
const COLLECTIONS_INDEX_PATH = path.join(ROOT_DIR, 'data/collections/collections-index.json');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates/product-detail.html');
const COLLECTION_TEMPLATE_PATH = path.join(ROOT_DIR, 'templates/collection-detail.html');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'san-pham/gach-op-lat');
const MANIFEST_PATH = path.join(ROOT_DIR, 'js/generated-products.js');
const COLLECTIONS_MANIFEST_PATH = path.join(ROOT_DIR, 'js/generated-collections.js');
const COLLECTION_DETAIL_PATH = path.join(OUTPUT_ROOT, 'bo-suu-tap.html');
const ROOT_FROM_DETAIL = '../../..';
const LISTING_FROM_DETAIL = '../index.html';
const ROOT_FROM_COLLECTION_DETAIL = '../..';
const LISTING_FROM_COLLECTION_DETAIL = 'index.html';

const CATEGORY_LABELS = {
  'gach-lat-nen': 'Gạch lát nền',
  'gach-san-vuon': 'Gạch sân vườn',
  'ngoi-phng-t': 'Ngói phẳng',
  'ngoi-song': 'Ngói sóng',
  'gach-40x80': 'Gạch 40x80',
  'gach-40x60': 'Gạch 40x60',
  'gach-op-lat': 'Gạch ốp lát',
  'san-pham-khac': 'Sản phẩm khác',
  'bst-song-hong': 'BST Sông Hồng',
  'bst-cuu-long': 'BST Cửu Long',
  'bo-suu-tap-platinum': 'Bộ sưu tập Platinum',
  'united-tiles-1': 'United Tiles',
  'porcelain-kho-lon': 'Porcelain khổ lớn',
  gach: 'Gạch',
};

const FIELD_PRIORITY = [
  'Mã sản phẩm',
  'Loại sản phẩm',
  'Xương gạch',
  'Kích thước',
  'Bề mặt men',
  'Bề mặt',
  'Công nghệ sản xuất',
  'Công nghệ in',
  'Họa tiết',
  'Hãng sản xuất',
  'Ứng dụng',
  'Quy cách đóng gói',
  'Giá',
];

const SUMMARY_FIELDS = [
  ['Danh mục', 'category'],
  ['Loại sản phẩm', 'Loại sản phẩm'],
  ['Kích thước', 'Kích thước'],
  ['Bề mặt', 'Bề mặt men', 'Bề mặt'],
  ['Xương gạch', 'Xương gạch'],
  ['Họa tiết', 'Họa tiết'],
  ['Ứng dụng', 'Ứng dụng'],
  ['Thương hiệu', 'Hãng sản xuất'],
  ['Quy cách đóng gói', 'Quy cách đóng gói'],
  ['Giá', 'Giá'],
];

const EXCLUDED_INFO_KEYS = new Set([
  'Số lượng',
  'Lượt xem',
  'Số điện thoại',
  'Email',
  'Website',
]);

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

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || cleanText(category).replace(/-/g, ' ');
}

function inferCategory(title) {
  if (/ngói sóng/i.test(title)) return 'ngoi-song';
  if (/ngói phẳng/i.test(title)) return 'ngoi-phng-t';
  if (/sân vườn/i.test(title)) return 'gach-san-vuon';
  if (/40x80/i.test(title)) return 'gach-40x80';
  if (/40x60/i.test(title)) return 'gach-40x60';
  if (/gạch lát nền/i.test(title)) return 'gach-lat-nen';
  return 'gach';
}

function buildCategoryMap() {
  const treePath = path.join(DATA_DIR, 'products-tree.json');
  const map = new Map();

  if (!fs.existsSync(treePath)) {
    return map;
  }

  const tree = readJson(treePath);
  Object.entries(tree).forEach(([category, products]) => {
    Object.values(products).forEach((product) => {
      const key = cleanText(product.title).toLowerCase();
      if (key) {
        map.set(key, category);
      }
      if (product.canonical && product.canonical.sku_key) {
        map.set(`sku:${product.canonical.sku_key}`, category);
      }
    });
  });
  return map;
}

function valueFromInfo(info, keys) {
  for (const key of keys) {
    const value = cleanText(info[key]);
    if (value) return value;
  }
  return '';
}

function normalizedFinish(info) {
  const raw = valueFromInfo(info, ['Bề mặt men', 'Bề mặt']);
  if (/^\d+\s*x\s*\d+/i.test(raw) || /\bcm\b/i.test(raw)) return 'Đang cập nhật';
  if (/porcelain/i.test(raw)) return 'Đang cập nhật';
  if (/bóng|glossy|polish/i.test(raw)) return 'Bóng';
  if (/mờ|matte|matt/i.test(raw)) return 'Mờ';
  if (/nhám/i.test(raw)) return 'Nhám';
  return raw || 'Đang cập nhật';
}

function normalizedSize(info) {
  return valueFromInfo(info, ['Kích thước'])
    .replace(/\s+/g, '')
    .replace(/×/g, 'x')
    .replace(/X/g, 'x') || 'Đang cập nhật';
}

function placementFromInfo(info, category) {
  const application = cleanText(info['Ứng dụng']);
  const values = [];

  if (/lát|nền/i.test(application)) values.push('Sàn');
  if (/ốp|tường/i.test(application)) values.push('Tường');
  if (/sân|vườn/i.test(application) || category === 'gach-san-vuon') values.push('Ngoài trời');
  if (!values.length && application) values.push(application);
  if (!values.length && /^ngoi/.test(category)) values.push('Mái');

  return values.length ? values : ['Đang cập nhật'];
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

function sourceImage(image) {
  return cleanText(image)
    .replace(/\\/g, '/')
    .replace(/-\d+x\d+(?=\.(?:png|jpe?g|webp|avif)(?:$|\?))/i, '');
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

function summaryAttributes(product, info, category) {
  return SUMMARY_FIELDS.map(([label, ...keys]) => {
    const value = keys[0] === 'category' ? categoryLabel(category) : valueFromInfo(info, keys);
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
  const keys = [
    ...FIELD_PRIORITY,
    ...Object.keys(info).filter((key) => !FIELD_PRIORITY.includes(key)),
  ];
  const rows = [];
  const seen = new Set();

  rows.push(`<p><b>DANH MỤC</b>: ${escapeHtml(categoryLabel(category))}</p>`);
  keys.forEach((key) => {
    if (seen.has(key) || EXCLUDED_INFO_KEYS.has(key)) return;
    seen.add(key);
    const value = cleanText(info[key]);
    if (!value) return;
    rows.push(`<p><b>${escapeHtml(key.toUpperCase())}</b>: ${escapeHtml(value)}</p>`);
  });

  return rows.join('\n            ');
}

function productCategory(product, info, categoryMap) {
  if (product.canonical && product.canonical.category_slug) {
    return product.canonical.category_slug;
  }
  const skuKey = product.canonical && product.canonical.sku_key;
  if (skuKey && categoryMap.has(`sku:${skuKey}`)) {
    return categoryMap.get(`sku:${skuKey}`);
  }
  const titleKey = cleanText(product.title).toLowerCase();
  return categoryMap.get(titleKey) || inferCategory(product.title);
}

function metaDescription(product, info, category) {
  const code = valueFromInfo(info, ['Mã sản phẩm']);
  const size = valueFromInfo(info, ['Kích thước']);
  const type = valueFromInfo(info, ['Loại sản phẩm']) || categoryLabel(category);
  const titleHasCode = code && product.title.toLowerCase().includes(code.toLowerCase());
  return cleanText(`${product.title}${code && !titleHasCode ? ` ${code}` : ''} thuộc nhóm ${type}${size ? `, kích thước ${size}` : ''} tại Lavatile.`).slice(0, 155);
}

function leadText(product, info, category) {
  const type = valueFromInfo(info, ['Loại sản phẩm']) || categoryLabel(category);
  const size = valueFromInfo(info, ['Kích thước']);
  const finish = valueFromInfo(info, ['Bề mặt men', 'Bề mặt']);
  const details = [size && `kích thước ${size}`, finish && `bề mặt ${finish.toLowerCase()}`].filter(Boolean).join(', ');
  return details ? `${type} với ${details}.` : `Sản phẩm thuộc nhóm ${categoryLabel(category).toLowerCase()} với thông tin kỹ thuật được cập nhật từ dữ liệu sản phẩm.`;
}

function renderTemplate(template, replacements) {
  return Object.entries(replacements).reduce((html, [key, value]) => {
    return html.replaceAll(`{{${key}}}`, value);
  }, template);
}

function uniqueSorted(values) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi'));
}

function buildFacets(manifest) {
  return {
    categories: uniqueSorted(manifest.map((product) => product.category)).map((label) => {
      const product = manifest.find((item) => item.category === label);
      return { label, value: label, slug: product ? product.categorySlug : slugify(label) };
    }),
    finishes: uniqueSorted(manifest.map((product) => product.finish)).map((label) => ({ label, value: label })),
    sizes: uniqueSorted(manifest.map((product) => product.size)).map((label) => ({ label, value: label })),
    placements: uniqueSorted(manifest.flatMap((product) => product.placement)).map((label) => ({ label, value: label })),
  };
}

function buildCollectionsManifest() {
  if (!fs.existsSync(COLLECTIONS_INDEX_PATH)) {
    return [];
  }

  const index = readJson(COLLECTIONS_INDEX_PATH);
  return Object.entries(index).flatMap(([source, collections]) => {
    return Object.entries(collections).map(([slug, item]) => {
      const collectionPath = path.join(ROOT_DIR, item.file);
      const collection = fs.existsSync(collectionPath) ? readJson(collectionPath) : {};
      const images = productImages(collection.images || []);
      const heroImage = sourceImage(collection.hero_image || images[0] || '');
      return {
        title: item.title,
        brand: item.brand,
        type: item.type,
        source,
        slug,
        image: heroImage,
        images: images.map(sourceImage),
        description: cleanText(collection.description || ''),
        productInfo: collection.product_info || {},
        productCodes: item.product_codes || [],
        detailUrl: `bo-suu-tap.html?source=${encodeURIComponent(source)}&collection=${encodeURIComponent(slug)}`,
        sourceUrl: collection.source_ref && collection.source_ref.url || '',
      };
    });
  }).filter((collection) => collection.title)
    .sort((a, b) => a.brand.localeCompare(b.brand, 'vi') || a.title.localeCompare(b.title, 'vi'));
}

function writeCollectionDetailTemplate() {
  if (!fs.existsSync(COLLECTION_TEMPLATE_PATH)) {
    return;
  }

  const template = fs.readFileSync(COLLECTION_TEMPLATE_PATH, 'utf8');
  fs.writeFileSync(COLLECTION_DETAIL_PATH, renderTemplate(template, {
    ROOT: ROOT_FROM_COLLECTION_DETAIL,
    LISTING_URL: LISTING_FROM_COLLECTION_DETAIL,
  }), 'utf8');
}

function main() {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const categoryMap = buildCategoryMap();
  const files = fs.readdirSync(DATA_DIR)
    .filter((file) => file.endsWith('.json') && !['products-tree.json', '_dedup-report.json'].includes(file))
    .sort();

  const manifest = [];
  let missingImages = 0;
  let missingCode = 0;

  files.forEach((file) => {
    const product = readJson(path.join(DATA_DIR, file));
    const info = product.product_info || {};
    const category = productCategory(product, info, categoryMap);
    const categorySlug = slugify(category);
    const outputDir = path.join(OUTPUT_ROOT, categorySlug);
    const outputName = file.replace(/\.json$/, '.html');
    const outputPath = path.join(outputDir, outputName);
    const images = productImages(product.images);
    const code = valueFromInfo(info, ['Mã sản phẩm']) || path.basename(file, '.json');
    const description = cleanText(product.description) || leadText(product, info, category);
    const detailUrl = `${categorySlug}/${outputName}`;
    const brand = valueFromInfo(info, ['Hãng sản xuất']) || 'Lavatile';

    if (!images.length) missingImages += 1;
    if (!valueFromInfo(info, ['Mã sản phẩm'])) missingCode += 1;

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, renderTemplate(template, {
      PAGE_TITLE: `${escapeHtml(product.title)} | Lavatile`,
      META_DESCRIPTION: escapeHtml(metaDescription(product, info, category)),
      ROOT: ROOT_FROM_DETAIL,
      PRODUCT_CODE: escapeHtml(code),
      PRODUCT_TITLE: escapeHtml(product.title),
      CATEGORY_LABEL: escapeHtml(categoryLabel(category)),
      LISTING_URL: LISTING_FROM_DETAIL,
      GALLERY: galleryMarkup(product, images),
      DESCRIPTION: escapeHtml(description),
      LEAD: escapeHtml(leadText(product, info, category)),
      ATTRIBUTES: summaryAttributes(product, info, category),
      DETAIL_PANEL: detailPanel(info, category),
      SHARE_URL: encodeURIComponent(`https://vietceramics.com/san-pham/gach-op-lat/${detailUrl.replace(/\.html$/, '/')}`),
    }), 'utf8');

    manifest.push({
      code,
      title: product.title,
      collection: categoryLabel(category),
      category: categoryLabel(category),
      categorySlug,
      finish: normalizedFinish(info),
      finishLabel: valueFromInfo(info, ['Bề mặt men', 'Bề mặt']) || normalizedFinish(info),
      color: valueFromInfo(info, ['Họa tiết']) || 'Đang cập nhật',
      size: normalizedSize(info),
      placement: placementFromInfo(info, category),
      country: brand,
      image: images[0] || '',
      detailUrl,
    });
  });

  const manifestJs = [
    '// Generated by script/generate-product-pages.js. Do not edit by hand.',
    `window.LavatileProductDataSource = ${JSON.stringify(path.relative(ROOT_DIR, DATA_DIR))};`,
    `window.LavatileProductFacets = ${JSON.stringify(buildFacets(manifest), null, 2)};`,
    'window.LavatileGeneratedProducts = ',
    JSON.stringify(manifest, null, 2),
    ';',
    '',
  ].join('\n');

  fs.writeFileSync(MANIFEST_PATH, manifestJs, 'utf8');

  const collections = buildCollectionsManifest();
  const collectionsJs = [
    '// Generated by script/generate-product-pages.js. Do not edit by hand.',
    'window.LavatileGeneratedCollections = ',
    JSON.stringify(collections, null, 2),
    ';',
    '',
  ].join('\n');

  fs.writeFileSync(COLLECTIONS_MANIFEST_PATH, collectionsJs, 'utf8');
  writeCollectionDetailTemplate();

  console.log(`Generated ${files.length} product detail pages.`);
  console.log(`Manifest: ${path.relative(ROOT_DIR, MANIFEST_PATH)} (${manifest.length} products)`);
  console.log(`Collections manifest: ${path.relative(ROOT_DIR, COLLECTIONS_MANIFEST_PATH)} (${collections.length} collections)`);
  console.log(`Products without product images: ${missingImages}`);
  console.log(`Products without explicit SKU: ${missingCode}`);
}

main();
