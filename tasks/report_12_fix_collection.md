# Report 12: fix collection carousel routing

Source: `tasks/spec_12_fix_collection.md`.

## Decision

The collection carousel on `san-pham/gach-op-lat/index.html` should route users to Lavatile internal collection pages, not external Eurotile or Vasta source URLs.

This is now implemented as part of the internal collection foundation committed in `bd04a2e`.

## What changed

- `js/tiles-index.js` renders collection cards with `collection.detailUrl`.
- `js/tiles-index.js` no longer uses `collection.sourceUrl`, `target="_blank"`, or external collection URLs for carousel navigation.
- `san-pham/gach-op-lat/bo-suu-tap.html` provides the internal collection detail route.
- `js/collection-detail.js` renders collection title, brand, description, specs, product codes, gallery, and related collections from `window.LavatileGeneratedCollections`.
- `script/generate-product-pages.js` emits `js/generated-collections.js` with local `detailUrl` values.
- `data/collections/` provides the collection source records used by the generated collection manifest.

## Verification

Commands:

```sh
node -c js/tiles-index.js
node -c js/collection-detail.js
node -c script/generate-product-pages.js
```

Collection URL invariant:

```sh
node -e "global.window={}; require('./js/generated-collections.js'); const xs=window.LavatileGeneratedCollections; const bad=xs.filter(x=>!x.detailUrl || /^https?:/i.test(x.detailUrl)); console.log(xs.length, bad.length);"
```

Result:

```text
124 0
```

Browser checks were performed against:

- `http://localhost:8001/san-pham/gach-op-lat/index.html`
- `http://localhost:8001/san-pham/gach-op-lat/bo-suu-tap.html?source=eurotile&collection=an-nien`

The collection detail page rendered correctly on mobile after reveal animations settled.
