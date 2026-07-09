#!/usr/bin/env node
/**
 * download-product-images.js
 *
 * Downloads product images from brand websites for catalogue products.
 * Run: node scripts/download-product-images.js <brand>
 *   brand: toto | caesar | inax | viglacera
 */
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const brand = process.argv[2];
if (!['toto', 'caesar', 'inax', 'viglacera'].includes(brand)) {
  console.error('Usage: node scripts/download-product-images.js <toto|caesar|inax|viglacera>');
  process.exit(1);
}

// ---- config per brand ----
const CONFIG = {
  toto: {
    catalogue: 'data/products/catalogue-toto-2026.json',
    imgDir: 'assets/images/products/toto',
    site: 'https://vn.toto.com',
    searchPaths: ['/products/', '/ban-cau-ve-sinh/', '/san-pham-moi/', '/chau-rua-mat/', '/sen-voi/', '/bon-tam/', '/phu-kien-phong-tam/'],
  },
  caesar: {
    catalogue: 'data/products/catalogue-caesar-06-2026.json',
    imgDir: 'assets/images/products/caesar',
    site: 'https://caesar.net.vn',
    searchPaths: ['/san-pham', '/Ban-Cau-Caesar-393467', '/Lavabo-Caesar-393465', '/Voi-Caesar-393904', '/Sen-Caesar-393907', '/Be-tieu-Caesar-393898', '/Bon-tam-Caesar-393899', '/Phu-kien-Caesar-393905', '/Nap-ban-cau-Caesar-393901', '/Guong-Caesar-393906'],
  },
  inax: {
    catalogue: 'data/products/catalogue-inax-2026.json',
    imgDir: 'assets/images/products/inax',
    site: 'https://www.inax.com.vn',
    searchPaths: ['/products/shower-toilet/', '/products/toilet/', '/products/washbasin/', '/products/faucets-and-showers/', '/products/bathtub/', '/products/urinal/', '/products/accessories/'],
  },
  viglacera: {
    catalogue: 'data/products/catalogue-t1-2026-sc.json',
    imgDir: 'assets/images/products/viglacera',
    site: 'https://viglacera.vn',
    searchPaths: ['/thiet-bi-ve-sinh', '/ban-cau-1', '/chau-rua-1', '/voi-chau', '/sen-tam', '/bon-tieu', '/phu-kien'],
  },
};

const cfg = CONFIG[brand];
const ROOT = path.resolve(__dirname, '..');
const CATALOGUE_PATH = path.join(ROOT, cfg.catalogue);
const IMG_DIR = path.join(ROOT, cfg.imgDir);

// Ensure image directory exists
fs.mkdirSync(IMG_DIR, { recursive: true });

const axiosCfg = {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  timeout: 15000,
};

let total = 0;
let downloaded = 0;
let failed = 0;
let skipped = 0;

async function downloadImage(url, localPath) {
  try {
    const resp = await axios({ url, responseType: 'stream', ...axiosCfg, timeout: 30000 });
    const writer = fs.createWriteStream(localPath);
    resp.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (e) {
    throw new Error(`Download failed: ${e.message}`);
  }
}

function normalizeCode(code) {
  return code.trim().replace(/\s+/g, ' ').toLowerCase();
}

// ---- Caesar specific: search product pages for images ----
async function findCaesarImage(productCode) {
  const code = normalizeCode(productCode);
  // Skip common non-product codes
  if (!code || code === 'liên hệ' || code === '0') return null;

  // Try direct search on caesar.net.vn
  for (const searchPath of cfg.searchPaths) {
    try {
      const url = `${cfg.site}${searchPath}`;
      const resp = await axios.get(url, axiosCfg);
      const $ = cheerio.load(resp.data);

      // Look for product links containing the code
      let found = false;
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().toLowerCase();
        if (href && (text.includes(code) || href.toLowerCase().includes(code))) {
          found = href;
          return false; // break
        }
      });

      if (found) {
        const productUrl = found.startsWith('http') ? found : `${cfg.site}${found}`;
        const prodResp = await axios.get(productUrl, axiosCfg);
        const $p = cheerio.load(prodResp.data);

        // Find product image
        let imgSrc = null;
        $p('img').each((i, el) => {
          const src = $p(el).attr('src') || $p(el).attr('data-src') || '';
          if (src.includes('datafiles') && src.match(/upload/)) {
            imgSrc = src;
            return false;
          }
        });

        if (imgSrc) {
          if (imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;
          if (imgSrc.startsWith('/')) imgSrc = cfg.site + imgSrc;
          return imgSrc;
        }
      }
    } catch (e) {
      // skip and try next path
    }
  }
  return null;
}

// ---- TOTO specific ----
async function findTotoImage(productCode) {
  const code = normalizeCode(productCode);
  if (!code || code === 'liên hệ') return null;

  // Try direct product URL patterns
  const cleanCode = code.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const productPaths = [
    `/en/product/${cleanCode}`,
    `/product/${cleanCode}`,
    `/en/ban-cau-ve-sinh/${cleanCode}`,
  ];

  for (const p of productPaths) {
    try {
      const url = `${cfg.site}${p}`;
      const resp = await axios.get(url, { ...axiosCfg, maxRedirects: 5 });
      const $ = cheerio.load(resp.data);
      const imgSrc = $('img[src*="uploads"]').first().attr('src') ||
                     $('.product-image img').attr('src') ||
                     $('.main-image img').attr('src');
      if (imgSrc) {
        return imgSrc.startsWith('http') ? imgSrc : `${cfg.site}${imgSrc}`;
      }
    } catch (e) { /* not found */ }
  }

  // Fallback: search category pages
  for (const searchPath of cfg.searchPaths) {
    try {
      const url = `${cfg.site}${searchPath}`;
      const resp = await axios.get(url, axiosCfg);
      const $ = cheerio.load(resp.data);

      let foundUrl = null;
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().toLowerCase();
        if (href && (text.includes(code) || href.toLowerCase().includes(code))) {
          foundUrl = href.startsWith('http') ? href : `${cfg.site}${href}`;
          return false;
        }
      });

      if (foundUrl) {
        const prodResp = await axios.get(foundUrl, axiosCfg);
        const $p = cheerio.load(prodResp.data);
        const imgSrc = $p('img[src*="uploads"]').first().attr('src') ||
                       $p('.product-image img').attr('src') ||
                       $p('img[src*="product"]').first().attr('src');
        if (imgSrc) return imgSrc.startsWith('http') ? imgSrc : `${cfg.site}${imgSrc}`;
      }
    } catch (e) { /* skip */ }
  }
  return null;
}

// ---- INAX specific ----
async function findInaxImage(productCode) {
  const code = normalizeCode(productCode);
  if (!code || code === 'liên hệ') return null;

  const cleanForUrl = code.replace(/\s*\+\s*/g, '-plus-').replace(/[/,()]/g, '').replace(/\s+/g, '-').toLowerCase();

  // Try direct product URL
  try {
    const url = `${cfg.site}/products/${cleanForUrl}/`;
    const resp = await axios.get(url, { ...axiosCfg, maxRedirects: 5 });
    const $ = cheerio.load(resp.data);
    const imgSrc = $('.product-gallery img').first().attr('src') ||
                   $('img[src*="uploads"]').first().attr('src') ||
                   $('.single-product-image img').attr('src');
    if (imgSrc) return imgSrc.startsWith('http') ? imgSrc : `${cfg.site}${imgSrc}`;
  } catch (e) { /* not found */ }

  // Search category pages
  for (const searchPath of cfg.searchPaths) {
    try {
      const url = `${cfg.site}${searchPath}?sort=newest`;
      const resp = await axios.get(url, axiosCfg);
      const $ = cheerio.load(resp.data);

      let foundUrl = null;
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().toLowerCase();
        const alt = $(el).find('img').attr('alt') || '';
        if (href && (text.includes(code) || alt.toLowerCase().includes(code) || href.toLowerCase().includes(code))) {
          foundUrl = href.startsWith('http') ? href : `${cfg.site}${href}`;
          return false;
        }
      });

      if (foundUrl) {
        const prodResp = await axios.get(foundUrl, axiosCfg);
        const $p = cheerio.load(prodResp.data);
        const imgSrc = $p('img[src*="uploads"]').first().attr('src') ||
                       $p('.product-image img').attr('src');
        if (imgSrc) return imgSrc.startsWith('http') ? imgSrc : `${cfg.site}${imgSrc}`;
      }
    } catch (e) { /* skip */ }
  }

  // Try WordPress upload URL pattern directly
  const wpCodes = [
    code.replace(/\s*\+\s*/g, '-plus-').replace(/[/,()\s]/g, '').toLowerCase(),
    code.replace(/\s*\+\s*/g, '_').replace(/[/,()\s]/g, '').toLowerCase(),
  ];
  for (const c of wpCodes) {
    try {
      const imgUrl = `https://www.inax.com.vn/wp-content/uploads/${c}.jpg`;
      await axios.head(imgUrl, axiosCfg);
      return imgUrl;
    } catch (e) { /* try next */ }
  }

  return null;
}

// ---- Viglacera specific ----
async function findViglaceraImage(productCode) {
  const code = normalizeCode(productCode);
  if (!code || code === 'liên hệ') return null;

  // Category -> URL slug mapping based on catalogue structure
  const categoryPages = [
    'ban-cau-1', 'chau-rua-1', 'voi-chau', 'sen-tam', 'bon-tieu', 'phu-kien', 'thiet-bi-ve-sinh'
  ];

  for (const cat of categoryPages) {
    try {
      const url = `https://viglacera.vn/${cat}`;
      const resp = await axios.get(url, axiosCfg);
      const $ = cheerio.load(resp.data);

      let foundUrl = null;
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const text = $(el).text().toLowerCase();
        const imgAlt = $(el).find('img').attr('alt') || '';
        if (text.includes(code) || imgAlt.toLowerCase().includes(code) || href.toLowerCase().includes(code)) {
          foundUrl = href.startsWith('http') ? href : `https://viglacera.vn${href}`;
          return false;
        }
      });

      if (foundUrl) {
        const prodResp = await axios.get(foundUrl, axiosCfg);
        const $p = cheerio.load(prodResp.data);
        // Viglacera uses bizweb.dktcdn.net for images
        let imgSrc = null;
        $p('img').each((i, el) => {
          const src = $p(el).attr('src') || '';
          if (src.includes('bizweb.dktcdn.net') && !src.includes('logo') && !src.includes('icon')) {
            imgSrc = src;
            return false;
          }
        });
        if (imgSrc) return imgSrc.startsWith('http') ? imgSrc : `https:${imgSrc}`;
      }
    } catch (e) { /* skip */ }
  }

  // Try direct URL pattern
  const directSlug = code.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const directUrls = [
    `https://viglacera.vn/${directSlug}`,
    `https://viglacera.vn/san-pham/${directSlug}`,
  ];
  for (const url of directUrls) {
    try {
      const resp = await axios.get(url, axiosCfg);
      const $ = cheerio.load(resp.data);
      let imgSrc = null;
      $('img').each((i, el) => {
        const src = $(el).attr('src') || '';
        if (src.includes('bizweb.dktcdn.net') && !src.includes('logo') && !src.includes('icon')) {
          imgSrc = src;
          return false;
        }
      });
      if (imgSrc) return imgSrc.startsWith('http') ? imgSrc : `https:${imgSrc}`;
    } catch (e) { /* try next */ }
  }

  return null;
}

// ---- main ----
async function main() {
  const data = JSON.parse(fs.readFileSync(CATALOGUE_PATH, 'utf-8'));
  const finders = { toto: findTotoImage, caesar: findCaesarImage, inax: findInaxImage, viglacera: findViglaceraImage };
  const findImage = finders[brand];

  const categories = Object.keys(data);
  for (const cat of categories) {
    const productKeys = Object.keys(data[cat]);
    for (const slug of productKeys) {
      const product = data[cat][slug];
      const code = product.product_info['Mã sản phẩm'] || slug;
      total++;

      // Skip if already has images
      if (product.images && product.images.length > 0) {
        skipped++;
        continue;
      }

      const ext = '.jpg';
      const localPath = path.join(IMG_DIR, `${slug}${ext}`);

      try {
        console.log(`[${brand}] ${total}. ${product.title} (${code})`);
        const imgUrl = await findImage(code);
        if (imgUrl) {
          await downloadImage(imgUrl, localPath);
          product.images = [`/assets/images/products/${brand}/${slug}${ext}`];
          downloaded++;
          console.log(`  ✓ ${imgUrl}`);
        } else {
          failed++;
          console.log(`  ✗ No image found`);
        }
      } catch (e) {
        failed++;
        console.log(`  ✗ Error: ${e.message}`);
      }

      // Small delay to be polite
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
    }
  }

  // Write updated catalogue
  fs.writeFileSync(CATALOGUE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');

  console.log(`\n=== ${brand.toUpperCase()} Summary ===`);
  console.log(`Total products: ${total}`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (had images): ${skipped}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
