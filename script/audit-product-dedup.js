const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data/products');
const REPORT_PATH = path.join(ROOT_DIR, 'tasks/report_10_verify_pd.md');

const NEW_SOURCES = new Set(['viglaceratiles', 'eurotile', 'vastastone']);
const SOURCE_LABELS = {
  current: 'Current Hoathanhphat data',
  viglaceratiles: 'Viglacera Tiles official',
  eurotile: 'Eurotile official',
  vastastone: 'Vasta Stone official',
};

const GENERIC_CODE_KEYS = new Set([
  'GACHOPLAT',
  'SANPHAM',
  'PRODUCT',
  'COLLECTION',
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

function compactCode(value) {
  return stripVietnamese(value).replace(/[^a-z0-9]/g, '').toUpperCase();
}

function isUsableCodeKey(codeKey) {
  return codeKey.length >= 3 && !GENERIC_CODE_KEYS.has(codeKey);
}

function slugText(value) {
  return stripVietnamese(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.json') && file !== 'products-tree.json')
    .sort()
    .map((file) => path.join(dir, file));
}

function splitCodes(rawCode) {
  const raw = cleanText(rawCode);
  if (!raw) return [];

  return raw.split(/[,;|]/)
    .map((part) => cleanText(part))
    .filter((part) => compactCode(part).length >= 3);
}

function sourceFromPath(filePath) {
  const relative = path.relative(DATA_DIR, filePath);
  const firstPart = relative.split(path.sep)[0];
  return NEW_SOURCES.has(firstPart) ? firstPart : 'current';
}

function recordType(sourceKey, product) {
  const code = cleanText(product.product_info && product.product_info['Mã sản phẩm']);
  if (sourceKey === 'vastastone') return 'collection';
  if (sourceKey === 'eurotile') return 'collection-with-skus';
  if (code && compactCode(code) === compactCode(product.title)) return 'product';
  return 'product';
}

function readRecords() {
  const files = [
    ...listJsonFiles(DATA_DIR),
    ...Array.from(NEW_SOURCES).flatMap((source) => listJsonFiles(path.join(DATA_DIR, source))),
  ];

  return files.map((filePath) => {
    const product = readJson(filePath);
    const info = product.product_info || {};
    const sourceKey = sourceFromPath(filePath);
    const rawCodes = splitCodes(info['Mã sản phẩm']);
    const fallbackCode = rawCodes.length ? [] : splitCodes(product.title);
    const codes = [...rawCodes, ...fallbackCode];
    const rawCodeKeys = Array.from(new Set(codes.map(compactCode).filter(Boolean)));
    const codeKeys = rawCodeKeys.filter(isUsableCodeKey);
    const relativePath = path.relative(ROOT_DIR, filePath);

    return {
      sourceKey,
      sourceLabel: SOURCE_LABELS[sourceKey],
      type: recordType(sourceKey, product),
      filePath: relativePath,
      title: cleanText(product.title),
      titleKey: slugText(product.title),
      codes,
      rawCodeKeys,
      codeKeys,
      size: cleanText(info['Kích thước']),
      finish: cleanText(info['Bề mặt men'] || info['Bề mặt']),
      brand: cleanText(info['Hãng sản xuất'] || info['Thương hiệu'] || info['Xuất xứ']),
      url: cleanText(info.URL),
      imageCount: Array.isArray(product.images) ? product.images.length : 0,
    };
  });
}

function groupBy(records, keySelector) {
  const map = new Map();
  records.forEach((record) => {
    const keys = keySelector(record);
    keys.forEach((key) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(record);
    });
  });
  return map;
}

function sourceNames(records) {
  return Array.from(new Set(records.map((record) => record.sourceKey))).sort();
}

function bySourceCount(records, sourceKey) {
  return records.filter((record) => record.sourceKey === sourceKey).length;
}

function duplicateGroupsByCode(records) {
  return Array.from(groupBy(records, (record) => record.codeKeys).entries())
    .filter(([, group]) => group.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function currentOverlapGroups(duplicateGroups) {
  return duplicateGroups.filter(([, group]) => {
    const sources = sourceNames(group);
    return sources.includes('current') && sources.some((source) => source !== 'current');
  });
}

function officialCrossSourceGroups(duplicateGroups) {
  return duplicateGroups.filter(([, group]) => {
    const sources = sourceNames(group).filter((source) => source !== 'current');
    return sources.length > 1;
  });
}

function sameSourceDuplicateGroups(duplicateGroups) {
  return duplicateGroups.filter(([, group]) => sourceNames(group).length === 1);
}

function newSameSourceDuplicateGroups(duplicateGroups) {
  return sameSourceDuplicateGroups(duplicateGroups)
    .filter(([, group]) => NEW_SOURCES.has(group[0].sourceKey));
}

function uniqueNewProductRecords(records, duplicateGroups) {
  const currentMatchedCodeKeys = new Set();
  currentOverlapGroups(duplicateGroups).forEach(([codeKey]) => currentMatchedCodeKeys.add(codeKey));

  return records.filter((record) => {
    if (!NEW_SOURCES.has(record.sourceKey)) return false;
    if (record.type !== 'product') return false;
    if (!record.codeKeys.length) return false;
    return !record.codeKeys.some((codeKey) => currentMatchedCodeKeys.has(codeKey));
  });
}

function tableRows(groups, limit) {
  return groups.slice(0, limit).map(([codeKey, group]) => {
    const sources = sourceNames(group).map((source) => SOURCE_LABELS[source]).join('<br>');
    const titles = group
      .slice(0, 4)
      .map((record) => `${record.title} (${record.filePath})`)
      .join('<br>');
    const sizes = Array.from(new Set(group.map((record) => record.size).filter(Boolean))).join('<br>');
    return `| ${codeKey} | ${sources} | ${titles} | ${sizes || 'Unknown'} |`;
  }).join('\n');
}

function renderReport(records) {
  const duplicates = duplicateGroupsByCode(records);
  const currentOverlaps = currentOverlapGroups(duplicates);
  const officialOverlaps = officialCrossSourceGroups(duplicates);
  const newInternalOverlaps = newSameSourceDuplicateGroups(duplicates);
  const uniqueNewProducts = uniqueNewProductRecords(records, duplicates);
  const collectionRecords = records.filter((record) => record.type !== 'product');
  const productRecordsWithoutUsableSku = records.filter((record) => record.type === 'product' && !record.codeKeys.length);

  const currentRecords = records.filter((record) => record.sourceKey === 'current');
  const newRecords = records.filter((record) => NEW_SOURCES.has(record.sourceKey));

  return `# Spec 10: product-data deduplication decision

Source: \`tasks/spec_10_verify_pd.md\`.

## Recommendation

Use a canonical product registry plus deterministic duplicate detection, with a small manual-review queue for ambiguous records.

Do not delete duplicates directly from the scraped folders, and do not build a full knowledge graph yet. The scraped folders should remain raw source snapshots. The site should later consume a curated canonical layer that decides which source wins for each SKU and which records are collections.

## Why this is the best fit

- Exact SKU matching already catches real duplicates. Example: \`VBS4605\` in the current data and \`VBS 4605\` from Viglacera Tiles refer to the same product.
- Most duplicates are product identity problems, not relationship-discovery problems. A knowledge graph would add more machinery before the site has enough curated data to benefit from it.
- The risky records are not all duplicates. Eurotile and Vasta Stone pages are often collection or surface/slab pages, so importing them as product pages would distort the current product structure.
- Manual review is still needed, but only for bounded batches: exact SKU overlaps can be auto-merged, while weak title/category matches can be reviewed in chunks of 100.

## Audit snapshot

| Dataset | Records |
| --- | ---: |
| Current root \`data/products/*.json\` | ${currentRecords.length} |
| New scraped records total | ${newRecords.length} |
| Viglacera Tiles official | ${bySourceCount(records, 'viglaceratiles')} |
| Eurotile official | ${bySourceCount(records, 'eurotile')} |
| Vasta Stone official | ${bySourceCount(records, 'vastastone')} |
| SKU duplicate groups across any source | ${duplicates.length} |
| Current-data SKU overlaps with new sources | ${currentOverlaps.length} |
| Cross-official-source SKU overlaps | ${officialOverlaps.length} |
| Same-new-source SKU duplicate groups | ${newInternalOverlaps.length} |
| New product records with no current SKU overlap | ${uniqueNewProducts.length} |
| Collection-like records | ${collectionRecords.length} |
| Product records needing SKU review | ${productRecordsWithoutUsableSku.length} |

## Collection mapping

The current generated website uses product files as individual product detail pages and currently uses \`collection\` mostly as a listing/category label. The new sources need one more concept:

- Product: one SKU or sellable tile item, for example \`VBS4605\`.
- Collection: a design family or slab/series page, for example Eurotile \`Thạch An\` or Vasta Stone \`Amazonite\`.
- Category: browse taxonomy such as \`Gạch lát nền\`, \`Gạch 40x60\`, \`Đá nung kết / tấm lớn\`.

Recommended future structure:

- Keep raw snapshots in \`data/products/viglaceratiles\`, \`data/products/eurotile\`, and \`data/products/vastastone\`.
- Add curated product records under the current product pipeline only after dedupe.
- Add curated collections separately, for example \`data/collections/{brand}/{collection-slug}.json\`.
- Let canonical products reference collections with fields like \`brand\`, \`collectionSlug\`, \`collectionName\`, and \`sourceRefs\`.

## Merge policy

| Case | Action |
| --- | --- |
| Same normalized SKU across current and official source | Merge into one canonical product. Prefer official source for specs/images, preserve current category/page slug if already published. |
| Same normalized SKU across official sources | Merge source references, then choose the brand owner as primary source. |
| Same normalized SKU repeated inside one new source | Keep one canonical product, retain all source URLs as source references, and mark the extra raw files as ignored. |
| Official SKU not in current data | Candidate new product. Import only after category and image quality checks. |
| Eurotile or Vasta collection page | Create/update collection record, not a product page, unless it exposes a clear individual SKU variant. |
| Title-only or weak match | Manual review queue in chunks of 100. Do not auto-delete. |

## Sample exact SKU overlaps

| SKU key | Sources | Records | Sizes |
| --- | --- | --- | --- |
${tableRows(currentOverlaps, 20) || '| None | None | None | None |'}

## Sample same-source duplicates in new data

| SKU key | Sources | Records | Sizes |
| --- | --- | --- | --- |
${tableRows(newInternalOverlaps, 20) || '| None | None | None | None |'}

## Implementation plan

1. Keep the scraped folders immutable as raw source data.
2. Generate an audit file from raw data with normalized SKU keys, title keys, source URLs, and candidate duplicate groups.
3. Build \`data/products/canonical-products.json\` or equivalent normalized product files from reviewed groups.
4. Build \`data/collections/\` for Eurotile and Vasta collection records.
5. Update \`script/generate-product-pages.js\` only after the canonical layer exists, so generated pages come from curated products instead of raw scrape folders.

## Local audit tool

Run:

\`\`\`sh
cd script
npm run audit:product-dedup
\`\`\`

This rewrites \`tasks/report_10_verify_pd.md\` with the latest local counts.`;
}

function main() {
  const records = readRecords();
  fs.writeFileSync(REPORT_PATH, `${renderReport(records)}\n`, 'utf8');
  console.log(`Audited ${records.length} records.`);
  console.log(`Report: ${path.relative(ROOT_DIR, REPORT_PATH)}`);
}

main();
