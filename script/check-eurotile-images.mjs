import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data/products/revise-eurotile');

async function urlExists(url, timeout = 8000) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeout) });
    return { ok: resp.ok, status: resp.status };
  } catch {
    try {
      const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(timeout) });
      return { ok: resp.ok, status: resp.status };
    } catch (e) {
      return { ok: false, status: 0, error: e.message };
    }
  }
}

async function withConcurrency(urls, concurrency = 10) {
  const results = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(url => urlExists(url)));
    results.push(...batchResults);
    process.stdout.write('.');
  }
  return results;
}

async function main() {
  // Load products file - extract all image URLs
  const raw = readFileSync(join(DATA_DIR, '_products.js'), 'utf8');
  const products = JSON.parse(raw.replace('window.LAVATILE_EUROTILE_PRODUCTS = ', '').replace(/;$/, ''));
  
  const allImages = products.map(p => p.image).filter(Boolean);
  const uniqueImages = [...new Set(allImages)];
  
  console.log(`Total products: ${products.length}`);
  console.log(`Products with images: ${allImages.length}`);
  console.log(`Unique images: ${uniqueImages.length}`);
  console.log(`Checking unique images with concurrency 10...\n`);

  const results = await withConcurrency(uniqueImages, 10);
  console.log(`\n`);

  const bad = [];
  for (let i = 0; i < uniqueImages.length; i++) {
    if (!results[i].ok) {
      bad.push({ url: uniqueImages[i], status: results[i].status || results[i].error });
    }
  }

  console.log(`=== Results ===`);
  console.log(`Checked: ${uniqueImages.length}, Broken: ${bad.length}, OK: ${uniqueImages.length - bad.length}`);

  if (bad.length > 0) {
    console.log(`\nBroken images:`);
    bad.forEach(b => {
      // Find products using this image
      const matched = products.filter(p => p.image === b.url);
      const codes = matched.map(p => p.code).join(', ');
      console.log(`  [${b.status}] ${codes}: ${b.url}`);
    });
  }

  // Also check if products without images could use a fallback
  const noImage = products.filter(p => !p.image);
  if (noImage.length > 0) {
    console.log(`\nProducts without any image (${noImage.length}):`);
    noImage.slice(0, 20).forEach(p => {
      console.log(`  ${p.code} (${p.eurotile_collection})`);
    });
    if (noImage.length > 20) console.log(`  ... and ${noImage.length - 20} more`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
