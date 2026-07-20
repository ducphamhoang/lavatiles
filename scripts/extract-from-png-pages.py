#!/usr/bin/env python3
"""
Extract product images from pre-rendered PNG catalog pages.

Strategy:
1. Use pdftotext -layout on the original PDF to build a page→slug mapping.
2. Use pdftotext -bbox-layout to find exact (x,y) positions of each SKU code.
3. Crop the product photo above each SKU from the PNG page image.
4. Save as slug.jpg in pdf-image/.

Usage: python3 scripts/extract-from-png-pages.py
"""

import subprocess, os, json, re, sys
from collections import defaultdict
from PIL import Image

BASE = '/home/ducph/SideProjects/lavatiles'
PDF = os.path.join(BASE, 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén.pdf')
PNG_DIR = os.path.join(BASE, 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén')
CATALOGUE = os.path.join(BASE, 'data/products/catalogue-toto-2026.json')
OUTPUT_DIR = os.path.join(PNG_DIR, 'pdf-image')


def load_catalogue():
    """Load catalogue and build slug -> primary code + variant."""
    data = json.load(open(CATALOGUE, 'r'))
    slug_info = {}
    for cat, products in data.items():
        for slug, p in products.items():
            code = p['product_info'].get('Mã sản phẩm', '')
            primary = re.split(r'[\s\+/]+', code.strip())[0].upper().strip()
            # Variant: sometimes the PDF omits 'R' before 'W' (e.g. MS625CDRW23 vs MS625CDW23)
            variant = re.sub(r'R(?=W)', '', primary)
            slug_info[slug] = {
                'code': code.upper().strip(),
                'primary': primary,
                'variant': variant if variant != primary else None,
                'category': cat,
            }
    return data, slug_info


def build_page_product_map(slug_info):
    """Use pdftotext -layout to map each page number to the slugs on it.
    
    Returns dict: page_num -> [(slug, primary_code, matching_code)]
    """
    print('Building page→product mapping from PDF text...')
    
    r = subprocess.run(
        ['pdftotext', '-layout', PDF, '-'],
        capture_output=True, text=True, timeout=120
    )
    all_pages = r.stdout.split('\f')
    
    page_map = {}
    duplicates = 0
    
    for slug, info in slug_info.items():
        primary = info['primary']
        variant = info['variant']
        
        # Try primary first, then variant
        found_page = None
        matched_code = None
        
        for page_idx, text in enumerate(all_pages):
            page_num = page_idx + 1
            text_upper = text.upper()
            
            # Try primary code on this page
            if primary in text_upper and len(primary) >= 4:
                # Verify it's not a false match (should be bounded by whitespace/non-alphanum)
                # In pdftotext layout, codes often appear at line boundaries
                for line in text.split('\n'):
                    if primary in line.upper():
                        found_page = page_num
                        matched_code = primary
                        break
            
            if found_page:
                break
            
            # Try variant
            if variant:
                if variant in text_upper and len(variant) >= 4:
                    for line in text.split('\n'):
                        if variant in line.upper():
                            found_page = page_num
                            matched_code = variant
                            break
            
            if found_page:
                break
        
        if found_page:
            if found_page not in page_map:
                page_map[found_page] = []
            page_map[found_page].append((slug, primary, matched_code))
        else:
            # Check if product is on page 11 (tle series)
            # Also search pages that have PNGs
            for page_idx, text in enumerate(all_pages):
                page_num = page_idx + 1
                if page_num < 16 or page_num > 153:
                    continue
                text_upper = text.upper()
                if primary in text_upper:
                    for line in text.split('\n'):
                        if primary in line.upper():
                            found_page = page_num
                            matched_code = primary
                            if found_page not in page_map:
                                page_map[found_page] = []
                            page_map[found_page].append((slug, primary, matched_code))
                            break
                if found_page:
                    break
    
    return page_map


def get_bbox_word_positions(pdf, page_num):
    """Get word bounding boxes from PDF for a specific page.
    
    Returns list of {x, y, w, text} with coordinates in PDF pts,
    and (pdf_w, pdf_h) page dimensions.
    """
    r = subprocess.run(
        ['pdftotext', '-bbox-layout', '-f', str(page_num), '-l', str(page_num), pdf, '-'],
        capture_output=True, text=True, timeout=30
    )
    if r.returncode != 0:
        return [], 0, 0
    
    html = r.stdout
    
    page_m = re.search(r'<page\s+width="([\d.]+)"\s+height="([\d.]+)"', html)
    if not page_m:
        return [], 0, 0
    pdf_w, pdf_h = float(page_m.group(1)), float(page_m.group(2))
    
    words = []
    for m in re.finditer(
        r'<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)"[^>]*>([^<]+)</word>',
        html
    ):
        x, y, x2, y2 = float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4))
        text = m.group(5).strip()
        words.append({
            'x': x, 'y': y,
            'cx': (x + x2) / 2,
            'cy': (y + y2) / 2,
            'w': x2 - x,
            'h': y2 - y,
            'text': text,
        })
    
    return words, pdf_w, pdf_h


def find_code_position(words, matched_code):
    """Find a code in the word list and return its position.
    Returns (x_center, y_center, y_min) or None.
    """
    target = matched_code.upper()
    
    # Try exact match first
    for w in words:
        if w['text'].upper() == target:
            return (w['cx'], w['cy'], w['y'])
    
    # Try prefix match (code might be split across multiple words)
    for i, w in enumerate(words):
        w_text = w['text'].upper()
        if target.startswith(w_text) and len(w_text) >= 3:
            # Check subsequent words
            full_text = w_text
            j = i
            while j + 1 < len(words) and len(full_text) < len(target):
                j += 1
                full_text += words[j]['text'].upper()
            if full_text == target or target in full_text:
                # Return position of first word
                return (w['cx'], w['cy'], w['y'])
    
    return None


def extract_images():
    """Main extraction logic."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    data, slug_info = load_catalogue()
    print(f'Loaded {len(slug_info)} products from catalogue')
    
    # Build page→slug mapping
    page_map = build_page_product_map(slug_info)
    print(f'Mapped products to {len(page_map)} pages')
    
    # Discover page PNGs
    page_pngs = {}
    for f in os.listdir(PNG_DIR):
        m = re.match(r'page-(\d+)\.png$', f)
        if m:
            page_pngs[int(m.group(1))] = os.path.join(PNG_DIR, f)
    
    print(f'Found {len(page_pngs)} page PNGs')
    
    # Get PNG dimensions and scale
    first_png = sorted(page_pngs.items())[0][1]
    words, pdf_w, pdf_h = get_bbox_word_positions(PDF, sorted(page_pngs.keys())[0])
    if not pdf_w:
        pdf_w, pdf_h = 419.528, 595.276
    
    with Image.open(first_png) as img:
        png_w, png_h = img.size
    scale_x = png_w / pdf_w
    scale_y = png_h / pdf_h
    
    print(f'PDF page: {pdf_w:.1f}x{pdf_h:.1f} pts')
    print(f'PNG page: {png_w}x{png_h} px')
    print(f'Scale: {scale_x:.3f}x{scale_y:.3f}')
    print()
    
    # Process each page
    total_extracted = 0
    extracted_slugs = set()
    
    for page_num in sorted(page_pngs.keys()):
        png_path = page_pngs[page_num]
        
        # Check if this page has any mapped products
        if page_num not in page_map or not page_map[page_num]:
            continue
        
        page_products = page_map[page_num]
        
        # Get bbox word positions for this page
        words, _, _ = get_bbox_word_positions(PDF, page_num)
        if not words:
            continue
        
        # Find position of each product's code
        product_positions = []  # (slug, primary, x_center, y_center, y_min, matched_code)
        for slug, primary, matched_code in page_products:
            pos = find_code_position(words, matched_code)
            if pos:
                cx, cy, y_min = pos
                product_positions.append((slug, primary, cx, cy, y_min, matched_code))
        
        if not product_positions:
            # Fallback: estimate positions based on order
            print(f'  Page {page_num:3d}: {len(page_products)} products (position estimates)')
            for i, (slug, primary, matched_code) in enumerate(page_products):
                # Estimate: evenly distribute across the page
                n = len(page_products)
                col = i % 2  # assume 2 columns
                row = i // 2
                est_x = (150 + col * 210) * scale_x
                est_y = (150 + row * 120) * scale_y
                product_positions.append((slug, primary, est_x, est_y, 0, matched_code))
        else:
            print(f'  Page {page_num:3d}: {len(product_positions)} products (bbox-matched)', end='')
        
        # Open PNG
        img = Image.open(png_path)
        
        # Detect column structure from x-positions
        if len(product_positions) >= 2:
            x_positions = [p[2] for p in product_positions]
            # Count distinct x-clusters
            # Sort by x
            sorted_by_x = sorted(product_positions, key=lambda p: p[2])
            x_gaps = []
            for i in range(1, len(sorted_by_x)):
                gap = sorted_by_x[i][2] - sorted_by_x[i-1][2]
                x_gaps.append(gap)
            
            avg_gap = sum(x_gaps) / len(x_gaps) if x_gaps else 0
            
            column_groups = []
            current_group = [sorted_by_x[0]]
            for i in range(1, len(sorted_by_x)):
                if sorted_by_x[i][2] - sorted_by_x[i-1][2] > avg_gap * 0.6:
                    column_groups.append(current_group)
                    current_group = [sorted_by_x[i]]
                else:
                    current_group.append(sorted_by_x[i])
            if current_group:
                column_groups.append(current_group)
            
            n_cols = len(column_groups)
        else:
            n_cols = 1
            column_groups = [product_positions]
        
        col_width = png_w / n_cols
        
        # Process each product
        page_ok = 0
        for slug, primary, cx, cy, y_min, matched_code in product_positions:
            # Determine column index
            col_idx = min(int(cx * scale_x / col_width) if cx > 0 else 0, n_cols - 1)
            
            # Column bounds
            col_left = int(col_idx * col_width) + 5
            col_right = min(png_w, int((col_idx + 1) * col_width) - 5)
            
            # Vertical bounds
            # SKU text position in pixels
            sku_y_px = y_min * scale_y
            
            # The product photo is ABOVE the SKU text
            # Estimate: photo occupies about 45-55% of the page height
            # Starting from top of page, going down to just above the SKU text
            
            # For multi-product pages, determine if product is in first or second row
            # Sort products in this column by y
            col_products = [p for p in product_positions if min(int(p[2] * scale_x / col_width), n_cols-1) == col_idx]
            col_products.sort(key=lambda p: p[4])  # sort by y_min
            
            # Find this product's position in the column
            row_idx = 0
            for i, cp in enumerate(col_products):
                if cp[0] == slug:
                    row_idx = i
                    break
            
            total_in_col = len(col_products)
            
            # Column height allocated per row
            row_height = png_h / max(total_in_col, 1)
            
            # Photo: top of its row area, bottom = just above SKU
            top = max(5, int(row_idx * row_height))
            bottom = min(png_h - 5, int(sku_y_px) - 3)
            
            # If bottom - top is too small, expand
            if bottom - top < 80:
                top = max(0, bottom - 200)
            
            # Trim horizontal whitespace around the product photo
            # Sample at mid-height
            mid_y = (top + bottom) // 2
            if mid_y >= bottom or mid_y < 0:
                mid_y = top + 50
            
            # Find left edge with padding
            left = col_left
            if left < png_w and mid_y < png_h:
                for x in range(col_left, min(png_w, col_left + 80)):
                    if x < png_w:
                        pixel = img.getpixel((x, mid_y))
                        if isinstance(pixel, tuple) and any(c < 230 for c in pixel[:3]):
                            left = max(0, x - 15)
                            break
            
            # Find right edge
            right = col_right
            if right > 0 and mid_y < png_h:
                for x in range(col_right, max(0, col_right - 80), -1):
                    if x < png_w:
                        pixel = img.getpixel((x, mid_y))
                        if isinstance(pixel, tuple) and any(c < 230 for c in pixel[:3]):
                            right = min(png_w, x + 15)
                            break
            
            # Ensure valid crop
            if left >= right or top >= bottom:
                continue
            
            cropped = img.crop((left, top, right, bottom))
            
            if cropped.size[0] >= 40 and cropped.size[1] >= 40:
                out_path = os.path.join(OUTPUT_DIR, f'{slug}.jpg')
                cropped.save(out_path, 'JPEG', quality=92)
                extracted_slugs.add(slug)
                page_ok += 1
        
        img.close()
        total_extracted += page_ok
    
    # Report
    print(f'\n=== Results ===')
    print(f'Extracted: {len(extracted_slugs)}/{len(slug_info)} unique products')
    
    missing = [slug for slug in slug_info if slug not in extracted_slugs]
    if missing:
        print(f'Missing ({len(missing)}):')
        for s in sorted(missing):
            # Find page
            page = None
            for p, prods in page_map.items():
                for sl, _, _ in prods:
                    if sl == s:
                        page = p
                        break
                if page:
                    break
            page_str = f' (page {page})' if page else ' (not in PDF pages)'
            print(f'  {s}: {slug_info[s]["code"]}{page_str}')
    else:
        print('✓ All products extracted!')
    
    total_size = sum(os.path.getsize(os.path.join(OUTPUT_DIR, f))
                     for f in os.listdir(OUTPUT_DIR) if f.endswith('.jpg'))
    print(f'Total output: {total_size/1024:.0f} KB ({total_size/1048576:.1f} MB)')


if __name__ == '__main__':
    extract_images()
