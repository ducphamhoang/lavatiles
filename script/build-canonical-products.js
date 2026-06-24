const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data/products');
const CANONICAL_DIR = path.join(DATA_DIR, 'canonical');
const COLLECTIONS_DIR = path.join(ROOT_DIR, 'data/collections');
const REPORT_PATH = path.join(CANONICAL_DIR, '_dedup-report.json');

const PRODUCT_SOURCES = new Set(['current', 'viglaceratiles']);
const COLLECTION_SOURCES = new Set(['eurotile', 'vastastone']);
const NEW_SOURCES = new Set(['viglaceratiles', 'eurotile', 'vastastone']);

const SOURCE_LABELS = {
  current: 'Current Hoathanhphat data',
  viglaceratiles: 'Viglacera Tiles official',
  eurotile: 'Eurotile official',
  vastastone: 'Vasta Stone official',
};

const SOURCE_BRANDS = {
  current: '',
  viglaceratiles: 'Viglacera',
  eurotile: 'Eurotile',
  vastastone: 'Vasta Stone',
};

const CATEGORY_LABELS = {
  'gach-lat-nen': 'Gạch lát nền',
  'gach-san-vuon': 'Gạch sân vườn',
  'ngoi-phng-t': 'Ngói phẳng',
  'ngoi-song': 'Ngói sóng',
  'gach-40x80': 'Gạch 40x80',
  'gach-40x60': 'Gạch 40x60',
  gach: 'Gạch',
  'gach-op-lat': 'Gạch ốp lát',
  'san-pham-khac': 'Sản phẩm khác',
};

const GENERIC_CODE_KEYS = new Set([
  'GACHOPLAT',
  'SANPHAM',
  'PRODUCT',
  'COLLECTION',
]);

const INFO_KEY_PRIORITY = [
  'Mã sản phẩm',
  'Loại sản phẩm',
  'Kích thước',
  'Bề mặt men',
  'Bề mặt',
  'Xương',
  'Xương gạch',
  'Loại gạch',
  'Công nghệ sản xuất',
  'Công nghệ in',
  'Họa tiết',
  'Ứng dụng',
  'Hãng sản xuất',
  'Thương hiệu',
  'Xuất xứ',
  'Quy cách đóng gói',
  'Giá',
];

const EXCLUDED_INFO_KEYS = new Set([
  'Số lượng',
  'Lượt xem',
  'Số điện thoại',
  'Email',
  'Website',
  'Nguồn dữ liệu',
  'URL',
  'Danh mục nguồn',
]);

function cleanText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function stripVietnamese(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function slugify(value) {
  return stripVietnamese(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function compactCode(value) {
  return stripVietnamese(value).replace(/[^a-z0-9]/g, '').toUpperCase();
}

function isUsableCodeKey(codeKey) {
  return codeKey.length >= 3 && !GENERIC_CODE_KEYS.has(codeKey);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.json') && file !== 'products-tree.json')
    .sort()
    .map((file) => path.join(dir, file));
}

function sourceFromPath(filePath) {
  const relative = path.relative(DATA_DIR, filePath);
  const firstPart = relative.split(path.sep)[0];
  return NEW_SOURCES.has(firstPart) ? firstPart : 'current';
}

function splitCodes(rawCode) {
  const raw = cleanText(rawCode);
  if (!raw) return [];
  return raw.split(/[,;|]/)
    .map((part) => cleanText(part))
    .filter((part) => compactCode(part).length >= 3);
}

function sourcePriority(sourceKey) {
  if (sourceKey === 'viglaceratiles') return 0;
  if (sourceKey === 'current') return 1;
  if (sourceKey === 'eurotile') return 2;
  if (sourceKey === 'vastastone') return 3;
  return 9;
}

function categoryLabel(categorySlug) {
  return CATEGORY_LABELS[categorySlug] || cleanText(categorySlug).replace(/-/g, ' ');
}

function buildCurrentCategoryMap() {
  const treePath = path.join(DATA_DIR, 'products-tree.json');
  const map = new Map();
  if (!fs.existsSync(treePath)) return map;

  const tree = readJson(treePath);
  Object.entries(tree).forEach(([category, products]) => {
    Object.entries(products || {}).forEach(([slug, product]) => {
      const titleKey = stripVietnamese(product.title);
      if (titleKey) map.set(titleKey, { categorySlug: category, sourceSlug: slug });
    });
  });
  return map;
}

function categoryFromViglaceraUrl(url) {
  if (!url) return '';
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const index = parts.indexOf('gach-op-lat');
    return index >= 0 && parts[index + 1] ? slugify(parts[index + 1]) : '';
  } catch {
    return '';
  }
}

function inferCategory(product, sourceKey, currentCategoryMap) {
  if (sourceKey === 'current') {
    const mapped = currentCategoryMap.get(stripVietnamese(product.title));
    if (mapped) return mapped.categorySlug;
  }

  const info = product.product_info || {};
  const fromSource = slugify(info['Danh mục nguồn']);
  if (fromSource) return fromSource;

  if (sourceKey === 'viglaceratiles') {
    const fromUrl = categoryFromViglaceraUrl(info.URL);
    if (fromUrl) return fromUrl;
  }

  const title = cleanText(product.title);
  if (/ngói sóng/i.test(title)) return 'ngoi-song';
  if (/ngói phẳng/i.test(title)) return 'ngoi-phng-t';
  if (/sân vườn/i.test(title)) return 'gach-san-vuon';
  if (/40\s*x?\s*80/i.test(title)) return 'gach-40x80';
  if (/40\s*x?\s*60/i.test(title)) return 'gach-40x60';
  if (/gạch lát nền/i.test(title)) return 'gach-lat-nen';
  return 'gach-op-lat';
}

function readRecords() {
  const currentCategoryMap = buildCurrentCategoryMap();
  const files = [
    ...listJsonFiles(DATA_DIR),
    ...Array.from(NEW_SOURCES).flatMap((source) => listJsonFiles(path.join(DATA_DIR, source))),
  ];

  return files.map((filePath) => {
    const product = readJson(filePath);
    const info = product.product_info || {};
    const sourceKey = sourceFromPath(filePath);
    const rawCodes = splitCodes(info['Mã sản phẩm']);
    const fallbackCodes = rawCodes.length ? [] : splitCodes(product.title);
    const rawCodeKeys = Array.from(new Set([...rawCodes, ...fallbackCodes].map(compactCode).filter(Boolean)));
    const codeKeys = rawCodeKeys.filter(isUsableCodeKey);
    const relativePath = path.relative(ROOT_DIR, filePath);
    const fileSlug = path.basename(filePath, '.json');

    return {
      sourceKey,
      sourceLabel: SOURCE_LABELS[sourceKey],
      filePath: relativePath,
      fileSlug,
      product,
      title: cleanText(product.title),
      titleKey: slugify(product.title),
      rawSku: cleanText(info['Mã sản phẩm']),
      codeKeys,
      primaryCodeKey: codeKeys[0] || '',
      categorySlug: inferCategory(product, sourceKey, currentCategoryMap),
      url: cleanText(info.URL),
      brand: cleanText(info['Hãng sản xuất'] || info['Thương hiệu'] || SOURCE_BRANDS[sourceKey]),
      imageCount: Array.isArray(product.images) ? product.images.length : 0,
    };
  });
}

function productRecords(records) {
  return records.filter((record) => PRODUCT_SOURCES.has(record.sourceKey));
}

function collectionRecords(records) {
  return records.filter((record) => COLLECTION_SOURCES.has(record.sourceKey));
}

function groupProductRecords(records) {
  const groups = new Map();
  const reviewQueue = [];

  productRecords(records).forEach((record) => {
    if (!record.primaryCodeKey) {
      reviewQueue.push({
        reason: 'missing_or_generic_sku',
        source: record.sourceKey,
        file: record.filePath,
        title: record.title,
        rawSku: record.rawSku,
      });
      return;
    }

    if (!groups.has(record.primaryCodeKey)) groups.set(record.primaryCodeKey, []);
    groups.get(record.primaryCodeKey).push(record);
  });

  return { groups, reviewQueue };
}

function sourceRef(record, role) {
  return {
    source: record.sourceKey,
    sourceLabel: record.sourceLabel,
    role,
    file: record.filePath,
    url: record.url || undefined,
    title: record.title,
    rawSku: record.rawSku || undefined,
    imageCount: record.imageCount,
  };
}

function firstUseful(records, selector) {
  for (const record of records) {
    const value = cleanText(selector(record));
    if (value) return value;
  }
  return '';
}

function unique(values) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const item = cleanText(value);
    if (!item || seen.has(item)) return;
    seen.add(item);
    result.push(item);
  });
  return result;
}

function cleanImages(record) {
  const images = Array.isArray(record.product.images) ? record.product.images : [];
  return images.filter((image) => {
    const src = cleanText(image);
    if (!src) return false;
    if (/logo|favicon|apple-touch-icon|zalo|icon|captcha|qrcode|qr-code|\/qr[-_0-9]/i.test(src)) return false;
    if (record.sourceKey === 'current') {
      return /\/thumbs\/480x381x2\/upload\/product\//.test(src)
        || (/\/upload\/product\//.test(src) && !/\/thumbs\/(?:37x37x2|277x220x2)\//.test(src));
    }
    if (record.sourceKey === 'viglaceratiles') {
      return /\/pictures\/(?:files|mobiles)\/3-sanpham\//i.test(src);
    }
    return /\.(?:avif|webp|png|jpe?g)(?:$|\?)/i.test(src);
  });
}

function mergedImages(records) {
  return unique(records
    .slice()
    .sort((a, b) => sourcePriority(a.sourceKey) - sourcePriority(b.sourceKey))
    .flatMap(cleanImages))
    .slice(0, 12);
}

function mergedInfo(records, sku) {
  const sorted = records.slice().sort((a, b) => sourcePriority(a.sourceKey) - sourcePriority(b.sourceKey));
  const keys = unique([
    ...INFO_KEY_PRIORITY,
    ...sorted.flatMap((record) => Object.keys(record.product.product_info || {})),
  ]);
  const info = {};

  keys.forEach((key) => {
    if (EXCLUDED_INFO_KEYS.has(key)) return;
    const value = firstUseful(sorted, (record) => (record.product.product_info || {})[key]);
    if (value) info[key] = value;
  });

  info['Mã sản phẩm'] = sku;
  if (!info['Hãng sản xuất']) {
    info['Hãng sản xuất'] = firstUseful(sorted, (record) => record.brand) || 'Viglacera';
  }
  if (!info.Giá) info.Giá = 'Liên hệ';

  return info;
}

function canonicalSlug(records, skuKey) {
  const current = records.find((record) => record.sourceKey === 'current');
  if (current) return current.fileSlug;
  return slugify(records[0].title || skuKey) || skuKey.toLowerCase();
}

function canonicalTitle(records, sku) {
  const current = records.find((record) => record.sourceKey === 'current' && record.title);
  if (current) return current.title;

  const branded = records.find((record) => /viglacera/i.test(record.title));
  if (branded) return branded.title;

  const title = firstUseful(records, (record) => record.title);
  if (/^gạch ốp lát$/i.test(title) || compactCode(title) === compactCode(sku)) {
    return `Gạch Viglacera ${sku}`;
  }
  return title || sku;
}

function canonicalDescription(records) {
  return firstUseful(records.slice().sort((a, b) => sourcePriority(a.sourceKey) - sourcePriority(b.sourceKey)), (record) => record.product.description);
}

function buildCanonicalProduct(skuKey, group) {
  const sorted = group.slice().sort((a, b) => sourcePriority(a.sourceKey) - sourcePriority(b.sourceKey));
  const primary = sorted[0];
  const sku = firstUseful(sorted, (record) => record.rawSku) || skuKey;
  const slug = canonicalSlug(group, skuKey);
  const categorySlug = firstUseful(group, (record) => record.sourceKey === 'current' ? record.categorySlug : '') ||
    firstUseful(sorted, (record) => record.categorySlug) ||
    'gach-op-lat';
  const brand = firstUseful(sorted, (record) => record.brand) || 'Viglacera';

  return {
    slug,
    data: {
      canonical_id: `${slugify(brand) || 'product'}-${slugify(sku) || skuKey.toLowerCase()}`,
      title: canonicalTitle(group, sku),
      product_info: mergedInfo(group, sku),
      description: canonicalDescription(group),
      images: mergedImages(group),
      view_count: 0,
      canonical: {
        status: 'survived',
        sku,
        sku_key: skuKey,
        brand,
        category_slug: categorySlug,
        category_label: categoryLabel(categorySlug),
        primary_source: primary.sourceKey,
        source_refs: sorted.map((record, index) => sourceRef(record, index === 0 ? 'primary' : 'duplicate')),
      },
    },
  };
}

function buildCollections(records) {
  return collectionRecords(records).map((record) => {
    const product = record.product;
    const info = product.product_info || {};
    const brand = record.brand || SOURCE_BRANDS[record.sourceKey];
    const slug = record.fileSlug;
    const productCodes = unique(splitCodes(info['Mã sản phẩm']).filter((code) => isUsableCodeKey(compactCode(code))));

    return {
      sourceKey: record.sourceKey,
      slug,
      data: {
        collection_id: `${record.sourceKey}-${slug}`,
        title: record.title,
        brand,
        type: record.sourceKey === 'vastastone' ? 'surface_collection' : 'tile_collection',
        product_codes: productCodes,
        product_info: Object.fromEntries(Object.entries(info).filter(([key, value]) => !EXCLUDED_INFO_KEYS.has(key) && cleanText(value))),
        description: cleanText(product.description),
        images: unique(Array.isArray(product.images) ? product.images : []).slice(0, 16),
        source_ref: sourceRef(record, 'primary'),
        canonical: {
          status: 'collection',
          source: record.sourceKey,
        },
      },
    };
  });
}

function resetGeneratedOutput() {
  fs.rmSync(CANONICAL_DIR, { recursive: true, force: true });
  fs.mkdirSync(CANONICAL_DIR, { recursive: true });
  fs.mkdirSync(COLLECTIONS_DIR, { recursive: true });
  Array.from(COLLECTION_SOURCES).forEach((sourceKey) => {
    fs.rmSync(path.join(COLLECTIONS_DIR, sourceKey), { recursive: true, force: true });
  });
  fs.rmSync(path.join(COLLECTIONS_DIR, 'collections-index.json'), { force: true });
}

function writeCanonicalProducts(canonicalProducts) {
  const tree = {};

  canonicalProducts.forEach(({ slug, data }) => {
    writeJson(path.join(CANONICAL_DIR, `${slug}.json`), data);
    const categorySlug = data.canonical.category_slug;
    if (!tree[categorySlug]) tree[categorySlug] = {};
    tree[categorySlug][slug] = data;
  });

  writeJson(path.join(CANONICAL_DIR, 'products-tree.json'), tree);
}

function writeCollections(collections) {
  const index = {};

  collections.forEach(({ sourceKey, slug, data }) => {
    const outputPath = path.join(COLLECTIONS_DIR, sourceKey, `${slug}.json`);
    writeJson(outputPath, data);
    if (!index[sourceKey]) index[sourceKey] = {};
    index[sourceKey][slug] = {
      title: data.title,
      brand: data.brand,
      type: data.type,
      file: path.relative(ROOT_DIR, outputPath),
      product_codes: data.product_codes,
    };
  });

  writeJson(path.join(COLLECTIONS_DIR, 'collections-index.json'), index);
}

function buildReport(records, canonicalProducts, collections, duplicateGroups, reviewQueue) {
  const duplicateActions = duplicateGroups.map(([skuKey, group]) => {
    const canonical = canonicalProducts.find((item) => item.data.canonical.sku_key === skuKey);
    return {
      sku_key: skuKey,
      canonical_file: canonical ? path.relative(ROOT_DIR, path.join(CANONICAL_DIR, `${canonical.slug}.json`)) : undefined,
      action: group.length > 1 ? 'merged_to_single_canonical_product' : 'kept_as_single_source_product',
      sources: canonical ? canonical.data.canonical.source_refs : group.map((record, index) => sourceRef(record, index === 0 ? 'primary' : 'duplicate')),
    };
  });

  return {
    summary: {
      raw_records: records.length,
      raw_product_records: productRecords(records).length,
      canonical_products: canonicalProducts.length,
      duplicate_sku_groups: duplicateGroups.filter(([, group]) => group.length > 1).length,
      raw_collection_records: collections.length,
      review_queue_records: reviewQueue.length,
    },
    output: {
      canonical_products_dir: path.relative(ROOT_DIR, CANONICAL_DIR),
      collections_dir: path.relative(ROOT_DIR, COLLECTIONS_DIR),
      products_tree: path.relative(ROOT_DIR, path.join(CANONICAL_DIR, 'products-tree.json')),
      collections_index: path.relative(ROOT_DIR, path.join(COLLECTIONS_DIR, 'collections-index.json')),
    },
    duplicate_actions: duplicateActions.filter((item) => item.action === 'merged_to_single_canonical_product'),
    review_queue: reviewQueue,
  };
}

function main() {
  const records = readRecords();
  const { groups, reviewQueue } = groupProductRecords(records);
  const duplicateGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  const canonicalProducts = duplicateGroups.map(([skuKey, group]) => buildCanonicalProduct(skuKey, group));
  const collections = buildCollections(records);

  resetGeneratedOutput();
  writeCanonicalProducts(canonicalProducts);
  writeCollections(collections);
  writeJson(REPORT_PATH, buildReport(records, canonicalProducts, collections, duplicateGroups, reviewQueue));

  console.log(`Canonical products: ${canonicalProducts.length}`);
  console.log(`Collections: ${collections.length}`);
  console.log(`Duplicate SKU groups merged: ${duplicateGroups.filter(([, group]) => group.length > 1).length}`);
  console.log(`Review queue records: ${reviewQueue.length}`);
  console.log(`Report: ${path.relative(ROOT_DIR, REPORT_PATH)}`);
}

main();
