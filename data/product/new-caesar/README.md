# Caesar Product Data

Generated from `https://caesar.com.vn/vi/san-pham` with:

```bash
node scripts/crawl-caesar.js
```

`categories.json` contains the nested catalogue categories. `products-tree.json`
uses the existing category -> product structure. Product `images` are paths
relative to this directory; `image_sources` preserves the original URLs.
`description_html` retains page markup with downloaded inline images rewritten
to local paths, and `videos` contains extracted product-page embeds.

Some source CDN URLs currently return 404; those are listed in
`crawl-report.json` and remain in `image_sources` without a local file.
