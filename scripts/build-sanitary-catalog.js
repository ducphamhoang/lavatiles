#!/usr/bin/env node
/**
 * Builds data/catalog-sanitary.js from the available sanitary catalogue sources.
 * Output: window.LAVATILE_SANITARY — flat array for VCProductFilter.
 */

const fs = require('fs');
const path = require('path');
const { categoryInfo, categoryGroup, flattenTotoTree, flattenCaesarTree, flattenViglaceraTree } = require('./toto-category-map');

const ROOT_DIR = path.resolve(__dirname, '..');

const BRANDS = [
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

const INAX_CATEGORY_MAP = {
  'shower-toilet': 'ban-cau-thong-minh', toilet: 'ban-cau', basin: 'chau-rua',
  shower: 'voi-chau', bathtub: 'bon-tam', urinal: 'bon-tieu', accessories: 'phu-kien',
  'bathroom-faucet': 'voi-chau', 'kitchent-faucet': 'voi-bep',
  'bidet-sanitary-ware': 'nap-rua-dien-tu',
};

const CAESAR_TREE_PATH = path.join(ROOT_DIR, 'data/product/new-caesar/products-tree.json');
const VIGLACERA_TREE_PATH = path.join(ROOT_DIR, 'data/product/new-viglacera/products-tree.json');
const VIGLACERA_CATEGORIES_PATH = path.join(ROOT_DIR, 'data/product/new-viglacera/categories.json');

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

const inaxTreePath = path.join(ROOT_DIR, 'data/product/new-inax/products-tree.json');
if (fs.existsSync(inaxTreePath)) {
  const tree = JSON.parse(fs.readFileSync(inaxTreePath, 'utf-8'));
  const seen = new Set();
  for (const [sourceCategory, products] of Object.entries(tree)) {
    const categorySlug = INAX_CATEGORY_MAP[sourceCategory] || 'phu-kien';
    const category = categoryInfo(categorySlug);
    for (const [slug, p] of Object.entries(products || {})) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      const info = p.product_info || {};
      const image = p.images && p.images[0] ? `/data/product/new-inax/${p.images[0]}` : '';
      allProducts.push({
        code: info['Mã sản phẩm'] || slug, title: p.title || slug, brand: 'INAX',
        category: category.label, categorySlug: category.slug, categoryGroup: categoryGroup(category.slug),
        price: info['Giá'] || '', dimensions: info['Kích thước'] || '',
        technology: info['Công nghệ'] || '', finish: info['Màu sắc'] || '', rooms: ['phong_tam'],
        image, slug, type: 'sanitary', detailUrl: `${category.slug}/${slug}.html`,
      });
    }
  }
}

if (fs.existsSync(CAESAR_TREE_PATH)) {
  for (const { slug, product, sourceCategories, category, categoryGroup: group } of flattenCaesarTree(JSON.parse(fs.readFileSync(CAESAR_TREE_PATH, 'utf-8')))) {
    const info = product.product_info || {};
    const image = product.images && product.images[0] ? `/data/product/new-caesar/${product.images[0]}` : '';
    allProducts.push({
      code: info['Mã sản phẩm'] || slug,
      title: product.title || slug,
      brand: 'Caesar',
      category: category.label,
      categorySlug: category.slug,
      categoryGroup: group,
      sourceCategories,
      price: info['Giá'] || '',
      dimensions: info['Kích thước'] || info['Kích cỡ'] || '',
      technology: info['Công nghệ'] || info['Tính năng'] || '',
      finish: info['Màu sắc'] || info['Bề mặt'] || '',
      rooms: product.rooms || ['phong_tam'],
      image,
      slug,
      type: 'sanitary',
      detailUrl: `${category.slug}/${slug}.html`,
    });
  }
}

if (fs.existsSync(VIGLACERA_TREE_PATH)) {
  const tree = JSON.parse(fs.readFileSync(VIGLACERA_TREE_PATH, 'utf-8'));
  const categories = fs.existsSync(VIGLACERA_CATEGORIES_PATH)
    ? JSON.parse(fs.readFileSync(VIGLACERA_CATEGORIES_PATH, 'utf-8')) : {};
  for (const { slug, product, sourceCategories, category, categoryGroup: group } of flattenViglaceraTree(tree, categories)) {
    const info = product.product_info || {};
    allProducts.push({
      code: info['Mã sản phẩm'] || slug, title: product.title || slug, brand: 'Viglacera',
      category: category.label, categorySlug: category.slug, categoryGroup: group, sourceCategories,
      price: info['Giá'] || '', dimensions: info['Kích thước'] || info['Kích thước (DxRxC)'] || '',
      technology: info['Công nghệ'] || '', finish: info['Màu sắc'] || '', rooms: product.rooms || ['phong_tam'],
      image: product.images && product.images[0] ? `/data/product/new-viglacera/${product.images[0]}` : '',
      slug, type: 'sanitary', detailUrl: `${category.slug}/${slug}.html`,
    });
  }
}

const output = `(function(){'use strict'; window.LAVATILE_SANITARY=${JSON.stringify(allProducts)};})();`;

fs.writeFileSync(path.join(ROOT_DIR, 'data/catalog-sanitary.js'), output, 'utf-8');
console.log(`Wrote ${allProducts.length} products to data/catalog-sanitary.js`);
