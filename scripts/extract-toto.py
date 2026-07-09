#!/usr/bin/env python3
"""Extract TOTO product images by rendering pages and cropping at code positions."""

import subprocess, os, json, re
from collections import defaultdict
from PIL import Image

PDF = 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén.pdf'
CATALOGUE = 'data/products/catalogue-toto-2026.json'
IMG_DIR = 'assets/images/products/toto'
TMP = '/tmp/toto-extract'

# Category → page ranges (from TOC analysis)
CAT_RANGES = {
    'ban-cau-thong-minh-toto': (150, 158),
    'nap-rua-dien-tu-toto': (34, 42),
    'nap-rua-co-toto': (39, 42),
    'ban-cau-mot-khoi-toto': (45, 68),
    'ban-cau-hai-khoi-toto': (69, 77),
    'ban-cau-treo-tuong-toto': (78, 88),
    'chau-rua-toto': (89, 99),
    'voi-chau-toto': (100, 125),
    'sen-tam-toto': (126, 132),
    'bon-tam-toto': (140, 147),
    'bon-tieu-toto': (148, 152),
    'phu-kien-toto': (153, 160),
}


def render_page(page):
    """Render a page at 200 DPI to a PIL Image."""
    subprocess.run(['pdftoppm', '-r', '200', '-f', str(page), '-l', str(page),
                    PDF, f'{TMP}/p{page}'], capture_output=True, text=True, timeout=60)
    for f in sorted(os.listdir(TMP)):
        if f.startswith(f'p{page}-') and f.endswith('.ppm'):
            return Image.open(os.path.join(TMP, f))
    return None


def crop_product_photo(img, code, lines, col_idx=0, n_cols=1):
    """Crop the product photo above a code text position."""
    w, h = img.size
    text_upper = '\n'.join(lines).upper()
    
    # Find the code in text lines to get y-position
    code_line_idx = -1
    for i, line in enumerate(lines):
        if code.upper() in line.upper():
            code_line_idx = i
            break
    
    if code_line_idx < 0:
        # Fallback: estimate position based on product index
        y_frac = 0.3 + (col_idx / n_cols) * 0.4
    else:
        y_frac = code_line_idx / max(len(lines), 1)
    
    # Estimate column boundaries
    col_width = w / n_cols
    x_left = int(col_width * col_idx) + 5
    x_right = int(col_width * (col_idx + 1)) - 5
    
    # Y: photo is above the code text
    photo_bottom_y = int(y_frac * h) - 5  # just above text
    
    # For most products, photo takes up ~40-50% of page height (200-250px at 200DPI)
    # Scan upward to find the photo's bottom edge
    strip_mid = int(x_left + (x_right - x_left) * 0.3)
    photo_bottom = photo_bottom_y
    
    for y in range(photo_bottom_y, max(0, photo_bottom_y - 25), -1):
        strip = img.crop((x_left, y, x_right, min(h, y+3)))
        px = list(strip.getdata())
        if not px: continue
        avg = sum(sum(p[:3]) for p in px) / (len(px) * 3)
        if avg < 230:  # Non-white = photo content
            photo_bottom = y + 2
            break
    
    # Find photo top: scan upward until white
    photo_top = max(0, photo_bottom - 250)
    for y in range(photo_bottom, max(0, photo_bottom - 300), -1):
        strip = img.crop((x_left, y, x_right, min(h, y+3)))
        px = list(strip.getdata())
        if not px: continue
        avg = sum(sum(p[:3]) for p in px) / (len(px) * 3)
        if avg > 240:  # White gap above photo
            # Check if it stays white for a few pixels
            if y > 0:
                strip2 = img.crop((x_left, max(0, y-3), x_right, min(h, y)))
                px2 = list(strip2.getdata())
                if px2 and sum(sum(p[:3]) for p in px2) / (len(px2) * 3) > 240:
                    photo_top = y + 3
                    break
    
    # If photo is too small, use a generous default
    if photo_bottom - photo_top < 80:
        photo_top = max(0, photo_bottom - 220)
    
    # Trim horizontal whitespace at the mid-line of the photo
    mid_y = (photo_top + photo_bottom) // 2
    row_strip = img.crop((0, mid_y, w, mid_y + 3)).convert('L')
    row_data = list(row_strip.getdata())
    
    # Left edge: scan in from column left
    left_edge = x_left
    for x in range(x_left, min(w, x_left + int(col_width * 0.4))):
        if x < len(row_data) and row_data[x] < 230:
            left_edge = x - 8
            break
    
    # Right edge: scan in from column right
    right_edge = x_right
    for x in range(x_right, max(0, x_right - int(col_width * 0.4)), -1):
        if x < len(row_data) and row_data[x] < 230:
            right_edge = x + 8
            break
    
    # Ensure minimum width
    if right_edge - left_edge < 80:
        left_edge = max(0, x_left)
        right_edge = min(w, x_right)
    
    # Ensure valid bounds (top < bottom, left < right)
    top = max(0, photo_top)
    bottom = min(h, photo_bottom)
    left = max(0, left_edge)
    right = min(w, right_edge)
    
    # If top >= bottom, the code is at top of page — use a generous crop below
    if top >= bottom:
        top = int(y_frac * h) + 10
        bottom = min(h, top + 220)
    # If bottom - top < 80, expand
    if bottom - top < 80:
        top = int(y_frac * h) + 10
        bottom = min(h, top + 200)
    # Ensure left < right
    if left >= right:
        left = int(col_width * col_idx) + 5
        right = int(col_width * (col_idx + 1)) - 5
    
    return (left, top, right, bottom)


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    data = json.load(open(CATALOGUE))
    
    # Build slug → (primary_code, full_code, cat)
    slug_info = {}
    for cat, products in data.items():
        for slug, p in products.items():
            code = p['product_info'].get('Mã sản phẩm', '').upper()
            primary = re.split(r'[\s\+/]+', code.strip())[0].strip()
            slug_info[slug] = (primary, code, cat)
    
    # Cache page texts
    r = subprocess.run(['pdftotext', '-layout', PDF, '-'],
                       capture_output=True, text=True, timeout=120)
    all_pages_text = r.stdout.split('\f')
    
    assigned = 0
    errors = 0
    
    # Process each category in its page range
    for cat_name, (start_page, end_page) in sorted(CAT_RANGES.items()):
        if cat_name not in data:
            continue
        
        products = data[cat_name]
        slugs = list(products.keys())
        if not slugs:
            continue
        
        # Find which pages in this range have each product's code
        page_slug_map = defaultdict(list)
        for slug in slugs:
            primary = slug_info[slug][0]
            best_page = 0
            best_score = 0
            best_line = 0
            
            for page_num in range(start_page, end_page + 1):
                if page_num >= len(all_pages_text):
                    continue
                text = all_pages_text[page_num - 1]
                text_upper = text.upper()
                
                if primary not in text_upper:
                    continue
                
                lines = text.split('\n')
                for j, line in enumerate(lines):
                    if primary in line.upper():
                        nearby = ' '.join(lines[max(0,j-2):min(len(lines),j+3)])
                        score = 0
                        if ('000' in nearby and 'đ' in nearby.lower()): score += 3
                        if 'MM' in nearby: score += 2
                        if score >= best_score:
                            best_score = score
                            best_page = page_num
                            best_line = j
                        break
            
            if best_page > 0 and best_score >= 2:
                page_slug_map[best_page].append((slug, best_line))
        
        if not page_slug_map:
            # Fallback: assign all to the first page of the range
            all_slugs = [(slug, 20 + i*10) for i, slug in enumerate(slugs)]
            page_slug_map[start_page] = all_slugs
        
        # For each page in this category
        for page_num, page_slugs in sorted(page_slug_map.items()):
            print(f'  {cat_name:30s} page {page_num:3d}: {len(page_slugs):2d} products', end='')
            
            lines = all_pages_text[page_num - 1].split('\n') if page_num < len(all_pages_text) else []
            
            img = render_page(page_num)
            if not img:
                print(' ✗ render failed')
                errors += len(page_slugs)
                continue
            
            page_slugs.sort(key=lambda x: x[1])  # Sort by line position
            
            # Determine number of columns from text layout
            # Estimate by looking at product code positions
            n_cols = min(4, len(page_slugs))
            
            page_ok = 0
            for i, (slug, line_idx) in enumerate(page_slugs):
                primary = slug_info[slug][0]
                col_idx = i % n_cols if n_cols > 1 else 0
                
                bounds = crop_product_photo(img, primary, lines, col_idx, n_cols)
                crop = img.crop(bounds)
                dst = f'{IMG_DIR}/{slug}.jpg'
                crop.save(dst, 'JPEG', quality=92)
                
                for cat in data.values():
                    if slug in cat:
                        cat[slug]['images'] = [f'/assets/images/products/toto/{slug}.jpg']
                
                page_ok += 1
                assigned += 1
            
            print(f' → {page_ok} OK')
            
            # Cleanup page render
            for f in os.listdir(TMP):
                if f.startswith(f'p{page_num}'):
                    os.remove(os.path.join(TMP, f))
    
    # For any remaining unassigned products, try to find them in their category range
    remaining = [(slug, info) for cat, products in data.items() 
                 for slug, p in products.items() if not p.get('images')
                 for info in [slug_info[slug]] if info[2] == cat]
    
    if remaining:
        print(f'\nHandling {len(remaining)} remaining products...')
        for slug, (primary, full, cat) in remaining:
            rng = CAT_RANGES.get(cat, (1, 186))
            for page_num in range(rng[0], rng[1] + 1):
                if page_num >= len(all_pages_text):
                    continue
                if primary in all_pages_text[page_num - 1].upper():
                    # Render and crop
                    img = render_page(page_num)
                    if not img:
                        continue
                    lines = all_pages_text[page_num - 1].split('\n')
                    bounds = crop_product_photo(img, primary, lines, 0, 1)
                    crop = img.crop(bounds)
                    dst = f'{IMG_DIR}/{slug}.jpg'
                    crop.save(dst, 'JPEG', quality=92)
                    for cat in data.values():
                        if slug in cat:
                            cat[slug]['images'] = [f'/assets/images/products/toto/{slug}.jpg']
                    assigned += 1
                    for f in os.listdir(TMP):
                        if f.startswith(f'p{page_num}'):
                            os.remove(os.path.join(TMP, f))
                    break
    
    # Save
    json.dump(data, open(CATALOGUE, 'w'), indent=2, ensure_ascii=False)
    
    # Stats
    missing = [slug for cat in data.values() for slug, p in cat.items() if not p.get('images')]
    print(f'\n=== TOTO Results ===')
    print(f'Assigned: {assigned}/{len(slug_info)}')
    print(f'Errors: {errors}')
    if missing:
        print(f'Missing ({len(missing)}):')
        for s in missing:
            print(f'  {s}: {slug_info[s][0]}')
    else:
        print('✓ All 90 products have images!')
    
    total_size = sum(os.path.getsize(os.path.join(IMG_DIR, f))
                     for f in os.listdir(IMG_DIR) if f.endswith('.jpg'))
    print(f'Total: {total_size/1024:.0f}KB ({total_size/1048576:.1f}MB)')
    
    import shutil
    shutil.rmtree(TMP, ignore_errors=True)


if __name__ == '__main__':
    main()
