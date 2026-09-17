#!/usr/bin/env node
/**
 * Mirrors the external images held by the remaining data sources into R2 and
 * rewrites those sources to point at the mirrored copies.
 *
 * The product canonical JSONs are handled by mirror-product-images.mjs; this
 * covers the other three sources that feed the generated pages:
 *   - data/catalog-sanitary.js   (sanitary products, vn.toto.com)
 *   - data/catalog-tiles.js      (hand-curated tiles, www.hoathanhphat.com.vn)
 *   - data/collections/*.json    (collection covers, www.eurotile.vn)
 *
 * Run: node scripts/mirror-remaining-images.mjs [--concurrency N] [--dry-run]
 *
 * Resumable via tmp/image-mirror-state.jsonl (shared with the product mirror).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = path.join(ROOT, 'tmp');
const STATE_FILE = path.join(TMP_DIR, 'image-mirror-state.jsonl');
const FAIL_FILE = path.join(TMP_DIR, 'image-mirror-failures.json');

const BUCKET = 'lavatiles-product-images';
const PUBLIC_BASE = 'https://pub-3ab81718ddbf44a49cbbc475f1064b77.r2.dev';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CONCURRENCY = (() => {
  const i = args.indexOf('--concurrency');
  return i !== -1 && args[i + 1] ? Number(args[i + 1]) : 10;
})();

const EXT_CT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
};
const URL_RE = /https?:\/\/[^\s"'`,)]+\.(?:jpg|jpeg|png|webp|avif|gif)/gi;

const collectionFiles = fs.existsSync(path.join(ROOT, 'data/collections'))
  ? fs.readdirSync(path.join(ROOT, 'data/collections'), { recursive: true })
      .filter((f) => String(f).endsWith('.json'))
      .map((f) => path.join('data/collections', String(f)))
  : [];

// The sanitary generator reads data/products/ directly (not canonical/), so that
// tree carries its own copy of the external image URLs.
const productJsonFiles = fs.existsSync(path.join(ROOT, 'data/products'))
  ? fs.readdirSync(path.join(ROOT, 'data/products'), { recursive: true })
      .filter((f) => String(f).endsWith('.json'))
      .map((f) => path.join('data/products', String(f)))
  : [];

const SOURCES = [
  'data/catalog-sanitary.js',
  'data/catalog-tiles.js',
  ...collectionFiles,
  ...productJsonFiles,
].filter((f) => fs.existsSync(path.join(ROOT, f)));

function keyFor(url) {
  const clean = url.split(/[?#]/)[0];
  const base = path.basename(clean).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60);
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  return `mirror/${hash}-${base || 'image'}`;
}

// ------------------------------------------------------------------ collect
const perFile = new Map();
const allUrls = new Set();
for (const rel of SOURCES) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
  const urls = new Set(text.match(URL_RE) || []);
  const external = [...urls].filter((u) => !u.includes('r2.dev'));
  if (external.length) {
    perFile.set(rel, external);
    external.forEach((u) => allUrls.add(u));
  }
}

console.log(`sources scanned     : ${SOURCES.length}`);
console.log(`sources with extern : ${perFile.size}`);
for (const [rel, urls] of perFile) console.log(`   ${String(urls.length).padStart(5)}  ${rel}`);
console.log(`distinct URLs       : ${allUrls.size}\n`);

if (DRY_RUN) process.exit(0);

// -------------------------------------------------------------------- state
fs.mkdirSync(TMP_DIR, { recursive: true });
const done = new Map();
if (fs.existsSync(STATE_FILE)) {
  for (const line of fs.readFileSync(STATE_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); done.set(r.url, r); } catch { /* ignore */ }
  }
}
const stateOut = fs.createWriteStream(STATE_FILE, { flags: 'a' });

const pending = [...allUrls].filter((u) => !done.has(u));
console.log(`already mirrored    : ${done.size}`);
console.log(`to mirror this run  : ${pending.length}\n`);

function wranglerUpload(localFile, key, ct) {
  return new Promise((resolve) => {
    const child = spawn('npx', [
      '--yes', 'wrangler@latest', 'r2', 'object', 'put',
      `${BUCKET}/${key}`, '--file', localFile, '--content-type', ct,
      '--remote', '--force',
    ], { cwd: ROOT, stdio: 'ignore' });
    child.on('close', (c) => resolve(c === 0));
    child.on('error', () => resolve(false));
  });
}

let ok = 0, failed = 0, processed = 0;
const failures = [];

async function handle(url) {
  const ext = (path.extname(url.split(/[?#]/)[0]) || '.jpg').toLowerCase();
  const ct = EXT_CT[ext] || 'application/octet-stream';
  const key = keyFor(url);
  const tmpFile = path.join(TMP_DIR, `dl2-${process.pid}-${processed}.tmp`);
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error('empty body');
    fs.writeFileSync(tmpFile, buf);
    if (!(await wranglerUpload(tmpFile, key, ct))) throw new Error('upload failed');
    const rec = { url, key, publicUrl: `${PUBLIC_BASE}/${key}`, bytes: buf.length };
    stateOut.write(JSON.stringify(rec) + '\n');
    ok++;
  } catch (err) {
    failed++;
    failures.push({ url, error: err.message });
  } finally {
    fs.rmSync(tmpFile, { force: true });
    processed++;
    if (processed % 50 === 0) console.log(`  ${processed}/${pending.length} ok=${ok} failed=${failed}`);
  }
}

const queue = [...pending];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await handle(queue.shift());
}));
stateOut.end();

// ------------------------------------------------------------------ rewrite
const map = new Map();
for (const line of fs.readFileSync(STATE_FILE, 'utf-8').split('\n')) {
  if (!line.trim()) continue;
  try { const r = JSON.parse(line); map.set(r.url, r.publicUrl); } catch { /* ignore */ }
}

let rewrites = 0;
for (const rel of SOURCES) {
  const full = path.join(ROOT, rel);
  let text = fs.readFileSync(full, 'utf-8');
  const before = text;
  text = text.replace(URL_RE, (u) => {
    if (u.includes('r2.dev')) return u;
    const hit = map.get(u);
    if (hit) { rewrites++; return hit; }
    return u;
  });
  if (text !== before) fs.writeFileSync(full, text);
}

fs.writeFileSync(FAIL_FILE, JSON.stringify(failures, null, 2));

console.log(`\nmirrored ok=${ok} failed=${failed}`);
console.log(`URLs rewritten: ${rewrites}`);
console.log(`failures logged: ${path.relative(ROOT, FAIL_FILE)}`);
