#!/usr/bin/env node
/**
 * Final pass: mirrors the external images still referenced by the generated
 * pages, then rewrites every data file that carries those URLs.
 *
 * Working from the rendered HTML rather than the crawl trees keeps this to the
 * ~1.2k images actually used, instead of the ~10k URLs those trees contain.
 *
 * Input:  tmp/remaining-html-images.json  (produced by scanning the pages)
 * Run:    node scripts/mirror-html-referenced-images.mjs [--concurrency N]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = path.join(ROOT, 'tmp');
const STATE_FILE = path.join(TMP_DIR, 'image-mirror-state.jsonl');
const INPUT = path.join(TMP_DIR, 'remaining-html-images.json');
const FAIL_FILE = path.join(TMP_DIR, 'image-mirror-failures.json');

const BUCKET = 'lavatiles-product-images';
const PUBLIC_BASE = 'https://pub-3ab81718ddbf44a49cbbc475f1064b77.r2.dev';

const args = process.argv.slice(2);
const CONCURRENCY = (() => {
  const i = args.indexOf('--concurrency');
  return i !== -1 && args[i + 1] ? Number(args[i + 1]) : 12;
})();

const EXT_CT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
};

const targets = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
console.log(`targets from HTML: ${targets.length}`);

const keyFor = (url) => {
  const base = path.basename(url.split(/[?#]/)[0]).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60);
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  return `mirror/${hash}-${base || 'image'}`;
};

fs.mkdirSync(TMP_DIR, { recursive: true });
const done = new Map();
if (fs.existsSync(STATE_FILE)) {
  for (const line of fs.readFileSync(STATE_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); done.set(r.url, r); } catch { /* ignore */ }
  }
}
const stateOut = fs.createWriteStream(STATE_FILE, { flags: 'a' });
const pending = targets.filter((u) => !done.has(u));
console.log(`already mirrored: ${done.size}`);
console.log(`to mirror       : ${pending.length}\n`);

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

let ok = 0, failed = 0, processed = 0;
const failures = [];
async function handle(url) {
  const ext = (path.extname(url.split(/[?#]/)[0]) || '.jpg').toLowerCase();
  const key = keyFor(url);
  const tmp = path.join(TMP_DIR, `dl3-${process.pid}-${processed}.tmp`);
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error('empty body');
    fs.writeFileSync(tmp, buf);
    if (!(await wranglerUpload(tmp, key, EXT_CT[ext] || 'application/octet-stream'))) throw new Error('upload failed');
    stateOut.write(JSON.stringify({ url, key, publicUrl: `${PUBLIC_BASE}/${key}`, bytes: buf.length }) + '\n');
    ok++;
  } catch (e) {
    failed++;
    failures.push({ url, error: e.message });
  } finally {
    fs.rmSync(tmp, { force: true });
    processed++;
    if (processed % 100 === 0) console.log(`  ${processed}/${pending.length} ok=${ok} failed=${failed}`);
  }
}

const queue = [...pending];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await handle(queue.shift());
}));
stateOut.end();

// ---------------------------------------------------------------- rewrite
const map = new Map();
for (const line of fs.readFileSync(STATE_FILE, 'utf-8').split('\n')) {
  if (!line.trim()) continue;
  try { const r = JSON.parse(line); map.set(r.url, r.publicUrl); } catch { /* ignore */ }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.git')) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (/\.(json|js|html)$/.test(e.name)) out.push(f);
  }
  return out;
}

const URL_RE = /https?:\/\/[^\s"'`,)]+\.(?:jpg|jpeg|png|webp|avif|gif)/gi;
let rewritten = 0, files = 0;
for (const f of walk(path.join(ROOT, 'data'))) {
  let text = fs.readFileSync(f, 'utf-8');
  const before = text;
  text = text.replace(URL_RE, (u) => {
    if (u.includes('r2.dev')) return u;
    const hit = map.get(u);
    if (hit) { rewritten++; return hit; }
    return u;
  });
  if (text !== before) { fs.writeFileSync(f, text); files++; }
}

fs.writeFileSync(FAIL_FILE, JSON.stringify(failures, null, 2));
console.log(`\nmirrored ok=${ok} failed=${failed}`);
console.log(`data files rewritten: ${files}, URLs: ${rewritten}`);
