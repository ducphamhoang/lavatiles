#!/usr/bin/env python3
"""Analyze a single page PNG: detect products and read SKUs with OCR."""

import sys, os, warnings, logging
warnings.filterwarnings('ignore')
logging.getLogger().setLevel(logging.ERROR)

import cv2
import easyocr
import re

BASE = '/home/ducph/SideProjects/lavatiles'
PNG_DIR = os.path.join(BASE, 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén')
OUTPUT_DIR = os.path.join(PNG_DIR, 'pdf-image')

page_num = sys.argv[1] if len(sys.argv) > 1 else '016'
png_file = os.path.join(PNG_DIR, f'page-{page_num}.png')

if not os.path.exists(png_file):
    print(f'ERROR: {png_file} not found')
    sys.exit(1)

img = cv2.imread(png_file)
h, w = img.shape[:2]

reader = easyocr.Reader(['en'], gpu=False, verbose=False)

results = reader.readtext(png_file, detail=1, paragraph=False)
results.sort(key=lambda r: (r[0][0][1], r[0][0][0]))

out = []
out.append(f'Image size: {w}x{h}')
out.append(f'')
out.append(f'=== SKU-like text ===')
for bbox, text, conf in results:
    x1, y1 = bbox[0]
    clean = text.strip().upper()
    if re.match(r'^[A-Z][A-Z0-9]{3,}[A-Z0-9]?$', clean) and conf > 0.3:
        out.append(f'  y={y1:6.0f} x={x1:6.0f} conf={conf:.2f}: "{text.strip()}"')

out.append(f'')
out.append(f'=== All text (for context) ===')
for bbox, text, conf in results:
    x1, y1 = bbox[0]
    out.append(f'  y={y1:6.0f} x={x1:6.0f} conf={conf:.2f}: "{text.strip()}"')

# Write to file
outfile = os.path.join(PNG_DIR, f'page-{page_num}-ocr.txt')
with open(outfile, 'w') as f:
    f.write('\n'.join(out))
print(f'Output written to {outfile}')
