const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'data/products');
const DEFAULT_CONCURRENCY = 8;

const SOURCES = {
  viglaceratiles: {
    name: 'Viglacera Tiles',
    brand: 'Viglacera',
    baseUrl: 'https://viglaceratiles.vn',
    listingUrl: 'https://viglaceratiles.vn/san-pham/gach-op-lat.html',
    linkPattern: /https:\/\/viglaceratiles\.vn\/san-pham\/gach-op-lat\/[^"' <>)]+?\.html/g,
  },
  eurotile: {
    name: 'Eurotile',
    brand: 'Eurotile',
    baseUrl: 'https://www.eurotile.vn',
    listingUrl: 'https://www.eurotile.vn/vi/san-pham.html',
    linkPattern: /https:\/\/www\.eurotile\.vn\/vi\/san-pham\/[^"' <>)]+?\.html/g,
  },
  vastastone: {
    name: 'Vasta Stone',
    brand: 'Vasta Stone',
    baseUrl: 'https://vastastone.com',
    listingUrl: 'https://vastastone.com/vi/bo-suu-tap/',
    linkPattern: /https:\/\/vastastone\.com\/vi\/collection\/[^"' <>)]+?\//g,
  },
};

function cleanText(value) {
  return decodeHtml(String(value == null ? '' : value))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, key) => named[key] || match);
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function compactCode(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getAttr(tag, attr) {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return cleanText(match[1]);
  }
  return '';
}

function titleFromHtml(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return cleanText(h1[1]);

  const productHeading = html.match(/<div class=["']title-product["'][^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (productHeading) {
    const headingText = cleanText(productHeading[1]);
    if (headingText) return headingText;
  }

  const ogTitle = metaContent(html, 'og:title');
  if (ogTitle && !/^eurotile$/i.test(ogTitle)) return ogTitle;

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? cleanText(title[1]).replace(/\s+-\s+Vasta Stone$/i, '') : '';
}

function eurotileTitleFromHtml(html) {
  const storyTitle = html.match(/data-name=["']story["'][\s\S]*?<div class=["']title-product["'][^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i);
  return storyTitle ? cleanText(storyTitle[1]) : '';
}

function absoluteUrl(rawUrl, baseUrl) {
  if (!rawUrl) return '';
  try {
    return new URL(decodeHtml(rawUrl), baseUrl).href;
  } catch {
    return '';
  }
}

async function fetchHtml(url, retryCount = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'vi,en;q=0.8',
          'user-agent': 'Mozilla/5.0 product-data-scraper/1.0',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retryCount) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function extractLinks(html, source) {
  if (source === SOURCES.eurotile) {
    return unique(Array.from(
      html.matchAll(/<div class=["']item-product-list[^"']*["'][^>]*>[\s\S]*?<a[^>]+href=["'](https:\/\/www\.eurotile\.vn\/vi\/san-pham\/[^"']+?\.html)["']/gi),
      (match) => match[1],
    )).sort();
  }

  return unique(Array.from(html.matchAll(source.linkPattern), (match) => match[0]))
    .filter((url) => {
      if (url === source.listingUrl) return false;
      if (source === SOURCES.viglaceratiles) {
        const parts = new URL(url).pathname.split('/').filter(Boolean);
        const index = parts.indexOf('gach-op-lat');
        return index >= 0 && parts.slice(index + 1).length >= 2;
      }
      return true;
    })
    .sort();
}

function extractListingCategories(html, source) {
  const categories = new Map();

  if (source === SOURCES.eurotile) {
    const categoryLabels = new Map();
    for (const match of html.matchAll(/data-list=["']sub-(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      categoryLabels.set(match[1], cleanText(match[2]));
    }
    for (const section of html.matchAll(/<div class=["']center-middle["'] data-slide=["']sub-(\d+)["']>([\s\S]*?)(?=<div class=["']center-middle["'] data-slide=|<div class=["']nav-product["'])/gi)) {
      const label = categoryLabels.get(section[1]) || '';
      for (const url of extractLinks(section[2], source)) {
        categories.set(url, label);
      }
    }
  }

  if (source === SOURCES.viglaceratiles) {
    for (const match of html.matchAll(/<a class=["']all-product[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      categories.set(absoluteUrl(match[1], source.baseUrl), cleanText(match[2]));
    }
  }

  return categories;
}

function eurotileDetailScope(html) {
  const scope = html.match(/<div class=["']box-slider["'][^>]*>([\s\S]*?)<div class=["']tranperant-bg["']/i);
  return scope ? scope[1] : html;
}

function extractImages(html, source, productUrl, title) {
  const imageHtml = source === SOURCES.eurotile ? eurotileDetailScope(html) : html;
  const rawImages = [];
  const slug = productUrl.split('/').filter(Boolean).pop().replace(/\.html$/i, '');
  const slugCode = compactCode(slug);
  const titleCode = compactCode(title);
  const ogImage = metaContent(html, 'og:image');
  if (ogImage) rawImages.push(ogImage);

  for (const style of imageHtml.matchAll(/background-image\s*:\s*url\(([^)]+)\)/gi)) {
    rawImages.push(style[1].replace(/^["']|["']$/g, ''));
  }

  for (const tag of imageHtml.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    ['src', 'data-src', 'srcset'].forEach((attr) => {
      const value = getAttr(tag[0], attr);
      if (!value) return;
      value.split(',').forEach((candidate) => {
        rawImages.push(candidate.trim().split(/\s+/)[0]);
      });
    });
  }

  return unique(rawImages.map((url) => absoluteUrl(url, source.baseUrl))).filter((url) => {
    const lowerUrl = url.toLowerCase();
    const compactUrl = compactCode(url);

    if (!/\.(?:avif|webp|png|jpe?g)(?:$|\?)/i.test(url)) return false;
    if (/logo|favicon|apple-touch-icon|zalo|icon-512|social|banner|captcha|qrcode|qr-code|\/qr[-_0-9]/i.test(lowerUrl)) return false;

    if (source === SOURCES.viglaceratiles) {
      return /\/pictures\/(?:files|mobiles)\/3-sanpham\//.test(lowerUrl)
        && (compactUrl.includes(slugCode) || compactUrl.includes(titleCode));
    }

    if (source === SOURCES.eurotile) {
      return /\/pictures\/catalog\/product\//.test(lowerUrl);
    }

    if (source === SOURCES.vastastone) {
      return /\/wp-content\/uploads\//.test(lowerUrl);
    }

    return true;
  }).slice(0, 16);
}

function extractViglaceraInfo(html, title) {
  const info = {
    'Mã sản phẩm': title,
    'Hãng sản xuất': 'Viglacera',
    'Giá': 'Liên hệ',
  };
  const block = html.match(/<div class=["']product-info[^"']*["'][^>]*>([\s\S]*?)(?:<\/section>|<div class=["']title-main["'])/i);
  if (!block) return info;

  for (const match of block[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>\s*<h3[^>]*>([\s\S]*?)<\/h3>/gi)) {
    const key = cleanText(match[1]);
    const value = cleanText(match[2]);
    if (key && value) info[key] = value;
  }
  return info;
}

function extractEurotileInfo(html, title) {
  const sizes = [];
  const codes = [];
  const surfaces = [];

  for (const match of html.matchAll(/<div class=["']col-thumb["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    const size = cleanText(match[1]);
    if (/^\d+\s*x\s*\d+$/i.test(size)) sizes.push(size);
  }

  for (const match of html.matchAll(/<div class=["']title-thumb["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    codes.push(cleanText(match[1]));
  }

  for (const match of html.matchAll(/<div class=["']sub-title(?: mobile)?["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    const value = cleanText(match[1]);
    if (value && !/^(câu chuyện|bề mặt)$/i.test(value)) surfaces.push(value);
  }

  return {
    'Mã sản phẩm': unique(codes).join(', ') || title,
    'Loại sản phẩm': 'Gạch ốp lát',
    'Kích thước': unique(sizes).join(', '),
    'Bề mặt': unique(surfaces).join(', '),
    'Hãng sản xuất': 'Eurotile',
    'Giá': 'Liên hệ',
  };
}

function extractVastaInfo(title) {
  return {
    'Mã sản phẩm': title,
    'Loại sản phẩm': 'Đá nung kết / tấm lớn',
    'Hãng sản xuất': 'Vasta Stone',
    'Giá': 'Liên hệ',
  };
}

function extractEurotileDescription(html) {
  const story = html.match(/<div class=["']box-center-screen story-product["'][^>]*>([\s\S]*?)<\/div>/i);
  if (story) return cleanText(story[1]);
  return metaContent(html, 'description');
}

function extractVastaDescription(html) {
  const textBlocks = [];
  for (const match of html.matchAll(/<div class=["'][^"']*elementor-widget-text-editor[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)) {
    const text = cleanText(match[1]);
    if (text && !/privacy|subscribe|instagram|linkedin/i.test(text)) textBlocks.push(text);
  }
  return unique(textBlocks).slice(0, 3).join('\n\n');
}

function categoryFromUrl(productUrl) {
  const parts = productUrl.split('/').filter(Boolean);
  if (productUrl.includes('vastastone.com')) return 'collection';
  if (productUrl.includes('eurotile.vn')) return 'san-pham';
  const index = parts.indexOf('gach-op-lat');
  return index >= 0 && parts[index + 1] ? parts[index + 1].replace(/\.html$/i, '') : 'gach-op-lat';
}

function productSlugFromUrl(productUrl) {
  const lastPart = new URL(productUrl).pathname.split('/').filter(Boolean).pop() || '';
  return slugify(lastPart.replace(/\.html$/i, ''));
}

function parseProduct(html, sourceKey, source, productUrl, listingCategory) {
  const infoBySource = {
    viglaceratiles: () => extractViglaceraInfo(html, title),
    eurotile: () => extractEurotileInfo(html, title),
    vastastone: () => extractVastaInfo(title),
  };
  const descriptionBySource = {
    viglaceratiles: () => metaContent(html, 'description'),
    eurotile: () => extractEurotileDescription(html),
    vastastone: () => extractVastaDescription(html),
  };
  let title = sourceKey === 'eurotile'
    ? eurotileTitleFromHtml(html) || titleFromHtml(html)
    : titleFromHtml(html);
  title = title || productUrl.split('/').filter(Boolean).pop().replace(/\.html$/i, '');
  const productInfo = infoBySource[sourceKey]();
  if (/^(gạch ốp lát|sản phẩm)$/i.test(title) && productInfo['Mã sản phẩm']) {
    title = productInfo['Mã sản phẩm'].split(',')[0].trim();
  }

  productInfo['Nguồn dữ liệu'] = source.name;
  productInfo.URL = productUrl;
  if (listingCategory) productInfo['Danh mục nguồn'] = listingCategory;

  return {
    title,
    product_info: productInfo,
    description: descriptionBySource[sourceKey](),
    images: extractImages(html, source, productUrl, title),
    view_count: 0,
  };
}

async function runWithConcurrency(items, limit, worker) {
  let nextIndex = 0;
  const results = [];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function scrapeSource(sourceKey, options) {
  const source = SOURCES[sourceKey];
  const outputDir = path.join(OUTPUT_ROOT, sourceKey);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const entry of fs.readdirSync(outputDir)) {
    if (entry.endsWith('.json')) {
      fs.unlinkSync(path.join(outputDir, entry));
    }
  }

  console.log(`[${sourceKey}] Fetching listing ${source.listingUrl}`);
  const listingHtml = await fetchHtml(source.listingUrl);
  const categoryByUrl = extractListingCategories(listingHtml, source);
  const links = extractLinks(listingHtml, source).slice(0, options.limit || undefined);
  console.log(`[${sourceKey}] Found ${links.length} detail URLs`);

  const tree = {};
  let saved = 0;
  let failed = 0;

  await runWithConcurrency(links, options.concurrency, async (productUrl, index) => {
    try {
      const html = await fetchHtml(productUrl);
      const product = parseProduct(html, sourceKey, source, productUrl, categoryByUrl.get(productUrl));
      const slug = productSlugFromUrl(productUrl) || slugify(product.title);
      const category = categoryFromUrl(productUrl);
      if (!tree[category]) tree[category] = {};
      tree[category][slug] = product;
      writeJson(path.join(outputDir, `${slug}.json`), product);
      saved += 1;
      if (saved % 25 === 0 || saved === links.length) {
        console.log(`[${sourceKey}] Saved ${saved}/${links.length}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`[${sourceKey}] Failed ${index + 1}/${links.length}: ${productUrl} (${error.message})`);
    }
  });

  writeJson(path.join(outputDir, 'products-tree.json'), tree);
  console.log(`[${sourceKey}] Done. Saved ${saved}; failed ${failed}; output ${path.relative(ROOT_DIR, outputDir)}`);
  return { sourceKey, saved, failed, outputDir };
}

function parseArgs(argv) {
  const options = {
    concurrency: DEFAULT_CONCURRENCY,
    limit: 0,
    sources: Object.keys(SOURCES),
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--source=')) {
      options.sources = arg.slice('--source='.length).split(',').map((value) => value.trim()).filter(Boolean);
    } else if (arg.startsWith('--limit=')) {
      options.limit = Number(arg.slice('--limit='.length)) || 0;
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = Number(arg.slice('--concurrency='.length)) || DEFAULT_CONCURRENCY;
    }
  });

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  for (const sourceKey of options.sources) {
    if (!SOURCES[sourceKey]) {
      throw new Error(`Unknown source "${sourceKey}". Use one of: ${Object.keys(SOURCES).join(', ')}`);
    }
  }

  for (const sourceKey of options.sources) {
    await scrapeSource(sourceKey, options);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
