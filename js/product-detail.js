(function () {
  'use strict';
  var products = window.LAVATILE_TILES || [];

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

  // assign category to each product
  products.forEach(function (p) { p.category = assignCategory(p); });

  // ---- URL param parser --------------------------------------------

  var CATEGORY_SLUG_MAP = {
    'gach-lat-nen': 'Gạch lát nền',
    'gach-san-vuon': 'Gạch sân vườn',
    'ngoi-phng': 'Ngói phẳng',
    'ngoi-song': 'Ngói sóng'
  };

  function readUrlInitialFilters() {
    var params = new URLSearchParams(window.location.search);
    var catSlug = params.get('category');
    var roomSlug = params.get('rooms');
    var filters = {};
    if (catSlug && CATEGORY_SLUG_MAP[catSlug]) {
      filters.category = [CATEGORY_SLUG_MAP[catSlug]];
    }
    if (roomSlug) {
      filters.rooms = [roomSlug];
    }
    return filters;
  }

  // ---- card renderer (image-based) --------------------------------

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

    return [
      '<article class="pd-product-card">',
      '<div class="pd-product-media">' + media + '</div>',
      '<div class="pd-product-body">',
      '<h3>' + product.code + '</h3>',
      '<span class="pd-product-brand">' + product.brand + '</span>',
      '<ul class="pd-product-specs">' + specs + '</ul>',
      '</div>',
      '</article>'
    ].join('');
  }

  // ---- room info panel -------------------------------------------

  function onRender(state) {
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

  window.VCProductFilter.init({
    products: products,
    filterKeys: ['finish', 'size', 'placement', 'rooms', 'category'],
    searchFields: ['code', 'title', 'size', 'rooms', 'finish', 'brand', 'category'],
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
