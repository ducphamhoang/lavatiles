/**
 * Generate Eurotile product catalog from existing collection data.
 * No additional scraping needed - all data is in the collection JSON files.
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data/products/revise-eurotile');

function convertEurotileSize(sizeStr) {
  // "300 x 600" → "30x60cm", "600 x 600" → "60x60cm"
  const m = sizeStr.match(/(\d+)\s*x\s*(\d+)/);
  if (!m) return sizeStr;
  const w = parseInt(m[1]) / 10;
  const h = parseInt(m[2]) / 10;
  return `${w}x${h}cm`;
}

function inferPlacement(categoryName, categoryCode) {
  // OUTDOOR / 20mm → outdoor
  if (categoryCode === '20mm' || categoryName === 'OUTDOOR') {
    return ['Ngoài trời'];
  }
  // Default
  return ['Sàn', 'Tường'];
}

function inferType(categoryName, categoryCode) {
  if (categoryCode === '20mm' || categoryName === 'OUTDOOR') return 'garden';
  if (categoryName === 'VÂN GỖ') return 'wood';
  if (categoryName === 'VÂN ĐÁ' || categoryName === 'CẨM THẠCH') return 'marble';
  if (categoryName === 'VÂN VẢI') return 'tile';
  if (categoryName === 'XI MĂNG') return 'tile';
  if (categoryName === 'THIRD-FIRING') return 'tile';
  if (categoryName === 'TẤM LỚN') return 'tile';
  if (categoryName === 'Xương trắng') return 'tile';
  return 'tile';
}

function inferRooms(type, placement) {
  const rooms = [];
  if (placement.includes('Sàn') || placement.includes('Ngoài trời')) {
    rooms.push('phong_khach', 'phong_bep', 'ban_cong');
  }
  if (placement.includes('Tường')) {
    rooms.push('phong_tam', 'phong_bep', 'phong_khach');
  }
  if (type === 'wood') {
    rooms.push('phong_ngu', 'phong_khach');
  }
  if (placement.includes('Ngoài trời')) {
    rooms.push('ban_cong');
  }
  return [...new Set(rooms)];
}

function inferFinish(code, categoryName) {
  // Check if code contains finish indicator
  const upper = code.toUpperCase();
  if (upper.includes('MATT') || upper.includes('MỜ')) return 'Mờ';
  if (upper.includes('BÓNG') || upper.includes('POLISHED')) return 'Bóng';
  if (categoryName === 'VÂN GỖ') return 'Men';
  if (categoryName === 'VÂN ĐÁ') return 'Bóng';
  return 'Đang cập nhật';
}

function main() {
  console.log('Generating Eurotile product catalog from collection data...\n');

  const catalog = JSON.parse(readFileSync(join(DATA_DIR, '_catalog.json'), 'utf8'));
  const entries = Object.entries(catalog);

  const allProducts = [];
  let total = 0;

  for (const [slug, entry] of entries) {
    const filepath = join(DATA_DIR, slug + '.json');
    if (!existsSync(filepath)) {
      console.log(`  ✗ ${entry.title}: no data file`);
      continue;
    }

    const data = JSON.parse(readFileSync(filepath, 'utf8'));
    const codes = data.product_codes || [];
    const sizeStr = data.product_info?.['Kích thước'] || '';
    const sizes = sizeStr.split(',').map(s => s.trim()).filter(Boolean);
    const images = data.images || [];
    const catName = data.eurotile_category || entry.category || '';
    const catCode = data.eurotile_category_code || entry.category_code || '';

    const type = inferType(catName, catCode);
    const placement = inferPlacement(catName, catCode);

    const products = codes.map(code => {
      // Pick an image for this code
      const codeKey = code.replace(/[\s\/]/g, '').toUpperCase();
      let image = images.find(img => {
        const upper = img.toUpperCase();
        return upper.includes(codeKey) || upper.includes(codeKey.replace(/[^A-Z0-9]/g, ''));
      });
      // Fallback to first non-technical image
      if (!image) {
        image = images.find(img => !img.includes('MOTA') && !img.includes('QR')) || images[0] || '';
      }

      // Infer finish from code
      const finish = inferFinish(code, catName);

      // Parse size - try to match from code suffix (size group letter)
      let productSize = '';
      const sizeMatch = code.match(/\s([A-Z])\d/);
      if (sizeMatch) {
        // Look through sizes for the specific collection
        productSize = sizes[0] || '';
      } else {
        productSize = sizes[0] || '';
      }

      const rooms = inferRooms(type, placement);

      return {
        code,
        brand: 'Eurotile',
        finish,
        size: productSize ? convertEurotileSize(productSize) : 'Đang cập nhật',
        placement,
        body: 'Porcelain',
        rooms,
        image,
        title: `${code} - ${entry.title}`,
        type,
        // Extra metadata for filtering/brand page
        eurotile_collection: data.title || entry.title,
        eurotile_category: catName,
        eurotile_category_code: catCode
      };
    });

    allProducts.push(...products);
    total += products.length;
    console.log(`  ✓ ${entry.title} (${codes.length} products)`);
  }

  // Write the product catalog
  const output = 'window.LAVATILE_EUROTILE_PRODUCTS = ' + JSON.stringify(allProducts, null, 2) + ';';
  writeFileSync(join(DATA_DIR, '_products.js'), output);
  
  // Also write a compact version
  const compact = allProducts.map(p => ({
    c: p.code, b: p.brand, f: p.finish, s: p.size,
    p: p.placement, r: p.rooms, i: p.image, t: p.title,
    y: p.type, ec: p.eurotile_collection, eca: p.eurotile_category
  }));
  const compactOutput = 'window.LAVATILE_EUROTILE_PRODUCTS = ' + JSON.stringify(allProducts, null, 2) + ';';

  console.log(`\n=== Done ===`);
  console.log(`Total products: ${total}`);
  console.log(`Saved to: ${join(DATA_DIR, '_products.js')}`);

  // Summary by category
  const byCat = {};
  allProducts.forEach(p => {
    const cat = p.eurotile_category || 'Unknown';
    byCat[cat] = (byCat[cat] || 0) + 1;
  });
  console.log('\nBy category:');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
    console.log(`  ${c.padEnd(20)} ${n} products`);
  });
}

main();
