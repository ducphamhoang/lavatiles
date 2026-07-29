#!/usr/bin/env node
/**
 * Crawl the Vietnamese Caesar catalogue.
 *
 * Categories are read from the product navigation/sidebar, product URLs from
 * every category page (including its AJAX pagination links), and product data
 * from the detail pages. Product images are downloaded to data/product/
 * new-caesar/images/<product-slug>/.
 *
 * Run:
 *   node scripts/crawl-caesar.js --limit-products 3
 *   node scripts/crawl-caesar.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://caesar.com.vn';
const OUTPUT_DIR = path.join(ROOT, 'data', 'product', 'new-caesar');
const IMAGE_DIR = path.join(OUTPUT_DIR, 'images');
const USER_AGENT = 'Mozilla/5.0 (compatible; lavatiles-caesar-crawler/1.0)';
const TIMEOUT_MS = 20000;
const RETRIES = 2;
const DELAY_MS = 150;
const DETAIL_CONCURRENCY = 8;

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(value, base = BASE) {
  if (!value) return '';
  try {
    return new URL(value.trim(), base).toString();
  } catch (_) {
    return '';
  }
}

function canonicalUrl(value) {
  const url = absoluteUrl(value);
  if (!url) return '';
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.pathname = parsed.pathname.replace(/\/+/g, '/');
  return parsed.toString();
}

function slugFromUrl(url) {
  const pathname = new URL(url).pathname.replace(/\/+$/, '');
  return pathname.split('/').pop().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

function parseArgs(argv) {
  const args = { category: '', limitProducts: 0, noImages: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--category') args.category = argv[++i] || '';
    else if (argv[i] === '--limit-products') args.limitProducts = Number(argv[++i] || 0);
    else if (argv[i] === '--no-images') args.noImages = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/crawl-caesar.js [--category KEY] [--limit-products N] [--no-images]');
      process.exit(0);
    }
  }
  if (!Number.isFinite(args.limitProducts) || args.limitProducts < 0) throw new Error('--limit-products must be non-negative');
  return args;
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(attempt * 800);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`${url}: ${lastError.message}`);
}

function parseCategoryTree(html) {
  const $ = cheerio.load(html);
  const categories = new Map();
  const add = (link, parent) => {
    const url = canonicalUrl($(link).attr('href'));
    if (!url || !/\/vi\/san-pham\/loai\//i.test(new URL(url).pathname)) return null;
    const key = (new URL(url).pathname.match(/\/loai\/\d+\/([^/]+)/i) || [])[1];
    if (!key) return null;
    if (!categories.has(key)) categories.set(key, { key, title: cleanText($(link).text()), url, parent, children: [] });
    const item = categories.get(key);
    if (!item.title) item.title = cleanText($(link).text());
    if (parent && !item.parent) item.parent = parent;
    return item;
  };
  const walk = (list, parent) => {
    $(list).children('li').each((_, li) => {
      const link = $(li).children('a').first();
      const item = add(link, parent);
      if (item) walk($(li).children('ul').first(), item.key);
    });
  };
  walk($('.main-nav > ul > li').filter((_, li) => $(li).children('a[href="/vi/san-pham"]').length).children('ul.sub_menu').first(), null);
  if (!categories.size) walk($('.tree-menu').first(), null);
  // The sidebar is more complete on some pages, so merge it after navigation.
  walk($('.tree-menu').first(), null);
  for (const item of categories.values()) item.children = [];
  for (const item of categories.values()) if (item.parent && categories.has(item.parent)) categories.get(item.parent).children.push(item);
  return [...categories.values()];
}

function parseProducts(html) {
  const $ = cheerio.load(html);
  return $('.pro-loop a[href*="/vi/san-pham/chi-tiet/"]').map((_, el) => {
    const card = $(el).closest('.pro-loop');
    const url = canonicalUrl($(el).attr('href'));
    return {
      url,
      slug: slugFromUrl(url),
      code: cleanText(card.find('h1.product-name').first().text()),
      title: cleanText(card.find('h3.product-name').first().text()),
      image: absoluteUrl(card.find('img').first().attr('src')),
    };
  }).get().filter((item) => item.url);
}

function paginationUrls(html, categoryUrl) {
  const $ = cheerio.load(html);
  return $('ul.pagination a[href]').map((_, el) => absoluteUrl($(el).attr('href'), categoryUrl)).get()
    .filter((url) => url && /ListProductOnCate/i.test(url));
}

async function crawlCategory(category) {
  const firstUrl = category.url;
  const firstHtml = await fetchText(firstUrl);
  const urls = [firstUrl, ...paginationUrls(firstHtml, firstUrl)];
  const products = new Map();
  for (const url of [...new Set(urls)]) {
    const html = url === firstUrl ? firstHtml : await fetchText(url);
    for (const product of parseProducts(html)) products.set(product.url, product);
    await sleep(DELAY_MS);
  }
  return [...products.values()];
}

function parseInfo($) {
  const info = {};
  $('#product .info-orther .info-item').each((_, el) => {
    const item = $(el);
    const label = cleanText(item.find('.info-title').text()).replace(/:$/, '');
    const value = cleanText(item.find('.in-stock').text());
    if (label && value) info[label] = value;
  });
  const price = cleanText($('#product .content_price').text());
  if (price) info['Giá'] = price;
  return info;
}

function parseVideos($) {
  const videos = [];
  $('#product iframe[src], #product video, #product source[src], #product [data-video]').each((_, el) => {
    const node = $(el);
    const source = node.attr('src') || node.attr('data-src') || node.attr('data-video');
    if (!source || /javascript:void/i.test(source)) return;
    const url = absoluteUrl(source);
    if (url && !videos.some((video) => video.url === url)) {
      videos.push({ type: /youtube|youtu\.be/i.test(url) ? 'youtube' : 'video', url, embed: url });
    }
  });
  return videos;
}

function parseDetail(html, fallback) {
  const $ = cheerio.load(html);
  const images = $('#product a.fancybox[rel="myGallery"], #product img[data-zoom-image], #product img#product-zoom').map((_, el) => {
    const image = $(el);
    return absoluteUrl(image.attr('href') || image.attr('data-zoom-image') || image.attr('src'));
  }).get().filter(Boolean);
  const descriptionNode = $('#product .content-wrapper').first();
  const descriptionHtml = descriptionNode.html() || $('#product .product-desc').first().html() || '';
  const contentImages = descriptionNode.find('img[src], img[data-src]').map((_, el) => {
    const image = $(el);
    return absoluteUrl(image.attr('src') || image.attr('data-src'));
  }).get().filter(Boolean);
  const description = cleanText(descriptionNode.text() || $('#product .product-desc').first().text());
  const info = parseInfo($);
  const model = cleanText($('#product h1.product-title').first().text()) || fallback.code;
  const title = cleanText($('#product h5.product-content').first().text()) || fallback.title;
  info['Mã sản phẩm'] = model;
  info.URL = fallback.url;
  return {
    title,
    model,
    product_info: info,
    description,
    description_html: descriptionHtml.trim(),
    images: [...new Set([...images, ...contentImages])],
    videos: parseVideos($),
    source_url: fallback.url,
  };
}

function imageName(url, index) {
  const pathname = new URL(url).pathname;
  const base = path.basename(pathname).replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${String(index + 1).padStart(2, '0')}-${base || 'image'}`;
}

async function downloadImage(url, localPath) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(localPath, buffer);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const homeHtml = await fetchText(`${BASE}/vi/san-pham`);
  const categories = parseCategoryTree(homeHtml);
  const selected = args.category ? categories.filter((category) => category.key === args.category) : categories;
  if (args.category && !selected.length) throw new Error(`Unknown category: ${args.category}`);
  const categoryRoots = categories.filter((category) => !category.parent).map((category) => ({
    ...category,
    children: category.children.map(({ children, ...child }) => child),
  }));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'categories.json'), `${JSON.stringify(Object.fromEntries(categoryRoots.map((category) => [category.key, category])), null, 2)}\n`);
  console.log(`Found ${categories.length} categories.`);

  const products = new Map();
  const failures = [];
  for (const category of selected) {
    try {
      const entries = await crawlCategory(category);
      for (const entry of entries) {
        if (!products.has(entry.url)) products.set(entry.url, { ...entry, categories: [] });
        products.get(entry.url).categories.push(category.key);
      }
      console.log(`${category.key}: ${entries.length} products`);
    } catch (error) {
      failures.push({ type: 'category', category: category.key, error: error.message });
      console.error(`${category.key}: ${error.message}`);
    }
  }
  let entries = [...products.values()];
  if (args.limitProducts) entries = entries.slice(0, args.limitProducts);
  const tree = {};
  let completed = 0;
  for (let offset = 0; offset < entries.length; offset += DETAIL_CONCURRENCY) {
    await Promise.all(entries.slice(offset, offset + DETAIL_CONCURRENCY).map(async (entry) => {
      try {
        const detail = parseDetail(await fetchText(entry.url), entry);
        detail.categories = [...new Set(entry.categories)];
        detail.card = { code: entry.code, title: entry.title, image: entry.image };
        if (!args.noImages) {
          const dir = path.join(IMAGE_DIR, entry.slug);
          fs.mkdirSync(dir, { recursive: true });
          const imageMap = new Map();
          const localImages = (await Promise.all(detail.images.map(async (source, index) => {
            const filename = imageName(source, index);
            const localPath = path.join(dir, filename);
            try {
              if (!fs.existsSync(localPath)) await downloadImage(source, localPath);
              const relativePath = path.relative(OUTPUT_DIR, localPath);
              imageMap.set(source, relativePath);
              return relativePath;
            } catch (error) {
              failures.push({ type: 'image', url: source, error: error.message });
              return '';
            }
          }))).filter(Boolean);
          detail.image_sources = detail.images;
          detail.description_html = detail.description_html.replace(/(?:https?:)?\/\/[^"'\s>]+/g, (source) => {
            const absolute = absoluteUrl(source);
            return imageMap.get(absolute) || source;
          });
          detail.images = localImages;
        }
        for (const category of detail.categories) {
          if (!tree[category]) tree[category] = {};
          tree[category][entry.slug] = detail;
        }
        completed += 1;
        if (completed % 25 === 0 || completed === entries.length) console.log(`Details: ${completed}/${entries.length}`);
      } catch (error) {
        failures.push({ type: 'detail', url: entry.url, error: error.message });
      }
    }));
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'products-tree.json'), `${JSON.stringify(tree, null, 2)}\n`);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'crawl-report.json'), `${JSON.stringify({ source: `${BASE}/vi/san-pham`, categories: categories.length, discovered_products: products.size, crawled_products: completed, failures }, null, 2)}\n`);
  console.log(`Wrote ${completed} products to data/product/new-caesar/products-tree.json`);
  if (failures.length) console.warn(`Failures: ${failures.length}; see crawl-report.json`);
}

main().catch((error) => { console.error(error); process.exit(1); });
