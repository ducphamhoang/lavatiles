# Lavatiles Website

## PDF → Flipbook Catalogue Pipeline

When adding a new catalogue PDF for the flipbook viewer, follow these steps.

### Prerequisites

- `poppler-utils` (`pdftoppm`, `pdfinfo`, `pdftotext`, `pdfimages`)
- Node.js (`sharp` via `npm install`)
- Python 3 + PIL for product image extraction (brand-specific)

### Step 1: Extract PDF pages as JPEG images

Run the resize script to extract/convert all PDFs to optimized page JPEGs:

```bash
node scripts/resize-catalogue-images.mjs
```

This does two things depending on the catalogue:
- **From PDF directly** (no existing PNGs): runs `pdftoppm -jpeg -r 96 -scale-to 1200` to extract each page as a JPEG
- **From existing PNGs**: resizes `page-NN.png` → `page-NN.jpg` at 1200px wide, quality 82, using `sharp`

Output goes into `assets/pdf/<Catalogue Name>/page-NNN.jpg`.

### Step 2: Register the catalogue in the data layer

Edit `data/catalogues.js` and add an entry:

```js
{
  id: 'my-catalogue',            // unique slug
  title: 'My Catalogue 2026',    // display name
  brand: 'BrandName',            // brand shown in toolbar
  category: 'gach',              // 'gach' | 'thiet-bi-ve-sinh' | 'san-pham-uu-dai'
  pdfUrl: 'assets/pdf/my-catalogue.pdf',
  coverImage: 'assets/images/catalogue/my-cover.jpg',
  basePath: 'assets/pdf/My Catalogue',  // must match directory name
  totalPages: 42,                // must match actual page count
  pageFormat: 'page-{03}.jpg'    // {03}=3-digit pad, {02}=2-digit pad
}
```

The `pageFormat` pattern: `{NN}` where `NN` is the number of zero-padded digits needed (e.g. `{02}` for 2-digit like `page-01.jpg`, `{03}` for 3-digit like `page-001.jpg`).

### Step 3: Add a card on catalogue.html

Add an `<article class="catalogue-card">` inside the appropriate tab panel (`data-catalogue-panel="gach|thiet-bi-ve-sinh|san-pham-uu-dai"`). The "Xem nhanh" button must use `data-flipbook-trigger data-flipbook-id="my-catalogue"`.

### Step 4: Verify

Start the dev server and open `catalogue.html`. Click "Xem nhanh" — the flipbook should open and navigate through all pages.

---

### Product image extraction (brand-specific)

For extracting individual product photos from catalogue PDFs (used on product detail pages):

```bash
# TOTO
python3 scripts/extract-pdf-images.py toto

# INAX
python3 scripts/extract-pdf-images.py inax
```

These scripts use `pdfimages` + `pdftotext` to match product codes with embedded JPEG regions.

---

### Adding a new catalogue (quick reference)

```
1. Copy PDF → assets/pdf/
2. node scripts/resize-catalogue-images.mjs   # extracts/optimizes pages
3. Edit data/catalogues.js                     # register metadata
4. Edit catalogue.html                         # add card with data-flipbook-trigger
```

Verify with `python3 -m http.server 8000` and browse to catalogue.html.

---

## Cloudflare Deployment (Workers Static Assets)

The site is fully static and deploys as-is from the repo root — there is no build step. Target
Workers, not Pages (Pages is maintenance-mode and new static sites are steered to Workers).

### One-time setup

```bash
npx wrangler login
npx wrangler r2 bucket create lavatiles-catalogue-pdfs
```

### Deploy

```bash
node scripts/build-assetsignore.mjs    # regenerate the asset excludes
bash scripts/upload-catalogue-pdfs.sh  # push the >25 MiB catalogue PDFs to R2
npx wrangler deploy
```

### How it is wired

- `assets.directory` is the repo root, so `.assetsignore` (generated) decides what ships —
  **~11.9k files** instead of 21.7k. Re-run `build-assetsignore.mjs` whenever pages are
  regenerated: the excluded image list is derived from the pages' own `<img>` references.
- Limits that shape this setup: **20,000 assets/version on Free** (100,000 on Paid, needs
  wrangler ≥ 4.34.0) and **25 MiB per individual file on all plans**.
- `worker/index.js` covers the two things static assets cannot do:
  1. serves `/assets/pdf/*` from R2 — those catalogue PDFs exceed the 25 MiB per-asset limit
     and are excluded from the deploy;
  2. maps `/` and `/dir/` onto `index.html`. `html_handling` is `"none"` so the existing
     `.html` URLs are preserved with **no redirects** — Workers stops resolving directory
     roots in that mode, so the root would otherwise 404.
- `worker/` must stay in `.assetsignore`: the Worker source sits inside the assets directory
  and would otherwise be uploaded and publicly readable.

### Verifying a deploy

```bash
B=https://<your-worker>.workers.dev
curl -s -o /dev/null -w '%{http_code}\n' "$B/"                     # 200
curl -s -o /dev/null -w '%{http_code}\n' "$B/bo-suu-tap-moi.html"  # 200, no redirect
curl -s -o /dev/null -w '%{http_code}\n' "$B/assets/pdf/GA%2BAT%20SQ.pdf"  # 200 from R2
```

Cloudflare caches the asset-level redirects, so immediately after changing `html_handling` a
probe can still show the previous behaviour — re-test with a cache-busting query string.
