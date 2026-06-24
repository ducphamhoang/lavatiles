# Product Scraper for Hoathanhphat.com.vn

This script scrapes product data from https://www.hoathanhphat.com.vn and organizes it into a structured JSON tree.

## Features

- **Scrapes product detail pages** for all products on the main page
- **Extracts comprehensive data**:
  - Product title
  - Product specifications (code, type, material, size, surface, technology, manufacturer, application, packaging)
  - Product description
  - All images (with full URLs)
  - View count
- **Organizes data** into a category → product structure
- **Saves individual product files** for easy access

## Usage

### Prerequisites

Install dependencies:
```bash
cd script
npm install
```

### Run the scraper

```bash
node scrape-products.js
```

### Generate static product pages

After product JSON files exist in `../data/products/`, generate the static detail pages and listing manifest:

```bash
npm run generate:products
```

Equivalent direct command from the repository root:

```bash
node script/generate-product-pages.js
```

This reads all individual JSON files in `../data/products/`, uses `../templates/product-detail.html`, and writes:

- `../san-pham/gach-op-lat/<category>/<product>.html`
- `../js/generated-products.js`

### Scan missing menu URLs and CTA text

Run a Product Design/QC scan for menu placeholders, broken local menu URLs, icon-only controls, and generic CTA text on menu-linked pages:

```bash
npm run scan:missing-parts
```

Equivalent direct command from the repository root:

```bash
node script/scan-missing-parts.js
```

The report is written to `../tasks/report_07_scan_missing_part.md`.

### Output

The script generates two types of files in `../data/products/`:

1. **Individual product files**: One JSON file per product
   - Filename format: `{product-title}.json`
   - Example: `gch-30x60-viglacera-sh-ce3621v.json`

2. **JSON tree file**: Complete structure organized by category
   - Filename: `products-tree.json`
   - Structure: `category → product → product data`

## Example JSON Structure

```json
{
  "gach": {
    "gach-30x60-viglacera-sh-ce3621v": {
      "title": "Gạch 30x60 Viglacera SH-CE3621V",
      "product_info": {
        "Mã sản phẩm": "SH-CE3621V",
        "Loại sản phẩm": "Gạch ốp lát 30x60",
        "Xương gạch": "Porcelain",
        "Kích thước": "30X60cm",
        "Bề mặt men": "Men Bóng Polish",
        "Công nghệ sản xuất": "ITALIA",
        "Công nghệ in": "Kỹ thuật số",
        "Hãng sản xuất": "Viglacera",
        "Ứng dụng": "Gạch lát nền và Gạch ốp tường",
        "Quy cách đóng gói": "8 viên/hộp",
        "Giá": "Liên hệ",
        "Số lượng": "-\n                        \n                        +",
        "Lượt xem": "1658",
        "Màu sắc và họa tiết": "Vân đá ghi sáng tinh tế và tối giản",
        "Bề mặt": "Men bóng (Polish) dễ vệ sinh, không bám bẩn, không rêu mốc, chống trầy xước hiệu quả",
        "Số điện thoại": "0989 300 979 - 0903 084 892",
        "Email": "info@hoathanhphat.com.vn",
        "Website": "http://hoathanhphat.com.vn"
      },
      "description": "",
      "images": [
        "https://www.hoathanhphat.com.vn/thumbs/130x70x1/upload/photo/anh-post-facebook-hoa-thanh-phat-1-8999.png",
        "https://www.hoathanhphat.com.vn/thumbs/480x381x2/upload/product/shce-3621v-2602.png",
        ...
      ],
      "view_count": 0
    }
  }
}
```

## Categories

The script automatically categorizes products based on their URL structure:
- `gach-30x60` - 30x60 cm tiles
- `gach-san-vuon` - Garden tiles
- `gach-lat-nen` - Floor tiles
- And more...

## Notes

- The script extracts all images from product detail pages and converts them to full URLs
- Product information is extracted from bullet-point lists on the detail pages
- The script handles relative and absolute URLs correctly
- Each product file is saved with a sanitized filename (lowercase, hyphens only)
