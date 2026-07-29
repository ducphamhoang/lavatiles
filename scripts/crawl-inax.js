#!/usr/bin/env node
/** Crawl the INAX Vietnam sanitary-ware catalogue into data/product/new-inax. */
'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://www.inax.com.vn';
const OUTPUT_DIR = path.join(ROOT, 'data', 'product', 'new-inax');
const IMAGE_DIR = path.join(OUTPUT_DIR, 'images');
const USER_AGENT = 'Mozilla/5.0 (compatible; lavatiles-inax-crawler/1.0)';
const TIMEOUT_MS = 25000;
const RETRIES = 3;
const CONCURRENCY = 6;

function cleanText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function absoluteUrl(value, base = BASE) {
  if (!value) return '';
  try { return new URL(value.trim(), base).toString(); } catch (_) { return ''; }
}
function canonicalUrl(value, base = BASE) {
  const url = absoluteUrl(value, base);
  if (!url) return '';
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.search = parsed.search.replace(/([?&])sort=[^&]*/i, '$1').replace(/[?&]$/, '');
  parsed.pathname = parsed.pathname.replace(/\/+/g, '/');
  return parsed.toString();
}
function slugFromUrl(url) {
  return new URL(url).pathname.replace(/\/+$/, '').split('/').pop().toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
}
function parseArgs(argv) {
  const args = { category: '', limitProducts: 0, noImages: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--category') args.category = argv[++i] || '';
    else if (argv[i] === '--limit-products') args.limitProducts = Number(argv[++i] || 0);
    else if (argv[i] === '--no-images') args.noImages = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/crawl-inax.js [--category KEY] [--limit-products N] [--no-images]');
      process.exit(0);
    }
  }
  if (!Number.isFinite(args.limitProducts) || args.limitProducts < 0) throw new Error('--limit-products must be non-negative');
  return args;
}
async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.8' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(attempt * 700);
    } finally { clearTimeout(timer); }
  }
  throw new Error(`${url}: ${lastError.message}`);
}
function cssImage(style) {
  const match = String(style || '').match(/url\(\s*(?:(['"])(.*?)\1|([^)]*))\s*\)/i);
  return match ? (match[2] || match[3] || '').trim() : '';
}
function parseCategories(html) {
  const $ = cheerio.load(html);
  const map = new Map();
  const add = (el, parent = '') => {
    const url = canonicalUrl($(el).attr('href'));
    if (!url || !/\/vi\/products\//i.test(new URL(url).pathname)) return;
    const key = slugFromUrl(url);
    if (!map.has(key)) map.set(key, { key, title: cleanText($(el).text()), url, parent, children: [] });
    else if (parent && !map.get(key).parent) map.get(key).parent = parent;
    if (!map.get(key).title) map.get(key).title = key;
  };
  $('#sanitary-ware a.collection').each((_, el) => add(el));
  $('#navbarSupportedContent a[href*="/vi/products/"]').each((_, el) => add(el));
  for (const category of map.values()) category.children = [];
  for (const category of map.values()) {
    if (category.parent && map.has(category.parent)) map.get(category.parent).children.push(category);
  }
  return [...map.values()];
}
function listingUrl(category, page = 1) {
  const parsed = new URL(category.url);
  parsed.pathname = parsed.pathname.replace('/vi/products/', '/vi/san-pham/');
  if (page > 1) parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/page/${page}/`;
  parsed.search = '?sort=newest';
  return parsed.toString();
}
function parseProducts(html, categoryUrl) {
  const $ = cheerio.load(html);
  const products = new Map();
  $('.products-listing .row.products .product').each((_, el) => {
    const card = $(el);
    const anchor = card.closest('a[href*="/vi/products/"]');
    const url = canonicalUrl(anchor.attr('href'), categoryUrl);
    if (!url || url === canonicalUrl(categoryUrl)) return;
    const image = absoluteUrl(cssImage(card.find('.img-holder').first().attr('style')) || card.find('img').first().attr('src'));
    products.set(url, { url, slug: slugFromUrl(url), title: cleanText(card.find('.title').first().text()), image,
      price: cleanText(card.find('.price').first().text()), model: cleanText(card.find('input[type="checkbox"]').first().attr('name')) });
  });
  return [...products.values()];
}
function nextPage(html, currentPage) {
  const $ = cheerio.load(html);
  const pages = $('.pagination a[href]').map((_, el) => absoluteUrl($(el).attr('href'))).get();
  const next = pages.find((url) => { const match = url.match(/\/page\/(\d+)\/?$/); return match && Number(match[1]) > currentPage; });
  return next || '';
}
async function crawlCategory(category) {
  const products = new Map();
  let page = 1;
  let firstUrl = category.url;
  while (true) {
    const url = page === 1 ? firstUrl : `${firstUrl.replace(/\/+$/, '')}/page/${page}/`;
    const html = await fetchText(url);
    let found = parseProducts(html, url);
    // Product collections use /products/<collection>, while ordinary product
    // groups use the older /san-pham/<group> listing route.
    if (page === 1 && !found.length) {
      firstUrl = listingUrl(category, 1);
      const fallbackHtml = await fetchText(firstUrl);
      found = parseProducts(fallbackHtml, firstUrl);
    }
    for (const product of found) products.set(product.url, product);
    const next = nextPage(html, page);
    if (!next && page === 1 && firstUrl !== url) {
      const fallbackHtml = await fetchText(firstUrl);
      const fallbackNext = nextPage(fallbackHtml, page);
      if (fallbackNext) { page += 1; await sleep(150); continue; }
    }
    if (!next && firstUrl === url) break;
    if (!next && firstUrl !== url) break;
    page += 1;
    await sleep(150);
  }
  return [...products.values()];
}
function parseJsonLd($) {
  let product = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const value = JSON.parse($(el).text());
      const candidates = Array.isArray(value) ? value : [value];
      const found = candidates.find((item) => item && (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))));
      if (found) product = found;
    } catch (_) { /* malformed third-party JSON-LD */ }
  });
  return product;
}
function parseDetail(html, fallback) {
  const $ = cheerio.load(html);
  const scope = $('.product-details').first();
  const specs = {};
  $('#specs .details-specs table.size-pro tr').each((_, el) => {
    const cells = $(el).find('td').map((__, cell) => cleanText($(cell).text())).get();
    if (cells[0] && cells[1]) specs[cells[0]] = cells[1];
  });
  const descriptionNode = $('#specs .details-specs .features-text-bullet .features-text').first();
  const contentSeo = $('#specs .content-seo').first();
  const descriptionHtml = (descriptionNode.html() || contentSeo.html() || scope.find('.product-desc').html() || '').trim();
  const gallery = $('#overview .product-slides[data-product-slides] .img-holder').map((_, el) => cssImage($(el).attr('style'))).get();
  const contentImages = descriptionNode.find('img[src], img[data-src]').map((_, el) => $(el).attr('data-src') || $(el).attr('src')).get();
  const images = [...new Set([...gallery, ...contentImages].map((url) => absoluteUrl(url)).filter((url) => url && !/productholder\.gif/i.test(url)))];
  const videos = [];
  $('#vidModal iframe[src], .modal-vid iframe[src], #specs iframe[src], #specs video source[src], [data-video], [data-video-url]').each((_, el) => {
    const node = $(el); const value = node.attr('src') || node.attr('data-video') || node.attr('data-video-url');
    const url = absoluteUrl(value); if (url && !videos.some((item) => item.url === url)) videos.push({ type: /youtube|youtu\.be/i.test(url) ? 'youtube' : 'video', url, embed: url });
  });
  const documents = [];
  $('#specs .details-specs .file a[href]').each((_, el) => { const url = absoluteUrl($(el).attr('href')); if (url) documents.push({ title: cleanText($(el).text()), url }); });
  const jsonLd = parseJsonLd($);
  const title = cleanText(scope.find('.product-name').first().text()) || cleanText(jsonLd.name) || fallback.title;
  const model = cleanText(scope.find('.product-sku').first().text()).replace(/^SKU\s*:?\s*/i, '') || fallback.model;
  if (model) specs['Mã sản phẩm'] = model;
  specs.URL = fallback.url;
  return { title, model, product_info: specs, description: cleanText(descriptionNode.text() || contentSeo.text() || scope.find('.product-desc').text()),
    description_html: descriptionHtml, images, videos, documents, source_url: fallback.url };
}
function imageName(url, index) { return `${String(index + 1).padStart(2, '0')}-${path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]+/g, '-') || 'image'}`; }
async function downloadImage(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}
function replaceLocalImages(html, imageMap) {
  return html.replace(/(?:https?:)?\/\/[^"'\s>)]+/g, (source) => imageMap.get(absoluteUrl(source)) || source);
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const homeUrl = `${BASE}/vi/thiet-bi-ve-sinh/`;
  const categories = parseCategories(await fetchText(homeUrl));
  const selected = args.category ? categories.filter((item) => item.key === args.category) : categories;
  if (args.category && !selected.length) throw new Error(`Unknown category: ${args.category}`);
  const roots = categories.filter((item) => !item.parent).map((item) => ({ ...item, children: item.children.map(({ children, ...child }) => child) }));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'categories.json'), `${JSON.stringify(Object.fromEntries(roots.map((item) => [item.key, item])), null, 2)}\n`);
  const products = new Map(); const failures = [];
  for (const category of selected) {
    try {
      const entries = await crawlCategory(category);
      for (const entry of entries) { if (!products.has(entry.url)) products.set(entry.url, { ...entry, categories: [] }); products.get(entry.url).categories.push(category.key); }
      console.log(`${category.key}: ${entries.length} products`);
    } catch (error) { failures.push({ type: 'category', category: category.key, error: error.message }); console.error(`${category.key}: ${error.message}`); }
  }
  let entries = [...products.values()]; if (args.limitProducts) entries = entries.slice(0, args.limitProducts);
  const tree = {}; let completed = 0;
  for (let offset = 0; offset < entries.length; offset += CONCURRENCY) {
    await Promise.all(entries.slice(offset, offset + CONCURRENCY).map(async (entry) => {
      try {
        const detail = parseDetail(await fetchText(entry.url), entry); detail.categories = [...new Set(entry.categories)]; detail.card = { title: entry.title, image: entry.image, price: entry.price, model: entry.model };
        if (!args.noImages) {
          const dir = path.join(IMAGE_DIR, entry.slug); fs.mkdirSync(dir, { recursive: true }); const local = []; const map = new Map();
          for (let i = 0; i < detail.images.length; i += 1) { const filename = imageName(detail.images[i], i); const target = path.join(dir, filename); try { if (!fs.existsSync(target)) await downloadImage(detail.images[i], target); const relative = path.relative(OUTPUT_DIR, target); local.push(relative); map.set(detail.images[i], relative); } catch (error) { failures.push({ type: 'image', url: detail.images[i], error: error.message }); } }
          detail.image_sources = detail.images; detail.description_html = replaceLocalImages(detail.description_html, map); detail.images = local;
        }
        for (const category of detail.categories) { if (!tree[category]) tree[category] = {}; tree[category][entry.slug] = detail; }
        completed += 1; if (completed % 25 === 0 || completed === entries.length) console.log(`Details: ${completed}/${entries.length}`);
      } catch (error) { failures.push({ type: 'detail', url: entry.url, error: error.message }); }
    }));
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'products-tree.json'), `${JSON.stringify(tree, null, 2)}\n`);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'crawl-report.json'), `${JSON.stringify({ source: homeUrl, categories: categories.length, discovered_products: products.size, crawled_products: completed, failures }, null, 2)}\n`);
  console.log(`Wrote ${completed} products to data/product/new-inax/products-tree.json`);
}
main().catch((error) => { console.error(error); process.exit(1); });
