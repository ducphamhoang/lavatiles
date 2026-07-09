#!/usr/bin/env python3
"""
extract-pdf-images.py — Universal PDF product image extractor.

Uses embedded JPEG positions mapped by text code positions using pdftotext -layout.

Usage: python3 scripts/extract-pdf-images.py <toto|inax>
"""

import subprocess, os, json, re, sys
from collections import defaultdict

IMPLE = {
    'toto': {
        'pdf': 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén.pdf',
        'catalogue': 'data/products/catalogue-toto-2026.json',
        'img_dir': 'assets/images/products/toto',
        'pages': (1, 186),
        'intro_pages': 30,
    },
    'inax': {
        'pdf': 'assets/pdf/INAX-CATALOGUE-01.04.2026.pdf',
        'catalogue': 'data/products/catalogue-inax-2026.json',
        'img_dir': 'assets/images/products/inax',
        'pages': (1, 107),
        'intro_pages': 4,
    },
}

def slug_codes(data):
    """Extract primary code and all sub-codes per slug."""
    result = {}
    for cat, products in data.items():
        for slug, p in products.items():
            code = p['product_info'].get('Mã sản phẩm', '').upper()
            # Get primary code (first meaningful code)
            primary = re.split(r'[\s\+/]+', code.strip())[0].strip()
            # Get all individual codes for matching
            parts = set()
            for sep in [r'\s\+\s', r'\+', r'\s*/\s*', r'\s+']:
                for part in re.split(sep, code.strip()):
                    part = part.strip().upper()
                    if part and any(c.isdigit() for c in part) and any(c.isalpha() for c in part):
                        parts.add(part)
            result[slug] = (primary, code, list(parts))
    return result


def get_page_jpegs(pdf, page):
    """Get product-sized JPEGs from a page."""
    r = subprocess.run(['pdfimages', '-list', '-f', str(page), '-l', str(page), pdf],
                       capture_output=True, text=True, timeout=30)
    images = []
    for line in r.stdout.split('\n'):
        parts = line.strip().split()
        if len(parts) < 14 or not parts[0].isdigit():
            continue
        if parts[2] == 'smask' or parts[8] != 'jpeg':
            continue
        num, w, h = int(parts[1]), int(parts[3]), int(parts[4])
        if w < 140 or h < 140 or max(w, h) / max(min(w, h), 1) > 3:
            continue
        images.append({'num': num, 'width': w, 'height': h})
    images.sort(key=lambda x: x['num'])
    return images


def get_page_text_bbox(pdf, page):
    """Get text with bounding boxes using pdftotext -layout."""
    r = subprocess.run(['pdftotext', '-layout',
                        '-f', str(page), '-l', str(page), pdf, '-'],
                       capture_output=True, text=True, timeout=30)
    return r.stdout.split('\n')


def extract(brand):
    cfg = IMPLE[brand]
    pdf = cfg['pdf']
    catalogue_path = cfg['catalogue']
    img_dir = cfg['img_dir']
    start_page, end_page = cfg['pages']
    intro_pages = cfg['intro_pages']
    
    os.makedirs(img_dir, exist_ok=True)
    data = json.load(open(catalogue_path, 'r'))
    info = slug_codes(data)
    
    TMP = '/tmp/pdf-extract'
    os.makedirs(TMP, exist_ok=True)
    
    assigned = 0
    errors = 0
    
    # Strategy: for each page with embedded JPEGs, match text codes to images
    # by comparing vertical position order.
    
    for page in range(start_page, end_page + 1):
        jpegs = get_page_jpegs(pdf, page)
        if not jpegs:
            continue
        
        lines = get_page_text_bbox(pdf, page)
        text_upper = '\n'.join(lines).upper()
        
        # Find which products are mentioned on this page
        page_slugs = []  # (slug, line_index, priority)
        for slug, (primary, full_code, parts) in info.items():
            for part in parts:
                if part in text_upper:
                    # Check occurrence and position
                    for i, line in enumerate(lines):
                        if part in line.upper():
                            # Score: 1 for any mention with dimensions/price nearby
                            nearby = ' '.join(lines[max(0,i-2):min(len(lines),i+3)])
                            has_context = ('000' in nearby and 'Đ' in nearby) or \
                                          'MM' in nearby or \
                                          any(c.isdigit() for c in line.strip()[:3])
                            priority = 2 if has_context else 1
                            page_slugs.append((slug, i, priority, part, full_code))
                            break
                    break  # Only one part needed per slug
        
        if not page_slugs:
            continue
        
        # Deduplicate: keep best occurrence per slug
        slug_best = {}
        for slug, line_idx, priority, matched_part, full_code in page_slugs:
            if slug not in slug_best or priority > slug_best[slug][1]:
                slug_best[slug] = (line_idx, priority, matched_part, full_code)
        
        # Sort by line position (top-to-bottom on page)
        sorted_slugs = sorted(slug_best.items(), key=lambda x: x[1][0])
        
        # If we have roughly the same number of JPEGs as products, do positional mapping
        n_jpegs = len(jpegs)
        n_products = len(sorted_slugs)
        
        if n_products == 0:
            continue
        
        print(f'  Page {page:3d}: {n_jpegs} JPEGs, {n_products} products', end='')
        
        # Extract JPEGs
        subprocess.run(['pdfimages', '-j', '-f', str(page), '-l', str(page),
                        pdf, f'{TMP}/p{page}'],
                       capture_output=True, text=True, timeout=30)
        
        page_ok = 0
        for i, (slug, (line_idx, priority, matched_part, full_code)) in enumerate(sorted_slugs):
            # Map position to JPEG index
            # For <=3 products, use direct index (first JPEG = first product)
            if n_products <= n_jpegs and n_products <= 6:
                jpeg_idx = min(i, n_jpegs - 1)
            else:
                # Position-based: map line position to JPEG position
                pos = line_idx / max(len(lines), 1)
                jpeg_idx = min(int(pos * n_jpegs), n_jpegs - 1)
            
            src = f'{TMP}/p{page}-{jpegs[jpeg_idx]["num"]:03d}.jpg'
            if os.path.exists(src):
                with open(src, 'rb') as f_in:
                    with open(f'{img_dir}/{slug}.jpg', 'wb') as f_out:
                        f_out.write(f_in.read())
                for cat in data.values():
                    if slug in cat:
                        cat[slug]['images'] = [f'/assets/images/products/{brand}/{slug}.jpg']
                page_ok += 1
                assigned += 1
        
        print(f' → {page_ok} OK')
        
        # Cleanup
        for f in os.listdir(TMP):
            if f.startswith(f'p{page}'):
                os.remove(os.path.join(TMP, f))
    
    # Save catalogue
    json.dump(data, open(catalogue_path, 'w'), indent=2, ensure_ascii=False)
    
    # Stats
    missing = []
    for cat in data.values():
        for slug, p in cat.items():
            if not p.get('images'):
                missing.append(slug)
    
    print(f'\n=== {brand.upper()} Results ===')
    print(f'Assigned: {assigned}/{sum(len(cat) for cat in data.values())}')
    print(f'Errors: {errors}')
    if missing:
        print(f'Missing ({len(missing)}): {missing[:20]}')
    else:
        print('All products have images ✓')
    
    import shutil
    shutil.rmtree(TMP, ignore_errors=True)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python3 scripts/extract-pdf-images.py <toto|inax>')
        sys.exit(1)
    extract(sys.argv[1])
