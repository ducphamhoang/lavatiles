# Product Data from Hoathanhphat.com.vn

This directory contains scraped product data from https://www.hoathanhphat.com.vn.

## Data Structure

### Files

1. **`products-tree.json`** - Complete JSON tree with all products organized by category
2. **Individual product files** - One JSON file per product (e.g., `gch-30x60-viglacera-sh-ce3621v.json`)

### Current Data

- **Total products**: 110
- **Categories**: 7
- **Last updated**: 2026-06-22

### Categories

| Category | Description | Product Count |
|----------|-------------|---------------|
| `gach-lat-nen` | Gạch lát nền (Floor tiles) | 57 |
| `gach-san-vuon` | Gạch sân vườn (Garden tiles) | 8 |
| `ngoi-phng-t` | Ngói phẳng (Flat tiles) | 10 |
| `ngoi-song` | Ngói sóng (Wavy tiles) | 5 |
| `gach-40x80` | Gạch 40x80 cm | 12 |
| `gach-40x60` | Gạch 40x60 cm | 6 |
| `gach` | Gạch general | 12 |

## Example JSON Structure

```json
{
  "gach-lat-nen": {
    "viglacera-gp601": {
      "title": "Gạch lát nền 60x60 Viglacera GP601",
      "product_info": {
        "Mã sản phẩm": "GP601",
        "Loại sản phẩm": "Gạch ốp lát 60x60",
        "Kích thước": "60x60cm",
        "Giá": "Liên hệ",
        "Thương hiệu": "Viglacera"
      },
      "description": "",
      "images": [
        "https://www.hoathanhphat.com.vn/thumbs/480x381x2/upload/product/a-1-3-9725.jpg",
        "https://www.hoathanhphat.com.vn/thumbs/277x220x2/upload/product/1-4562.png"
      ],
      "view_count": 1517
    }
  }
}
```

## Usage Examples

### 1. Access Data in JavaScript

```javascript
const products = require('./data/products/products-tree.json');

// Access a specific category
const gachLatNen = products['gach-lat-nen'];
console.log(`Found ${Object.keys(gachLatNen).length} products in gach-lat-nen category`);

// Get all products
const allProducts = Object.values(products).reduce((acc, category) => {
  return acc + Object.keys(category).length;
}, 0);
console.log(`Total products: ${allProducts}`);
```

### 2. Add Products to Database

```javascript
const products = require('./data/products/products-tree.json');

Object.entries(products).forEach(([category, categoryProducts]) => {
  Object.entries(categoryProducts).forEach(([slug, product]) => {
    const productToSave = {
      name: product.title,
      category: category,
      sku: product.product_info['Mã sản phẩm'],
      size: product.product_info['Kích thước'],
      price: product.product_info['Giá'],
      images: product.images,
      specs: product.product_info,
      description: product.description,
      url: `https://www.hoathanhphat.com.vn/${slug}`
    };

    // Save to database...
    console.log(`Saving: ${productToSave.name}`);
  });
});
```

### 3. Create HTML Page for Products

```javascript
const fs = require('fs');
const products = JSON.parse(
  fs.readFileSync('./data/products/products-tree.json', 'utf-8')
);

let html = '';
Object.entries(products).forEach(([category, categoryProducts]) => {
  html += `<h2>${category}</h2>`;
  html += '<div class="product-grid">';

  Object.entries(categoryProducts).forEach(([slug, product]) => {
    html += `
      <div class="product-card">
        <img src="${product.images[0]}" alt="${product.title}">
        <h3>${product.title}</h3>
        <p>${product.product_info['Giá']}</p>
        <a href="${product.url}">View Details</a>
      </div>
    `;
  });

  html += '</div>';
});

fs.writeFileSync('products.html', html);
```

### 4. Create CSV File for Excel

```javascript
const fs = require('fs');
const products = require('./data/products/products-tree.json');

let csv = 'Category,Name,SKU,Size,Price,URL\n';

Object.entries(products).forEach(([category, categoryProducts]) => {
  Object.entries(categoryProducts).forEach(([slug, product]) => {
    const row = [
      category,
      product.title,
      product.product_info['Mã sản phẩm'],
      product.product_info['Kích thước'],
      product.product_info['Giá'],
      `https://www.hoathanhphat.com.vn/${slug}`
    ].join(',');
    csv += row + '\n';
  });
});

fs.writeFileSync('products.csv', csv);
console.log('CSV file created!');
```

### 5. Use with Next.js/React

```javascript
// lib/products.js
export async function getProducts() {
  const products = require('../data/products/products-tree.json');
  return products;
}

// In a page component
import { getProducts } from '@/lib/products';

export default function ProductsPage() {
  const products = getProducts();

  return (
    <div>
      {Object.entries(products).map(([category, items]) => (
        <div key={category}>
          <h2>{category}</h2>
          {Object.entries(items).map(([slug, product]) => (
            <ProductCard key={slug} product={product} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

### 6. Convert to API Format

```javascript
const products = require('./data/products/products-tree.json');

const apiFormat = Object.entries(products).map(([category, items]) => ({
  category,
  products: Object.entries(items).map(([slug, product]) => ({
    slug,
    name: product.title,
    code: product.product_info['Mã sản phẩm'],
    images: product.images,
    specifications: product.product_info,
    url: `https://www.hoathanhphat.com.vn/${slug}`
  }))
}));

console.log(JSON.stringify(apiFormat, null, 2));
```

## Data Fields

Each product contains:

- `title`: Product name
- `product_info`: Object with specifications (code, size, price, manufacturer, etc.)
- `description`: Product description
- `images`: Array of image URLs
- `view_count`: Number of times product was viewed

## Product Information Fields

Common fields in `product_info`:
- `Mã sản phẩm`: Product code/SKU
- `Loại sản phẩm`: Product type
- `Kích thước`: Size
- `Giá`: Price
- `Hãng sản xuất`: Manufacturer
- `Xương gạch`: Material
- `Bề mặt`: Surface type
- `Ứng dụng`: Application
- `Quy cách đóng gói`: Packaging

## Regenerating Data

To scrape the latest data from the website:

```bash
cd ../script
npm install
node scrape-products.js
```

See `../script/README.md` for more details about the scraper.

## License

This data is scraped from hoathanhphat.com.vn and is provided as-is for use in your projects.