#!/usr/bin/env node
/**
 * Rewrites the external image URLs in data/products/canonical/*.json to their
 * mirrored R2 URLs, using the mapping produced by mirror-product-images.mjs.
 *
 * Run: node scripts/apply-r2-image-map.mjs [--dry-run]
 *
 * Idempotent: URLs already on the R2 host are left untouched, so re-running
 * after a partial mirror only picks up newly-mirrored images.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CANON_DIR = path.join(ROOT, 'data', 'products', 'canonical');
const MAP_FILE = path.join(ROOT, 'tmp', 'image-mirror-map.json');
const DRY_RUN = process.argv.includes('--dry-run');

if (!fs.existsSync(MAP_FILE)) {
  console.error(`No mapping at ${path.relative(ROOT, MAP_FILE)} — run mirror-product-images.mjs first.`);
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf-8'));
console.log(`mapping entries: ${Object.keys(map).length}`);

const files = fs.readdirSync(CANON_DIR).filter(
  (f) => f.endsWith('.json') && !['products-tree.json', '_dedup-report.json'].includes(f)
);

let changedFiles = 0;
let replaced = 0;
let stillExternal = 0;
const untouchedHosts = new Map();

for (const file of files) {
  const full = path.join(CANON_DIR, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(full, 'utf-8'));
  } catch {
    continue;
  }
  if (!Array.isArray(data.images)) continue;

  let dirty = false;
  data.images = data.images.map((url) => {
    if (typeof url !== 'string' || !url.startsWith('http')) return url;
    if (url.includes('r2.dev')) return url;
    if (map[url]) {
      replaced++;
      dirty = true;
      return map[url];
    }
    stillExternal++;
    const host = url.replace(/^https?:\/\/([^/]+).*/, '$1');
    untouchedHosts.set(host, (untouchedHosts.get(host) || 0) + 1);
    return url;
  });

  if (dirty) {
    changedFiles++;
    if (!DRY_RUN) fs.writeFileSync(full, JSON.stringify(data, null, 2));
  }
}

console.log(`${DRY_RUN ? '[dry-run] ' : ''}files changed       : ${changedFiles}`);
console.log(`${DRY_RUN ? '[dry-run] ' : ''}URLs rewritten      : ${replaced}`);
console.log(`URLs still external : ${stillExternal}`);
if (untouchedHosts.size) {
  console.log('remaining external hosts:');
  for (const [h, n] of [...untouchedHosts].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(5)}  ${h}`);
  }
}
