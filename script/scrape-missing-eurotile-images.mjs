/** Scrape missing product images for 8 Eurotile collections */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data/products/revise-eurotile');

// Collection slug → Eurotile page URL
const SLUG_TO_PAGE = {};
const catalog = JSON.parse(readFileSync(join(DATA_DIR, '_catalog.json'), 'utf8'));
for (const [slug, entry] of Object.entries(catalog)) {
  SLUG_TO_PAGE[slug] = entry.url || '';
}

async function fetchPage(url) {
  const resp = await fetch(url);
  return resp.text();
}

function extractImages(html, codes) {
  // Match image URLs like: "https://www.eurotile.vn/pictures/..."
  const imgRegex = /https:\/\/www\.eurotile\.vn\/pictures\/[^"'\s)]+/g;
  const allMatches = [...new Set(html.match(imgRegex) || [])];
  
  // Filter out QR codes, MOTA (technical) images
  const filtered = allMatches.filter(u => 
    !u.includes('QR') && !u.includes('MOTA') && !u.includes('QRCODE') &&
    !u.includes('icon') && !u.includes('.mp4') && !u.includes('.avi')
  );

  // Try to find images that match any product code
  const matched = [];
  for (const code of codes) {
    const key = code.replace(/[\s\/.]/g, '').toLowerCase();
    const found = filtered.filter(u => u.toLowerCase().includes(key));
    if (found.length > 0) matched.push(...found);
  }

  // Include scene/general images too
  const sceneImages = filtered.filter(u => 
    u.includes('minhhoa') || u.includes('scene') || u.includes('Minhhoa')
  );

  return [...new Set([...matched, ...sceneImages, ...filtered])];
}

async function main() {
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  let fixed = 0;

  for (const f of files) {
    const filepath = join(DATA_DIR, f);
    const data = JSON.parse(readFileSync(filepath, 'utf8'));
    
    if (data.images && data.images.length > 0) continue;

    const slug = f.replace('.json', '');
    const url = data.source_ref?.url || SLUG_TO_PAGE[slug];
    if (!url) {
      console.log(`  ✗ ${data.title}: no URL`);
      continue;
    }

    console.log(`  → Fetching ${data.title}...`);
    try {
      const html = await fetchPage(url);
      const codes = data.product_codes || [];
      const images = extractImages(html, codes);

      if (images.length > 0) {
        data.images = images;
        writeFileSync(filepath, JSON.stringify(data, null, 2));
        console.log(`  ✓ ${data.title}: found ${images.length} images`);
        fixed++;
      } else {
        console.log(`  ✗ ${data.title}: no images found at ${url}`);
      }
    } catch (err) {
      console.log(`  ✗ ${data.title}: ${err.message}`);
    }
  }

  console.log(`\nFixed collections: ${fixed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
