#!/usr/bin/env node
/**
 * Crawl the Vietnamese TOTO catalogue.
 *
 * Category pages provide the category -> product relationship. Product pages
 * provide the authoritative product fields, images, technologies, features,
 * and downloadable documents.
 *
 * Run:
 *   node scripts/crawl-toto.js --category ban-cau-ve-sinh --limit-products 3
 *   node scripts/crawl-toto.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://vn.toto.com';
const OUTPUT_DIR = path.join(ROOT, 'data', 'product', 'new-toto');
const TREE_PATH = path.join(OUTPUT_DIR, 'products-tree.json');
const CATEGORIES_PATH = path.join(OUTPUT_DIR, 'categories.json');
const REPORT_PATH = path.join(OUTPUT_DIR, 'crawl-report.json');
const DETAIL_CACHE_PATH = path.join(OUTPUT_DIR, '.detail-cache.json');

const USER_AGENT = 'Mozilla/5.0 (compatible; lavatiles-toto-crawler/1.0)';
const REQUEST_TIMEOUT_MS = 15000;
const REQUEST_RETRIES = 2;
const REQUEST_DELAY_MS = 250;
const DETAIL_CONCURRENCY = 12;

const CATEGORY_GROUPS = [
  {
    key: 'san-pham-moi',
    title: 'Sản phẩm mới',
    url: '/san-pham-moi/',
    children: [],
  },
  {
    key: 'washlet',
    title: 'Washlet',
    url: '/bon-cau-va-nap-rua-thong-minh-washlet/',
    children: [
      ['nap-rua-dien-tu-thong-minh-washlet', 'Nắp rửa điện tử WASHLET', '/nap-rua-dien-tu-thong-minh-washlet/'],
      ['nap-rua-co-ecowasher', 'Nắp rửa cơ Ecowasher', '/nap-rua-co-ecowasher/'],
      ['tat-ca-san-pham-nap-rua-dien-tu-washlet', 'Bàn cầu với Nắp rửa điện tử WASHLET', '/tat-ca-san-pham-nap-rua-dien-tu-washlet/'],
      ['tat-ca-san-pham-nap-rua-co-ecowasher', 'Bàn cầu với Nắp rửa cơ Ecowasher', '/tat-ca-san-pham-nap-rua-co-ecowasher/'],
    ],
  },
  {
    key: 'neorest',
    title: 'NEOREST',
    url: '/bo-suu-tap-neorest/',
    children: [],
  },
  {
    key: 'ban-cau-ve-sinh',
    title: 'Bàn cầu',
    url: '/ban-cau-ve-sinh/',
    children: [
      ['bon-cau-mot-khoi', 'Bàn cầu 1 khối', '/bon-cau-mot-khoi/'],
      ['bon-cau-hai-khoi', 'Bàn cầu 2 khối', '/bon-cau-hai-khoi/'],
      ['bon-cau-treo-tuong', 'Bàn cầu treo tường', '/bon-cau-treo-tuong/'],
      ['bon-cau-dat-san', 'Bàn cầu đặt sàn', '/bon-cau-dat-san/'],
      ['ban-cau-dien-tu', 'Bàn cầu điện tử', '/ban-cau-dien-tu/'],
      ['ket-nuoc-am-tuong', 'Két nước âm tường', '/ket-nuoc-am-tuong/'],
      ['mat-na-xa-nhan', 'Mặt nạ xả nhấn', '/mat-na-xa-nhan/'],
      ['phu-kien-bon-cau', 'Phụ kiện bàn cầu', '/phu-kien-bon-cau/'],
    ],
  },
  {
    key: 'chau-rua-mat',
    title: 'Chậu rửa mặt',
    url: '/chau-rua-mat/',
    children: [
      ['chau-rua-mat-galalato', 'Chậu GALALATO', '/chau-rua-mat-galalato/'],
      ['chau-rua-mat-dat-tren-ban', 'Chậu đặt bàn', '/chau-rua-mat-dat-tren-ban/'],
      ['chau-rua-mat-ban-am-ban', 'Chậu bán âm bàn', '/chau-rua-mat-ban-am-ban/'],
      ['chau-rua-mat-duong-vanh', 'Chậu dương vành', '/chau-rua-mat-duong-vanh/'],
      ['chau-rua-mat-am-ban', 'Chậu âm bàn', '/chau-rua-mat-am-ban/'],
      ['chau-rua-mat-treo-tuong', 'Chậu rửa mặt treo tường', '/chau-rua-mat-treo-tuong/'],
      ['phu-kien-chau-rua-mat', 'Phụ kiện chậu rửa mặt', '/phu-kien-chau-rua-mat/'],
    ],
  },
  {
    key: 'sen-voi',
    title: 'Sen vòi',
    url: '/sen-voi/',
    children: [
      ['z-collections', 'Z Collections', '/z-collections/'],
      ['g-collections', 'G Collections', '/g-collections/'],
      ['sen-voi-bo-suu-tap-khac', 'Bộ sưu tập khác', '/sen-voi-bo-suu-tap-khac/'],
      ['voi-chau-rua', 'Vòi chậu rửa mặt', '/voi-chau-rua/'],
      ['bat-sen-tam', 'Bát sen tắm', '/bat-sen-tam/'],
      ['sen-tam', 'Sen tắm', '/sen-tam/'],
      ['voi-bon-tam', 'Vòi sen xả bồn tắm', '/voi-bon-tam/'],
      ['voi-bep-rua-bat', 'Vòi chậu rửa bát', '/voi-bep-rua-bat/'],
      ['sen-voi-phu-kien', 'Phụ kiện sen vòi', '/sen-voi-phu-kien/'],
    ],
  },
  {
    key: 'bon-tam',
    title: 'Bồn tắm',
    url: '/bon-tam/',
    children: [
      ['bon-tam-khong-gian-bon-tam', 'Bồn tắm không gian', '/bon-tam-khong-gian-bon-tam/'],
      ['bon-tam-galalato', 'Bồn tắm GALALATO', '/bon-tam-galalato/'],
      ['bon-tam-dat-san', 'Bồn tắm đặt sàn', '/bon-tam-dat-san/'],
      ['bon-tam-xay', 'Bồn tắm xây', '/bon-tam-xay/'],
      ['bon-tam-massage', 'Bồn tắm Massage', '/bon-tam-massage/'],
    ],
  },
  {
    key: 'phu-kien-phong-tam',
    title: 'Phụ kiện',
    url: '/phu-kien-phong-tam/',
    children: [
      ['phu-kien-ve-sinh-bo-phu-kien', 'Bộ phụ kiện', '/phu-kien-ve-sinh-bo-phu-kien/'],
      ['thanh-vat-khan-phong-tam', 'Thanh vắt khăn', '/thanh-vat-khan-phong-tam/'],
      ['moc-ao', 'Móc áo', '/moc-ao/'],
      ['lo-xa-bong', 'Lô xà bông', '/lo-xa-bong/'],
      ['lo-ban-chai', 'Lô bàn chải', '/lo-ban-chai/'],
      ['day-voi-xit-ve-sinh', 'Dây vòi xịt vệ sinh', '/day-voi-xit-ve-sinh/'],
      ['ke-kinh', 'Kệ kính', '/ke-kinh/'],
      ['lo-giay', 'Lô giấy', '/lo-giay/'],
      ['guong', 'Gương', '/guong/'],
      ['ga-thoat-san', 'Ga thoát sàn', '/ga-thoat-san/'],
      ['phu-kien-ve-sinh-khac', 'Phụ kiện khác', '/phu-kien-ve-sinh-khac/'],
      ['ong-cong', 'Ống thải chữ P', '/ong-cong/'],
    ],
  },
  {
    key: 'thiet-bi-ve-sinh-cong-cong',
    title: 'Khu công cộng',
    url: '/thiet-bi-ve-sinh-cong-cong/',
    children: [],
  },
];

const SITEMAP_URLS = [
  '/product-sitemap.xml',
  '/product-sitemap2.xml',
  '/product-sitemap3.xml',
  '/product-sitemap4.xml',
];

function allCategories() {
  const result = [];
  for (const group of CATEGORY_GROUPS) {
    result.push({ key: group.key, title: group.title, url: group.url, parent: null });
    for (const [key, title, url] of group.children) {
      result.push({ key, title, url, parent: group.key });
    }
  }
  return result;
}

function absoluteUrl(value, base = BASE) {
  if (!value) return '';
  try {
    return new URL(value, base).toString();
  } catch (_) {
    return '';
  }
}

function canonicalUrl(value) {
  const url = absoluteUrl(value);
  if (!url) return '';
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.search = '';
  parsed.pathname = parsed.pathname.replace(/\/+/g, '/');
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/';
  return parsed.toString();
}

function slugFromUrl(value) {
  const pathname = new URL(value).pathname.replace(/\/+$/, '');
  return pathname.split('/').pop().toLowerCase();
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanDescription(value) {
  const text = cleanText(value);
  return /^chưa có mô tả sản phẩm$/i.test(text) ? '' : text;
}

function firstImage($, selector) {
  const image = $(selector).first();
  const candidates = [
    image.attr('data-src'),
    image.attr('data-lazy-src'),
    image.attr('src'),
  ];
  for (const candidate of candidates) {
    if (candidate && !candidate.startsWith('data:image/')) return absoluteUrl(candidate);
  }
  const noscript = image.closest('a').find('noscript').first().text();
  const match = noscript.match(/(?:src|data-src)=["']([^"']+)["']/i);
  return match ? absoluteUrl(match[1]) : '';
}

function imagesFrom($, selector) {
  const result = [];
  $(selector).each((_, element) => {
    const image = $(element);
    const candidates = [
      image.attr('data-src'),
      image.attr('data-lazy-src'),
      image.attr('src'),
    ];
    for (const candidate of candidates) {
      if (candidate && !candidate.startsWith('data:image/')) {
        const url = absoluteUrl(candidate);
        if (url) result.push(url);
        break;
      }
    }
  });
  return [...new Set(result)];
}

function parseArgs(argv) {
  const args = { category: '', limitProducts: 0, noDetails: false, skipSitemap: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--category') args.category = argv[++i] || '';
    else if (arg === '--limit-products') args.limitProducts = Number(argv[++i] || 0);
    else if (arg === '--no-details') args.noDetails = true;
    else if (arg === '--skip-sitemap') args.skipSitemap = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/crawl-toto.js [--category KEY] [--limit-products N] [--no-details] [--skip-sitemap]');
      process.exit(0);
    }
  }
  if (!Number.isFinite(args.limitProducts) || args.limitProducts < 0) {
    throw new Error('--limit-products must be a non-negative number');
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < REQUEST_RETRIES) await sleep(attempt * 1000);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`${url}: ${lastError.message}`);
}

function parseCategoryPage(html, pageUrl) {
  const $ = cheerio.load(html);
  return {
    title: cleanText($('main .title-page').first().text() || $('h1').first().text()),
    products: parseProductCards($),
    next: '',
    totalPages: parseTotalPages($),
    filter: {
      termId: cleanText($('#termId').attr('value')),
      hasChildTerm: cleanText($('#hasChildTerm').attr('value')),
      minPrice: cleanText($('.slider-1').attr('min') || $('.val-1').text()),
      maxPrice: cleanText($('.slider-2').attr('max') || $('.val-2').text()),
    },
    canonical: canonicalUrl($('link[rel="canonical"]').attr('href') || pageUrl),
  };
}

function parseTotalPages($) {
  const match = cleanText($('.pagination .page-info').first().text()).match(/of\s+(\d+)/i);
  return match ? Number(match[1]) : 1;
}

function parseProductCards($) {
  const products = [];
  $('#more-product > .list-filter > .item, .list-filter > .item').each((_, element) => {
    const item = $(element);
    const link = item.find('.name > a[href]').first();
    const url = canonicalUrl(link.attr('href'));
    if (!url || !url.startsWith(`${BASE}/`) || url.includes('/technology/')) return;

    const title = cleanText(link.text());
    const description = cleanDescription(item.find('.info .desc').text());
    const price = cleanText(item.find('.info .price').clone().children().remove().end().text());
    const regularPrice = cleanText(item.find('.info .price .regular').text());
    const image = firstImage($, item.find('.img img').first());
    const flags = item.find('.type > div').map((__, flag) => cleanText($(flag).text())).get().filter(Boolean);
    const compare = item.find('.prodcompare').first();

    products.push({
      url,
      slug: slugFromUrl(url),
      card: {
        model: title,
        title: description,
        price,
        regular_price: regularPrice,
        image,
        flags,
        site_id: compare.attr('data-id') || '',
        category: compare.attr('data-category') || '',
      },
    });
  });
  return products;
}

async function fetchCategoryAjaxPage(filter, page) {
  const url = new URL(`${BASE}/wp-admin/admin-ajax.php`);
  const params = url.searchParams;
  params.set('action', 'product_cat_filter');
  params.set('paged', String(page));
  params.set('termId', filter.termId);
  params.set('hasChildTerm', filter.hasChildTerm);
  params.set('min_price', filter.minPrice);
  params.set('max_price', filter.maxPrice);
  params.set('selected_value', 'default');

  const response = JSON.parse(await fetchText(url.toString()));
  if (!response || typeof response.products !== 'string') {
    throw new Error(`Unexpected pagination response for page ${page}`);
  }
  const products = cheerio.load(response.products);
  return {
    products: parseProductCards(products),
    totalPages: parseTotalPages(cheerio.load(response.pagination || '')),
  };
}

function parseCategoryTiles(html) {
  const $ = cheerio.load(html);
  return $('.category__main-content .product-list > .item').map((_, element) => {
    const item = $(element);
    const link = item.find('.bottom > a[href]').first();
    return {
      title: cleanText(link.text()),
      url: canonicalUrl(link.attr('href')),
      image: firstImage($, item.find('.top img').first()),
    };
  }).get().filter((item) => item.url);
}

function parseInfoBlocks($) {
  const info = {};
  $('.view-top .view__info').each((_, element) => {
    const block = $(element);
    const label = cleanText(block.find('.view__info-title').text()).replace(/:$/, '');
    const value = cleanText(block.find('.view__info-value, .view__info-price').text());
    if (label && value) info[label] = value;
  });
  const price = cleanText($('#product-price .price_load').first().text());
  const regular = cleanText($('#product-price .regular').first().text());
  if (price) info['Giá'] = price;
  if (regular) info['Giá niêm yết'] = regular;
  return info;
}

function parseTechnicalFields($) {
  const fields = {};
  $('.detail__feature .item').each((_, element) => {
    const item = $(element);
    const heading = cleanText(item.find('.title-section').first().text());
    if (!/^kỹ thuật$/i.test(heading)) return;
    const technicalBlock = item.find('.detail__feature-content .info > p').first();
    const html = (technicalBlock.length ? technicalBlock.html() : item.find('.detail__feature-content').first().html()) || '';
    const labeled = /<(?:strong|b)[^>]*>\s*([^<:]+):?\s*<\/(?:strong|b)>\s*([\s\S]*?)(?=(?:<br\s*\/?>\s*)?<(?:strong|b)|$)/gi;
    for (const match of html.matchAll(labeled)) {
      const value = cleanText(
        match[2]
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' '),
      );
      if (value) fields[cleanText(match[1])] = value;
    }
    const withoutTags = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ');
    const lines = withoutTags.split(/\n+/).map(cleanText).filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match && !fields[cleanText(match[1])]) fields[cleanText(match[1])] = cleanText(match[2]);
    }
  });
  return fields;
}

function parseFeatures($) {
  const features = [];
  $('.detail__feature .item').each((_, element) => {
    const item = $(element);
    const heading = cleanText(item.find('.title-section').first().text());
    if (!/^tính năng$/i.test(heading)) return;
    const text = item.find('.detail__feature-content').text();
    text.split(/[•\n]+/).map(cleanText).filter(Boolean).forEach((feature) => features.push(feature));
  });
  return [...new Set(features)];
}

function parseDocuments($) {
  return $('.doc-item > a[href]').map((_, element) => {
    const link = $(element);
    return {
      title: cleanText(link.find('.doc-item-content span').text()) || cleanText(link.attr('aria-label')).replace(/^Download\s+file\s+/i, ''),
      url: absoluteUrl(link.attr('href')),
    };
  }).get().filter((document) => document.url);
}

function parseTechnologies($) {
  return $('.view-technology .symbol > a[href*="/technology/technologies/"]').map((_, element) => {
    const link = $(element);
    const image = link.find('img').first();
    return {
      name: cleanText(link.attr('aria-label')).replace(/^Link\s+/i, ''),
      url: canonicalUrl(link.attr('href')),
      image: absoluteUrl(image.attr('data-src') || image.attr('src')),
    };
  }).get().filter((technology) => technology.url);
}

function parseProductPage(html, requestedUrl, fallback) {
  const $ = cheerio.load(html);
  const url = canonicalUrl($('link[rel="canonical"]').attr('href') || requestedUrl);
  const model = cleanText($('.view-top .view__title').first().text()) || fallback.card.model;
  const marketingDescription = cleanDescription($('.view-top .view__desc').first().text()) || fallback.card.title;
  const productInfo = parseInfoBlocks($);
  const technical = parseTechnicalFields($);
  Object.assign(productInfo, technical);
  productInfo.URL = url;

  const description = cleanDescription($('.detail__desc-content').first().text());
  const images = imagesFrom($, '.view-slider img, .view-slider-nav img');
  const technologies = parseTechnologies($);
  const documents = parseDocuments($);
  const features = parseFeatures($);

  return {
    title: marketingDescription || model,
    product_info: productInfo,
    description,
    images: images.length ? images : (fallback.card.image ? [fallback.card.image] : []),
    technologies,
    features,
    documents,
    view_count: 0,
    rooms: ['phong_tam'],
    source_url: url,
    model,
    _requested_url: requestedUrl,
  };
}

function fallbackProduct(entry) {
  const info = {
    'Mã sản phẩm': entry.card.model,
    'Giá': entry.card.price,
    'Giá niêm yết': entry.card.regular_price,
    'URL': entry.url,
  };
  return {
    title: entry.card.title || entry.card.model,
    product_info: info,
    description: '',
    images: entry.card.image ? [entry.card.image] : [],
    technologies: [],
    features: [],
    documents: [],
    view_count: 0,
    rooms: ['phong_tam'],
    source_url: entry.url,
    model: entry.card.model,
    _requested_url: entry.url,
  };
}

async function crawlCategory(category, state) {
  const pageUrl = absoluteUrl(category.url);
  let pageCount = 0;
  const categoryProducts = [];

  const firstPageHtml = await fetchText(pageUrl);
  const firstPage = parseCategoryPage(firstPageHtml, pageUrl);
  let firstProducts = { products: firstPage.products, totalPages: firstPage.totalPages };
  try {
    firstProducts = await fetchCategoryAjaxPage(firstPage.filter, 1);
  } catch (error) {
    state.failures.push({ type: 'category-page', category: category.key, page: 1, error: error.message });
    console.error(`Category ${category.key} page 1 failed: ${error.message}; using server-rendered products`);
  }
  const pages = [firstProducts];
  for (let page = 2; page <= firstProducts.totalPages; page += 1) {
    try {
      pages.push(await fetchCategoryAjaxPage(firstPage.filter, page));
    } catch (error) {
      state.failures.push({ type: 'category-page', category: category.key, page, error: error.message });
      console.error(`Category ${category.key} page ${page} failed: ${error.message}`);
      break;
    }
    await sleep(REQUEST_DELAY_MS);
  }

  for (const page of pages) {
    pageCount += 1;
    for (const product of page.products) {
      categoryProducts.push(product);
      const existing = state.products.get(product.url);
      if (existing) {
        if (!existing.categories.includes(category.key)) existing.categories.push(category.key);
        existing.card_sources[category.key] = product.card;
      } else {
        state.products.set(product.url, {
          entry: product,
          categories: [category.key],
          card_sources: { [category.key]: product.card },
        });
      }
    }
  }

  state.categoryStats[category.key] = {
    title: category.title,
    url: absoluteUrl(category.url),
    parent: category.parent,
    pages: pageCount,
    products: categoryProducts.length,
    first_page_category_tiles: firstPageHtml ? parseCategoryTiles(firstPageHtml) : [],
  };
  console.log(`Category ${category.key}: ${categoryProducts.length} products across ${pageCount} page(s)`);
}

async function crawlProductDetails(state, args) {
  const entries = [...state.products.values()];
  const limit = args.limitProducts > 0 ? args.limitProducts : entries.length;
  const queue = entries.slice(0, limit);
  let cursor = 0;
  let completed = 0;
  let processed = 0;

  async function worker() {
    while (cursor < queue.length) {
      const record = queue[cursor];
      cursor += 1;
      const fallback = fallbackProduct(record.entry);
      const cached = state.detailCache[record.entry.url];
      if (cached) {
        record.product = cached;
        completed += 1;
        processed += 1;
        continue;
      }
      if (args.noDetails) {
        record.product = fallback;
        processed += 1;
        continue;
      }
      try {
        const html = await fetchText(record.entry.url);
        record.product = parseProductPage(html, record.entry.url, record.entry);
        state.detailCache[record.entry.url] = record.product;
        fs.writeFileSync(DETAIL_CACHE_PATH, `${JSON.stringify(state.detailCache)}\n`, 'utf8');
        completed += 1;
      } catch (error) {
        record.product = fallback;
        state.failures.push({ type: 'product', url: record.entry.url, error: error.message });
      }
      processed += 1;
      if (processed % 10 === 0) console.log(`Products: ${completed}/${processed} detail pages completed`);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const workers = Array.from(
    { length: Math.min(DETAIL_CONCURRENCY, queue.length) },
    () => worker(),
  );
  await Promise.all(workers);

  for (const record of entries.slice(limit)) record.product = fallbackProduct(record.entry);
  return { requested: queue.length, completed };
}

async function auditSitemaps(state) {
  const urls = new Set();
  let imageCount = 0;
  for (const sitemapPath of SITEMAP_URLS) {
    try {
      const xml = await fetchText(absoluteUrl(sitemapPath));
      const $ = cheerio.load(xml, { xmlMode: true });
      $('url').each((_, element) => {
        const loc = canonicalUrl($(element).find('loc').first().text());
        if (loc && !new URL(loc).pathname.startsWith('/en/')) urls.add(loc);
        imageCount += $(element).find('image\\:loc').length;
      });
    } catch (error) {
      state.failures.push({ type: 'sitemap', url: absoluteUrl(sitemapPath), error: error.message });
    }
  }
  const categoryProducts = new Set(state.products.keys());
  return {
    raw_vietnamese_product_urls: urls.size,
    category_discovered_urls: categoryProducts.size,
    category_urls_missing_from_sitemap: [...categoryProducts].filter((url) => !urls.has(url)).length,
    sitemap_urls_not_reached_from_categories: [...urls].filter((url) => !categoryProducts.has(url)).length,
    sitemap_image_entries: imageCount,
  };
}

function buildTree(state) {
  const tree = {};
  const categoryLookup = new Map(allCategories().map((category) => [category.key, category]));
  for (const category of allCategories()) tree[category.key] = {};

  for (const record of state.products.values()) {
    const product = { ...record.product };
    delete product._requested_url;
    delete product.model;
    product.categories = record.categories;
    const slug = slugFromUrl(product.source_url || record.entry.url);
    for (const categoryKey of record.categories) {
      if (!tree[categoryKey]) tree[categoryKey] = {};
      tree[categoryKey][slug] = product;
    }
  }
  return { tree, categoryLookup };
}

function writeOutputs(state, args, detailStats, sitemapStats) {
  const { tree, categoryLookup } = buildTree(state);
  const outputProducts = new Set();
  let outputAssignments = 0;
  for (const products of Object.values(tree)) {
    outputAssignments += Object.keys(products).length;
    for (const product of Object.values(products)) outputProducts.add(product.source_url);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(TREE_PATH, `${JSON.stringify(tree, null, 2)}\n`, 'utf8');

  const categories = {};
  for (const group of CATEGORY_GROUPS) {
    categories[group.key] = {
      key: group.key,
      title: group.title,
      url: absoluteUrl(group.url),
      children: group.children.map(([key, title, url]) => ({ key, title, url: absoluteUrl(url) })),
    };
  }
  fs.writeFileSync(CATEGORIES_PATH, `${JSON.stringify(categories, null, 2)}\n`, 'utf8');

  const report = {
    generated_at: new Date().toISOString(),
    source: BASE,
    options: args,
    output: path.relative(ROOT, TREE_PATH),
    total_discovered_products: state.products.size,
    total_unique_products: outputProducts.size,
    total_category_assignments: outputAssignments,
    category_stats: state.categoryStats,
    detail_stats: detailStats,
    sitemap_stats: sitemapStats,
    failures: state.failures,
    notes: [
      'Vietnamese category pages are the source of category-to-product relationships.',
      'Product sitemap URLs are used as a coverage audit and may include stale or uncategorized products.',
      'Images and documents are stored as source URLs; binaries are not downloaded.',
    ],
  };
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return { tree, categoryLookup, report };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const categories = allCategories();
  const selected = args.category
    ? categories.filter((category) => category.key === args.category)
    : categories;
  if (!selected.length) throw new Error(`Unknown category: ${args.category}`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const state = {
    products: new Map(),
    categoryStats: {},
    failures: [],
    detailCache: fs.existsSync(DETAIL_CACHE_PATH)
      ? JSON.parse(fs.readFileSync(DETAIL_CACHE_PATH, 'utf8'))
      : {},
  };

  for (const category of selected) {
    try {
      await crawlCategory(category, state);
    } catch (error) {
      state.failures.push({ type: 'category', category: category.key, url: absoluteUrl(category.url), error: error.message });
      console.error(`Category ${category.key} failed: ${error.message}`);
    }
  }

  const detailStats = await crawlProductDetails(state, args);
  const sitemapStats = args.skipSitemap ? { skipped: true } : await auditSitemaps(state);
  const { report } = writeOutputs(state, args, detailStats, sitemapStats);

  console.log(`Wrote ${report.total_unique_products} unique products to ${path.relative(ROOT, TREE_PATH)}`);
  console.log(`Wrote category metadata to ${path.relative(ROOT, CATEGORIES_PATH)}`);
  console.log(`Failures: ${report.failures.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
