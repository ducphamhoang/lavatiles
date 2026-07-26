import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = '/home/ducph/SideProjects/lavatiles';

// Catalogues that have extracted PNGs and need → JPEG resize
const RESIZE_PNG = [
  { name: 'Caesar', dir: 'assets/pdf/CATALO 06-2026', pattern: /^page-\d{2}\.png$/, pages: 64 },
  { name: 'Viglacera', dir: 'assets/pdf/Catalogue T1-2026', pattern: /^page-\d{2}\.png$/, pages: 65 },
  { name: 'INAX', dir: 'assets/pdf/INAX-CATALOGUE-01.04.2026', pattern: /^page-\d{3}\.png$/, pages: 107 },
];

// PDFs to extract pages from (no existing page images)
const EXTRACT_PDF = [
  { name: 'TOTO', pdf: 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén.pdf', outDir: 'assets/pdf/260323_TOTO Mini_1H26_rev6_view (1)-đã nén', pages: 186 },
  { name: 'VASTA STONE 2024', pdf: 'assets/pdf/VASTA STONE 2024 full-body vein.pdf', outDir: 'assets/pdf/VASTA STONE 2024 full-body vein', pages: 16 },
  { name: 'Vasta Collection', pdf: 'assets/pdf/Vasta Collection.pdf', outDir: 'assets/pdf/Vasta Collection', pages: 105 },
  { name: 'Vasta Essential', pdf: 'assets/pdf/Vasta Essential.pdf', outDir: 'assets/pdf/Vasta Essential', pages: 6 },
  { name: 'VASTA ESSENTIALS_PRODUCTION', pdf: 'assets/pdf/VASTA ESSENTIALS_PRODUCTION - THANG 8.24.pdf', outDir: 'assets/pdf/VASTA ESSENTIALS_PRODUCTION - THANG 8.24', pages: 34 },
  { name: 'NEW_EUROTILE 8', pdf: 'assets/pdf/NEW_EUROTILE 8_120x240_200725.pdf', outDir: 'assets/pdf/NEW_EUROTILE 8_120x240_200725', pages: 44 },
  { name: 'Viglacera Full', pdf: 'assets/pdf/_Catalogue Viglacera Full (100dpi).pdf', outDir: 'assets/pdf/Catalogue Viglacera Full', pages: 138 },
];

// Already have JPEGs — included in summary only
const EXISTING_JPEG = [
  { name: 'VietY GA+AT', dir: 'assets/pdf/GA+AT SQ' },
];

/** Rename page-N.jpg (variable padding) → page-NNN.jpg (3-digit pad) */
function normalizeFilenames(dirPath) {
  const files = fs.readdirSync(dirPath).filter(f => /^page-\d+\.jpg$/.test(f));
  let renamed = 0;
  for (const f of files) {
    const num = parseInt(f.match(/page-(\d+)\.jpg$/)[1], 10);
    const padded = 'page-' + String(num).padStart(3, '0') + '.jpg';
    if (f !== padded) {
      fs.renameSync(path.join(dirPath, f), path.join(dirPath, padded));
      renamed++;
    }
  }
  return renamed;
}

async function resizeExisting() {
  for (const cat of RESIZE_PNG) {
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

async function extractFromPDFs() {
  for (const cat of EXTRACT_PDF) {
    const pdfPath = path.join(ROOT, cat.pdf);
    const outDir = path.join(ROOT, cat.outDir);

    if (!fs.existsSync(pdfPath)) {
      console.log(`\n${cat.name}: PDF not found, skipping`);
      continue;
    }

    fs.mkdirSync(outDir, { recursive: true });

    // Check if already extracted (look for 3-digit JPEGs)
    const existing = fs.readdirSync(outDir).filter(f => /^page-\d{3}\.jpg$/.test(f));
    if (existing.length >= cat.pages) {
      console.log(`\n${cat.name}: ${existing.length} JPEGs already exist, skipping`);
      continue;
    }

    console.log(`\n${cat.name}: Extracting ${cat.pages} pages with pdftoppm...`);
    const start = Date.now();

    execSync(
      `pdftoppm -jpeg -r 96 -scale-to 1200 "${pdfPath}" "${outDir}/page"`,
      { cwd: ROOT, stdio: 'pipe' }
    );

    // Normalize filenames to 3-digit zero-padded
    const renamed = normalizeFilenames(outDir);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const count = fs.readdirSync(outDir).filter(f => /^page-\d{3}\.jpg$/.test(f)).length;
    const totalSize = fs.readdirSync(outDir)
      .filter(f => /^page-\d{3}\.jpg$/.test(f))
      .reduce((sum, f) => sum + fs.statSync(path.join(outDir, f)).size, 0);

    console.log(`  ✓ ${cat.name}: ${count} pages in ${elapsed}s${renamed ? ` (renamed ${renamed} files to 3-digit)` : ''}, total ${(totalSize/1024/1024).toFixed(1)}MB`);
  }
}

function summary() {
  const all = [
    ...RESIZE_PNG.map(c => ({ name: c.name, dir: c.dir })),
    ...EXTRACT_PDF.map(c => ({ name: c.name, dir: c.outDir })),
    ...EXISTING_JPEG,
  ];

  console.log('\n  Catalogue                            JPEGs     Size       Avg/page');
  console.log('  ─────────────────────────────────── ──────── ────────── ────────');
  for (const cat of all) {
    const dirPath = path.join(ROOT, cat.dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`  ${cat.name.padEnd(35)} (no dir)`);
      continue;
    }
    const jpgs = fs.readdirSync(dirPath).filter(f => f.endsWith('.jpg'));
    const totalSize = jpgs.reduce((sum, f) => sum + fs.statSync(path.join(dirPath, f)).size, 0);
    const avgSize = jpgs.length > 0 ? totalSize / jpgs.length / 1024 : 0;
    console.log(`  ${cat.name.padEnd(35)} ${String(jpgs.length).padStart(7)}  ${(totalSize/1024/1024).toFixed(1).padStart(7)} MB  ~${avgSize.toFixed(0).padStart(4)} KB`);
  }
}

async function main() {
  console.log('=== PDF Catalogue → Flipbook Page Images ===\n');

  console.log('Step 1: Resizing existing PNG pages → JPEGs...');
  await resizeExisting();

  console.log('\nStep 2: Extracting pages from PDFs...');
  await extractFromPDFs();

  console.log('\nStep 3: Summary');
  summary();

  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
