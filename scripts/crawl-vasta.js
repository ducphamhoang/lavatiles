#!/usr/bin/env node
/**
 * crawl-vasta.js
 *
 * Crawls all products listed on https://vasta.vn/san-pham/ via the site's
 * public WooCommerce Store API (no HTML scraping needed — the theme
 * renders products from WooCommerce, which exposes a public JSON API).
 *
 * Writes the full product list (name, slug, permalink, image URLs, and
 * parsed spec fields) to data/products/vasta-vn-crawl.json.
 *
 * Run: node scripts/crawl-vasta.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const API = 'https://vasta.vn/wp-json/wc/store/v1/products?per_page=100';
const OUT = path.resolve(__dirname, '..', 'data', 'products', 'vasta-vn-crawl.json');

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; lavatiles-crawler/1.0)' };

function decodeEntities(str) {
  return (str || '')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).trim();
}

// Only keep label:value pairs whose label looks like an actual spec field
// (as opposed to the marketing copy elsewhere in the description, which is
// also full of "<strong>Word</strong>: text" patterns).
const SPEC_KEYWORDS = [
  'tên sản phẩm', 'tên thương mại', 'mã tham chiếu', 'mã sản phẩm',
  'kích thước', 'khổ tấm', 'độ dày', 'bề mặt', 'màu sắc', 'tông', 'vân',
  'ứng dụng', 'xuất xứ', 'thương hiệu',
];

function isSpecLabel(label) {
  const l = label.toLowerCase();
  return SPEC_KEYWORDS.some((k) => l.includes(k));
}

/**
 * Pull the "Thông số kỹ thuật" spec out of the description HTML, scoped to
 * the technical-spec section only (the rest of the description is
 * SEO/marketing copy that also happens to use <strong> a lot). Products use
 * one of two layouts:
 *   1. Table rows:  <tr><td><strong>Label</strong></td><td>Value</td></tr>
 *   2. Bullet list: <li><p><strong>Label:</strong> Value</p></li>
 */
function parseSpec(descriptionHtml) {
  const spec = {};

  const specStart = descriptionHtml.search(/Th[oô]ng s[oố]/i);
  const scoped = specStart === -1
    ? descriptionHtml
    : descriptionHtml.slice(specStart, specStart + 4000);

  const rowRe = /<tr[^>]*>\s*<td[^>]*><strong[^>]*>([^<]+?)<\/strong><\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = rowRe.exec(scoped))) {
    const label = stripTags(m[1]).trim();
    const value = stripTags(m[2]).trim();
    if (label && value && isSpecLabel(label)) spec[label] = value;
  }

  const bulletRe = /<strong[^>]*>\s*([^<:]+?)\s*:?\s*<\/strong>\s*:?\s*([\s\S]*?)<\/(?:p|li)>/gi;
  while ((m = bulletRe.exec(scoped))) {
    const label = stripTags(m[1]).trim();
    const value = stripTags(m[2]).replace(/^:\s*/, '').trim();
    if (label && value && isSpecLabel(label) && !spec[label]) spec[label] = value;
  }

  return spec;
}

async function fetchAll() {
  const res = await fetch(API, { headers: HEADERS });
  if (!res.ok) throw new Error(`Vasta API returned ${res.status}`);
  return res.json();
}

async function main() {
  console.log('Fetching product list from vasta.vn ...');
  const raw = await fetchAll();
  console.log(`Fetched ${raw.length} products.`);

  const products = raw.map((p) => ({
    id: p.id,
    name: decodeEntities(p.name),
    slug: p.slug,
    permalink: p.permalink,
    category: (p.categories || []).map((c) => c.name).join(', '),
    images: (p.images || []).map((img) => img.src),
    spec: parseSpec(p.description || ''),
  }));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(products, null, 2) + '\n', 'utf-8');

  const withImages = products.filter((p) => p.images.length > 0).length;
  const withSpec = products.filter((p) => Object.keys(p.spec).length > 0).length;
  console.log(`Wrote ${products.length} products to ${path.relative(process.cwd(), OUT)}`);
  console.log(`  With images: ${withImages}, with parsed spec: ${withSpec}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
