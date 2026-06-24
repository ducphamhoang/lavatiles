# Spec 10: product-data deduplication decision

Source: `tasks/spec_10_verify_pd.md`.

## Recommendation

Use a canonical product registry plus deterministic duplicate detection, with a small manual-review queue for ambiguous records.

Do not delete duplicates directly from the scraped folders, and do not build a full knowledge graph yet. The scraped folders should remain raw source snapshots. The site should later consume a curated canonical layer that decides which source wins for each SKU and which records are collections.

## Why this is the best fit

- Exact SKU matching already catches real duplicates. Example: `VBS4605` in the current data and `VBS 4605` from Viglacera Tiles refer to the same product.
- Most duplicates are product identity problems, not relationship-discovery problems. A knowledge graph would add more machinery before the site has enough curated data to benefit from it.
- The risky records are not all duplicates. Eurotile and Vasta Stone pages are often collection or surface/slab pages, so importing them as product pages would distort the current product structure.
- Manual review is still needed, but only for bounded batches: exact SKU overlaps can be auto-merged, while weak title/category matches can be reviewed in chunks of 100.

## Audit snapshot

| Dataset | Records |
| --- | ---: |
| Current root `data/products/*.json` | 110 |
| New scraped records total | 1974 |
| Viglacera Tiles official | 1850 |
| Eurotile official | 90 |
| Vasta Stone official | 34 |
| SKU duplicate groups across any source | 111 |
| Current-data SKU overlaps with new sources | 58 |
| Cross-official-source SKU overlaps | 0 |
| Same-new-source SKU duplicate groups | 52 |
| New product records with no current SKU overlap | 1716 |
| Collection-like records | 124 |
| Product records needing SKU review | 73 |

## Collection mapping

The current generated website uses product files as individual product detail pages and currently uses `collection` mostly as a listing/category label. The new sources need one more concept:

- Product: one SKU or sellable tile item, for example `VBS4605`.
- Collection: a design family or slab/series page, for example Eurotile `Thạch An` or Vasta Stone `Amazonite`.
- Category: browse taxonomy such as `Gạch lát nền`, `Gạch 40x60`, `Đá nung kết / tấm lớn`.

Recommended future structure:

- Keep raw snapshots in `data/products/viglaceratiles`, `data/products/eurotile`, and `data/products/vastastone`.
- Add curated product records under the current product pipeline only after dedupe.
- Add curated collections separately, for example `data/collections/{brand}/{collection-slug}.json`.
- Let canonical products reference collections with fields like `brand`, `collectionSlug`, `collectionName`, and `sourceRefs`.

## Merge policy

| Case | Action |
| --- | --- |
| Same normalized SKU across current and official source | Merge into one canonical product. Prefer official source for specs/images, preserve current category/page slug if already published. |
| Same normalized SKU across official sources | Merge source references, then choose the brand owner as primary source. |
| Same normalized SKU repeated inside one new source | Keep one canonical product, retain all source URLs as source references, and mark the extra raw files as ignored. |
| Official SKU not in current data | Candidate new product. Import only after category and image quality checks. |
| Eurotile or Vasta collection page | Create/update collection record, not a product page, unless it exposes a clear individual SKU variant. |
| Title-only or weak match | Manual review queue in chunks of 100. Do not auto-delete. |

## Sample exact SKU overlaps

| SKU key | Sources | Records | Sizes |
| --- | --- | --- | --- |
| BS506 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch sân vườn 50x50 Viglacera BS506 (data/products/gch-sn-vn-50x50-viglacera-bs506.json)<br>BS506 (data/products/viglaceratiles/bs506-1.json)<br>BS506 (data/products/viglaceratiles/bs506.json) | 50×50 cm<br>50 x 50 cm |
| MDK662017 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x60 Viglacera MDK662017 (data/products/gch-lt-nn-60x60-viglacera-mdk662017.json)<br>MDK 662017 (data/products/viglaceratiles/mdk-662017.json)<br>MDK662017 (data/products/viglaceratiles/mdk662017.json) | 60x60cm<br>60 x 60 cm |
| MDK662021 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x60 Viglacera MDK662021 (data/products/gch-lt-nn-60x60-viglacera-mdk662021.json)<br>MDK 662021 (data/products/viglaceratiles/mdk-662021.json)<br>MDK662021 (data/products/viglaceratiles/mdk662021.json) | 60x60cm<br>60 x 60 cm |
| BS503 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch sân vườn 50x50 Viglacera BS503 (data/products/gch-sn-vn-50x50-viglacera-bs503.json)<br>BS503 (data/products/viglaceratiles/bs503.json) | 50×50 cm<br>50 x 50 cm |
| BS505 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch sân vườn 50x50 Viglacera BS505 (data/products/gch-sn-vn-50x50-viglacera-bs505.json)<br>BS505 (data/products/viglaceratiles/bs505.json) | 50×50 cm<br>50 x 50 cm |
| BS507 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch sân vườn 50x50 Viglacera BS507 (data/products/gch-sn-vn-50x50-viglacera-bs507.json)<br>BS507 (data/products/viglaceratiles/bs507.json) | 50×50 cm<br>50 x 50 cm |
| BS508 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch sân vườn 50x50 Viglacera BS508 (data/products/gch-sn-vn-50x50-viglacera-bs508.json)<br>BS508 (data/products/viglaceratiles/bs508.json) | 50×50 cm<br>50 x 50 cm |
| BS509 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch sân vườn 50x50 Viglacera BS509 (data/products/gch-sn-vn-50x50-viglacera-bs509.json)<br>BS509 (data/products/viglaceratiles/bs509.json) | 50×50 cm<br>50 x 50 cm |
| BS513 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch sân vườn 50x50 Viglacera BS513 (data/products/gch-sn-vn-50x50-viglacera-bs513.json)<br>BS513 (data/products/viglaceratiles/bs513.json) | 50×50 cm<br>50 x 50 cm |
| MDK662018 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x60 Viglacera MDK662018 (data/products/gch-lt-nn-60x60-viglacera-mdk662018.json)<br>MDK 662018 (data/products/viglaceratiles/mdk-662018.json) | 60x60cm<br>60 x 60 cm |
| MDK662019 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x60 Viglacera MDK662019 (data/products/gch-lt-nn-60x60-viglacera-mdk662019.json)<br>MDK 662019 (data/products/viglaceratiles/mdk-662019.json) | 60x60cm<br>60 x 60 cm |
| SH10GM61201 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x120 Viglacera SH10_GM61201 (data/products/gch-lt-nn-60x120-viglacera-sh10gm61201.json)<br>SH10-GM61201 (data/products/viglaceratiles/sh10-gm61201.json) | 60x120cm |
| SH10GM61203 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x120 Viglacera SH10_GM61203 (data/products/gch-lt-nn-60x120-viglacera-sh10gm61203.json)<br>SH10-GM61203 (data/products/viglaceratiles/sh10-gm61203.json) | 60x120cm |
| SH11GM61201 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x120 Viglacera SH11_GM61201 (data/products/gch-lt-nn-60x120-viglacera-sh11gm61201.json)<br>SH11-GM61201 (data/products/viglaceratiles/sh11-gm61201.json) | 60x120cm<br>60x120 cm |
| SH11GM61203 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x120 Viglacera SH11_GM61203 (data/products/gch-lt-nn-60x120-viglacera-sh11gm61203.json)<br>SH11-GM61203 (data/products/viglaceratiles/sh11-gm61203.json) | 60x120cm<br>60x120 cm |
| SH12GP61201 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x120 Viglacera SH12_GP61201 (data/products/gch-lt-nn-60x120-viglacera-sh12gp61201.json)<br>SH12-GP61201 (data/products/viglaceratiles/sh12-gp61201.json) | 60x120cm<br>60x120 cm |
| SH12GP61203 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 60x120 Viglacera SH12_GP61203 (data/products/gch-lt-nn-60x120-viglacera-sh12gp61203.json)<br>SH12-GP61203 (data/products/viglaceratiles/sh12-gp61203.json) | 60x120cm<br>60x120 cm |
| SH1GP8801 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 80x80 Viglacera SH1-GP8801 (data/products/gch-lt-nn-80x80-viglacera-sh1-gp8801.json)<br>SH1-GP8801 (data/products/viglaceratiles/sh1-gp8801.json) | 80x80cm<br>80 x 80 cm |
| SH1P121201 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch lát nền 120x120 Viglacera SH1-P121201 (data/products/gch-lt-nn-120x120-viglacera-sh1-p121201.json)<br>SH1-P121201 (data/products/viglaceratiles/sh1-p121201.json) | 120X120cm<br>120x120 cm |
| SH2GP4803 | Current Hoathanhphat data<br>Viglacera Tiles official | Gạch 40x80 Viglacera SH2-GP4803 (data/products/gch-40x80-viglacera-sh2-gp4803.json)<br>SH2-GP4803 (data/products/viglaceratiles/sh2-gp4803.json) | 40x80cm<br>40 x 80 cm |

## Sample same-source duplicates in new data

| SKU key | Sources | Records | Sizes |
| --- | --- | --- | --- |
| CLSM606 | Viglacera Tiles official | CL-SM606 (data/products/viglaceratiles/cl-sm606-1.json)<br>CL-SM606 (data/products/viglaceratiles/cl-sm606-2.json)<br>CL-SM606 (data/products/viglaceratiles/cl-sm606.json) | 60 x 60 cm |
| CBL636 | Viglacera Tiles official | CB L636 (data/products/viglaceratiles/cb-l636-1.json)<br>CB-L636 (data/products/viglaceratiles/cb-l636.json) | 60x60cm<br>60 x 60 cm |
| CBP3606 | Viglacera Tiles official | CB-P3606 (data/products/viglaceratiles/cb-p3606-1.json)<br>CB-P3606 (data/products/viglaceratiles/cb-p3606.json) | 30x60cm<br>30 x 60 cm |
| CBPT61202 | Viglacera Tiles official | CB-PT61202 (data/products/viglaceratiles/cb-pt61202-1.json)<br>CB-PT61202 (data/products/viglaceratiles/cb-pt61202.json) | 60x120cm<br>60 x 120 cm |
| CL1GP8801 | Viglacera Tiles official | CL1-GP8801 (data/products/viglaceratiles/cl1-gp8801-1.json)<br>CL1-GP8801 (data/products/viglaceratiles/cl1-gp8801.json) | 80x80 cm<br>80 x 80 cm |
| CLCE508 | Viglacera Tiles official | CL-CE508 (data/products/viglaceratiles/cl-ce508-1.json)<br>CL-CE508 (data/products/viglaceratiles/cl-ce508.json) | 50 x 50 cm |
| CLSM3601 | Viglacera Tiles official | CL-SM3601 (data/products/viglaceratiles/cl-sm3601-1.json)<br>CL-SM3601 (data/products/viglaceratiles/cl-sm3601.json) | 30 x 60 cm |
| ECOB3604 | Viglacera Tiles official | ECOB3604 (data/products/viglaceratiles/ecob3604-1.json)<br>ECOB3604 (data/products/viglaceratiles/ecob3604.json) | 30 x 60 cm |
| ECOM601 | Viglacera Tiles official | ECOM601 (data/products/viglaceratiles/ecom601-1.json)<br>ECOM601 (data/products/viglaceratiles/ecom601.json) | 60 x 60 cm |
| ECOM621 | Viglacera Tiles official | ECOM621 (data/products/viglaceratiles/ecom621-1.json)<br>ECOM621 (data/products/viglaceratiles/ecom621.json) | 60 x 60 cm |
| ECOM622 | Viglacera Tiles official | ECOM622 (data/products/viglaceratiles/ecom622-1.json)<br>ECOM622 (data/products/viglaceratiles/ecom622.json) | 60 x 60 cm |
| ECOM625 | Viglacera Tiles official | ECOM625 (data/products/viglaceratiles/ecom625-1.json)<br>ECOM625 (data/products/viglaceratiles/ecom625.json) | 60 x 60 cm |
| ECOM6911 | Viglacera Tiles official | ECOM6911 (data/products/viglaceratiles/ecom6911-1.json)<br>ECOM6911 (data/products/viglaceratiles/ecom6911.json) | 60 x 60 cm |
| ECOM6914 | Viglacera Tiles official | ECOM6914 (data/products/viglaceratiles/ecom6914-1.json)<br>ECOM6914 (data/products/viglaceratiles/ecom6914.json) | 60 x 60 cm |
| ECOS822 | Viglacera Tiles official | ECOS822 (data/products/viglaceratiles/ecos822-1.json)<br>ECOS822 (data/products/viglaceratiles/ecos822.json) | 80 x 80 cm |
| GT15902 | Viglacera Tiles official | GT 15902 (data/products/viglaceratiles/gt-15902-1.json)<br>GT 15902 (data/products/viglaceratiles/gt-15902.json) | 15 x 90 cm |
| GT15903 | Viglacera Tiles official | GT 15903 (data/products/viglaceratiles/gt-15903-1.json)<br>GT 15903 (data/products/viglaceratiles/gt-15903.json) | 15 x 90 cm |
| GT15904 | Viglacera Tiles official | GT 15904 (data/products/viglaceratiles/gt-15904-1.json)<br>GT 15904 (data/products/viglaceratiles/gt-15904.json) | 15 x 90 cm |
| GT15905 | Viglacera Tiles official | GT 15905 (data/products/viglaceratiles/gt-15905-1.json)<br>GT 15905 (data/products/viglaceratiles/gt-15905.json) | 15 x 90 cm |
| GT15906 | Viglacera Tiles official | GT 15906 (data/products/viglaceratiles/gt-15906.json)<br>GT15906 (data/products/viglaceratiles/gt15906.json) | 15 x 90 cm |

## Implementation plan

1. Keep the scraped folders immutable as raw source data.
2. Generate an audit file from raw data with normalized SKU keys, title keys, source URLs, and candidate duplicate groups.
3. Build `data/products/canonical-products.json` or equivalent normalized product files from reviewed groups.
4. Build `data/collections/` for Eurotile and Vasta collection records.
5. Update `script/generate-product-pages.js` only after the canonical layer exists, so generated pages come from curated products instead of raw scrape folders.

## Local audit tool

Run:

```sh
cd script
npm run audit:product-dedup
```

This rewrites `tasks/report_10_verify_pd.md` with the latest local counts.
