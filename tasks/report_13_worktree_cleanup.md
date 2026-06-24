# Report 13: collection foundation worktree split

Source: `tasks/spec_13_worktree_cleanup.md`.

## Decision

Do not clean the worktree destructively yet.

The current worktree contains:

- A small collection-routing fix for `tasks/spec_12_fix_collection.md`.
- A much larger canonical product and collection-data foundation that is needed to support internal collection pages.

Because these are mixed in both tracked and untracked files, `git clean`, `git reset`, and broad deletion are not appropriate. The large product-system change is intentional and should be preserved unless the user explicitly says a path is disposable.

Follow-up decision: keep the foundation as one coherent feature batch. The product data, generated product pages, collection data, generated manifests, filters/navigation, and local collection-detail route are part of the same internal collection foundation.

## Current counts

Tracked modified files:

| Group | Count |
| --- | ---: |
| Modified tracked files | 88 |

Untracked source/generated data:

| Path | Count |
| --- | ---: |
| `data/collections/` | 125 |
| `data/products/canonical/` | 1,774 |
| `data/products/eurotile/` | 91 |
| `data/products/vastastone/` + `data/products/viglaceratiles/` | 1,886 |

Untracked generated product pages:

| Path | Count |
| --- | ---: |
| `san-pham/gach-op-lat/san-pham-khac/` | 900 |
| `san-pham/gach-op-lat/united-tiles-1/` | 281 |
| `san-pham/gach-op-lat/bst-song-hong/`, `bst-cuu-long/`, `bo-suu-tap-platinum/`, `porcelain-kho-lon/` | 482 |

## Narrow collection-routing files

These files are directly part of the internal collection page and route behavior and can be reviewed together:

- `san-pham/gach-op-lat/bo-suu-tap.html`
- `js/collection-detail.js`
- `css/tiles-index.css`
- `js/generated-collections.js`
- `data/collections/`
- `tasks/spec_12_fix_collection.md`
- `tasks/spec_13_worktree_cleanup.md`
- `tasks/report_13_worktree_cleanup.md`

## Mixed files

These files contain collection-fix hunks, but also include broader collection-foundation/product-baseline work when compared to `HEAD`:

- `js/tiles-index.js`
  - Current worktree needs the `collection.detailUrl` routing.
  - Diff against `HEAD` also includes the generated collection carousel renderer, which is part of the foundation for internal collections.
- `san-pham/gach-op-lat/index.html`
  - Current worktree needs `../../js/generated-collections.js`.
  - Diff against `HEAD` also includes canonical product filter markup changes.
- `script/generate-product-pages.js`
  - Current worktree needs collection-manifest output.
  - Diff against `HEAD` also includes canonical product source selection, product facets, product image normalization, category mapping, and generated-products changes.

These should be staged together if the goal is one internal-collection foundation commit. If the goal is a narrow task-12 commit, split-staging is needed.

## Collection-foundation / product-baseline batch

Keep these together as the product-system foundation for internal collections:

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

## Verification performed

Collection manifest local URL invariant:

```sh
node -e "global.window={}; require('./js/generated-collections.js'); const xs=window.LavatileGeneratedCollections; const bad=xs.filter(x=>!x.detailUrl || /^https?:/i.test(x.detailUrl)); console.log(xs.length, bad.length);"
```

Result:

```text
124 0
```

## Recommended next actions

1. Stage and review one foundation batch.
2. Keep all product/collection data, generator changes, manifests, generated product pages, filters/navigation, and local collection route together.
3. Only clean leftovers after this batch is accepted and a path is explicitly declared disposable.
