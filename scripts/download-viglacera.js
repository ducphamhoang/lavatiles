#!/usr/bin/env node
'use strict';
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CAT = path.join(ROOT, 'data/products/catalogue-t1-2026-sc.json');
const IMG = path.join(ROOT, 'assets/images/products/viglacera');
fs.mkdirSync(IMG, { recursive: true });
const ax = { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 };

async function dl(url, file) {
  const r = await axios({ url, responseType: 'stream', timeout: 30000, headers: ax.headers });
  const w = fs.createWriteStream(file);
  r.data.pipe(w);
  return new Promise((ok, fail) => { w.on('finish', ok); w.on('error', fail); });
}

// Build a list of Viglacera product pages to search
const CAT_PAGES = [
  { name: 'ban-cau-thong-minh', catFilter: 'Bàn cầu thông minh', url: 'https://viglacera.vn/ban-cau-1?q=collections:4158564%20AND%20tags.keyword:(%22B%C3%A0n%20c%E1%BA%A7u%20th%C3%B4ng%20minh%22)' },
  { name: 'ban-cau-1', url: 'https://viglacera.vn/ban-cau-1' },
  { name: 'chau-rua-1', url: 'https://viglacera.vn/chau-rua-1' },
  { name: 'voi-chau', url: 'https://viglacera.vn/voi-chau' },
  { name: 'sen-tam', url: 'https://viglacera.vn/sen-tam' },
  { name: 'bon-tieu', url: 'https://viglacera.vn/bon-tieu' },
  { name: 'phu-kien', url: 'https://viglacera.vn/phu-kien' },
];

async function findOnSite(code) {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!clean || clean === 'LIÊNHỆ') return null;

  // Try direct product page URL first
  const slug = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const directUrls = [
    `https://viglacera.vn/${slug}`,
    `https://viglacera.vn/san-pham-${slug}`,
  ];
  for (const u of directUrls) {
    try {
      const r = await axios.get(u, ax);
      const $ = cheerio.load(r.data);
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (ogImg && ogImg.includes('bizweb.dktcdn.net')) return ogImg;
      // Also try img tags
      const imgs = $('img[src*="bizweb.dktcdn.net"][src*="products"]');
      if (imgs.length > 0) {
        const src = $(imgs[0]).attr('src');
        if (src) return src.startsWith('http') ? src : 'https:' + src;
      }
    } catch (_) {}
  }
  return null;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(CAT, 'utf-8'));
  let ok = 0, fail = 0, skip = 0, total = 0;
  const cats = Object.keys(data);
  for (const cat of cats) {
    const keys = Object.keys(data[cat]);
    for (const slug of keys) {
      const p = data[cat][slug];
      const code = p.product_info['Mã sản phẩm'] || slug;
      total++;
      if (p.images && p.images.length > 0) { skip++; continue; }

      const fp = path.join(IMG, slug + '.jpg');
      const url = await findOnSite(code);
      if (url) {
        try { await dl(url, fp); p.images = [`/assets/images/products/viglacera/${slug}.jpg`]; ok++; }
        catch (e) { fail++; }
      } else { fail++; }
      if (total % 10 === 0) console.log(`[Viglacera] ${total} processed...`);
      await new Promise(r => setTimeout(r, 300));
    }
  }
  fs.writeFileSync(CAT, JSON.stringify(data, null, 2) + '\n');
  console.log(`Viglacera: ${ok} OK, ${fail} fail, ${skip} skip (${total} total)`);
}
main().catch(e => { console.error(e); process.exit(1); });
