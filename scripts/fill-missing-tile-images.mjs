#!/usr/bin/env node
/**
 * Fills in roof-tile images for products whose only source image was on the
 * dead-cert host, using Viglacera's own product listing.
 *
 * Input: tmp/vl-tiles.json — a { code: { img, link } } map parsed from
 * https://viglaceratiles.vn/san-pham/ngoi-lop.html, where each product block
 * carries an <h3> code, an image, and a detail link.
 *
 * Matches on the exact product code, so it only fills a product when the code
 * is unambiguous. Run: node scripts/fill-missing-tile-images.mjs [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CANON_DIR = path.join(ROOT, 'data', 'products', 'canonical');
const TMP_DIR = path.join(ROOT, 'tmp');
const MAP_FILE = path.join(TMP_DIR, 'vl-tiles.json');
const OUT_FILE = path.join(TMP_DIR, 'viglacera-tiles-filled.json');

const BUCKET = 'lavatiles-product-images';
const PUBLIC_BASE = 'https://pub-3ab81718ddbf44a49cbbc475f1064b77.r2.dev';
const UA = 'Mozilla/5.0 (compatible; LavatilesImageImport/1.0)';
const DRY_RUN = process.argv.includes('--dry-run');

const EXT_CT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
};
const code = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

if (!fs.existsSync(MAP_FILE)) {
  console.error(`Missing ${path.relative(ROOT, MAP_FILE)} — parse the tile listing first.`);
  process.exit(1);
}
const tiles = JSON.parse(fs.readFileSync(MAP_FILE, 'utf-8'));
const byCode = new Map();
for (const [k, v] of Object.entries(tiles)) byCode.set(code(k), v);

// Which products still have no images?
const report = JSON.parse(fs.readFileSync(path.join(TMP_DIR, 'dead-host-images.json'), 'utf-8'));
const targets = [];
for (const r of report) {
  const file = path.join(CANON_DIR, `${r.slug}.json`);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  if ((data.images || []).length) continue;
  const lastTok = (data.title || '').trim().split(/\s+/).pop() || '';
  targets.push({ slug: r.slug, title: data.title || '', file, data, code: code(lastTok) });
}

function wranglerUpload(localFile, key, ct) {
  return new Promise((resolve) => {
    const child = spawn('npx', [
      '--yes', 'wrangler@latest', 'r2', 'object', 'put',
      `${BUCKET}/${key}`, '--file', localFile, '--content-type', ct, '--remote', '--force',
    ], { cwd: ROOT, stdio: 'ignore' });
    child.on('close', (c) => resolve(c === 0));
    child.on('error', () => resolve(false));
  });
}

const results = [];
for (const t of targets) {
  const hit = byCode.get(t.code);
  if (!hit) { results.push({ slug: t.slug, title: t.title, status: 'no-code-match' }); continue; }

  const url = hit.img;
  const ext = (path.extname(url.split('?')[0]) || '.jpg').toLowerCase();
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  const key = `products/${t.slug}/00-${hash}-${path.basename(url.split('?')[0])}`;

  if (DRY_RUN) {
    console.log(`  MATCH ${t.title}  ->  ${url.split('/').pop()}`);
    results.push({ slug: t.slug, status: 'dry-run', url });
    continue;
  }

  const tmp = path.join(TMP_DIR, `vl-${process.pid}.tmp`);
  let publicUrl = null;
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error('empty');
    fs.writeFileSync(tmp, buf);
    if (!(await wranglerUpload(tmp, key, EXT_CT[ext] || 'application/octet-stream'))) throw new Error('upload failed');
    publicUrl = `${PUBLIC_BASE}/${key}`;
  } catch (e) {
    console.log(`  FAIL  ${t.title} — ${e.message}`);
    results.push({ slug: t.slug, status: 'failed', url });
    fs.rmSync(tmp, { force: true });
    continue;
  }
  fs.rmSync(tmp, { force: true });

  t.data.images = [publicUrl];
  fs.writeFileSync(t.file, JSON.stringify(t.data, null, 2));
  console.log(`  OK    ${t.title}  -> ${url.split('/').pop()}`);
  results.push({ slug: t.slug, status: 'filled', url, publicUrl });
}

fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
console.log(`\nfilled: ${results.filter((r) => r.status === 'filled').length}`);
console.log('still unmatched:');
for (const r of results.filter((x) => x.status !== 'filled' && x.status !== 'dry-run')) {
  console.log(`   ${r.title}  (${r.status})`);
}
