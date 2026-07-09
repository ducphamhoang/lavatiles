# Catalogue Comparison Report

Generated: 2026-07-08

## Overview

Analyzed 4 new catalogue PDFs against **110 existing Viglacera tile products** in `data/products/` to find overlaps, conflicts, and new products.

---

## Summary Matrix

| Catalogue | Brand | Category Types | Total Products | Matches Existing | New | Conflicts |
|---|---|---|---|---|---|---|
| `catalogue-toto-2026.json` | **TOTO** | Smart toilets, bidets, basins, faucets, showers, bathtubs, urinals, accessories | **90** | 0 | 90 | **None** |
| `catalogue-caesar-06-2026.json` | **Caesar** | Smart toilets, bidet seats, toilets, vanity cabinets, sinks, urinals, kitchen/basin faucets, showers, bathtubs, accessories | **165** | 0 | 165 | **None** |
| `catalogue-inax-2026.json` | **INAX** | Smart toilets, washlets, toilets, basins, urinals, faucets, showers, kitchen faucets, bathtubs, accessories | **245** | 0 | 245 | **None** |
| `catalogue-t1-2026-sc.json` | **Viglacera SC** (sanitary ware) | Smart toilets, toilets, basins, pedestals, urinals, faucets, showers, accessories, floor drains | **237** | 0 | 236 | **1 (BS503)** |

**Grand Total: 737 products** across 4 catalogues — **736 are new**, 1 has a naming collision.

---

## Key Finding: Three Brands Are Entirely New

**TOTO, Caesar, and INAX** — all 500 products across these 3 brands have **zero presence** in `data/products/`. The existing database is exclusively Viglacera tiles. These are completely new brand verticals.

---

## ⚠️ Conflict Details

### BS503 — Naming Collision (Viglacera)

| Aspect | Catalogue (SC Sanitary) | Existing (Tiles) |
|---|---|---|
| **Product** | Chân chậu Viglacera BS503 (pedestal) | Gạch sân vườn 50x50 Viglacera BS503 (garden tile) |
| **Price** | 600,000 VNĐ | Liên hệ |
| **Slug** | `viglacera-bs503` (under `chan-chau-sc`) | `viglacera-bs503` (under `gach-sn-vn-50x50`) |

**Recommendation:** These are completely different products, so both can coexist. However, the slug `viglacera-bs503` is already taken in `products-tree.json`. The pedestal needs a different slug — e.g. `chan-chau-viglacera-bs503` or scoped under its category path.

---

## Data Quality Notes (All Catalogues)

All 4 catalogues share these gaps vs existing products:

| Field | Catalogue Status | Existing Status |
|---|---|---|
| `images` | Empty `[]` | Have URLs |
| `description` | Empty `""` | Empty `""` (same gap) |
| `rooms` | Not present | Present (e.g. `phong_tam`, `phong_bep`) |
| `product_info` | Brand-specific fields (~4-7 fields) | Extended specs (~10-20 fields + tiles-specific) |
| `view_count` | All `0` | Various |

---

## Recommended Next Steps

1. **Resolve BS503 naming conflict** before importing Viglacera SC sanitary products
2. **Add `rooms` field** to all catalogue products for site filter compatibility
3. **Source product images** from brand websites/suppliers
4. **Write product descriptions** (all currently empty)
5. **Create individual JSON files** per product (matching existing pattern) or decide to keep grouped catalogue files
6. **Extend `products-tree.json`** with new brand categories (TOTO, Caesar, INAX) and new Viglacera sanitary category
7. **Create category/navigation pages** for the new product verticals on the frontend
