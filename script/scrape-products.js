const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.hoathanhphat.com.vn';
const PRODUCTS_PAGE = `${BASE_URL}/san-pham`;
const OUTPUT_DIR = path.join(__dirname, '../data/products');

// All category pages to scrape
const CATEGORY_PAGES = [
  'ngoi-trang-men',
  'ngoi-song',
  'ngoi-viglacera',
  'ngoi-phang-t',
  'gach-op-lat',
  'gach-op',
  '30x60',
  '40x80',
  'gach-lat',
  '30x30',
  '60x60',
  '80x80',
  '20x100-van-go',
  '100x100',
  '60x120',
  '120x120-cm',
  '80-x-160-cm',
  'gach-san-vuon',
  'gach-viglacera-40-x-60-cm',
  '50x50',
];

// Map product slug patterns to categories
const CATEGORY_MAPPING = {
  'ngoi-trang-men': ['ngoi-trang-men', 'ngoi-phng-trng-men'],
  'ngoi-song': ['ngoi-song', 'ngoi-sng-trng-men'],
  'ngoi-viglacera': ['ngoi-viglacera'],
  'ngoi-phng-t': ['ngoi-phng-t', 'ngoi-phng-piata'],
  'gach-op-lat': ['gach-op-lat'],
  'gach-op': ['gach-op'],
  'gach-lat': ['gach-lat', 'gach-lat-nen'],
  'gach-san-vuon': ['gach-san-vuon'],
  'gach-30x60': ['30x60', 'gach-30x60'],
  'gach-40x80': ['40x80', 'gach-40x80'],
  'gach-40x60': ['gach-viglacera-40-x-60-cm', 'gach-40x60'],
  'gach-50x50': ['50x50', 'gach-50x50'],
  'gach-20x100': ['20x100-van-go', 'gach-20x100'],
  'gach-100x100': ['100x100', 'gach-100x100'],
  'gach-60x120': ['60x120', 'gach-60x120'],
  'gach-120x120': ['120x120-cm', 'gach-120x120'],
  'gach-80x160': ['80-x-160-cm', 'gach-80x160'],
  'gach-40x60-viglacera': ['gach-viglacera-40-x-60-cm', 'gach-40x60-viglacera'],
  'viglacera': ['gach-lat', '30x30', '60x60', '80x80', '100x100', '120x120-cm', '80-x-160-cm', '20x100-van-go'],
};

// Determine category from product slug
function determineCategory(slug) {
  for (const [category, patterns] of Object.entries(CATEGORY_MAPPING)) {
    if (patterns.includes(slug) || patterns.includes(slug.split('-')[0])) {
      console.log(`  Category match: ${slug} -> ${category}`);
      return category;
    }
  }
  console.log(`  No category match for: ${slug}, using first part: ${slug.split('-')[0]}`);
  return slug.split('-')[0];
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });
    return cheerio.load(response.data);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

async function scrapeProductsPage($) {
  const products = [];
  let $container = $('div.product-list');

  if ($container.length === 0) {
    console.log('No products found on the main page');
    console.log('Looking for products in different containers...');
    $container = $('body');
  }

  console.log('Container found:', $container.length > 0);

  console.log('Looking for product items...');
  $('div').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (text.includes('Gạch') && $el.find('a').length > 0) {
      console.log('Found potential product element:', $el.attr('class'));
    }
  });

  $('div.item').each((_, el) => {
    const $el = $(el);
    const $link = $el.find('a');
    const $img = $el.find('img');

    if ($link.length && $img.length) {
      const productUrl = $link.attr('href');
      const imgUrl = $img.attr('src');

      if (productUrl && imgUrl) {
        const fullProductUrl = productUrl.startsWith('/') ? BASE_URL + productUrl : `${BASE_URL}/${productUrl}`;
        const fullImgUrl = imgUrl.startsWith('/') ? BASE_URL + imgUrl : `${BASE_URL}/${imgUrl}`;

        if (fullProductUrl) {
          products.push({
            url: fullProductUrl,
            image: fullImgUrl,
          });
        }
      }
    }
  });

  return products;
}

async function scrapeProductDetail($) {
  const product = {
    title: '',
    product_info: {},
    description: '',
    images: [],
    view_count: 0,
  };

  // Extract title
  const $title = $('h1');
  if ($title.length) {
    product.title = $title.text().trim();
  }

  // Extract product info from the specs list
  const $infoList = $('ul.product-info, .info-list, .product-info ul, .info-list ul');
  if ($infoList.length) {
    $infoList.find('li').each((_, item) => {
      const $item = $(item);
      const text = $item.text().trim();
      const parts = text.split(':');

      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();

        if (key && value) {
          product.product_info[key] = value;
        }
      }
    });
  }

  // Also try to find all bullet list items
  $('ul li').each((_, item) => {
    const $item = $(item);
    const text = $item.text().trim();
    const parts = text.split(':');

    if (parts.length >= 2 && text.includes(':') && !Object.keys(product.product_info).includes(parts[0].trim())) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();

      if (key && value && key !== 'https') {
        product.product_info[key] = value;
      }
    }
  });

  // Extract description from the detail content
  const $descSection = $('.detail-content p');
  if ($descSection.length) {
    product.description = $descSection.text().trim();
  }

  // Extract images from the main image and gallery
  const $mainImage = $('#main-image img');
  if ($mainImage.length) {
    product.images.push($mainImage.attr('src'));
  }

  // Also try to find all images in the detail content
  $('.detail-content img').each((_, img) => {
    const $img = $(img);
    let src = $img.attr('src');
    if (src && !product.images.includes(src)) {
      if (src.startsWith('http')) {
        product.images.push(src);
      } else if (src.startsWith('//')) {
        product.images.push('https:' + src);
      } else if (src.startsWith('/')) {
        product.images.push(BASE_URL + src);
      } else {
        product.images.push(BASE_URL + '/' + src);
      }
    }
  });

  // Try to find images in markdown-style links
  $('a img').each((_, img) => {
    const $img = $(img);
    let src = $img.attr('src');
    if (src && !product.images.includes(src)) {
      if (src.startsWith('http')) {
        product.images.push(src);
      } else if (src.startsWith('//')) {
        product.images.push('https:' + src);
      } else if (src.startsWith('/')) {
        product.images.push(BASE_URL + src);
      } else {
        product.images.push(BASE_URL + '/' + src);
      }
    }
  });

  // Also look for img tags inside product detail sections
  $('.product-detail img').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src');
    if (src && !product.images.includes(BASE_URL + src)) {
      product.images.push(BASE_URL + src);
    }
  });

  // Extract view count
  const $viewCount = $('span.view-count');
  if ($viewCount.length) {
    product.view_count = parseInt($viewCount.text().replace(/\D/g, '')) || 0;
  }

  return product;
}

// Determine category from product slug
function determineCategory(slug) {
  for (const [category, patterns] of Object.entries(CATEGORY_MAPPING)) {
    if (patterns.includes(slug) || patterns.includes(slug.split('-')[0])) {
      return category;
    }
  }
  return slug.split('-')[0];
}

// Determine category from product title
function determineCategoryFromTitle(title) {
  if (title.includes('Gạch lát nền')) {
    if (title.includes('30x30')) return 'gach-lat-nen';
    if (title.includes('60x60')) return 'gach-lat-nen';
    if (title.includes('80x80')) return 'gach-lat-nen';
    if (title.includes('100x100')) return 'gach-lat-nen';
    if (title.includes('120x120')) return 'gach-lat-nen';
    if (title.includes('80x160')) return 'gach-lat-nen';
    if (title.includes('20x100')) return 'gach-lat-nen';
    if (title.includes('1mx1m')) return 'gach-lat-nen';
    if (title.includes('60x120')) return 'gach-lat-nen';
    return 'gach-lat-nen';
  }
  if (title.includes('Gạch sân vườn')) return 'gach-san-vuon';
  if (title.includes('Gạch ốp tường') && title.includes('30x60')) return 'gach-30x60';
  if (title.includes('Gạch 40x60')) return 'gach-40x60';
  if (title.includes('Gạch 40x80')) return 'gach-40x80';
  if (title.includes('Gạch 50x50')) return 'gach-50x50';
  if (title.includes('Ngói tráng men')) return 'ngoi-trang-men';
  if (title.includes('Ngói sóng')) return 'ngoi-song';
  if (title.includes('Ngói phẳng')) return 'ngoi-phng-t';
  if (title.includes('Ngói Viglacera')) return 'ngoi-viglacera';
  return 'gach';
}

async function scrapeAllProducts() {
  console.log('Fetching main products page...');
  const $mainPage = await fetchPage(PRODUCTS_PAGE);

  if (!$mainPage) {
    console.error('Failed to fetch main page');
    process.exit(1);
  }

  const products = await scrapeProductsPage($mainPage);
  console.log(`Found ${products.length} products on main page`);

  // Scrape all category pages
  for (const category of CATEGORY_PAGES) {
    const categoryUrl = `${BASE_URL}/${category}`;
    console.log(`\nFetching category: ${category}`);

    const $categoryPage = await fetchPage(categoryUrl);

    if ($categoryPage) {
      const categoryProducts = await scrapeProductsPage($categoryPage);
      console.log(`  Found ${categoryProducts.length} products in ${category}`);
      products.push(...categoryProducts);
    }
  }

  // Remove duplicates
  const uniqueProducts = products.filter((product, index, self) =>
    index === self.findIndex(p => p.url === product.url)
  );
  console.log(`\nTotal unique products found: ${uniqueProducts.length}`);

  const allData = {};

  for (let i = 0; i < uniqueProducts.length; i++) {
    const product = uniqueProducts[i];
    const productSlug = product.url.split('/').filter(Boolean).pop();
    console.log(`[${i + 1}/${uniqueProducts.length}] Scraping: ${product.title || product.url}`);

    const $detailPage = await fetchPage(product.url);

    if ($detailPage) {
      const productData = await scrapeProductDetail($detailPage);

      if (productData.title) {
        const filename = productData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        const outputPath = path.join(OUTPUT_DIR, `${filename}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(productData, null, 2), 'utf-8');

        console.log(`  ✓ Saved: ${filename}.json`);

        // Extract category from product title
        const category = determineCategoryFromTitle(productData.title);

        if (!allData[category]) {
          allData[category] = {};
        }

        if (!allData[category][productSlug]) {
          allData[category][productSlug] = productData;
        }
      } else {
        console.log(`  ✗ Skipped: No title found for ${product.url}`);
      }
    } else {
      console.log(`  ✗ Failed to fetch detail page for ${product.url}`);
    }
  }

  // Save the complete JSON tree with proper structure: category -> product
  const treePath = path.join(OUTPUT_DIR, 'products-tree.json');
  fs.writeFileSync(treePath, JSON.stringify(allData, null, 2), 'utf-8');

  // Count categories and products
  const categoryCount = Object.keys(allData).length;
  const productCount = Object.values(allData).reduce((acc, cat) => acc + Object.keys(cat).length, 0);

  console.log('\n✓ All products scraped successfully!');
  console.log(`  - ${uniqueProducts.length} individual product files`);
  console.log(`  - ${categoryCount} categories`);
  console.log(`  - ${productCount} products in JSON tree`);
  console.log(`  - 1 JSON tree file: products-tree.json`);
}

scrapeAllProducts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});