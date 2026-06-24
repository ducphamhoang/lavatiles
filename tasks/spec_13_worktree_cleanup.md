# Spec 13: preserve collection foundation and split review batches

## Context

After `tasks/spec_12_fix_collection.md`, the worktree contains both the collection carousel fix and the larger product-data/generated-page foundation needed to support internal collection pages.

The larger product-system change is intentional and should be preserved. The worktree should not be cleaned with `git clean`, `git reset`, or bulk deletion because several untracked directories are required source inputs or generated outputs for the internal collection experience.

## Goal

Create reviewable, non-destructive batches while keeping all collection-foundation work:

1. A minimal collection-routing batch for spec 12.
2. A collection-foundation/product-data batch for canonical products, generated product pages, scraper scripts, and reports.

## Spec 12 collection-routing batch

Include these files or hunks:

- `js/tiles-index.js`
  - Collection cards must use `collection.detailUrl`.
  - Collection cards must not use `collection.sourceUrl`, `target="_blank"`, or external Eurotile/Vasta URLs as navigation targets.
- `san-pham/gach-op-lat/bo-suu-tap.html`
  - Internal collection detail page.
- `js/collection-detail.js`
  - Resolves `source` and `collection` query params.
  - Renders collection title, brand, description, specs, codes, gallery, and related collections from `window.LavatileGeneratedCollections`.
- `css/tiles-index.css`
  - Collection detail page styles and responsive rules.
- `js/generated-collections.js`
  - Generated collection manifest.
  - Each collection should have a local `detailUrl`, for example `bo-suu-tap.html?source=eurotile&collection=an-nien`.
- `data/collections/`
  - Source data required to regenerate `js/generated-collections.js`.
- `san-pham/gach-op-lat/index.html`
  - Include only the hunk that loads `../../js/generated-collections.js` if splitting a clean task-12 commit.
- `script/generate-product-pages.js`
  - Include only collection-manifest generation hunks if splitting a clean task-12 commit.

## Collection-foundation / product baseline batch

Keep separate from the narrow routing patch if clean review batches are desired, but do not delete it. This work supports the local product and collection data model:

- `data/products/**`
- `js/generated-products.js`
- Generated product detail pages under `san-pham/gach-op-lat/*/`
- `js/product-detail.js`
- `js/product-filter.js`
- `js/site-chrome.js`
- `partials/navbar.html`
- `partials/sidenav.html`
- `script/package.json`
- `script/audit-product-dedup.js`
- `script/build-canonical-products.js`
- `script/scrape-new-product-sources.js`
- `tasks/spec_10_verify_pd.md`
- `tasks/spec_11_update_group.md`
- `tasks/report_10_verify_pd.md`
- `tasks/report_11_update_group.md`

## Known risk

Running `script/generate-product-pages.js` rewrites both product outputs and collection outputs because the script now prefers `data/products/canonical` when available. This is expected for the collection foundation, but it means a narrow carousel-routing change and broad generated product output can appear together in one worktree.

Before cleanup, review and preserve `data/products/canonical`, `data/collections`, and the generated product/collection manifests as the intended internal-collection foundation.

## Verification checklist

- `node -c js/tiles-index.js`
- `node -c js/collection-detail.js`
- `node -c script/generate-product-pages.js`
- Confirm generated collection URLs are local:

```sh
node -e "global.window={}; require('./js/generated-collections.js'); const xs=window.LavatileGeneratedCollections; const bad=xs.filter(x=>!x.detailUrl || /^https?:/i.test(x.detailUrl)); console.log(xs.length, bad.length);"
```

Expected result: `124 0`.

## Cleanup rule

Do not delete, reset, or clean untracked files. Treat the product and collection data as intentional unless the user explicitly declares a path disposable.
