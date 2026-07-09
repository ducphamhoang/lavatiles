#!/usr/bin/env node
/**
 * extract-caesar-images.js
 *
 * Extracts product images from the Caesar 2026 PDF and maps them 1:1
 * to product slugs in the catalogue.
 *
 * Strategy:
 *   Each page of the PDF has products in a grid layout. pdfimages extracts
 *   embedded JPEGs in visual reading order. We know which products are on
 *   each page (verified via text scan + catalogue cross-reference). We map
 *   the Nth product to the Nth product-sized JPEG on that page.
 *
 * Run: node scripts/extract-caesar-images.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PDF = path.join(ROOT, 'assets/pdf/CATALO 06-2026.pdf');
const CATALOGUE = path.join(ROOT, 'data/products/catalogue-caesar-06-2026.json');
const IMG_DIR = path.join(ROOT, 'assets/images/products/caesar');

// ---- Verified page→product mapping ------------------------------------
//
// Each entry: pageNumber → [slug1, slug2, ...] in visual layout order.
// Derived by cross-referencing pdftext output + pdfimages metadata.
//
// NOTE: Pages 4-9 are combo-product pages (toilet+seat shown together).
// Those products get their individual photos from the spec/product pages.
//
const PAGE_PRODUCTS = {
  3:  ['caesar-ca1389h'],                                              // Smart toilet (cover page)

  10: ['caesar-c1353', 'caesar-c1363', 'caesar-c1356', 'caesar-c1395',   // One-piece toilets
       'caesar-c1394', 'caesar-c1375', 'caesar-c1374', 'caesar-c1391'],

  11: ['caesar-cd1340', 'caesar-cd1342', 'caesar-cd1320', 'caesar-cd1341', // Two-piece toilets
       'caesar-cd1325', 'caesar-cd1338', 'caesar-cts1325', 'caesar-cts1338',
       'caesar-ct1325', 'caesar-ct1338', 'caesar-cds1325', 'caesar-cds1338',
       'caesar-cpt1332', 'caesar-cpt1505'],

  12: ['caesar-c1230', 'caesar-cs1230', 'caesar-c1250', 'caesar-cs1280',   // Public toilets + accessories
       'caesar-c1352', 'caesar-cp1333', 'caesar-ct1026',
       'caesar-bf521a', 'caesar-bf523a', 'caesar-bf525a', 'caesar-b1031'],

  13: ['caesar-lf5261', 'caesar-lf5358', 'caesar-lf5357',               // Vanity cabinets
       'caesar-lf5030', 'caesar-lf5032'],

  16: ['caesar-lf5026', 'caesar-lf5028', 'caesar-lf5030', 'caesar-lf5032',
       'caesar-lf5024', 'caesar-lf5261', 'caesar-l5022'],

  18: ['caesar-lf5380', 'caesar-lf5382', 'caesar-lf5384',
       'caesar-lf5386', 'caesar-lf5388'],

  19: ['caesar-lf5036', 'caesar-lf5368', 'caesar-lf5370',
       'caesar-lf5372', 'caesar-lf5376'],

  27: ['caesar-l5018', 'caesar-lf5130', 'caesar-l5019', 'caesar-l5115',   // Basins
       'caesar-l5113', 'caesar-l5125', 'caesar-l5022',
       'caesar-lf5301', 'caesar-lf5302', 'caesar-lf5017-chau'],

  29: ['caesar-ua0234', 'caesar-ua0237', 'caesar-ua0283', 'caesar-ua0284'], // Sensor urinals

  30: ['caesar-u0232', 'caesar-u0233', 'caesar-u0235', 'caesar-u0239',     // Manual urinals
       'caesar-u0240', 'caesar-u0282', 'caesar-u0296'],

  31: ['caesar-u0210'],

  42: ['caesar-ksh01h060sx', 'caesar-ksh01h075sx', 'caesar-ksh01h082se',  // Kitchen sinks
       'caesar-ksh01h082sx', 'caesar-ksh02h082se', 'caesar-ksh02h082sx',
       'caesar-ksh02h100sx', 'caesar-ksh11h060sx',
       'caesar-ksh21h082sx', 'caesar-ksh22h100sx'],

  43: ['caesar-kp1035sa'],                                                  // Faucet KP1035SA

  44: ['caesar-k079c', 'caesar-k905c', 'caesar-k915c',                   // Kitchen faucets
       'caesar-k540c', 'caesar-k415c', 'caesar-k815c', 'caesar-k685c',
       'caesar-k695c', 'caesar-k745c', 'caesar-k511c', 'caesar-k535c',
       'caesar-k527c', 'caesar-k376c', 'caesar-k665c', 'caesar-k325c',
       'caesar-k026c', 'caesar-k027c', 'caesar-k025c',
       'caesar-k028c', 'caesar-k022c', 'caesar-k035c', 'caesar-k036c'],

  45: ['caesar-b119c', 'caesar-b111c', 'caesar-b109c', 'caesar-b105c',   // Basin faucets
       'caesar-b104c', 'caesar-b040c', 'caesar-b037c', 'caesar-b027c',
       'caesar-b101c', 'caesar-b060c', 'caesar-b076c',
       'caesar-s108c', 'caesar-s043c', 'caesar-s063c', 'caesar-s038c'],

  47: ['caesar-mt7520', 'caesar-at5120', 'caesar-mt5120'],                 // Bathtubs

  48: ['caesar-at0750', 'caesar-at0770', 'caesar-at0950', 'caesar-at6270',
       'caesar-kt1160', 'caesar-kt1170', 'caesar-mt6480',
       'caesar-s143c', 'caesar-as143c', 'caesar-as689c'],

  49: ['caesar-mt0150', 'caesar-mt0170', 'caesar-mt0440',
       'caesar-mt0670', 'caesar-mt0870', 'caesar-mt211', 'caesar-mt3370'],

  50: ['caesar-s143c', 'caesar-s503c', 'caesar-spr101',
       'caesar-as489c', 'caesar-as143c', 'caesar-as689c', 'caesar-as111c',
       'caesar-s063c', 'caesar-s043c', 'caesar-s038c'],

  51: ['caesar-em0145v', 'caesar-em01100v', 'caesar-em0160v',
       'caesar-em0180v', 'caesar-m941'],

  // Spec pages — product reference tables with individual photos
  53: ['caesar-q7300-a6', 'caesar-q7710-a6', 'caesar-q8300-a6', 'caesar-q8800-a6'],

  54: ['caesar-q940a6', 'caesar-q990-a6', 'caesar-q999', 'caesar-q945'],

  55: ['caesar-cpt1505'],

  59: ['caesar-b1031', 'caesar-lf5017'],
};

// Electric seats: these appear on combo pages (4-9). The individual
// seat photos are the FIRST product image on those pages before the
// combo photos start. We handle them specially.
const SEAT_PAGES = {
  // page → [slug]
  4: ['caesar-taf610h'],       // Main electric seat (large photo at top)
  5: ['caesar-taf512h'],       // Electric seat variant
  6: ['caesar-taf710h'],       // Electric seat variant
  7: ['caesar-taf400h'],       // Basic electric seat
  9: ['caesar-taf060'],        // Mechanical seat
};

// ---- helpers ----------------------------------------------------------

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`);
  return { stdout: r.stdout.toString(), stderr: r.stderr.toString(), status: r.status };
}

/** Get JPEG dimensions by scanning for the SOF marker in the header. */
function jpegDimensions(fp) {
  try {
    const fd = fs.openSync(fp, 'r');
    // Read first 2KB — SOF marker is usually within this range
    const buf = Buffer.alloc(2048);
    const bytesRead = fs.readSync(fd, buf, 0, 2048, 0);
    fs.closeSync(fd);

    for (let i = 0; i < bytesRead - 1; i++) {
      if (buf[i] === 0xFF) {
        const marker = buf[i+1];
        // SOF markers: 0xC0, 0xC1, 0xC2 (start of frame)
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
          const h = (buf[i+5] << 8) + buf[i+6];
          const w = (buf[i+7] << 8) + buf[i+8];
          return { width: w, height: h };
        }
        // Skip marker segments we don't care about (APP, DQT, DHT, COM, etc.)
      }
    }
  } catch (_) {}
  return null;
}

/** Get sorted list of product-sized JPEGs on a page via pdfimages metadata. */
function getProductImages(page) {
  const r = run('pdfimages', ['-list', '-f', String(page), '-l', String(page), PDF]);
  const images = [];

  for (const line of r.stdout.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 14 || !/^\d+$/.test(parts[0])) continue;

    const imgType = parts[2];
    const width = parseInt(parts[3]);
    const height = parseInt(parts[4]);
    const encoding = parts[8];
    const num = parseInt(parts[1]);

    // Skip alpha masks
    if (imgType === 'smask') continue;

    // Filter to JPEG product photos (140-2500px, AR ≤ 3:1)
    const tooSmall = encoding === 'jpeg' && (width < 140 || height < 140);
    const tooLarge = width > 2500 || height > 2500;
    const badAspect = width > 0 && height > 0 &&
      (Math.max(width, height) / Math.min(width, height)) > 3;

    if (encoding !== 'jpeg') continue;
    if (tooSmall || tooLarge || badAspect) continue;

    images.push({ num, width, height });
  }

  // Sort by image number (extraction order = visual layout order)
  images.sort((a, b) => a.num - b.num);
  return images;
}

// ---- main ------------------------------------------------------------

async function main() {
  console.log('=== Caesar PDF Image Extractor ===\n');

  const data = JSON.parse(fs.readFileSync(CATALOGUE, 'utf-8'));
  fs.mkdirSync(IMG_DIR, { recursive: true });

  // Count existing web-scraped images
  let alreadyHave = 0;
  let total = 0;
  for (const cat of Object.values(data)) {
    for (const [slug, product] of Object.entries(cat)) {
      total++;
      if (product.images && product.images.length > 0) alreadyHave++;
    }
  }
  console.log(`Total products: ${total}`);
  console.log(`Already have web-scraped images: ${alreadyHave}`);
  console.log(`Need from PDF: ${total - alreadyHave}\n`);

  const TMP = fs.mkdtempSync('/tmp/caesar-pdf-');
  let assigned = 0;
  let errors = 0;

  // Helper: assign image to a product slug
  function assignImage(srcFile, slug, label) {
    if (!fs.existsSync(srcFile)) {
      console.log(`  ✗ ${slug}: source not found (${path.basename(srcFile)})`);
      errors++;
      return false;
    }
    const dims = jpegDimensions(srcFile);
    const destFile = path.join(IMG_DIR, `${slug}.jpg`);
    fs.copyFileSync(srcFile, destFile);
    // Update catalogue
    for (const cat of Object.values(data)) {
      if (cat[slug]) {
        cat[slug].images = [`/assets/images/products/caesar/${slug}.jpg`];
        break;
      }
    }
    const dimStr = dims ? ` (${dims.width}x${dims.height})` : '';
    console.log(`  ✓ ${slug} ← ${label}${dimStr}`);
    assigned++;
    return true;
  }

  // ---- Phase 1: regular product pages ---------------------------------
  console.log('--- Phase 1: Individual product pages ---');
  for (const [pageStr, slugs] of Object.entries(PAGE_PRODUCTS)) {
    const page = parseInt(pageStr);

    // Filter to slugs that still need images
    const needed = slugs.filter(s => {
      for (const cat of Object.values(data))
        if (cat[s] && (!cat[s].images || cat[s].images.length === 0)) return true;
      return false;
    });
    if (needed.length === 0) {
      console.log(`  Page ${page}: all done, skipping`);
      continue;
    }

    // Extract images
    const pagePrefix = path.join(TMP, `p${page}`);
    run('pdfimages', ['-j', '-f', String(page), '-l', String(page), PDF, pagePrefix]);

    const productImages = getProductImages(page);
    if (productImages.length === 0) {
      console.log(`  Page ${page}: 0 usable JPEGs found`);
      errors += needed.length;
      continue;
    }

    // Map as many as we can
    const count = Math.min(needed.length, productImages.length);
    process.stdout.write(`  Page ${page}: ${needed.length} needed, ${productImages.length} images →`);
    for (let i = 0; i < count; i++) {
      const srcFile = path.join(TMP, `p${page}-${String(productImages[i].num).padStart(3, '0')}.jpg`);
      assignImage(srcFile, needed[i], `p${page}#${productImages[i].num}`);
    }
    if (needed.length > count) {
      console.log(`    ⚠ ${needed.length - count} products on page ${page} have no matching image`);
      errors += needed.length - count;
    }
  }

  // ---- Phase 2: electric seat pages (first JPEG = seat photo) ---------
  console.log('\n--- Phase 2: Electric seat / seat cover pages ---');
  for (const [pageStr, slugs] of Object.entries(SEAT_PAGES)) {
    const page = parseInt(pageStr);

    const needed = slugs.filter(s => {
      for (const cat of Object.values(data))
        if (cat[s] && (!cat[s].images || cat[s].images.length === 0)) return true;
      return false;
    });
    if (needed.length === 0) {
      console.log(`  Page ${page}: all done, skipping`);
      continue;
    }

    const pagePrefix = path.join(TMP, `p${page}`);
    run('pdfimages', ['-j', '-f', String(page), '-l', String(page), PDF, pagePrefix]);

    // For seat pages, the first product image is the individual seat photo
    // (before the combo photos below it)
    const productImages = getProductImages(page);
    if (productImages.length === 0) {
      console.log(`  Page ${page}: 0 usable JPEGs found`);
      errors += needed.length;
      continue;
    }

    const count = Math.min(needed.length, productImages.length);
    for (let i = 0; i < count; i++) {
      const srcFile = path.join(TMP, `p${page}-${String(productImages[i].num).padStart(3, '0')}.jpg`);
      assignImage(srcFile, needed[i], `p${page}#${productImages[i].num}`);
    }
  }

  // ---- Phase 3: remaining products (spec pages 55-64) -----------------
  // Products not caught by phases 1+2 might appear on spec pages (55-64)
  // where each product has a small reference photo.
  console.log('\n--- Phase 3: Spec pages (fallback) ---');

  // Find all slugs still needing images
  const stillNeeded = [];
  for (const cat of Object.values(data)) {
    for (const [slug, product] of Object.entries(cat)) {
      if (!product.images || product.images.length === 0) {
        stillNeeded.push(slug);
      }
    }
  }

  if (stillNeeded.length > 0) {
    console.log(`  ${stillNeeded.length} products still need images: ${stillNeeded.slice(0, 10).join(', ')}${stillNeeded.length > 10 ? '...' : ''}`);
    console.log('  (to be handled: extract from spec pages or web scraping)');
  } else {
    console.log('  All products have images. ✓');
  }

  // ---- Write updated catalogue ----------------------------------------
  fs.writeFileSync(CATALOGUE, JSON.stringify(data, null, 2) + '\n', 'utf-8');

  // Cleanup
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}

  console.log(`\n=== Results ===`);
  console.log(`Assigned from PDF: ${assigned}`);
  console.log(`Errors: ${errors}`);
  console.log(`Previously had: ${alreadyHave}`);
  console.log(`Total with images now: ${alreadyHave + assigned}`);
  console.log(`Still missing: ${total - (alreadyHave + assigned)}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
