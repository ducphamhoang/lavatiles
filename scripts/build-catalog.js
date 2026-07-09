#!/usr/bin/env node
/**
 * build-catalog.js
 *
 * Reads all product JSONs from data/products/, normalises fields from
 * Vietnamese scraped keys to the frontend schema, and writes
 * data/catalog-tiles.js (a JS file consumed by the frontend).
 *
 * Run: node scripts/build-catalog.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.resolve(__dirname, '..', 'data', 'products');
const OUT = path.resolve(__dirname, '..', 'data', 'catalog-tiles.js');

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf-8'));
}

/** Extract first product image (480x381 if available, else index 2) */
function getImage(images) {
  if (!images || images.length < 3) return '';
  // prefer the first 480x381 image (index 2, skip first 2 banners)
  for (let i = 2; i < images.length; i++) {
    if (images[i].includes('480x381')) return images[i];
  }
  return images[2] || '';
}

/** Normalise size string */
function normaliseSize(raw) {
  if (!raw) return '';
  let s = raw.trim();
  s = s.toLowerCase();
  s = s.replace(/×/g, 'x');
  s = s.replace(/\s+/g, '');
  s = s.replace(/^800x1600/, '80x160');
  if (!s.endsWith('cm')) s += 'cm';
  return s;
}

/** Normalise finish field */
function normaliseFinish(info) {
  const candidates = ['Bề mặt men', 'Men gạch', 'Bề mặt'];
  let raw = null;
  for (const k of candidates) {
    if (info[k]) { raw = info[k]; break; }
  }
  if (!raw) return '';
  const v = raw.trim().toLowerCase();
  if (/bóng|polish/i.test(v) && !/mờ|matt/i.test(v)) return 'Bóng';
  if (/mờ|matt|nhám|matte/i.test(v)) return 'Mờ';
  return raw.trim();
}

/** Extract placement from Ứng dụng */
function getPlacement(info) {
  const raw = info['Ứng dụng'];
  if (!raw) return [];
  const v = raw.trim().toLowerCase();
  const result = [];
  if (/lát nền|sàn/i.test(v)) result.push('Sàn');
  if (/ốp tường|tường/i.test(v)) result.push('Tường');
  if (result.length === 0 && /ốp lát|gạch/i.test(v)) result.push('Sàn', 'Tường');
  return result;
}

/** Infer a "color" from the title and available fields */
function inferColor(info, title) {
  const colorField = info['Màu sắc và họa tiết'];
  if (colorField) {
    const v = colorField.toLowerCase();
    if (/trắng/.test(v)) return 'Trắng';
    if (/xám|ghi/.test(v)) return 'Xám';
    if (/đen/.test(v)) return 'Đen';
    if (/kem|be|vàng/.test(v)) return 'Kem';
    if (/nâu/.test(v)) return 'Nâu';
    if (/hồng/.test(v)) return 'Hồng';
    if (/xanh/.test(v)) return 'Xanh';
    if (/đá/.test(v)) return 'Vân đá';
    if (/gỗ/.test(v)) return 'Vân gỗ';
  }
  if (title) {
    const t = title.toLowerCase();
    if (/vân đá/.test(t)) return 'Vân đá';
    if (/vân gỗ|giả gỗ/.test(t)) return 'Vân gỗ';
    if (/trang trí/.test(t)) return 'Trang trí';
  }
  return '';
}

/** Infer a tone-based class for potential CSS use */
function inferType(title) {
  const t = (title || '').toLowerCase();
  if (t.startsWith('ngói')) return 'roof';
  if (t.includes('sân vườn')) return 'garden';
  if (t.includes('vân đá')) return 'marble';
  if (t.includes('giả gỗ') || t.includes('vân gỗ')) return 'wood';
  if (t.includes('trang trí')) return 'decor';
  return 'tile';
}

// ---- main --------------------------------------------------------------

function main() {
  const files = fs.readdirSync(PRODUCTS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'products-tree.json')
    .sort();

  const catalog = [];

  for (const file of files) {
    const filePath = path.join(PRODUCTS_DIR, file);
    const p = readJson(filePath);
    const info = p.product_info || {};

    const code = info['Mã sản phẩm'] || '';
    const isRoof = (p.title || '').toLowerCase().startsWith('ngói');

    const entry = {
      code: code === '0' ? path.basename(file, '.json').replace(/^gch-/, '') : code,
      brand: info['Thương hiệu'] || '',
      finish: normaliseFinish(info) || (isRoof ? 'Men' : ''),
      color: inferColor(info, p.title),
      size: normaliseSize(info['Kích thước']),
      placement: getPlacement(info),
      body: (info['Xương gạch'] || info['Loại gạch'] || '').trim(),
      rooms: p.rooms || [],
      image: getImage(p.images),
      title: p.title || '',
      type: inferType(p.title)
    };

    catalog.push(entry);
  }

  // Write JS file
  const js = `(function () {
  'use strict';
  window.LAVATILE_TILES = ${JSON.stringify(catalog, null, 2)};
})();
`;
  fs.writeFileSync(OUT, js, 'utf-8');

  console.log(`✓ Wrote ${catalog.length} products to data/catalog-tiles.js`);
  console.log(`  Rooms present: ${catalog.filter(p => p.rooms.length > 0).length} products`);
  console.log(`  No image: ${catalog.filter(p => !p.image).length} products`);
}

main();
