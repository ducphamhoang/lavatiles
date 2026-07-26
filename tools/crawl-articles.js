#!/usr/bin/env node
/**
 * Crawl article content from Vietceramics and populate data/articles.json
 *
 * Usage: node tools/crawl-articles.js
 *
 * Reads data/articles-skeleton.json with slugs/URLs, fetches each article,
 * extracts body content blocks, writes data/articles.json.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKELETON = path.join(ROOT, 'data', 'articles-skeleton.json');
const OUTPUT = path.join(ROOT, 'data', 'articles.json');

const skeleton = JSON.parse(fs.readFileSync(SKELETON, 'utf-8'));

function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractBetween(text, start, end) {
  const s = text.indexOf(start);
  if (s === -1) return '';
  const e = text.indexOf(end, s + start.length);
  if (e === -1) return text.substring(s + start.length);
  return text.substring(s + start.length, e);
}

function extractBlocks(html, template) {
  const blocks = [];

  if (template === 'B') {
    // Template B: section-blog-detail-header + complex blocks
    // Extract hero images from section-blog-detail-header
    const heroSection = extractBetween(html, '<section class="section-blog-detail-header">', '</section>');
    const heroImages = [];
    if (heroSection) {
      const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
      let match;
      while ((match = imgRegex.exec(heroSection)) !== null) {
        heroImages.push(match[1]);
      }
    }

    // Find post-detail-body content
    let bodyHtml = extractBetween(html,
      'class="post-detail-body"',
      '</section>\n    <!-- Related -->'
    );

    if (!bodyHtml) {
      bodyHtml = extractBetween(html,
        'class="post-detail-body"',
        '</section>'
      );
    }

    if (bodyHtml) {
      // Remove any container wrappers
      bodyHtml = bodyHtml.replace(/<div class="container">/g, '').replace(/<\/div>\s*$/g, '');

      // Extract each block
      const blockTypes = [
        'block-paragraph_special',
        'block-image_two_column',
        'block-image_text_two_column',
        'block-images_text_two_column',
        'block-image_text_color_two_column',
        'block-image',
        'block-paragraph_block'
      ];

      for (const type of blockTypes) {
        const pattern = new RegExp(
          '<div class="' + type.replace(/_/g, '[_-]') + '"[\\s\\S]*?</div>\\s*</div>\\s*</div>',
          'g'
        );
        let match;
        while ((match = pattern.exec(bodyHtml)) !== null) {
          blocks.push({ type, html: match[0] });
        }
      }
    }

    return { heroImages, blocks };

  } else {
    // Template A: Standard layout
    const bodySection = extractBetween(html,
      'class="post-detail-body"',
      '</section>\n    <!-- Related -->'
    );

    if (bodySection) {
      const blockTypes = ['block-image', 'block-paragraph_block'];
      for (const type of blockTypes) {
        const pattern = new RegExp(
          '<div class="' + type + '"[\\s\\S]*?</div>\\s*</div>',
          'g'
        );
        let match;
        while ((match = pattern.exec(bodySection)) !== null) {
          blocks.push({ type, html: match[0] });
        }
      }
    }

    return { blocks };
  }
}

function extractImagesFromBlocks(blocks, baseUrl) {
  const images = [];
  const slug = path.basename(baseUrl.replace(/\/$/, ''));
  let counter = 1;

  for (const block of blocks) {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let match;
    while ((match = imgRegex.exec(block.html)) !== null) {
      const url = match[1].startsWith('http') ? match[1] : 'https://vietceramics.com' + match[1];
      const ext = path.extname(url.split('?')[0]) || '.jpg';
      const filename = 'img-' + String(counter++).padStart(2, '0') + ext;
      images.push({ url, local: filename });
    }
  }

  return images;
}

async function main() {
  const results = [];

  for (const article of skeleton) {
    process.stdout.write(`\n[FETCH] ${article.slug}... `);
    try {
      const html = await fetch(article.url);
      process.stdout.write(`OK (${html.length} bytes)\n`);

      // Extract meta
      const title = extractBetween(html, '<h1 class="post-title', '</h1>');
      const cleanTitle = title ? title.replace(/[^>]*>/, '').replace(/<[^>]*>/g, '').trim() : article.title;

      const lead = extractBetween(html, '<div class="short-content">', '</div>');
      const cleanLead = lead ? lead.replace(/<[^>]*>/g, '').trim() : '';

      const dateMatch = html.match(/<li>(\d{2}\/\d{2}\/\d{4})<\/li>/);
      const date = dateMatch ? dateMatch[1] : article.date;

      // Extract category from post-category link
      const catMatch = html.match(/<div class="post-category">[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
      const categoryName = catMatch ? catMatch[1].trim() : article.category_name;

      // Extract body blocks
      const { heroImages, blocks: rawBlocks } = extractBlocks(html, article.template);

      // Convert raw blocks to structured data
      const blocks = [];
      for (const raw of rawBlocks) {
        if (raw.type === 'block-image') {
          const imgMatch = raw.html.match(/<img[^>]+src="([^"]+)"[^>]*>/);
          const capMatch = raw.html.match(/<span class="img-alt">([^<]*)<\/span>/);
          const src = imgMatch ? imgMatch[1] : '';
          blocks.push({
            type: 'block-image',
            src: path.basename(src.split('?')[0]),
            alt: capMatch ? capMatch[1] : '',
            caption: capMatch ? capMatch[1] : ''
          });
        } else if (raw.type === 'block-paragraph_block') {
          const h2Match = raw.html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
          const content = raw.html
            .replace(/<div class="block-paragraph_block">/g, '')
            .replace(/<div class="row">[\s\S]*?<div class="[^"]*">/g, '')
            .replace(/<\/div>\s*<\/div>\s*<\/div>\s*$/g, '')
            .trim();
          blocks.push({
            type: 'block-paragraph_block',
            heading: h2Match ? h2Match[1].replace(/<[^>]*>/g, '') : '',
            content: content
          });
        } else if (raw.type === 'block-paragraph_special') {
          const pContent = extractBetween(raw.html,
            '<div class="inner-content">',
            '</div>\n                </div>\n            </div>\n        </div>\n    </div>\n</section>'
          ) || extractBetween(raw.html,
            '<div class="inner-content">',
            '</div>'
          );
          blocks.push({
            type: 'block-paragraph_special',
            content: pContent ? pContent.trim() : raw.html
          });
        } else if (raw.type === 'block-image_two_column') {
          const images = [];
          const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
          let m;
          while ((m = imgRegex.exec(raw.html)) !== null) {
            images.push({
              src: path.basename(m[1].split('?')[0]),
              alt: '',
              colClass: images.length === 0 ? 'col-8' : 'col-4'
            });
          }
          blocks.push({ type: 'block-image_two_column', images });
        } else if (raw.type === 'block-image_text_two_column') {
          const imgMatch = raw.html.match(/<img[^>]+src="([^"]+)"[^>]*>/);
          const contentMatch = raw.html.match(/<div class="inner-content">([\s\S]*?)<\/div>/);
          blocks.push({
            type: 'block-image_text_two_column',
            image: { src: imgMatch ? path.basename(imgMatch[1].split('?')[0]) : '', alt: '', caption: '' },
            content: contentMatch ? contentMatch[1].trim() : '',
            reverse: raw.html.includes('order-1') ? false : true
          });
        } else if (raw.type === 'block-images_text_two_column') {
          const columns = [];
          const parts = raw.html.match(/<div class="(col-[^"]+)">([\s\S]*?)<\/div>\s*<\/div>/g) || [];
          // simpler: extract images and text blocks
          const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
          let m;
          let imgIdx = 0;
          while ((m = imgRegex.exec(raw.html)) !== null && imgIdx < 2) {
            columns.push({
              type: 'image',
              src: path.basename(m[1].split('?')[0]),
              alt: '',
              caption: ''
            });
            imgIdx++;
          }
          const contentMatch = raw.html.match(/<div class="inner-content">([\s\S]*?)<\/div>/);
          if (contentMatch) {
            columns.push({ type: 'text', content: contentMatch[1].trim() });
          }
          blocks.push({ type: 'block-images_text_two_column', columns });
        } else if (raw.type === 'block-image_text_color_two_column') {
          const imgMatch = raw.html.match(/<img[^>]+src="([^"]+)"[^>]*>/);
          const contentMatch = raw.html.match(/<div class="inner-content[^"]*">([\s\S]*?)<\/div>/);
          blocks.push({
            type: 'block-image_text_color_two_column',
            image: { src: imgMatch ? path.basename(imgMatch[1].split('?')[0]) : '', alt: '', caption: '' },
            content: contentMatch ? contentMatch[1].trim() : ''
          });
        }
      }

      // Extract hero images
      const heroImgList = [];
      if (heroImages && heroImages.length) {
        let hi = 1;
        for (const url of heroImages) {
          const cleanUrl = url.startsWith('http') ? url : 'https://vietceramics.com' + url;
          const ext = path.extname(cleanUrl.split('?')[0]) || '.jpg';
          const filename = 'hero-' + hi + ext;
          heroImgList.push({ url: cleanUrl, local: filename });
          hi++;
        }
      }

      // Extract block images
      const blockImgList = [];
      for (const block of blocks) {
        if (block.type === 'block-image' && block.src) {
          const srcUrl = block.src.startsWith('http') ? block.src :
            'https://vietceramics.com/media/images/' + block.src.split('?')[0].replace('/media/images/', '');
          // We need the original URL
        }
      }

      // Collect all images from the article HTML
      const allImages = [];
      const allImgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
      let mi;
      while ((mi = allImgRegex.exec(html)) !== null) {
        const imgUrl = mi[1].startsWith('http') ? mi[1] : 'https://vietceramics.com' + mi[1];
        if (imgUrl.includes('/media/images/') && !imgUrl.includes('logo') && !imgUrl.includes('icon')) {
          const ext = path.extname(imgUrl.split('?')[0]) || '.jpg';
          const name = path.basename(imgUrl.split('?')[0]).replace(/\.\w+$/, '');
          const filename = name.substring(0, 40) + ext;
          allImages.push({ url: imgUrl, local: filename });
        }
      }

      // Deduplicate
      const seen = new Set();
      const images = allImages.filter(img => {
        const key = img.local;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const slug = article.slug;

      // Build the article object
      const result = {
        slug,
        template: article.template,
        category_id: article.category_id,
        category_name: categoryName,
        title: cleanTitle || article.title,
        date,
        description: cleanLead.substring(0, 200),
        lead: cleanLead,
        thumbnail: images.length > 0 ? images[0].local : '',
        heroImages: images.slice(0, 3).map(img => ({ src: img.local, alt: '', caption: '' })),
        blocks,
        images,
        related: article.related || []
      };

      results.push(result);
      process.stdout.write(`  → ${blocks.length} blocks, ${images.length} images\n`);

    } catch (err) {
      process.stdout.write(`ERROR: ${err.message}\n`);
      // Still add with skeleton data
      results.push({ ...article, blocks: [], images: [], related: article.related || [] });
    }

    // Delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nDone! Wrote ${results.length} articles to ${OUTPUT}`);
}

main().catch(console.error);
