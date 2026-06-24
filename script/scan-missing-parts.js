const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const reportPath = path.join(repoRoot, 'tasks', 'report_07_scan_missing_part.md');

const MENU_SOURCES = [
  { label: 'active header/footer', type: 'site-chrome' },
  { label: 'partials/navbar.html', type: 'html', file: 'partials/navbar.html' },
  { label: 'partials/sidenav.html', type: 'html', file: 'partials/sidenav.html' },
  { label: 'partials/footer.html', type: 'html', file: 'partials/footer.html' },
];

const GENERIC_CTA_TEXT = new Set([
  'xem thêm',
  'chi tiết',
  'xem chi tiết',
  'khám phá',
  'tìm hiểu thêm',
]);

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function lineNumberForOffset(source, offset) {
  return source.slice(0, offset).split(/\r?\n/).length;
}

function decodeHtmlEntities(text) {
  const entities = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };

  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const radix = entity[1].toLowerCase() === 'x' ? 16 : 10;
      const value = parseInt(entity[1].toLowerCase() === 'x' ? entity.slice(2) : entity.slice(1), radix);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }
    return entities[entity.toLowerCase()] || match;
  });
}

function normalizeText(text) {
  return decodeHtmlEntities(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHiddenAndCode(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '');
}

function textFromHtml(html) {
  return normalizeText(stripHiddenAndCode(html).replace(/<[^>]+>/g, ' '));
}

function getAttribute(tag, name) {
  const attr = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return attr ? decodeHtmlEntities(attr[2] || attr[3] || attr[4] || '') : '';
}

function shortSnippet(text, maxLength = 120) {
  const clean = normalizeText(text);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1)}...`;
}

function elementContext(source, offset) {
  const before = source.slice(Math.max(0, offset - 1800), offset);
  const headingMatch = Array.from(before.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)).pop();
  if (headingMatch) return shortSnippet(textFromHtml(headingMatch[1]), 80);

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(source);
  if (titleMatch) return shortSnippet(textFromHtml(titleMatch[1]), 80);

  return '';
}

function findElements(html, tags = ['a', 'button']) {
  const tagPattern = tags.join('|');
  const elementPattern = new RegExp(`<(${tagPattern})\\b([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'gi');
  const elements = [];
  let match;

  while ((match = elementPattern.exec(html))) {
    const tag = match[1].toLowerCase();
    const openTag = `<${match[1]}${match[2]}>`;
    elements.push({
      tag,
      openTag,
      innerHtml: match[3],
      text: textFromHtml(match[3]),
      ariaLabel: normalizeText(getAttribute(openTag, 'aria-label')),
      title: normalizeText(getAttribute(openTag, 'title')),
      href: tag === 'a' ? normalizeText(getAttribute(openTag, 'href')) : '',
      line: lineNumberForOffset(html, match.index),
      offset: match.index,
    });
  }

  return elements;
}

function isMissingHref(href) {
  const clean = normalizeText(href).toLowerCase();
  return !clean || clean === '#' || clean === '#!' || clean.startsWith('javascript:') || clean === 'about:blank';
}

function isExternalOrProtocol(href) {
  return /^(https?:)?\/\//i.test(href) || /^(mailto|tel|sms):/i.test(href);
}

function resolveLocalHref(href, baseDir = '') {
  if (!href || isMissingHref(href) || isExternalOrProtocol(href) || href.startsWith('#')) {
    return null;
  }

  const cleanHref = href.split('#')[0].split('?')[0];
  if (!cleanHref || !cleanHref.endsWith('.html')) return null;

  const normalized = path.normalize(path.join(baseDir, cleanHref)).replace(/\\/g, '/');
  return normalized.startsWith('../') ? null : normalized;
}

function createTarget(attrs) {
  return {
    outerHTML: '',
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
  };
}

function renderSiteChrome() {
  const script = readFile('js/site-chrome.js');
  const header = createTarget({ 'data-site-root': '.', 'data-active-nav': '' });
  const footer = createTarget({ 'data-site-root': '.' });

  const sandbox = {
    document: {
      querySelectorAll(selector) {
        if (selector === '[data-site-header]') return [header];
        if (selector === '[data-site-footer]') return [footer];
        return [];
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(script, sandbox, { filename: 'js/site-chrome.js' });

  return `${header.outerHTML}\n${footer.outerHTML}`;
}

function collectMenuLinks() {
  const records = [];

  MENU_SOURCES.forEach((source) => {
    const html = source.type === 'site-chrome' ? renderSiteChrome() : readFile(source.file);
    findElements(html, ['a']).forEach((element) => {
      const text = element.text || element.ariaLabel || element.title || '(không có text)';
      const href = element.href;
      const resolvedPath = resolveLocalHref(href, '');
      const exists = resolvedPath ? fs.existsSync(path.join(repoRoot, resolvedPath)) : false;

      records.push({
        source: source.label,
        line: element.line,
        text,
        href,
        missingHref: isMissingHref(href),
        resolvedPath,
        exists,
      });
    });
  });

  return records;
}

function collectPagePaths(menuLinks) {
  const pagePaths = new Set(['index.html']);

  menuLinks.forEach((link) => {
    if (link.resolvedPath && link.exists) {
      pagePaths.add(link.resolvedPath);
    }
  });

  return Array.from(pagePaths).sort();
}

function scanPage(relativePath) {
  const html = readFile(relativePath);
  const baseDir = path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath);
  const issues = [];

  findElements(html, ['a', 'button']).forEach((element) => {
    const accessibleName = element.text || element.ariaLabel || element.title;
    const context = elementContext(html, element.offset);

    if (!element.text) {
      issues.push({
        type: 'missing-visible-text',
        severity: element.ariaLabel || element.title ? 'review' : 'high',
        line: element.line,
        element: element.tag,
        text: element.ariaLabel || element.title || '(không có label)',
        href: element.href,
        context,
        note: element.ariaLabel || element.title
          ? 'Có aria-label/title nhưng người dùng không thấy text trên UI.'
          : 'Không có text hiển thị và không có accessible label.',
      });
    }

    if (element.tag === 'a' && isMissingHref(element.href)) {
      issues.push({
        type: 'placeholder-url',
        severity: 'high',
        line: element.line,
        element: element.tag,
        text: accessibleName || '(không có text)',
        href: element.href || '(trống)',
        context,
        note: 'Anchor đang dùng URL placeholder.',
      });
    }

    if (element.tag === 'a') {
      const resolvedPath = resolveLocalHref(element.href, baseDir);
      if (resolvedPath && !fs.existsSync(path.join(repoRoot, resolvedPath))) {
        issues.push({
          type: 'broken-local-url',
          severity: 'high',
          line: element.line,
          element: element.tag,
          text: accessibleName || '(không có text)',
          href: element.href,
          context,
          note: `Local HTML không tồn tại: ${resolvedPath}`,
        });
      }
    }

    if (GENERIC_CTA_TEXT.has(element.text.toLowerCase())) {
      issues.push({
        type: 'generic-cta-text',
        severity: 'review',
        line: element.line,
        element: element.tag,
        text: element.text,
        href: element.href,
        context,
        note: 'CTA chung chung; nên thêm ngữ cảnh trong text hoặc điểm đến.',
      });
    }
  });

  return issues;
}

function issueTypeLabel(type) {
  return {
    'missing-visible-text': 'Thiếu text hiển thị',
    'placeholder-url': 'URL placeholder',
    'broken-local-url': 'URL local lỗi',
    'generic-cta-text': 'CTA chung chung',
  }[type] || type;
}

function renderTable(headers, rows) {
  if (!rows.length) return '_Không phát hiện._\n';

  const escapeCell = (value) => String(value === undefined || value === null ? '' : value)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');

  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
  ].join('\n') + '\n';
}

function groupBy(records, keyFn) {
  return records.reduce((groups, record) => {
    const key = keyFn(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
    return groups;
  }, new Map());
}

function renderReport(menuLinks, pagePaths, pageIssues) {
  const missingMenuLinks = menuLinks.filter((link) => link.missingHref);
  const brokenMenuLinks = menuLinks.filter((link) => link.resolvedPath && !link.exists);
  const uniqueMissingMenuLinks = Array.from(groupBy(
    missingMenuLinks,
    (link) => `${link.text}__${link.href}`
  ).values()).map((links) => ({
    ...links[0],
    occurrences: links.length,
    sources: Array.from(new Set(links.map((link) => `${link.source}:${link.line}`))).join('<br>'),
  }));

  const pageRows = [];
  pagePaths.forEach((page) => {
    (pageIssues.get(page) || []).forEach((issue) => {
      pageRows.push([
        page,
        issue.line,
        issueTypeLabel(issue.type),
        issue.severity,
        issue.text,
        issue.href || '',
        issue.context || '',
        issue.note,
      ]);
    });
  });

  const byType = pageRows.reduce((counts, row) => {
    counts[row[2]] = (counts[row[2]] || 0) + 1;
    return counts;
  }, {});

  const summaryRows = [
    ['Menu links scanned', menuLinks.length],
    ['Menu missing/placeholder URL occurrences', missingMenuLinks.length],
    ['Unique menu items missing URL', uniqueMissingMenuLinks.length],
    ['Broken menu local URLs', brokenMenuLinks.length],
    ['Menu pages scanned', pagePaths.length],
    ['Page QC issues', pageRows.length],
    ...Object.entries(byType).map(([type, count]) => [type, count]),
  ];

  const report = [
    '# Spec 07 QC report: missing URLs and missing text',
    '',
    `Generated by \`node script/scan-missing-parts.js\`.`,
    '',
    '## Scope',
    '',
    '- Reads the active header/footer generated by `js/site-chrome.js`.',
    '- Cross-checks legacy shared partials: `partials/navbar.html`, `partials/sidenav.html`, `partials/footer.html`.',
    '- Scans existing local `.html` pages linked from those menus, plus `index.html`.',
    '- Treats `#`, empty hrefs, JavaScript hrefs, and missing local HTML files as URL issues.',
    '- Treats icon-only anchors/buttons as missing visible text from user POV, even when an `aria-label` exists.',
    '',
    '## Summary',
    '',
    renderTable(['Metric', 'Count'], summaryRows),
    '## Menu items missing URL',
    '',
    renderTable(
      ['Text', 'Href', 'Occurrences', 'Sources'],
      uniqueMissingMenuLinks.map((link) => [link.text, link.href || '(trống)', link.occurrences, link.sources])
    ),
    '## Broken menu URLs',
    '',
    renderTable(
      ['Text', 'Href', 'Resolved local path', 'Source'],
      brokenMenuLinks.map((link) => [link.text, link.href, link.resolvedPath, `${link.source}:${link.line}`])
    ),
    '## Scanned menu pages',
    '',
    pagePaths.map((page) => `- \`${page}\``).join('\n') || '_Không có page hợp lệ._',
    '',
    '## Page-level QC issues',
    '',
    renderTable(
      ['Page', 'Line', 'Issue', 'Severity', 'User-facing text', 'Href', 'Nearest context', 'Note'],
      pageRows
    ),
    '## Recommended next fixes',
    '',
    '1. Replace menu placeholders for product taxonomy pages before adding more collection content.',
    '2. Update menu-linked landing pages that still use `href="#"` on visible CTAs.',
    '3. Review icon-only controls and decide which need visible text versus aria-label-only treatment.',
    '4. Rewrite repeated `Xem thêm` CTAs when multiple cards point to different user intents.',
    '',
  ].join('\n');

  fs.writeFileSync(reportPath, report, 'utf8');
}

function main() {
  const menuLinks = collectMenuLinks();
  const pagePaths = collectPagePaths(menuLinks);
  const pageIssues = new Map();

  pagePaths.forEach((page) => {
    pageIssues.set(page, scanPage(page));
  });

  renderReport(menuLinks, pagePaths, pageIssues);

  const issueCount = Array.from(pageIssues.values()).reduce((total, issues) => total + issues.length, 0);
  const missingMenuCount = menuLinks.filter((link) => link.missingHref).length;
  console.log(`Scanned ${menuLinks.length} menu links and ${pagePaths.length} menu pages.`);
  console.log(`Found ${missingMenuCount} menu placeholder URLs and ${issueCount} page-level QC issues.`);
  console.log(`Report written to ${path.relative(repoRoot, reportPath)}`);
}

main();
