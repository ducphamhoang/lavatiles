#!/usr/bin/env python3
"""Extract INAX product images from embedded JPEGs in the PDF, mapped by text position."""

import subprocess, os, json, re, sys
from collections import defaultdict

PDF = 'assets/pdf/INAX-CATALOGUE-01.04.2026.pdf'
CATALOGUE = 'data/products/catalogue-inax-2026.json'
IMG_DIR = 'assets/images/products/inax'

#──────────────────────────────────────────────────────────────────────
# Step 1: For each product, determine its primary listing page
# by scanning text for the product code with strong context clues.
#──────────────────────────────────────────────────────────────────────

def get_page_texts():
    """Cache pdftotext output for all pages."""
    r = subprocess.run(['pdftotext', '-layout', PDF, '-'], 
                       capture_output=True, text=True, timeout=120)
    return r.stdout.split('\f')

def get_all_page_jpegs():
    """Get all product-sized JPEGs per page."""
    page_jpegs = {}
    for page in range(1, 108):
        r = subprocess.run(['pdfimages', '-list', '-f', str(page), '-l', str(page), PDF],
                           capture_output=True, text=True, timeout=30)
        jpegs = []
        for line in r.stdout.split('\n'):
            parts = line.strip().split()
            if len(parts) < 14 or not parts[0].isdigit():
                continue
            if parts[2] == 'smask' or parts[8] != 'jpeg':
                continue
            w, h = int(parts[3]), int(parts[4])
            # Product photos: not too small, not too wide/tall
            if 180 <= w <= 1800 and 180 <= h <= 1800 and max(w, h) / max(min(w, h), 1) < 2.5:
                # Filter image-type images vs decorative
                jpegs.append({'num': int(parts[1]), 'w': w, 'h': h})
        jpegs.sort(key=lambda x: x['num'])
        if jpegs:
            page_jpegs[page] = jpegs
    return page_jpegs

#──────────────────────────────────────────────────────────────────────
# Step 2: Map product slugs to their primary page using text context
#──────────────────────────────────────────────────────────────────────

def find_product_pages(data, pages_text, slug_code_map, known_ranges=None):
    """
    For each product slug, find its primary listing page.
    Uses: code presence + price context + product density.
    """
    # Short codes (< 6 chars) are ambiguous — handle them by category range
    short_codes = {}
    
    slug_page_score = defaultdict(list)  # slug → [(page, line_frac, score)]
    
    for slug, (primary, full_code, cat) in slug_code_map.items():
        for page_num, text in enumerate(pages_text, 1):
            if page_num >= len(pages_text):
                break
            text_upper = text.upper()
            
            # Skip pages that aren't in this product's category range
            if known_ranges and cat in known_ranges:
                r_start, r_end = known_ranges[cat]
                if not (r_start <= page_num <= r_end):
                    continue
            
            if primary not in text_upper:
                continue
            
            lines = text_upper.split('\n')
            found_on_page = False
            
            for j, line in enumerate(lines):
                if primary not in line:
                    continue
                nearby = ' '.join(lines[max(0,j-2):min(len(lines),j+3)])
                
                # Context clues:
                has_price = '000' in nearby and 'Đ' in nearby.upper()
                has_dim = 'MM' in nearby or ('X' in nearby and 'L' in nearby)
                
                # If it's a very short code (< 6 chars), require stronger context
                code_len = len(primary)
                if code_len < 6:
                    if not (has_price or has_dim):
                        continue
                
                # Count how many other product codes are on this page (density check)
                other_codes = 0
                for s2, (pr2, _, _) in slug_code_map.items():
                    if s2 != slug and pr2 in text_upper and len(pr2) > 3:
                        other_codes += 1
                
                # Score
                score = 0
                if has_price: score += 3
                if has_dim: score += 3
                if other_codes <= 3: score += 2    # dedicated product page
                elif other_codes >= 10: score -= 2  # cross-reference page
                if code_len >= 8: score += 1       # long codes are more unique
                
                slug_page_score[slug].append((page_num, j/max(len(lines),1), score, nearby[:60]))
                found_on_page = True
                break
            
            if found_on_page:
                continue
    
    # Pick best page per slug
    result = {}
    for slug, candidates in slug_page_score.items():
        if not candidates:
            continue
        # Sort by score desc, then line position asc (top of page preferred for main listing)
        candidates.sort(key=lambda x: (-x[2], x[1]))
        result[slug] = candidates[0]
    
    return result

#──────────────────────────────────────────────────────────────────────
# Main
#──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    data = json.load(open(CATALOGUE, 'r'))
    
    # Build code mapping
    slug_code_map = {}
    for cat, products in data.items():
        for slug, p in products.items():
            code = p['product_info'].get('Mã sản phẩm', '').upper()
            primary = re.split(r'[\s\+/]+', code.strip())[0].strip()
            slug_code_map[slug] = (primary, code, cat)
    
    print(f"Products to process: {len(slug_code_map)}")
    
    pages_text = get_page_texts()
    page_jpegs = get_all_page_jpegs()
    print(f"Pages with JPEGs: {len(page_jpegs)}")
    print(f"Total JPEGs: {sum(len(v) for v in page_jpegs.values())}")
    
    # Try without range constraints first (let context scoring work)
    print("\nFinding product page mappings...")
    slug_page = find_product_pages(data, pages_text, slug_code_map)
    print(f"Products mapped: {len(slug_page)}/{len(slug_code_map)}")
    
    # Handle unmapped
    mapped = set(slug_page.keys())
    unmapped = [s for s in slug_code_map if s not in mapped]
    
    if unmapped:
        print(f"\nUnmapped products ({len(unmapped)}):")
        # Last resort: scan ALL pages for any mention of the code
        for slug in unmapped:
            primary = slug_code_map[slug][0]
            # Try all pages, any mention
            for page_num, text in enumerate(pages_text, 1):
                if page_num >= len(pages_text):
                    break
                if primary in text.upper():
                    lines = text.upper().split('\n')
                    for j, line in enumerate(lines):
                        if primary in line:
                            slug_page[slug] = (page_num, j/max(len(lines),1), -1, '')
                            print(f"  {slug:35s} → page {page_num} (last resort)")
                            break
                    break
            else:
                print(f"  {slug:35s} → NOT FOUND ANYWHERE")
    
    # Group by page
    page_slugs = defaultdict(list)
    for slug, (page, line_frac, score, context) in slug_page.items():
        page_slugs[page].append((slug, line_frac))
    
    print(f"\nPages with mapped products: {len(page_slugs)}")
    
    # Process pages
    TMP = '/tmp/inax-extract'
    os.makedirs(TMP, exist_ok=True)
    
    assigned = 0
    errors = 0
    
    for page, slugs in sorted(page_slugs.items()):
        jpegs = page_jpegs.get(page, [])
        if not jpegs:
            print(f"  Page {page}: {len(slugs)} products but NO JPEGs")
            errors += len(slugs)
            continue
        
        n_jpegs = len(jpegs)
        n_products = len(slugs)
        
        # Extract JPEGs from this page
        subprocess.run(['pdfimages', '-j', '-f', str(page), '-l', str(page),
                        PDF, f'{TMP}/p{page}'],
                       capture_output=True, text=True, timeout=30)
        
        # Sort slugs by line position
        slugs.sort(key=lambda x: x[1])
        
        page_ok = 0
        
        for i, (slug, line_frac) in enumerate(slugs):
            # Map: if n_products <= n_jpegs, direct index
            # Otherwise, position-based mapping
            if n_products <= n_jpegs:
                jpeg_idx = i
            else:
                jpeg_idx = min(int(line_frac * n_jpegs), n_jpegs - 1)
            
            if jpeg_idx >= n_jpegs:
                jpeg_idx = n_jpegs - 1
            
            src = f'{TMP}/p{page}-{jpegs[jpeg_idx]["num"]:03d}.jpg'
            if os.path.exists(src):
                dst = f'{IMG_DIR}/{slug}.jpg'
                with open(src, 'rb') as f_in:
                    with open(dst, 'wb') as f_out:
                        f_out.write(f_in.read())
                for cat in data.values():
                    if slug in cat:
                        cat[slug]['images'] = [f'/assets/images/products/inax/{slug}.jpg']
            else:
                errors += 1
                continue
            
            page_ok += 1
            assigned += 1
        
        # Cleanup
        for f in os.listdir(TMP):
            if f.startswith(f'p{page}'):
                os.remove(os.path.join(TMP, f))
        
        if n_products <= n_jpegs:
            status = f'{page_ok}/{n_products} ✓'
        else:
            status = f'{page_ok}/{n_products} ({n_jpegs} JPEGs)'
        print(f'  Page {page:3d}: {status}')
    
    # Save
    json.dump(data, open(CATALOGUE, 'w'), indent=2, ensure_ascii=False)
    
    # Stats
    missing = [slug for cat in data.values() for slug, p in cat.items() if not p.get('images')]
    print(f'\n=== Results ===')
    print(f'Assigned: {assigned}/{len(slug_code_map)}')
    print(f'Errors: {errors}')
    if missing:
        print(f'Missing ({len(missing)}):')
        for s in missing:
            print(f'  {s}: {slug_code_map[s][0]}')
    else:
        print('✓ All products have images!')
    
    # Total size
    total_size = sum(os.path.getsize(os.path.join(IMG_DIR, f)) 
                     for f in os.listdir(IMG_DIR) if f.endswith('.jpg'))
    print(f'Total: {total_size/1024:.0f}KB ({total_size/1048576:.1f}MB)')
    
    import shutil
    shutil.rmtree(TMP, ignore_errors=True)

if __name__ == '__main__':
    main()
