(function () {
  'use strict';
  var products = window.LAVATILE_TILES || [];
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
    filterKeys: ['finish', 'size', 'placement', 'rooms'],
    searchFields: ['code', 'title', 'size', 'rooms', 'finish', 'brand'],
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
