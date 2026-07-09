#!/usr/bin/env node
/**
 * assign-rooms.js
 *
 * Reads every product JSON in data/products/, assigns room tags based on
 * tile specifications (size, finish, body), and writes the `rooms` field
 * back into each individual file AND into products-tree.json.
 *
 * Run: node scripts/assign-rooms.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.resolve(__dirname, '..', 'data', 'products');
const TREE_PATH = path.join(PRODUCTS_DIR, 'products-tree.json');

// ---- helpers -----------------------------------------------------------

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf-8'));
}

function writeJson(absPath, data) {
  fs.writeFileSync(absPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Extract and normalise the "size" key from product_info.
 * Returns a cleaned string like "60x120cm" or null.
 */
function getSize(info) {
  const raw = info['Kích thước'];
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  s = s.replace(/^800x1600/, '80x160'); // scraped typo
  s = s.replace(/\s+/g, '');
  s = s.replace(/×/g, 'x'); // normalize multiplication sign
  if (!s.endsWith('cm')) s += 'cm';
  return s;
}

/**
 * Extract ứng dụng -> placement
 * Returns an array of placement tags like ["Sàn"] or ["Sàn", "Tường"].
 */
function getPlacement(info) {
  const raw = info['Ứng dụng'];
  if (!raw) return [];
  const v = raw.trim().toLowerCase();
  const result = [];
  if (/lát nền|sàn/i.test(v)) result.push('Sàn');
  if (/ốp tường|tường/i.test(v)) result.push('Tường');
  if (result.length === 0 && /ốp lát|gạch/i.test(v)) {
    result.push('Sàn', 'Tường');
  }
  return result;
}

// ---- room assignment rules ---------------------------------------------

function assignRooms(product) {
  const info = product.product_info || {};
  const title = (product.title || '').toLowerCase();

  // Roof tiles — not for interior rooms
  if (title.startsWith('ngói')) {
    return ['hanh_lang'];
  }

  const size = getSize(info);
  const rooms = new Set();

  if (!size) return [];

  // Rooms mapped per user's exact spec for each room.

  // phòng khách: 60x60, 80x80, 60x120, 80x160, 120x120, 100x100
  if (['60x60cm', '80x80cm', '60x120cm', '80x160cm', '120x120cm', '100x100cm'].includes(size)) {
    rooms.add('phong_khach');
  }

  // phòng ngủ: 20x100, 15x90, 60x60, 80x80
  if (['20x100cm', '60x60cm', '80x80cm'].includes(size)) {
    rooms.add('phong_ngu');
  }

  // phòng bếp: 60x60, 80x80, 60x120 (+ wall: 30x60, 40x80)
  if (['60x60cm', '80x80cm', '60x120cm', '30x60cm', '40x80cm'].includes(size)) {
    rooms.add('phong_bep');
  }

  // phòng tắm: floor 30x30, 30x60; wall 30x60, 40x80, 60x120
  if (['30x30cm', '30x60cm', '40x80cm', '60x120cm'].includes(size)) {
    rooms.add('phong_tam');
  }

  // sân vườn: 40x40, 50x50, 60x60, 40x60
  if (['40x40cm', '50x50cm', '60x60cm', '40x60cm'].includes(size)) {
    rooms.add('ban_cong');
  }

  // ban công: 30x30, 40x40, 60x60, 40x60
  if (['30x30cm', '40x40cm', '60x60cm', '40x60cm'].includes(size)) {
    rooms.add('ban_cong');
  }

  // cầu thang: 30x60, 60x120
  if (['30x60cm', '60x120cm'].includes(size)) {
    rooms.add('hanh_lang');
  }

  // mặt tiền: 40x80, 60x120, 80x160
  if (['40x80cm', '60x120cm', '80x160cm'].includes(size)) {
    rooms.add('mat_tien');
  }

  // Showroom / khách sạn / trung tâm thương mại: 80x80, 60x120, 80x160, 100x100, 120x120
  if (['80x80cm', '60x120cm', '80x160cm', '100x100cm', '120x120cm'].includes(size)) {
    rooms.add('showroom');
  }

  return Array.from(rooms);
}

// ---- main --------------------------------------------------------------

function main() {
  // 1. Read the tree (for category info)
  const tree = readJson(TREE_PATH);

  // Build a map from product title → tree key path
  // So we can write rooms back into the tree
  const titleToTreeInfo = {};
  for (const [cat, products] of Object.entries(tree)) {
    for (const [key, product] of Object.entries(products)) {
      titleToTreeInfo[product.title] = { cat, key };
    }
  }

  // 2. Read all individual product JSONs (skip tree and README)
  const files = fs.readdirSync(PRODUCTS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'products-tree.json')
    .sort();

  let updated = 0;

  for (const file of files) {
    const filePath = path.join(PRODUCTS_DIR, file);
    const product = readJson(filePath);

    // Assign rooms
    const rooms = assignRooms(product);
    product.rooms = rooms;

    // Write individual file
    writeJson(filePath, product);
    updated++;

    // Also update tree if we can find a match by title
    const treeInfo = titleToTreeInfo[product.title];
    if (treeInfo) {
      tree[treeInfo.cat][treeInfo.key].rooms = rooms;
    } else {
      // Try matching by extracting code from title
      const codeMatch = product.title.match(/[A-Z][A-Z0-9_-]+/);
      if (codeMatch) {
        const code = codeMatch[0];
        for (const [cat, prods] of Object.entries(tree)) {
          for (const [key, tp] of Object.entries(prods)) {
            const tc = tp.product_info && tp.product_info['Mã sản phẩm'];
            if (tc === code) {
              tp.rooms = rooms;
              break;
            }
          }
        }
      }
    }
  }

  // 3. Write tree back
  writeJson(TREE_PATH, tree);

  console.log(`✓ Assigned rooms to ${updated} products`);
  console.log(`✓ Updated products-tree.json`);
}

main();
