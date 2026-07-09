#!/usr/bin/env node
'use strict';
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CAT = path.join(ROOT, 'data/products/catalogue-inax-2026.json');
const IMG = path.join(ROOT, 'assets/images/products/inax');
fs.mkdirSync(IMG, { recursive: true });
const ax = { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 };

async function dl(url, file) {
  const r = await axios({ url, responseType: 'stream', timeout: 30000, headers: ax.headers });
  const w = fs.createWriteStream(file);
  r.data.pipe(w);
  return new Promise((ok, fail) => { w.on('finish', ok); w.on('error', fail); });
}

const CAT_MAP = {
  'ban-cau-dien-tu-inax': 'shower-toilet',
  'nap-rua-dien-tu-inax': 'shower-toilet',
  'nap-rua-co-inax': 'bidet-sanitary-ware',
  'ban-cau-mot-khoi-inax': 'toilet',
  'ban-cau-hai-khoi-inax': 'toilet',
  'ban-cau-treo-tuong-inax': 'toilet',
  'ban-cau-xa-cam-ung-inax': 'urinal',
  'chau-cerafine-inax': 'washbasin',
  'chau-dat-ban-inax': 'washbasin',
  'chau-ban-am-ban-inax': 'washbasin',
  'chau-duong-ban-inax': 'washbasin',
  'chau-am-ban-inax': 'washbasin',
  'chau-treo-tuong-inax': 'washbasin',
  'chau-rua-tich-hop-inax': 'washbasin',
  'bon-tieu-inax': 'urinal',
  'voi-chau-inax': 'faucets-and-showers',
  'voi-chau-cao-inax': 'faucets-and-showers',
  'voi-chau-cam-ung-inax': 'faucets-and-showers',
  'sen-tam-inax': 'faucets-and-showers',
  'voi-bep-inax': 'faucets-and-showers',
  'bon-tam-inax': 'bathtub',
  'phu-kien-inax': 'accessories',
  'voi-lanh-inax': 'faucets-and-showers',
};

async function findOnSite(code, catSlug) {
  const clean = code.trim().toUpperCase().replace(/[/\\:()]/g, '').replace(/\s+/g, '');
  if (!clean || clean === 'LIÊNHỆ') return null;

  const catPath = CAT_MAP[catSlug] || 'toilet';
  const codeLower = clean.toLowerCase().replace(/[^a-z0-9-]/g, '');

  // Try known product URL patterns
  const knownSlugs = [
    codeLower,
    codeLower + '-saras-light-e',
    codeLower + '-saras-auto-open',
    codeLower + '-washeto-10',
    codeLower + '-washeto-11',
  ];

  for (const slug of knownSlugs) {
    try {
      const url = `https://www.inax.com.vn/products/${catPath}/${slug}/`;
      const r = await axios.get(url, { ...ax, maxRedirects: 3, timeout: 8000 });
      const $ = cheerio.load(r.data);
      // First try: find images in the product description content
      const contentImg = $('.product-description img[src*="uploads"]').first().attr('src');
      if (contentImg && !contentImg.includes('flag') && !contentImg.includes('logo')) {
        return contentImg.startsWith('http') ? contentImg : 'https://www.inax.com.vn' + contentImg;
      }
      // Second try: any img in main content
      const anyImg = $('.entry-content img[src*="uploads"]').first().attr('src');
      if (anyImg && !anyImg.includes('flag') && !anyImg.includes('logo')) {
        return anyImg.startsWith('http') ? anyImg : 'https://www.inax.com.vn' + anyImg;
      }
      // Third try: gallery images
      const allImgs = $('img[src*="uploads"][src*="2026"]');
      for (let i = 0; i < allImgs.length; i++) {
        const src = $(allImgs[i]).attr('src');
        if (src && !src.includes('flag') && !src.includes('logo') && !src.includes('global')) {
          return src.startsWith('http') ? src : 'https://www.inax.com.vn' + src;
        }
      }
    } catch (_) { continue; }
  }

  // Try wp-content uploads pattern
  const imgPatterns = [
    `https://www.inax.com.vn/wp-content/uploads/2026/06/${codeLower}-1.png`,
    `https://www.inax.com.vn/wp-content/uploads/2026/06/${codeLower}.png`,
    `https://www.inax.com.vn/wp-content/uploads/2026/06/${codeLower}-1.jpg`,
    `https://www.inax.com.vn/wp-content/uploads/2025/06/${codeLower}-1.png`,
    `https://www.inax.com.vn/wp-content/uploads/2025/06/${codeLower}.png`,
  ];
  for (const u of imgPatterns) {
    try {
      const r = await axios.head(u, { timeout: 3000, headers: ax.headers });
      if (r.status === 200) return u;
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
      const url = await findOnSite(code, cat);
      if (url) {
        try { await dl(url, fp); p.images = [`/assets/images/products/inax/${slug}.jpg`]; ok++; }
        catch (e) { fail++; }
      } else { fail++; }
      if (total % 10 === 0) console.log(`[INAX] ${total}/${Object.keys(data).reduce((a,c) => a+Object.keys(data[c]).length,0)} (${ok} ok)`);
      await new Promise(r => setTimeout(r, 600));
    }
  }
  fs.writeFileSync(CAT, JSON.stringify(data, null, 2) + '\n');
  console.log(`INAX: ${ok} OK, ${fail} fail (${total} total)`);
}
main().catch(e => { console.error(e); process.exit(1); });
