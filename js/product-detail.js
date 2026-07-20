(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var brand = params.get('brand') || '';
  var isEurotile = brand.toLowerCase() === 'eurotile';
  var isVietYTile = brand.toLowerCase() === 'vietytile';

  // ---- pick product set -------------------------------------------

  var products = isEurotile
    ? (window.LAVATILE_EUROTILE_PRODUCTS || [])
    : isVietYTile
    ? (window.LAVATILE_VIETYTILE_PRODUCTS || [])
    : (window.LAVATILE_TILES || []);

  // ---- enrich with generated detail URLs -------------------------

  function normaliseCode(code) {
    return (code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  function lastWord(str) {
    var parts = (str || '').trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  var generatedMap = {};
  var titleMap = {};
  if (window.LavatileGeneratedProducts) {
    window.LavatileGeneratedProducts.forEach(function (gp) {
      generatedMap[normaliseCode(gp.code)] = gp.detailUrl;
      var lw = normaliseCode(lastWord(gp.title));
      if (lw) titleMap[lw] = gp.detailUrl;
    });
  }

  // ---- category enrichment -----------------------------------------

  function assignCategory(p) {
    if (p.type === 'roof') {
      var code = (p.code || '').toUpperCase();
      var title = (p.title || '').toLowerCase();
      if (code.indexOf('S0') === 0 || title.indexOf('sóng') !== -1) return 'Ngói sóng';
      if (code.indexOf('PT') !== -1 || title.indexOf('phẳng') !== -1) return 'Ngói phẳng';
      return 'Ngói phẳng';
    }
    if (p.type === 'garden') return 'Gạch sân vườn';
    return 'Gạch lát nền';
  }

  products.forEach(function (p) {
    if (isEurotile) {
      // Eurotile products already have eurotile_category; no Lavatiles category needed
      p.category = '';
    } else if (isVietYTile) {
      p.category = 'Gạch lát nền';
      p.detailUrl = generatedMap[normaliseCode(p.code)] || '';
    } else {
      p.category = assignCategory(p);
      p.detailUrl = generatedMap[normaliseCode(p.code)] ||
                    titleMap[normaliseCode(lastWord(p.title))] ||
                    '';
    }
  });

  // ---- URL param parser --------------------------------------------

  var CATEGORY_SLUG_MAP = {
    'gach-lat-nen': 'Gạch lát nền',
    'gach-san-vuon': 'Gạch sân vườn',
    'ngoi-phng': 'Ngói phẳng',
    'ngoi-song': 'Ngói sóng'
  };

  function readUrlInitialFilters() {
    var p = new URLSearchParams(window.location.search);
    var catSlug = p.get('category');
    var roomSlug = p.get('rooms');
    var filters = {};
    if (catSlug && CATEGORY_SLUG_MAP[catSlug]) {
      filters.category = [CATEGORY_SLUG_MAP[catSlug]];
    }
    if (roomSlug) {
      filters.rooms = [roomSlug];
    }
    // Eurotile category from URL
    var euroCat = p.get('eurotile_category');
    if (euroCat && isEurotile) {
      filters.eurotile_category = [euroCat];
    }
    return filters;
  }

  // ---- UI: toggle category filter chips --------------------------

  var lavatileCatGroup = document.getElementById('pdCatGroup');
  var euroCatGroup = document.getElementById('pdEurotileCatGroup');
  var vietYTileCatGroup = document.getElementById('pdVietYTileCatGroup');

  if (isEurotile) {
    if (lavatileCatGroup) lavatileCatGroup.hidden = true;
    if (euroCatGroup) euroCatGroup.hidden = false;
    if (vietYTileCatGroup) vietYTileCatGroup.hidden = true;
  } else if (isVietYTile) {
    if (lavatileCatGroup) lavatileCatGroup.hidden = true;
    if (euroCatGroup) euroCatGroup.hidden = true;
    if (vietYTileCatGroup) vietYTileCatGroup.hidden = false;
  } else {
    if (lavatileCatGroup) lavatileCatGroup.hidden = false;
    if (euroCatGroup) euroCatGroup.hidden = true;
    if (vietYTileCatGroup) vietYTileCatGroup.hidden = true;
  }

  // ---- page title/breadcrumb branding ----------------------------

  var pageTitle = document.querySelector('title');
  var pageH1 = document.querySelector('.tiles-hero-content h1');
  var breadcrumb = document.querySelector('.pd-breadcrumb');

  if (isEurotile) {
    var desc = document.querySelector('.tiles-desc p');
    // Update hero
    if (pageTitle) pageTitle.textContent = 'Eurotile | Gạch ốp lát | Lavatiles';
    if (pageH1) pageH1.textContent = 'EUROTILE';
    if (breadcrumb) {
      var lastCrumb = breadcrumb.querySelector('strong');
      if (lastCrumb) lastCrumb.textContent = 'Eurotile';
    }
    // Update section title/description
    var sectionTitle = document.querySelector('#pd-filters h2');
    if (sectionTitle) sectionTitle.textContent = 'Sản phẩm Eurotile';
    var sectionDesc = document.querySelector('#pd-filters p');
    if (sectionDesc) sectionDesc.textContent = 'Khám phá bộ sưu tập gạch ốp lát Eurotile với đa dạng dòng sản phẩm và phong cách thiết kế.';
  }

  // ---- VietY Tile branding ---------------------------------------

  if (isVietYTile) {
    var desc = document.querySelector('.tiles-desc p');
    if (pageTitle) pageTitle.textContent = 'VietY Tile GA + AT | Gạch ốp lát | Lavatiles';
    if (pageH1) pageH1.textContent = 'VIET Y TILE — GA + AT';
    if (breadcrumb) {
      var lastCrumb = breadcrumb.querySelector('strong');
      if (lastCrumb) lastCrumb.textContent = 'VietY Tile';
    }
    var sectionTitle = document.querySelector('#pd-filters h2');
    if (sectionTitle) sectionTitle.textContent = 'Sản phẩm VietY Tile';
    var sectionDesc = document.querySelector('#pd-filters p');
    if (sectionDesc) sectionDesc.textContent = 'Bộ sưu tập gạch granite GA và AT từ VietY Tile với đa dạng kích thước và bề mặt.';
  }

  // ---- card renderer --------------------------------------------

  function cardMarkup(product) {
    var media = product.image
      ? '<img src="' + product.image + '" alt="' + product.code + '" loading="lazy">'
      : '<div class="pd-tile-placeholder">' + product.code + '</div>';
    var specs = '';
    specs += '<li><span>Kích thước</span><strong>' + (product.size || '-') + '</strong></li>';
    specs += '<li><span>Bề mặt</span><strong>' + (product.finish || '-') + '</strong></li>';
    if (product.body) {
      specs += '<li><span>Xương gạch</span><strong>' + product.body + '</strong></li>';
    }
    specs += '<li><span>Vị trí</span><strong>' + ((product.placement || []).join(' / ') || '-') + '</strong></li>';

    // Show collection name for Eurotile products
    if (isEurotile && product.eurotile_collection) {
      specs += '<li><span>Bộ sưu tập</span><strong>' + product.eurotile_collection + '</strong></li>';
    }

    // Show collection for VietY Tile products
    if (isVietYTile && product.collection) {
      specs += '<li><span>Bộ sưu tập</span><strong>' + product.collection + '</strong></li>';
    }

    var body = [
      '<div class="pd-product-media">' + media + '</div>',
      '<div class="pd-product-body">',
      '<h3>' + product.code + '</h3>',
      '<span class="pd-product-brand">' + product.brand + '</span>',
      '<ul class="pd-product-specs">' + specs + '</ul>',
      '</div>',
    ].join('');

    if (product.detailUrl) {
      body = '<a class="pd-product-link" href="' + product.detailUrl + '">' + body + '</a>';
    }

    return [
      '<article class="pd-product-card">',
      body,
      '</article>'
    ].join('');
  }

  // ---- room info panel -------------------------------------------

  function onRender(state) {
    if (isEurotile || isVietYTile) return; // no room info for brand pages
    var active = state.rooms || [];
    var info = document.getElementById('pdRoomInfo');
    var label = document.getElementById('pdRoomInfoLabel');
    var desc = document.getElementById('pdRoomInfoDesc');
    if (!info || !label || !desc) return;

    if (active.length === 1) {
      var room = window.LAVATILE_ROOMS && window.LAVATILE_ROOMS[active[0]];
      if (room) {
        label.textContent = room.label;
        var specParts = [];
        var sizes = room.sizes || room.floor_sizes || [];
        if (sizes.length) specParts.push('Kích thước: ' + sizes.join(', '));
        if (room.finishes && room.finishes.length) specParts.push('Bề mặt: ' + room.finishes.join(', '));
        if (room.bodies && room.bodies.length) specParts.push('Xương gạch: ' + room.bodies.join(', '));
        desc.textContent = room.description + (specParts.length ? ' Gợi ý: ' + specParts.join(' · ') + '.' : '');
        info.hidden = false;
        return;
      }
    }
    info.hidden = true;
  }

  // ---- init ------------------------------------------------------

  if (!window.VCProductFilter) return;

  var filterKeys = isEurotile
    ? ['eurotile_category', 'finish', 'size', 'placement']
    : isVietYTile
    ? ['collection', 'finish', 'size', 'placement']
    : ['finish', 'size', 'placement', 'rooms', 'category'];

  var searchFields = isEurotile
    ? ['code', 'title', 'size', 'finish', 'brand', 'eurotile_collection', 'eurotile_category']
    : isVietYTile
    ? ['code', 'title', 'size', 'finish', 'brand', 'collection']
    : ['code', 'title', 'size', 'rooms', 'finish', 'brand', 'category'];

  window.VCProductFilter.init({
    products: products,
    filterKeys: filterKeys,
    searchFields: searchFields,
    initialFilters: readUrlInitialFilters(),
    cardMarkup: cardMarkup,
    postRender: onRender,
    initialLimit: 12,
    loadStep: 6,
    gridId: 'pd-grid',
    emptyId: 'pdEmpty',
    countId: 'pdResultCount',
    activeId: 'pdActiveFilters',
    loadMoreId: 'pdLoadMore',
    searchId: 'pdSearch',
    resetId: 'pdReset'
  });
})();
