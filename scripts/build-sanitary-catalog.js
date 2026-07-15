#!/usr/bin/env node
/**
 * Builds data/catalog-sanitary.js from the 4 brand catalogue JSON files.
 * Output: window.LAVATILE_SANITARY — flat array for VCProductFilter.
 */

const fs = require('fs');
const path = require('path');

const BRANDS = [
  {
    file: 'data/products/catalogue-caesar-06-2026.json',
    brand: 'Caesar',
    imgRoot: '/assets/images/products/caesar/',
  },
  {
    file: 'data/products/catalogue-toto-2026.json',
    brand: 'TOTO',
    imgRoot: '/assets/images/products/toto/',
  },
  {
    file: 'data/products/catalogue-inax-2026.json',
    brand: 'INAX',
    imgRoot: '/assets/images/products/inax/',
  },
  {
    file: 'data/products/catalogue-t1-2026-sc.json',
    brand: 'Viglacera',
    imgRoot: '/assets/images/products/viglacera/',
  },
];

// Category label mapping (slug → display name)
const CATEGORY_LABELS = {
  'ban-cau-thong-minh': 'Bàn cầu thông minh',
  'ban-cau-dien-tu': 'Bàn cầu điện tử',
  'nap-ban-cau-dien-tu': 'Nắp bàn cầu điện tử',
  'nap-rua-dien-tu': 'Nắp rửa điện tử',
  'nap-rua-co': 'Nắp rửa cơ',
  'nap-ban-cau-co': 'Nắp bàn cầu cơ',
  'ban-cau-mot-khoi': 'Bàn cầu một khối',
  'ban-cau-hai-khoi': 'Bàn cầu hai khối',
  'ban-cau-cong-cong': 'Bàn cầu công cộng',
  'ban-cau-treo-tuong': 'Bàn cầu treo tường',
  'ban-cau-xa-cam-ung': 'Bàn cầu xả cảm ứng',
  'phu-kien-ban-cau': 'Phụ kiện bàn cầu',
  'lavabo-tu': 'Lavabo tủ',
  'chau-dương-ban': 'Chậu dương bàn',
  'chau-am-ban': 'Chậu âm bàn',
  'chau-ban-da': 'Chậu bàn đá',
  'chau-duong-ban': 'Chậu dương bàn',
  'chau-ban-duong-ban': 'Chậu bàn dương bàn',
  'chau-cerafine': 'Chậu Cerafine',
  'chau-dat-ban': 'Chậu đặt bàn',
  'chau-treo-tuong': 'Chậu treo tường',
  'chau-rua-chen': 'Chậu rửa chén',
  'chau-rua-tich-hop': 'Chậu rửa tích hợp',
  'chau-rua': 'Chậu rửa',
  'bon-tieu': 'Bồn tiểu',
  'voi-bep': 'Vòi bếp',
  'voi-lanh': 'Vòi lạnh',
  'voi-chau-cam-ung': 'Vòi chậu cảm ứng',
  'voi-chau-cao': 'Vòi chậu cao',
  'voi-chau': 'Vòi chậu',
  'voi-rua-bat': 'Vòi rửa bát',
  'voi-bon-tam': 'Vòi bồn tắm',
  'sen-tam': 'Sen tắm',
  'bon-tam': 'Bồn tắm',
  'phu-kien': 'Phụ kiện',
  'chan-chau': 'Chân chậu',
  'ga-thoat-san': 'Ga thoát sàn',
};

function categoryLabel(key) {
  for (const [prefix, label] of Object.entries(CATEGORY_LABELS)) {
    if (key.startsWith(prefix)) return label;
  }
  // Capitalize
  return key
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Match what generate-sanitary-pages.js's parseCategory does — longest prefix first
const CATEGORY_PREFIXES = Object.keys(CATEGORY_LABELS).sort((a, b) => b.length - a.length);

function categorySlug(catKey) {
  for (const prefix of CATEGORY_PREFIXES) {
    if (catKey.startsWith(prefix)) return prefix;
  }
  return catKey;
}

const allProducts = [];

for (const { file, brand, imgRoot } of BRANDS) {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  
  for (const [catKey, products] of Object.entries(data)) {
    const category = categoryLabel(catKey);
    const sluggedCat = categorySlug(catKey);
    
    for (const [slug, p] of Object.entries(products)) {
      const info = p.product_info || {};
      
      allProducts.push({
        code: info['Mã sản phẩm'] || slug,
        title: p.title || slug,
        brand: brand,
        category: category,
        price: info['Giá'] || '',
        dimensions: info['Kích thước'] || info['Kích thước (D x R x C)'] || '',
        technology: info['Công nghệ'] || info['Công nghệ sản xuất'] || '',
        finish: info['Bề mặt'] || info['Bề mặt men'] || '',
        rooms: p.rooms || ['phong_tam'],
        image: (p.images && p.images[0]) ? p.images[0] : (imgRoot + slug + '.jpg'),
        slug: slug,
        type: 'sanitary',
        detailUrl: sluggedCat + '/' + slug + '.html',
      });
    }
  }
}

const output = `(function(){'use strict'; window.LAVATILE_SANITARY=${JSON.stringify(allProducts)};})();`;

fs.writeFileSync('data/catalog-sanitary.js', output, 'utf-8');
console.log(`Wrote ${allProducts.length} products to data/catalog-sanitary.js`);
