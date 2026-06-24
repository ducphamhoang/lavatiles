# Spec 11: reflect canonical products on website

Source: `tasks/spec_11_update_group.md`.

## Decision

The website should consume the canonical product layer instead of the old root product JSON files whenever `data/products/canonical/products-tree.json` exists.

The canonical layer is now reflected through:

- `js/generated-products.js`: 1,772 canonical products.
- `js/generated-collections.js`: 124 Eurotile/Vasta collection records.
- `san-pham/gach-op-lat/index.html`: data-backed filter groups and collection slider.
- Shared header/footer tile links: direct filtered catalogue links for the canonical groups.

## What changed

- `script/generate-product-pages.js` now prefers `data/products/canonical/` and emits product facets.
- Product filters are generated from real manifest facets instead of only the old seven hard-coded groups.
- Query parameters can preselect filters, for example:
  - `san-pham/gach-op-lat/index.html?category=bst-song-hong#pd-filters`
  - `san-pham/gach-op-lat/index.html?category=porcelain-kho-lon#pd-filters`
- The tile menu now links to canonical groups:
  - Porcelain khổ lớn
  - Bộ sưu tập Platinum
  - United Tiles
  - BST Sông Hồng
  - BST Cửu Long
  - Sản phẩm khác
- The collection slider now renders from `window.LavatileGeneratedCollections`.

## Generated output

Running `npm run generate:products` produced:

| Output | Count |
| --- | ---: |
| Product detail pages | 1,772 |
| `window.LavatileGeneratedProducts` records | 1,772 |
| `window.LavatileGeneratedCollections` records | 124 |
| Dynamic product categories | 13 |
| Products without images | 89 |
| Products without explicit SKU | 0 |

## Verification

Commands:

```sh
cd script
npm run generate:products
```

```sh
node -c script/generate-product-pages.js
node -c js/product-detail.js
node -c js/product-filter.js
node -c js/tiles-index.js
node -c js/site-chrome.js
```

Browser checks:

- `http://localhost:8001/san-pham/gach-op-lat/index.html`
- `http://localhost:8001/san-pham/gach-op-lat/index.html?category=bst-song-hong#pd-filters`

The filtered URL selected `BST Sông Hồng` and showed 200 matching products.
