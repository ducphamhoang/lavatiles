#!/usr/bin/env node
'use strict';
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CAT = path.join(ROOT, 'data/products/catalogue-caesar-06-2026.json');
const IMG = path.join(ROOT, 'assets/images/products/caesar');
fs.mkdirSync(IMG, { recursive: true });
const ax = { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 };

async function dl(url, file) {
  const r = await axios({ url, responseType: 'stream', timeout: 30000, headers: ax.headers });
  const w = fs.createWriteStream(file);
  r.data.pipe(w);
  return new Promise((ok, fail) => { w.on('finish', ok); w.on('error', fail); });
}

// Product page slugs
const CAT_PAGES = {
  'ban-cau-thong-minh-caesar': 'Ban-cau-dien-tu-397566',
  'nap-ban-cau-dien-tu-caesar': 'Nap-ban-cau-Caesar-393901',
  'nap-ban-cau-co-caesar': 'Nap-ban-cau-Caesar-393901',
  'ban-cau-mot-khoi-caesar': 'Ban-cau-mot-khoi-397554',
  'ban-cau-hai-khoi-caesar': 'Ban-cau-hai-khoi-397555',
  'ban-cau-cong-cong-caesar': 'Ban-Cau-Caesar-393467',
  'phu-kien-ban-cau-caesar': 'Phu-kien-Caesar-393905',
  'lavabo-tu-caesar': 'Lavabo-Caesar-393465',
  'chau-duong-ban-caesar': 'Lavabo-Caesar-393465',
  'chau-am-ban-caesar': 'Lavabo-Caesar-393465',
  'bon-tieu-caesar': 'Be-tieu-Caesar-393898',
  'voi-bep-caesar': 'Voi-Caesar-393904',
  'voi-lanh-caesar': 'Voi-Caesar-393904',
  'sen-tam-caesar': 'Sen-Caesar-393907',
  'voi-bon-tam-caesar': 'Voi-Caesar-393904',
  'bon-tam-caesar': 'Bon-tam-Caesar-393899',
  'chau-rua-chen-caesar': 'Voi-Caesar-393904',
  'phu-kien-caesar': 'Phu-kien-Caesar-393905',
};

async function findOnSite(code) {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean || clean === 'LIÊNHỆ') return null;

  // Caesar product images follow pattern: https://caesar.net.vn/datafiles/4776/upload/images/2020/{CODE}.jpg
  for (const year of ['2020','2021','2022','2023','2024','2025','2026']) {
    const u = `https://caesar.net.vn/datafiles/4776/upload/images/${year}/${clean}.jpg`;
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
      const url = await findOnSite(code);
      if (url) {
        try { await dl(url, fp); p.images = [`/assets/images/products/caesar/${slug}.jpg`]; ok++; }
        catch (e) { fail++; console.log(`  ✗ dl fail: ${slug}`); }
      } else {
        fail++;
      }
      if (total % 10 === 0) console.log(`[Caesar] ${total} processed...`);
      await new Promise(r => setTimeout(r, 200));
    }
  }
  fs.writeFileSync(CAT, JSON.stringify(data, null, 2) + '\n');
  console.log(`Caesar: ${ok} OK, ${fail} fail, ${skip} skip (${total} total)`);
}
main().catch(e => { console.error(e); process.exit(1); });
