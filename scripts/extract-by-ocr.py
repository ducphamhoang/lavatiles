#!/usr/bin/env python3
"""
Extract product images from TOTO catalog PNG pages using OCR + computer vision.

For each page:
1. Run OCR to find SKU codes and their positions
2. Detect product image regions (large non-white rectangles) using contour analysis
3. Match each image region to the nearest SKU code below it
4. Crop and save as slug.jpg

Usage: /tmp/pdf-venv/bin/python3 scripts/extract-by-ocr.py <page_num>
"""

import sys, os, warnings, logging, re, json
warnings.filterwarnings('ignore')
logging.getLogger().setLevel(logging.ERROR)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import cv2
import numpy as np
import easyocr

BASE = '/home/ducph/SideProjects/lavatiles'
PNG_DIR = os.path.join(BASE, 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén')
OUTPUT_DIR = os.path.join(PNG_DIR, 'pdf-image')
CATALOGUE = os.path.join(BASE, 'data/products/catalogue-toto-2026.json')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load catalogue
catalogue = json.load(open(CATALOGUE, 'r'))
code_to_slug = {}
slug_primary = {}
all_codes_set = set()
for cat, products in catalogue.items():
    for slug, p in products.items():
        full_code = p['product_info'].get('Mã sản phẩm', '').upper().strip()
        parts = re.split(r'[\s\+/]+', full_code)
        primary = parts[0].strip()
        slug_primary[slug] = primary
        for part in parts:
            part = part.strip()
            if part and len(part) >= 4:
                all_codes_set.add(part)
        code_to_slug[primary] = slug
        variant = re.sub(r'R(?=W)', '', primary)
        if variant != primary:
            code_to_slug[variant] = slug

reader = easyocr.Reader(['en'], gpu=False, verbose=False)

SKIP_CODES = {'TOTO', 'NEW', 'WASHLET', 'TORNADO', 'CEFIONTECT', 'EWATER', 'ECOWASHER',
              'AIR', 'WONDER', 'MASSAGE'}


def match_sku(ocr_code):
    clean = ocr_code.strip().upper()
    if clean in SKIP_CODES:
        return None, clean
    if clean in code_to_slug:
        return code_to_slug[clean], clean
    if clean in all_codes_set:
        for slug, primary in slug_primary.items():
            for cat, products in catalogue.items():
                if slug in products:
                    full = products[slug]['product_info'].get('Mã sản phẩm', '').upper().strip()
                    break
            else:
                continue
            if full and clean in full:
                return slug, primary
    fixes = {'0': 'O', 'O': '0', '1': 'I', 'I': '1', '5': 'S', 'S': '5', '8': 'B', 'B': '8'}
    for i, ch in enumerate(clean):
        if ch in fixes:
            v = clean[:i] + fixes[ch] + clean[i+1:]
            if v in code_to_slug:
                return code_to_slug[v], v
    for cat_code, slug in code_to_slug.items():
        if cat_code in clean or clean in cat_code:
            return slug, cat_code
    return None, clean


def find_skus(ocr_results):
    """Find catalogue-matched SKU codes from OCR results."""
    matched = []
    for bbox, text, conf in ocr_results:
        x1, y1 = bbox[0]
        clean = text.strip().upper()
        if re.match(r'^[A-Z][A-Z0-9]{3,}[A-Z0-9]?$', clean) and conf > 0.3:
            slug, mc = match_sku(clean)
            if slug:
                matched.append({'slug': slug, 'x': int(x1), 'y': int(y1), 'conf': conf})
    # Dedup by slug
    best = {}
    for m in matched:
        if m['slug'] not in best or m['conf'] > best[m['slug']]['conf']:
            best[m['slug']] = m
    result = list(best.values())
    result.sort(key=lambda m: (m['y'], m['x']))
    return result


def detect_image_regions(img):
    """Detect product photo regions using contour analysis.
    
    Returns list of (x, y, w, h) bounding boxes for likely product images,
    sorted by area (largest first).
    """
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Use adaptive threshold to find content regions
    # Invert: white background (255) becomes 0, content becomes 255
    _, thresh = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY_INV)
    
    # Clean up noise
    kernel = np.ones((5, 5), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    regions = []
    page_area = w * h
    
    for cnt in contours:
        rx, ry, rw, rh = cv2.boundingRect(cnt)
        area = rw * rh
        
        # Filter
        if area < 8000:  # too small
            continue
        if area > page_area * 0.75:  # too big (full page background)
            continue
        if rw < 100 or rh < 100:
            continue
        asp = rw / rh
        if asp > 4 or asp < 0.2:
            continue
        
        # Check the region is actually "interesting" (has color variation)
        roi = gray[ry:ry+rh, rx:rx+rw]
        if roi.size > 0:
            std_val = np.std(roi)
            if std_val < 10:  # Too uniform = likely empty/bg
                continue
        
        regions.append((rx, ry, rw, rh, area))
    
    regions.sort(key=lambda r: r[4], reverse=True)
    return regions


def process_page(page_num):
    png_file = os.path.join(PNG_DIR, f'page-{page_num:03d}.png')
    if not os.path.exists(png_file):
        print(f'SKIP: page-{page_num:03d}.png not found')
        return []
    
    img = cv2.imread(png_file)
    h, w = img.shape[:2]
    print(f'\n=== Page {page_num} ({w}x{h}) ===')
    
    # Run OCR
    results = reader.readtext(png_file, detail=1, paragraph=False)
    
    # Find SKU codes
    skus = find_skus(results)
    if not skus:
        print('  No catalogue-matched SKU codes found')
        return []
    
    print(f'  SKUs:')
    for s in skus:
        print(f'    {s["slug"]:40s} at ({s["x"]:4d}, {s["y"]:4d})')
    
    # Detect product image regions
    regions = detect_image_regions(img)
    if not regions:
        print('  No product image regions detected')
        return []
    
    print(f'  Image regions (showing top 5):')
    for i, (rx, ry, rw, rh, area) in enumerate(regions[:5]):
        print(f'    [{i}] ({rx:4d},{ry:4d}) {rw:3d}x{rh:3d} area={area:7d}')
    
    # Match SKU codes to image regions
    # Strategy: for each SKU, find the nearest image region that is above or to the left of it
    extracted = []
    used_regions = set()
    
    for sku in skus:
        sx, sy = sku['x'], sku['y']
        best_region = None
        best_dist = float('inf')
        
        for ri, (rx, ry, rw, rh, area) in enumerate(regions):
            if ri in used_regions:
                continue
            
            # Region center
            rcx = rx + rw // 2
            rcy = ry + rh // 2
            
            # Check if region is above or to the left of the SKU text
            is_above = (ry + rh) <= sy + 20  # region ends above or near SKU
            is_left = (rx + rw) <= sx + 50   # region ends to the left of SKU, or overlaps
            
            if not (is_above or is_left):
                continue
            
            # Calculate distance from region bottom-center to SKU position
            dist = np.sqrt((rcx - sx)**2 + ((ry + rh) - sy)**2)
            
            # Bonus for regions directly above the SKU
            if rcx > sx - 100 and rcx < sx + 100 and (ry + rh) <= sy:
                dist *= 0.5
            
            if dist < best_dist:
                best_dist = dist
                best_region = ri
        
        if best_region is not None:
            rx, ry, rw, rh, area = regions[best_region]
            used_regions.add(best_region)
            
            # Add small padding
            pad = 5
            crop = img[max(0,ry-pad):min(h,ry+rh+pad), max(0,rx-pad):min(w,rx+rw+pad)]
            
            out_path = os.path.join(OUTPUT_DIR, f'{sku["slug"]}.jpg')
            cv2.imwrite(out_path, crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
            extracted.append(sku['slug'])
            print(f'  → {sku["slug"]:40s}: crop region [{best_region}] ({rx:4d},{ry:4d},{rw:3d}x{rh:3d})')
        else:
            # Fallback: crop left side above SKU
            print(f'  ? {sku["slug"]:40s}: no matching region, using fallback')
            left = 5
            right = max(50, min(w, sx - 10))
            top = max(0, sy - 350)
            bottom = max(top + 50, sy - 5)
            crop = img[top:bottom, left:right]
            if crop.shape[0] >= 50 and crop.shape[1] >= 50:
                out_path = os.path.join(OUTPUT_DIR, f'{sku["slug"]}.jpg')
                cv2.imwrite(out_path, crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
                extracted.append(sku['slug'])
                print(f'    fallback: ({left},{top},{right},{bottom}) = {crop.shape[1]}x{crop.shape[0]}')
    
    return extracted


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: scripts/extract-by-ocr.py <page_num>')
        sys.exit(1)
    process_page(int(sys.argv[1]))
