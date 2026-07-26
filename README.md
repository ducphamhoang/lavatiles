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
