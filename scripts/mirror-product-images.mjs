#!/usr/bin/env node
/**
 * Mirrors the external product images into R2.
 *
 * 93% of the catalogue hotlinks images from manufacturer sites, one of which
 * (www.hoathanhphat.com.vn) already serves an invalid certificate, so those
 * images are broken for visitors. This downloads every externally-referenced
 * image, uploads it to the R2 bucket, and records a URL -> R2 URL mapping for
 * the data rewrite step.
 *
 * Run: node scripts/mirror-product-images.mjs [--concurrency N] [--limit N]
 *
 * Resumable: completed keys are recorded in tmp/image-mirror-state.jsonl and
 * skipped on re-run.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CANON_DIR = path.join(ROOT, 'data', 'products', 'canonical');
const TMP_DIR = path.join(ROOT, 'tmp');
const STATE_FILE = path.join(TMP_DIR, 'image-mirror-state.jsonl');
const MAP_FILE = path.join(TMP_DIR, 'image-mirror-map.json');

const BUCKET = 'lavatiles-product-images';
const PUBLIC_BASE = 'https://pub-3ab81718ddbf44a49cbbc475f1064b77.r2.dev';

const args = process.argv.slice(2);
const argVal = (name, dflt) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? Number(args[i + 1]) : dflt;
};
const CONCURRENCY = argVal('--concurrency', 12);
const LIMIT = argVal('--limit', Infinity);

const EXT_CT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
};

function sanitize(name) {
  const decoded = decodeURIComponent(name)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return decoded.slice(0, 80) || 'image';
}

// ------------------------------------------------------------------ collect
const jobs = [];
const seenUrls = new Set();
const canonicalFiles = fs.readdirSync(CANON_DIR).filter(
  (f) => f.endsWith('.json') && !['products-tree.json', '_dedup-report.json'].includes(f)
);

for (const file of canonicalFiles) {
  const productSlug = file.replace(/\.json$/, '');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(CANON_DIR, file), 'utf-8'));
  } catch {
    continue;
  }
  const images = data.images || [];
  images.forEach((url, index) => {
    if (typeof url !== 'string' || !url.startsWith('http')) return;
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    const clean = url.split(/[?#]/)[0];
    const base = path.basename(clean);
    const ext = path.extname(base).toLowerCase() || '.jpg';
    const key = `products/${productSlug}/${String(index).padStart(2, '0')}-${sanitize(base)}`;
    jobs.push({ url, key, ext, ct: EXT_CT[ext] || 'application/octet-stream', productSlug, index });
  });
}

// -------------------------------------------------------------------- state
fs.mkdirSync(TMP_DIR, { recursive: true });
const done = new Map();
if (fs.existsSync(STATE_FILE)) {
  for (const line of fs.readFileSync(STATE_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      done.set(rec.url, rec);
    } catch { /* ignore */ }
  }
}
const stateOut = fs.createWriteStream(STATE_FILE, { flags: 'a' });

console.log(`external images: ${jobs.length}`);
console.log(`already mirrored: ${done.size}`);
console.log(`concurrency: ${CONCURRENCY}`);

const pending = jobs.filter((j) => !done.has(j.url)).slice(0, LIMIT === Infinity ? undefined : LIMIT);
console.log(`to mirror this run: ${pending.length}\n`);

// ------------------------------------------------------------------ workers
function wranglerUpload(localFile, key, contentType) {
  return new Promise((resolve) => {
    const child = spawn('npx', [
      '--yes', 'wrangler@latest', 'r2', 'object', 'put',
      `${BUCKET}/${key}`, '--file', localFile,
      '--content-type', contentType, '--remote', '--force',
    ], { cwd: ROOT, stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

let ok = 0, failed = 0, processed = 0;

async function handle(job) {
  const tmpFile = path.join(TMP_DIR, `dl-${process.pid}-${processed}.tmp`);
  try {
    const res = await fetch(job.url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error('empty body');
    fs.writeFileSync(tmpFile, buf);

    const uploaded = await wranglerUpload(tmpFile, job.key, job.ct);
    if (!uploaded) throw new Error('upload failed');

    const rec = { url: job.url, key: job.key, publicUrl: `${PUBLIC_BASE}/${job.key}`, bytes: buf.length };
    stateOut.write(JSON.stringify(rec) + '\n');
    ok++;
    return rec;
  } catch (err) {
    failed++;
    console.error(`  FAIL ${job.url.slice(0, 90)} — ${err.message}`);
    return null;
  } finally {
    fs.rmSync(tmpFile, { force: true });
    processed++;
    if (processed % 100 === 0) {
      console.log(`  progress: ${processed}/${pending.length}  ok=${ok} failed=${failed}`);
    }
  }
}

const queue = [...pending];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await handle(queue.shift());
  })
);

stateOut.end();

// --------------------------------------------------------------- write map
const map = {};
for (const line of fs.readFileSync(STATE_FILE, 'utf-8').split('\n')) {
  if (!line.trim()) continue;
  try {
    const rec = JSON.parse(line);
    map[rec.url] = rec.publicUrl;
  } catch { /* ignore */ }
}
fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));

console.log(`\ndone. mirrored ok=${ok} failed=${failed}`);
console.log(`total mapped: ${Object.keys(map).length}`);
console.log(`map written to ${path.relative(ROOT, MAP_FILE)}`);
