#!/usr/bin/env node
'use strict';
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CAT = path.join(ROOT, 'data/products/catalogue-toto-2026.json');
const IMG = path.join(ROOT, 'assets/images/products/toto');
fs.mkdirSync(IMG, { recursive: true });
const ax = { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 };

async function dl(url, file) {
  const r = await axios({ url, responseType: 'stream', timeout: 30000, headers: ax.headers });
  const w = fs.createWriteStream(file);
  r.data.pipe(w);
  return new Promise((ok, fail) => { w.on('finish', ok); w.on('error', fail); });
}

async function main() {
  const data = JSON.parse(fs.readFileSync(CAT, 'utf-8'));
  let ok = 0, fail = 0, skip = 0;
  const cats = Object.keys(data);
  for (const cat of cats) {
    const keys = Object.keys(data[cat]);
    for (const slug of keys) {
      const p = data[cat][slug];
      const code = p.product_info['Mã sản phẩm'] || slug;
      if (p.images && p.images.length > 0) { skip++; continue; }

      const fp = path.join(IMG, slug + '.jpg');
      let found = null;
      const clean = code.replace(/[/\\:()]/g, '').trim().toLowerCase();

      // TOTO doesn't have scrapeable product pages - use PDF extraction
      // Try the global TOTO site
      const urls = [
        `https://image1.toto.com/media/product/${clean.replace(/\s/g, '_')}.jpg`,
        `https://image.toto.com/media/product/${clean.replace(/\s/g, '_')}.jpg`,
        `https://vn.toto.com/wp-content/uploads/${clean.replace(/[^a-z0-9]/g, '-')}.jpg`,
        `https://vn.toto.com/wp-content/uploads/${clean.replace(/[^a-z0-9]/g, '')}.jpg`,
      ];
      for (const u of urls) {
        try {
          const r = await axios.head(u, { timeout: 5000, headers: ax.headers });
          if (r.status === 200 || r.status === 301 || r.status === 302) { found = u; break; }
        } catch (_) { }
      }

      if (found) {
        try { await dl(found, fp); p.images = [`/assets/images/products/toto/${slug}.jpg`]; ok++; }
        catch (e) { fail++; }
      } else { fail++; }
      await new Promise(r => setTimeout(r, 300));
    }
  }
  fs.writeFileSync(CAT, JSON.stringify(data, null, 2) + '\n');
  console.log(`TOTO: ${ok} OK, ${fail} fail, ${skip} skip`);
}
main().catch(e => { console.error(e); process.exit(1); });
