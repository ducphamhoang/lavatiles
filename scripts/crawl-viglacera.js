#!/usr/bin/env node
/** Crawl Viglacera sanitary collections into a category -> product tree. */
'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://viglacera.vn';
const OUTPUT_DIR = path.join(ROOT, 'data', 'product', 'new-viglacera');
const IMAGE_DIR = path.join(OUTPUT_DIR, 'images');
const TREE_PATH = path.join(OUTPUT_DIR, 'products-tree.json');
const CATEGORIES_PATH = path.join(OUTPUT_DIR, 'categories.json');
const REPORT_PATH = path.join(OUTPUT_DIR, 'crawl-report.json');
const CACHE_PATH = path.join(OUTPUT_DIR, '.detail-cache.json');
const USER_AGENT = 'Mozilla/5.0 (compatible; lavatiles-viglacera-crawler/1.0)';
const COLLECTIONS = [
  ['ban-cau', 'Bàn cầu', '/ban-cau-1'],
  ['chau-rua', 'Chậu rửa', '/chau-rua-1'],
  ['voi-chau', 'Vòi chậu', '/voi-chau'],
  ['sen-tam', 'Sen tắm', '/sen-tam'],
  ['bon-tieu', 'Bồn tiểu', '/bon-tieu'],
  ['phu-kien', 'Phụ kiện', '/phu-kien'],
  ['combo-phong-tam', 'Combo phòng tắm', '/combo-phong-tam'],
];
const PAGE_SIZE = 18;

function cleanText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function absoluteUrl(value) { try { return new URL(value, BASE).toString(); } catch (_) { return ''; } }
function canonicalUrl(value) {
  const url = absoluteUrl(value);
  if (!url) return '';
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.search = '';
  parsed.pathname = parsed.pathname.replace(/\/+/g, '/');
  return parsed.toString();
}
function slugFromUrl(value) { return new URL(value).pathname.replace(/\/+$/, '').split('/').pop().toLowerCase(); }
function slugify(value) {
  return String(value || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function parseArgs(argv) {
  const args = { category: '', limitProducts: 0, noImages: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--category') args.category = argv[++i] || '';
    else if (argv[i] === '--limit-products') args.limitProducts = Number(argv[++i] || 0);
    else if (argv[i] === '--no-images') args.noImages = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/crawl-viglacera.js [--category KEY] [--limit-products N] [--no-images]');
      process.exit(0);
    }
  }
  if (!Number.isFinite(args.limitProducts) || args.limitProducts < 0) throw new Error('--limit-products must be non-negative');
  return args;
}
async function fetchText(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.8' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt === 3) throw new Error(`${url}: ${error.message}`);
      await sleep(attempt * 700);
    }
  }
  return '';
}
function parseListing(html, category) {
  const $ = cheerio.load(html);
  const products = new Map();
  $('.category-products .product-item').each((_, element) => {
    const item = $(element);
    const anchor = item.find('.product-name a[href], .product-thumb[href]').first();
    const url = canonicalUrl(anchor.attr('href'));
    if (!url || new URL(url).hostname !== new URL(BASE).hostname) return;
    const image = absoluteUrl(item.find('img').first().attr('src'));
    const model = cleanText(item.find('.product-sku').last().text());
    products.set(url, { url, slug: slugFromUrl(url), title: cleanText(anchor.attr('title') || anchor.text()), image, model, category });
  });
  const pages = $('.pagination a[onclick]').map((_, element) => {
    const match = String($(element).attr('onclick') || '').match(/doSearch\((\d+)/);
    return match ? Number(match[1]) : 0;
  }).get();
  return { products: [...products.values()], pages: Math.max(1, ...pages, 1) };
}
function parseProduct(html, requestedUrl, fallback) {
  const $ = cheerio.load(html);
  const productMatch = html.slice(html.indexOf('var product =')).match(/var product = (\{[\s\S]*?\});/);
  const raw = productMatch ? JSON.parse(productMatch[1]) : {};
  const title = cleanText(raw.name || $('h1.title-product').first().text() || fallback.title);
  const tags = Array.isArray(raw.tags) ? raw.tags.map(cleanText).filter(Boolean) : [];
  const info = {
    'Mã sản phẩm': cleanText(raw.variants?.[0]?.sku || fallback.model || fallback.slug),
    'Loại sản phẩm': cleanText(raw.type),
    'Thương hiệu': cleanText(raw.vendor || 'Viglacera'),
    'Giá': raw.price ? `${Number(raw.price).toLocaleString('vi-VN')}₫` : '',
    'URL': canonicalUrl(requestedUrl),
  };
  const specsHtml = $('.product-box.product-thongso .content').first().html() || '';
  const specs = specsHtml.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').split('\n').map(cleanText).filter(Boolean).join('\n');
  for (const line of specs.split('\n')) {
    const match = line.match(/^([^:]{2,60}):\s*(.+)$/);
    if (match) info[cleanText(match[1])] = cleanText(match[2]);
  }
  const features = $('.product-box.product-tinhnang-nb .content li, .product-box.product-tinhnang-nb .content p')
    .map((_, element) => cleanText($(element).text())).get().filter(Boolean);
  const descriptionNode = $('.product-box.product-content .content').first();
  const descriptionHtml = descriptionNode.html() || '';
  const images = [...new Set((raw.images || []).map((image) => absoluteUrl(image.src)).filter(Boolean))];
  const childTags = tags.filter((tag) => /^danhmuc_/i.test(tag)).map((tag) => tag.replace(/^danhmuc_/i, '')).filter(Boolean);
  return {
    title,
    product_info: info,
    description: cleanText(descriptionNode.text()),
    description_html: descriptionHtml,
    images,
    features: [...new Set(features)],
    technologies: tags.filter((tag) => !/^danhmuc_|^tinhnang_/i.test(tag)),
    documents: [],
    view_count: 0,
    rooms: ['phong_tam'],
    source_url: canonicalUrl(requestedUrl),
    categories: [fallback.category],
    _childTags: childTags,
  };
}
function categoryKey(title) { return slugify(title) || 'khac'; }
function childTagsFor(record) {
  return (record.product._childTags || []).filter((title) => {
    if (/tất cả sản phẩm|combo phòng tắm/i.test(title)) return false;
    if (record.category === 'bon-tieu' && /bàn cầu/i.test(title)) return false;
    return true;
  });
}
async function downloadImage(url, target) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await sharp(buffer).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 }).toFile(target);
}
async function downloadProductImages(product) {
  const local = [];
  const sources = product.image_sources || product.images || [];
  await Promise.all(sources.slice(0, 6).map(async (source, index) => {
    const target = path.join(IMAGE_DIR, `${slugFromUrl(product.source_url)}-${index + 1}.webp`);
    try {
      if (!fs.existsSync(target)) await downloadImage(source, target);
      local[index] = `images/${path.basename(target)}`;
    } catch (error) {
      console.error(`Image failed ${product.source_url}: ${error.message}`);
    }
  }));
  const validLocal = local.filter(Boolean);
  if (validLocal.length) product.images = validLocal;
  product.image_sources = sources;
}
function buildCategories(productsByUrl) {
  const categories = {};
  for (const [key, title, url] of COLLECTIONS) categories[key] = { key, title, url: absoluteUrl(url), parent: '', children: [] };
  for (const record of productsByUrl.values()) {
    for (const childTitle of childTagsFor(record)) {
      const childKey = categoryKey(childTitle);
      const parent = record.category;
      if (!categories[childKey]) categories[childKey] = { key: childKey, title: childTitle, url: absoluteUrl(`/${record.category}`), parent, children: [] };
      if (!categories[parent].children.some((child) => child.key === childKey)) categories[parent].children.push({ key: childKey, title: childTitle, url: categories[childKey].url });
    }
  }
  return categories;
}
function buildTree(productsByUrl, categories) {
  const tree = Object.fromEntries(Object.keys(categories).map((key) => [key, {}]));
  for (const record of productsByUrl.values()) {
    const product = { ...record.product };
    const childTags = childTagsFor(record);
    delete product._childTags;
    const slug = slugFromUrl(product.source_url);
    tree[record.category][slug] = product;
    for (const childTitle of childTags) {
      const childKey = categoryKey(childTitle);
      if (tree[childKey]) tree[childKey][slug] = product;
      product.categories.push(childKey);
    }
  }
  return tree;
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const selected = COLLECTIONS.filter(([key]) => !args.category || key === args.category);
  if (!selected.length) throw new Error(`Unknown category: ${args.category}`);
  const cached = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
  const products = new Map();
  const failures = [];
  for (const [category, title, url] of selected) {
    let pages = 1;
    let discovered = 0;
    for (let page = 1; page <= pages; page += 1) {
      const pageUrl = `${absoluteUrl(url)}?page=${page}`;
      try {
        const listing = parseListing(await fetchText(pageUrl), category);
        pages = Math.max(pages, listing.pages);
        for (const entry of listing.products) {
          discovered += 1;
          const existing = products.get(entry.url);
          if (existing) existing.categories.push(category);
          else products.set(entry.url, { ...entry, categories: [category] });
        }
      } catch (error) { failures.push({ type: 'category', category, page, error: error.message }); }
      await sleep(150);
    }
    console.log(`Category ${category}: ${discovered} products across ${pages} page(s)`);
  }
  const entries = [...products.values()].slice(0, args.limitProducts || undefined);
  let completed = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const entry = entries[cursor++];
      try {
        const product = cached[entry.url] || parseProduct(await fetchText(entry.url), entry.url, entry);
        product.categories = [...new Set(entry.categories)];
        if (!args.noImages) await downloadProductImages(product);
        cached[entry.url] = product;
        entry.product = product;
        completed += 1;
        if (completed % 20 === 0) { fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cached, null, 2)}\n`); console.log(`Products: ${completed}/${entries.length}`); }
      } catch (error) {
        failures.push({ type: 'product', url: entry.url, error: error.message });
        entry.product = { title: entry.title, product_info: { 'Mã sản phẩm': entry.model, URL: entry.url }, images: entry.image ? [entry.image] : [], categories: entry.categories, rooms: ['phong_tam'], source_url: entry.url };
      }
      await sleep(100);
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, entries.length) }, () => worker()));
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cached, null, 2)}\n`);
  const categories = buildCategories(new Map(entries.map((entry) => [entry.url, { ...entry, product: entry.product }])));
  const tree = buildTree(new Map(entries.map((entry) => [entry.url, entry])), categories);
  fs.writeFileSync(TREE_PATH, `${JSON.stringify(tree, null, 2)}\n`);
  fs.writeFileSync(CATEGORIES_PATH, `${JSON.stringify(categories, null, 2)}\n`);
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify({ generated_at: new Date().toISOString(), source: BASE, options: args, total_discovered_products: products.size, total_completed_products: completed, failures }, null, 2)}\n`);
  console.log(`Wrote ${entries.length} products to ${path.relative(ROOT, TREE_PATH)}; failures: ${failures.length}`);
}
main().catch((error) => { console.error(error.message); process.exit(1); });
