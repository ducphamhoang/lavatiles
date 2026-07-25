#!/usr/bin/env node
/**
 * update-vasta-images.js
 *
 * Matches existing Vasta Stone products (data/products/vasta-stone/products.js
 * + data/products/canonical/gch-vasta-*.json) against the fresh crawl from
 * vasta.vn (data/products/vasta-vn-crawl.json, see scripts/crawl-vasta.js),
 * and replaces blurry local images with the higher-res external image URLs
 * from vasta.vn for confident matches.
 *
 * Ambiguous / low-confidence matches are NOT applied — they're written to
 * the report for manual review instead.
 *
 * Run:
 *   node scripts/update-vasta-images.js          # dry run, writes report only
 *   node scripts/update-vasta-images.js --apply   # also writes the updates
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CRAWL_FILE = path.join(ROOT, 'data/products/vasta-vn-crawl.json');
const PRODUCTS_JS = path.join(ROOT, 'data/products/vasta-stone/products.js');
const CANONICAL_DIR = path.join(ROOT, 'data/products/canonical');
const REPORT_FILE = path.join(ROOT, 'data/products/vasta-vn-match-report.json');

const APPLY = process.argv.includes('--apply');
const SCORE_THRESHOLD = 0.5;

// Known typo/rebrand pairs between the old catalog and the current vasta.vn
// site that the automatic word-overlap scorer can't bridge on its own.
const MANUAL_OVERRIDES = {
  'GAG09E': 'da-nung-ket-grani-gorge', // "Garni Gorge" (old) vs "Grani Gorge" (site)
  'GRS09E': 'da-nung-ket-gravel-stone-vasta-xam-nau', // "Garvel Stone" vs "Gravel Stone"
  'MARVEL-BERNINI': 'da-nung-ket-gravel-bernini-vasta-trang-van-may', // "Marvel" vs "Gravel" Bernini
  'TERRE-ROSA': 'da-nung-ket-terre-rosa-vasta-cao-cap', // "Terre Rose" on site vs "Terre Rosa"
  'TERRE-GREY': 'da-nung-ket-terra-gray-nen-xam-khong-van-mach', // "Terra Grey" vs "Terre Grey"
  'TERRE-BEIGE': 'da-nung-ket-terra-beige-vasta-tong-dat-am', // "Terra Beige" vs "Terre Beige"
};

// Collections that fan out into multiple color/variant products on vasta.vn
// with no reliable way to tell which variant the old single generic entry
// meant — skip these rather than guess.
const AMBIGUOUS_CODES = new Set(['ARB09E', 'TEG09E', 'TRS09E']);

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const STOPWORDS = new Set(
  'da nung ket vasta stone sintered interior hd nham bong mo xam nau trang van may trong xuong kho lon nen den khong mach tong dat am xanh bang nhiet doi rung mau ben bi cao cap'
    .split(' ')
);

function norm(s) {
  let t = stripAccents(s || '').toLowerCase();
  t = t.replace(/&#\d+;/g, ' ');
  t = t.replace(/-/g, ' ');
  t = t.replace(/[^a-z0-9 ]/g, ' ');
  const tokens = t.split(/\s+/).filter((w) => w && !STOPWORDS.has(w));
  return tokens.join(' ');
}

function jaccard(a, b) {
  const sa = new Set(a.split(' ').filter(Boolean));
  const sb = new Set(b.split(' ').filter(Boolean));
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / Math.max(sa.size, sb.size);
}

function loadProductsJs() {
  let code = fs.readFileSync(PRODUCTS_JS, 'utf-8');
  code = code
    .replace('(function () {', '')
    .replace("'use strict';", '')
    .replace('window.LAVATILE_VASTA_STONE_PRODUCTS = ', 'module.exports = ');
  code = code.slice(0, code.lastIndexOf('})();'));
  const tmpFile = path.join(require('os').tmpdir(), `vasta-products-${process.pid}.js`);
  fs.writeFileSync(tmpFile, code);
  const arr = require(tmpFile);
  fs.unlinkSync(tmpFile);
  return arr;
}

function canonicalFilenameFor(entry) {
  // Mirrors how these canonical files were originally named: real short
  // codes (e.g. APU09E) use the collection name slug, everything else uses
  // the product code slug.
  const isAbbrevCode = /^[A-Z]{2,4}\d{2}E$/.test(entry.code);
  const base = isAbbrevCode ? entry.collection : entry.code;
  const slug = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `gch-vasta-${slug}.json`;
}

function findMatch(entry, crawled) {
  if (MANUAL_OVERRIDES[entry.code]) {
    const p = crawled.find((c) => c.slug === MANUAL_OVERRIDES[entry.code]);
    return { product: p, score: 1, reason: 'manual override' };
  }
  if (AMBIGUOUS_CODES.has(entry.code)) {
    return { product: null, score: 0, reason: 'ambiguous — multiple variants on site, no reliable signal' };
  }

  const isAbbrevCode = /^[A-Z]{2,4}\d{2}E$/.test(entry.code);
  const codeKey = isAbbrevCode ? '' : norm(entry.code);
  const collKey = norm(entry.collection);
  const key = `${codeKey} ${collKey}`.trim();

  let best = null;
  for (const p of crawled) {
    const sc = jaccard(key, norm(p.name));
    if (!best || sc > best.score) best = { product: p, score: sc };
  }
  return { ...best, reason: best.score >= SCORE_THRESHOLD ? 'word-overlap match' : 'low confidence' };
}

function main() {
  const crawled = JSON.parse(fs.readFileSync(CRAWL_FILE, 'utf-8'));
  const entries = loadProductsJs();

  const report = { applied: [], skipped: [] };
  const seenCanonicalUpdates = [];

  for (const entry of entries) {
    const match = findMatch(entry, crawled);
    const canonicalFile = canonicalFilenameFor(entry);
    const canonicalPath = path.join(CANONICAL_DIR, canonicalFile);

    const row = {
      code: entry.code,
      collection: entry.collection,
      canonicalFile,
      matchedSlug: match.product ? match.product.slug : null,
      matchedName: match.product ? match.product.name : null,
      score: Number((match.score || 0).toFixed(2)),
      reason: match.reason,
      newImageCount: match.product ? match.product.images.length : 0,
    };

    const confident = match.product && (match.score >= SCORE_THRESHOLD || MANUAL_OVERRIDES[entry.code]);
    if (!confident) {
      report.skipped.push(row);
      continue;
    }

    report.applied.push(row);

    if (APPLY) {
      entry.images = match.product.images.slice();
      entry.image = match.product.images[0];

      if (fs.existsSync(canonicalPath)) {
        const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf-8'));
        canonical.images = match.product.images.slice();
        fs.writeFileSync(canonicalPath, JSON.stringify(canonical, null, 2) + '\n', 'utf-8');
        seenCanonicalUpdates.push(canonicalFile);
      } else {
        row.warning = `canonical file not found: ${canonicalFile}`;
      }
    }
  }

  if (APPLY) {
    const js = `(function () {
  'use strict';
  window.LAVATILE_VASTA_STONE_PRODUCTS = ${JSON.stringify(entries, null, 2)};
})();
`;
    fs.writeFileSync(PRODUCTS_JS, js, 'utf-8');
  }

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  console.log(`${APPLY ? 'Applied' : 'Would apply (dry run)'}: ${report.applied.length} products`);
  console.log(`Skipped (low confidence / ambiguous): ${report.skipped.length} products`);
  if (APPLY) console.log(`Updated ${seenCanonicalUpdates.length} canonical files + data/products/vasta-stone/products.js`);
  console.log(`Report written to ${path.relative(ROOT, REPORT_FILE)}`);
}

main();
