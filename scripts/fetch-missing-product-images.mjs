#!/usr/bin/env node
/**
 * Fills in images for the products whose only source was the dead-cert host
 * (www.hoathanhphat.com.vn), by sourcing them from another retailer.
 *
 * Matching is deliberately conservative: a candidate page is only accepted
 * when its <title> (normalised) contains both the product code and the brand.
 * Product codes repeat across brands and collections — "GP8801" is both an
 * Arizona and a Viglacera code — so a slug match alone is not trustworthy.
 *
 * Run: node scripts/fetch-missing-product-images.mjs [--limit N] [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CANON_DIR = path.join(ROOT, 'data', 'products', 'canonical');
const TMP_DIR = path.join(ROOT, 'tmp');
const REPORTS = path.join(TMP_DIR, 'sourced-images.json');

const SOURCE_INDEX = path.join(TMP_DIR, 'np-urls.txt');
const BUCKET = 'lavatiles-product-images';
const PUBLIC_BASE = 'https://pub-3ab81718ddbf44a49cbbc475f1064b77.r2.dev';
const UA = 'Mozilla/5.0 (compatible; LavatilesImageImport/1.0)';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => {
  const i = args.indexOf('--limit');
  return i !== -1 && args[i + 1] ? Number(args[i + 1]) : Infinity;
})();

const EXT_CT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
};

const norm = (s) =>
  s.normalize('NFD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

if (!fs.existsSync(SOURCE_INDEX)) {
  console.error(`Missing ${path.relative(ROOT, SOURCE_INDEX)} — build the source URL index first.`);
  process.exit(1);
}
const sourceUrls = fs.readFileSync(SOURCE_INDEX, 'utf-8').split('\n').map((s) => s.trim()).filter(Boolean);
const sourceSlugs = new Map(sourceUrls.map((u) => [norm(u.replace(/\/$/, '').split('/').pop()), u]));

// -------------------------------------------------------------- missing set
const report = JSON.parse(fs.readFileSync(path.join(TMP_DIR, 'dead-host-images.json'), 'utf-8'));
const targets = [];
for (const r of report) {
  const file = path.join(CANON_DIR, `${r.slug}.json`);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  if ((data.images || []).length) continue;
  targets.push({ slug: r.slug, title: data.title || '', file, data });
}
console.log(`products with no images: ${targets.length}`);

function codeCandidates(title) {
  const out = [];
  const toks = title.split(/\s+/);
  if (toks.length) {
    const last = toks[toks.length - 1];
    if (/\d/.test(last)) out.push(last);
    if (toks.length >= 2 && /\d/.test(toks[toks.length - 2])) out.push(toks.slice(-2).join(''));
  }
  out.push(...(title.match(/[A-Z]{1,4}-[A-Z0-9]{2,}/g) || []));
  return [...new Set(out)].filter((c) => norm(c).length >= 4);
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function galleryImages(html) {
  const out = [];
  for (const m of html.matchAll(/data-large_image="([^"]+)"/g)) out.push(m[1]);
  const og = html.match(/og:image" content="([^"]+)"/);
  if (og) out.push(og[1]);
  return [...new Set(out)].filter((u) => /\.(jpg|jpeg|png|webp)$/i.test(u.split('?')[0]));
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

async function mirror(url, slug, index) {
  const ext = (path.extname(url.split('?')[0]) || '.jpg').toLowerCase();
  const base = path.basename(url.split('?')[0]).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60);
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  const key = `products/${slug}/${String(index).padStart(2, '0')}-${hash}-${base}`;
  const tmp = path.join(TMP_DIR, `src-${process.pid}-${index}.tmp`);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    fs.writeFileSync(tmp, buf);
    if (!(await wranglerUpload(tmp, key, EXT_CT[ext] || 'application/octet-stream'))) return null;
    return `${PUBLIC_BASE}/${key}`;
  } catch {
    return null;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// ------------------------------------------------------------------- solve
const results = [];
let scanned = 0;
for (const t of targets) {
  if (scanned >= LIMIT) break;
  scanned++;
  const brand = /viglacera/i.test(t.title) ? 'viglacera' : '';
  const codes = codeCandidates(t.title);
  let chosen = null;
  let candidateUrls = [];
  for (const c of codes) {
    for (const [slugNorm, url] of sourceSlugs) {
      if (slugNorm.includes(norm(c))) candidateUrls.push(url);
    }
  }
  candidateUrls = [...new Set(candidateUrls)].slice(0, 6);

  for (const url of candidateUrls) {
    try {
      const html = await fetchText(url);
      const title = (html.match(/<title>([^<]*)/) || [, ''])[1];
      const nt = norm(title);
      const okCode = codes.some((c) => nt.includes(norm(c)));
      const okBrand = brand ? nt.includes(brand) : true;
      if (okCode && okBrand) { chosen = { url, title, html }; break; }
    } catch { /* try next */ }
  }

  if (!chosen) { console.log(`  no verified match : ${t.title}`); results.push({ slug: t.slug, status: 'no-match' }); continue; }

  const imgs = galleryImages(chosen.html).slice(0, 6);
  if (!imgs.length) { console.log(`  no images found   : ${t.title}`); results.push({ slug: t.slug, status: 'no-images' }); continue; }

  if (DRY_RUN) {
    console.log(`  MATCH ${t.title}\n        ${chosen.url}  (${imgs.length} images)`);
    results.push({ slug: t.slug, status: 'dry-run', url: chosen.url, images: imgs });
    continue;
  }

  const mirrored = [];
  for (let i = 0; i < imgs.length; i++) {
    const pub = await mirror(imgs[i], t.slug, i);
    if (pub) mirrored.push(pub);
  }
  if (!mirrored.length) { console.log(`  mirror failed     : ${t.title}`); results.push({ slug: t.slug, status: 'mirror-failed' }); continue; }

  t.data.images = mirrored;
  fs.writeFileSync(t.file, JSON.stringify(t.data, null, 2));
  console.log(`  OK   ${t.title}  -> ${mirrored.length} image(s)  [${chosen.url.split('/').filter(Boolean).pop()}]`);
  results.push({ slug: t.slug, status: 'filled', url: chosen.url, images: mirrored });
}

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.writeFileSync(REPORTS, JSON.stringify(results, null, 2));

const filled = results.filter((r) => r.status === 'filled').length;
const dry = results.filter((r) => r.status === 'dry-run').length;
console.log(`\nprocessed: ${results.length}  filled: ${filled}${dry ? `  dry-run: ${dry}` : ''}`);
console.log(`report: ${path.relative(ROOT, REPORTS)}`);
