#!/usr/bin/env node
/**
 * Download images for news articles from Vietceramics.
 * Reads data/articles.json and downloads hero/block images.
 *
 * Usage: node tools/download-news-images.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'articles.json');
const IMG_DIR = path.join(ROOT, 'assets', 'images', 'news');

const articles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;

    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  let totalDownloads = 0;
  let errors = 0;

  for (const article of articles) {
    if (!article.images) continue;
    for (const img of article.images) {
      if (!img.url || !img.local) continue;
      const dest = path.join(IMG_DIR, article.slug, img.local);
      if (fs.existsSync(dest)) {
        console.log(`  [SKIP] ${img.local} (exists)`);
        continue;
      }
      try {
        await download(img.url, dest);
        console.log(`  [OK] ${article.slug}/${img.local}`);
        totalDownloads++;
      } catch (err) {
        console.error(`  [ERR] ${article.slug}/${img.local}: ${err.message}`);
        errors++;
      }
      // Small delay to be polite
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`\nDone! Downloaded ${totalDownloads} images (${errors} errors).`);
}

main().catch(console.error);
