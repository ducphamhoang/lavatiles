#!/usr/bin/env node
/**
 * Builds data/catalog-sanitary.js from the available sanitary catalogue sources.
 * Output: window.LAVATILE_SANITARY — flat array for VCProductFilter.
 */

const fs = require('fs');
const path = require('path');
const { categoryInfo, categoryGroup, flattenTotoTree } = require('./toto-category-map');

const ROOT_DIR = path.resolve(__dirname, '..');

const BRANDS = [
  {
    file: path.join(ROOT_DIR, 'data/products/catalogue-caesar-06-2026.json'),
    brand: 'Caesar',
    imgRoot: '/assets/images/products/caesar/',
  },
  {
    file: path.join(ROOT_DIR, 'data/products/catalogue-toto-2026.json'),
    brand: 'TOTO',
    imgRoot: '/assets/images/products/toto/',
  },
  {
    file: path.join(ROOT_DIR, 'data/products/catalogue-inax-2026.json'),
    brand: 'INAX',
    imgRoot: '/assets/images/products/inax/',
  },
  {
    file: path.join(ROOT_DIR, 'data/products/catalogue-t1-2026-sc.json'),
    brand: 'Viglacera',
    imgRoot: '/assets/images/products/viglacera/',
  },
];

const allProducts = [];

for (const { file, brand, imgRoot } of BRANDS) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  
  for (const [catKey, products] of Object.entries(data)) {
    const category = categoryInfo(catKey);
    const sluggedCat = category.slug;
    
    for (const [slug, p] of Object.entries(products)) {
      const info = p.product_info || {};
      
      allProducts.push({
        code: info['Mã sản phẩm'] || slug,
        title: p.title || slug,
        brand: brand,
        category: category.label,
        categorySlug: category.slug,
        categoryGroup: categoryGroup(category.slug),
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

const totoTreePath = path.join(ROOT_DIR, 'data/product/new-toto/products-tree.json');
if (fs.existsSync(totoTreePath)) {
  for (const { slug, product, sourceCategories, category, categoryGroup: group } of flattenTotoTree(JSON.parse(fs.readFileSync(totoTreePath, 'utf-8')))) {
    const info = product.product_info || {};
    allProducts.push({
      code: info['Mã sản phẩm'] || slug,
      title: product.title || slug,
      brand: 'TOTO',
      category: category.label,
      categorySlug: category.slug,
      categoryGroup: group,
      sourceCategories,
      price: info['Giá'] || '',
      dimensions: info['Kích thước'] || info['Kích cỡ'] || '',
      technology: info['Công nghệ'] || '',
      finish: info['Màu sắc'] || '',
      rooms: product.rooms || ['phong_tam'],
      image: product.images && product.images[0] ? product.images[0] : '',
      slug,
      type: 'sanitary',
      detailUrl: `${category.slug}/${slug}.html`,
    });
  }
}

const output = `(function(){'use strict'; window.LAVATILE_SANITARY=${JSON.stringify(allProducts)};})();`;

fs.writeFileSync(path.join(ROOT_DIR, 'data/catalog-sanitary.js'), output, 'utf-8');
console.log(`Wrote ${allProducts.length} products to data/catalog-sanitary.js`);
