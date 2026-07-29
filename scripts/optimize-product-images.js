#!/usr/bin/env node
/**
 * Compress oversized crawled product images and update local data references.
 *
 * Run: node scripts/optimize-product-images.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const LIMIT = 500 * 1024;
const DATASETS = ['new-caesar', 'new-inax'];

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(filePath));
    else if (/\.(?:avif|gif|jpe?g|png|webp)$/i.test(entry.name)) files.push(filePath);
  }
  return files;
}

async function compress(input, output, maxDimension, quality) {
  const temporary = `${output}.tmp`;
  await sharp(input)
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(temporary);
  const size = fs.statSync(temporary).size;
  if (size <= LIMIT) {
    fs.renameSync(temporary, output);
    if (input !== output) fs.unlinkSync(input);
    return size;
  }
  fs.unlinkSync(temporary);
  return 0;
}

async function optimizeImage(input) {
  const oldSize = fs.statSync(input).size;
  if (oldSize <= LIMIT) return null;
  const output = input.replace(/\.[^.]+$/, '.webp');
  const dimensions = [2200, 1800, 1400, 1100, 900, 700];
  const qualities = [76, 68, 60, 52, 45, 38];
  for (const maxDimension of dimensions) {
    for (const quality of qualities) {
      const size = await compress(input, output, maxDimension, quality);
      if (size) return { oldPath: input, newPath: output, size, oldSize };
    }
  }
  throw new Error(`Could not compress below 500 KB: ${input}`);
}

function updateDataset(dataset, mappings) {
  const treePath = path.join(ROOT, 'data', 'product', dataset, 'products-tree.json');
  const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
  const dataRoot = path.join(ROOT, 'data', 'product', dataset);
  const replace = (value) => {
    let result = value;
    for (const [oldPath, newPath] of mappings) {
      const oldRelative = path.relative(dataRoot, oldPath).replace(/\\/g, '/');
      const newRelative = path.relative(dataRoot, newPath).replace(/\\/g, '/');
      result = result.split(oldRelative).join(newRelative);
    }
    const localPath = path.join(dataRoot, result);
    if (!fs.existsSync(localPath) && /^images\//.test(result)) {
      const webpPath = `${localPath.replace(/\.[^.]+$/, '')}.webp`;
      if (fs.existsSync(webpPath)) result = `${result.replace(/\.[^.]+$/, '')}.webp`;
    }
    return result;
  };
  for (const products of Object.values(tree)) {
    for (const product of Object.values(products || {})) {
      product.images = (product.images || []).map(replace);
      if (product.description_html) product.description_html = replace(product.description_html);
    }
  }
  fs.writeFileSync(treePath, `${JSON.stringify(tree, null, 2)}\n`);
}

async function main() {
  let optimized = 0;
  let savedBytes = 0;
  for (const dataset of DATASETS) {
    const imageRoot = path.join(ROOT, 'data', 'product', dataset, 'images');
    const mappings = [];
    for (const input of walk(imageRoot)) {
      const result = await optimizeImage(input);
      if (!result) continue;
      mappings.push([result.oldPath, result.newPath]);
      optimized += 1;
      savedBytes += result.oldSize - result.size;
    }
    updateDataset(dataset, mappings);
    console.log(`${dataset}: optimized ${mappings.length} images`);
  }
  console.log(`Optimized ${optimized} images; source bytes removed: ${(savedBytes / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
