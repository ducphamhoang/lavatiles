import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = '/home/ducph/SideProjects/lavatiles';

const catalogues = [
  {
    name: 'Caesar',
    dir: 'assets/pdf/CATALO 06-2026',
    pattern: /^page-\d{2}\.png$/,
    pages: 64
  },
  {
    name: 'Viglacera',
    dir: 'assets/pdf/Catalogue T1-2026',
    pattern: /^page-\d{2}\.png$/,
    pages: 65
  },
  {
    name: 'INAX',
    dir: 'assets/pdf/INAX-CATALOGUE-01.04.2026',
    pattern: /^page-\d{3}\.png$/,
    pages: 107
  }
];

async function resizeExisting() {
  for (const cat of catalogues) {
    const dirPath = path.join(ROOT, cat.dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`Skipping ${cat.name}: directory not found`);
      continue;
    }

    const files = fs.readdirSync(dirPath)
      .filter(f => cat.pattern.test(f) && !f.endsWith('.jpg'));

    console.log(`\n${cat.name}: ${files.length} PNG files to process`);

    let totalIn = 0, totalOut = 0, done = 0;

    for (const file of files) {
      const src = path.join(dirPath, file);
      const dst = path.join(dirPath, file.replace(/\.png$/, '.jpg'));

      // Skip if already done
      if (fs.existsSync(dst)) continue;

      try {
        const origSize = fs.statSync(src).size;
        totalIn += origSize;

        const info = await sharp(src)
          .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82, mozjpeg: true })
          .toFile(dst);

        totalOut += info.size;
        done++;

        if (done % 10 === 0 || done === files.length) {
          const pct = totalOut / totalIn * 100;
          console.log(`  ${done}/${files.length}: ${(totalIn/1024/1024).toFixed(1)}MB → ${(totalOut/1024/1024).toFixed(1)}MB (${pct.toFixed(1)}%)`);
        }
      } catch (err) {
        console.error(`  Error on ${file}: ${err.message}`);
      }
    }

    if (done > 0) {
      console.log(`  ✓ ${cat.name}: ${done} files, ${(totalIn/1024/1024).toFixed(1)}MB → ${(totalOut/1024/1024).toFixed(1)}MB`);
    } else {
      console.log(`  ${cat.name}: all images already converted`);
    }
  }
}

async function extractTOTO() {
  const pdfPath = path.join(ROOT, 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén.pdf');
  const outDir = path.join(ROOT, 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén');

  if (!fs.existsSync(pdfPath)) {
    console.log('\nTOTO: PDF not found, skipping');
    return;
  }

  // Check if already extracted
  const existing = fs.readdirSync(outDir).filter(f => /^page-\d{3}\.jpg$/.test(f));
  if (existing.length > 0) {
    console.log(`\nTOTO: ${existing.length} JPEGs already exist, skipping extraction`);
    return;
  }

  console.log('\nTOTO: Extracting pages with pdftoppm...');
  const start = Date.now();

  execSync(
    `pdftoppm -jpeg -r 96 -scale-to 1200 "${pdfPath}" "${outDir}/page"`,
    { cwd: ROOT, stdio: 'pipe' }
  );

  // pdftoppm outputs page-001.jpg, page-002.jpg, etc.
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const count = fs.readdirSync(outDir).filter(f => /^page-\d{3}\.jpg$/.test(f)).length;
  const totalSize = fs.readdirSync(outDir)
    .filter(f => /^page-\d{3}\.jpg$/.test(f))
    .reduce((sum, f) => sum + fs.statSync(path.join(outDir, f)).size, 0);

  console.log(`  ✓ TOTO: ${count} pages in ${elapsed}s, total ${(totalSize/1024/1024).toFixed(1)}MB`);
}

async function main() {
  console.log('=== Resize catalogue page images ===\n');
  
  console.log('Resizing Caesar, Viglacera, INAX PNGs → JPEGs...');
  await resizeExisting();

  console.log('\n=== Extracting TOTO from PDF ===');
  await extractTOTO();

  console.log('\n=== Summary ===');
  for (const cat of [...catalogues, { name: 'TOTO', dir: 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén' }]) {
    const dirPath = path.join(ROOT, cat.dir);
    if (!fs.existsSync(dirPath)) continue;
    const jpgs = fs.readdirSync(dirPath).filter(f => f.endsWith('.jpg'));
    const totalSize = jpgs.reduce((sum, f) => sum + fs.statSync(path.join(dirPath, f)).size, 0);
    const avgSize = jpgs.length > 0 ? totalSize / jpgs.length / 1024 : 0;
    console.log(`  ${cat.name}: ${jpgs.length} JPEGs, ${(totalSize/1024/1024).toFixed(1)}MB total, ~${avgSize.toFixed(0)}KB avg`);
  }

  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
