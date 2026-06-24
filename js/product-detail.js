(function () {
  'use strict';
  var products = [
    { code: '3060PM36602S', finish: 'Bóng', color: 'Trắng', size: '30x60cm', placement: ['Tường'], country: 'Malaysia', tone: 'pearl-white', collection: 'ONYCE' },
    { code: '612MF6N', finish: 'Mờ', color: 'Kem', size: '60x120cm', placement: ['Sàn', 'Tường'], country: 'Ý', tone: 'sand-cream', collection: 'TELE DI MARMO LUMIA' },
    { code: '612EN8A', finish: 'Bóng', color: 'Xám', size: '60x120cm', placement: ['Sàn', 'Tường'], country: 'Tây Ban Nha', tone: 'silver-grey', collection: 'MARVEL X' },
    { code: '612MTSACRMT', finish: 'Mờ', color: 'Nâu', size: '60x120cm', placement: ['Tường'], country: 'Ấn Độ', tone: 'cocoa-vein', collection: 'MARVEL GALA' },
    { code: '75150MXFIBOSK', finish: 'Bóng', color: 'Đen', size: '75x150cm', placement: ['Sàn'], country: 'Ý', tone: 'obsidian-gold', collection: 'ONYCE' },
    { code: '612MOPELP', finish: 'Mờ', color: 'Xanh dương; xanh lá', size: '60x120cm', placement: ['Tường'], country: 'Indonesia', tone: 'verdant-mist', collection: 'TELE DI MARMO LUMIA' },
    { code: '612MVGRLP', finish: 'Mờ', color: 'Xám', size: '60x120cm', placement: ['Sàn', 'Tường'], country: 'Malaysia', tone: 'graphite-cloud', collection: 'MARVEL X' },
    { code: '612MHCAPRLP', finish: 'Bóng', color: 'Kem', size: '60x120cm', placement: ['Sàn', 'Tường'], country: 'Ý', tone: 'ivory-gold', collection: 'ONYCE' },
    { code: '120278MADSOLP', finish: 'Mờ', color: 'Trắng', size: '120x278cm', placement: ['Tường'], country: 'Ý', tone: 'alabaster-fine', collection: 'TELE DI MARMO LUMIA' },
    { code: '612MXCAAPHA', finish: 'Bóng', color: 'Hồng', size: '60x120cm', placement: ['Tường'], country: 'Trung Quốc', tone: 'rose-marble', collection: 'MARVEL GALA' },
    { code: '120278MDBLTESK', finish: 'Mờ', color: 'Đen', size: '120x278cm', placement: ['Tường'], country: 'Ý', tone: 'noir-strata', collection: 'MARVEL X' },
    { code: '120278MDWHEVSK', finish: 'Bóng', color: 'Trắng', size: '120x278cm', placement: ['Tường'], country: 'Ý', tone: 'white-veil', collection: 'TELE DI MARMO LUMIA' },
    { code: '120MDWHEVVE', finish: 'Bóng', color: 'Trắng', size: '120x120cm', placement: ['Sàn', 'Tường'], country: 'Thái Lan', tone: 'opal-mirror', collection: 'ONYCE' },
    { code: '612MDBLTEVE', finish: 'Bóng', color: 'Xám', size: '60x120cm', placement: ['Sàn'], country: 'Ý', tone: 'smoke-polish', collection: 'MARVEL GALA' },
    { code: '120278MACABLLP', finish: 'Mờ', color: 'Kem', size: '120x278cm', placement: ['Tường'], country: 'Ý', tone: 'calacatta-warm', collection: 'TELE DI MARMO LUMIA' },
    { code: '612MACABLLP', finish: 'Mờ', color: 'Kem', size: '60x120cm', placement: ['Sàn', 'Tường'], country: 'Tây Ban Nha', tone: 'calacatta-soft', collection: 'ONYCE' }
  ];

  var generatedProducts = window.LavatileGeneratedProducts || null;
  var generatedFacets = window.LavatileProductFacets || null;
  var activeProducts = generatedProducts || products;
  var filterKeys = generatedProducts ? ['finish', 'category', 'size', 'placement'] : ['finish', 'color', 'size', 'placement'];
  var searchFields = generatedProducts ? ['code', 'title', 'collection', 'category', 'size', 'country', 'placement'] : ['code', 'collection', 'color', 'size', 'country'];

  function toneMarkup(tone) {
    return '<div class="pd-tile-art pd-tone-' + tone + '"><div class="pd-tile-shine"></div></div>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  function filterButtonMarkup(group, item) {
    return '<button type="button" class="pd-chip" data-filter-group="' + escapeHtml(group) + '" data-filter-value="' + escapeHtml(item.value) + '">' + escapeHtml(item.label) + '</button>';
  }

  function filterCheckboxMarkup(group, item) {
    var id = 'pd-' + group + '-' + slugify(item.value);
    return '<label for="' + escapeHtml(id) + '"><input id="' + escapeHtml(id) + '" type="checkbox" data-filter-group="' + escapeHtml(group) + '" value="' + escapeHtml(item.value) + '"> ' + escapeHtml(item.label) + '</label>';
  }

  function renderGeneratedFilters() {
    if (!generatedFacets) return;
    var config = {
      finish: { values: generatedFacets.finishes || [], markup: filterCheckboxMarkup },
      category: { values: generatedFacets.categories || [], markup: filterButtonMarkup },
      size: { values: generatedFacets.sizes || [], markup: filterButtonMarkup },
      placement: { values: generatedFacets.placements || [], markup: filterButtonMarkup }
    };

    Object.keys(config).forEach(function (group) {
      var target = document.querySelector('[data-generated-filter-list="' + group + '"]');
      if (!target || !config[group].values.length) return;
      target.innerHTML = config[group].values.map(function (item) {
        return config[group].markup(group, item);
      }).join('');
    });
  }

  function valuesFromQuery(group) {
    var params = new URLSearchParams(window.location.search);
    var rawValues = params.getAll(group).concat(params.getAll(group + '[]'));
    var values = [];
    rawValues.forEach(function (raw) {
      raw.split(',').forEach(function (value) {
        var normalized = value.trim();
        if (normalized) values.push(normalized);
      });
    });
    return values;
  }

  function matchFacetValues(group, rawValues) {
    var facetKey = group === 'category' ? 'categories' : group + 's';
    var facets = generatedFacets && generatedFacets[facetKey] || [];
    return rawValues.map(function (raw) {
      var rawSlug = slugify(raw);
      var match = facets.find(function (item) {
        return item.value === raw || item.label === raw || item.slug === raw || slugify(item.value) === rawSlug || slugify(item.label) === rawSlug;
      });
      return match ? match.value : raw;
    });
  }

  function initialFiltersFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var initial = {};
    filterKeys.forEach(function (group) {
      initial[group] = matchFacetValues(group, valuesFromQuery(group));
    });
    if (params.has('search')) {
      initial.search = params.get('search') || '';
    }
    return initial;
  }

  function mediaMarkup(product) {
    if (product.image) {
      return '<img class="pd-product-image" src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.title || product.code) + '" loading="lazy" decoding="async">';
    }
    return toneMarkup(product.tone || 'alabaster-fine');
  }

  function cardMarkup(product) {
    var title = product.title || product.code;
    var detail = [
      '<div class="pd-product-media">' + mediaMarkup(product) + '</div>',
      '<div class="pd-product-body">',
      '<div class="pd-product-topline"><span>' + escapeHtml(product.collection) + '</span><strong>' + escapeHtml(product.country) + '</strong></div>',
      '<h3>' + escapeHtml(title) + '</h3>',
      '<ul class="pd-product-specs">',
      '<li><span>Mã sản phẩm</span><strong>' + escapeHtml(product.code) + '</strong></li>',
      '<li><span>Bề mặt</span><strong>' + escapeHtml(product.finishLabel || product.finish) + '</strong></li>',
      '<li><span>Kích thước</span><strong>' + escapeHtml(product.size) + '</strong></li>',
      '<li><span>Vị trí</span><strong>' + escapeHtml(product.placement.join(' / ')) + '</strong></li>',
      '</ul>',
      '</div>'
    ].join('');

    if (product.detailUrl) {
      detail = '<a class="pd-product-link" href="' + escapeHtml(product.detailUrl) + '">' + detail + '</a>';
    }

    return [
      '<article class="pd-product-card">',
      detail,
      '</article>'
    ].join('');
  }

  if (!window.VCProductFilter) return;

  renderGeneratedFilters();

  window.VCProductFilter.init({
    products: activeProducts,
    filterKeys: filterKeys,
    searchFields: searchFields,
    cardMarkup: cardMarkup,
    initialFilters: initialFiltersFromQuery(),
    initialLimit: generatedProducts ? 12 : 8,
    loadStep: generatedProducts ? 12 : 4
  });
})();
