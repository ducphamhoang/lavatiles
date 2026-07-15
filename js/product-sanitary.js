(function () {
  'use strict';

  var products = window.LAVATILE_SANITARY || [];

  if (!products.length || !window.VCProductFilter) return;

  function cardMarkup(product) {
    var media = product.image
      ? '<img src="' + product.image + '" alt="' + product.code + '" loading="lazy">'
      : '<div class="pd-tile-placeholder">' + product.code + '</div>';

    var specs = '';
    specs += '<li><span>Mã</span><strong>' + product.code + '</strong></li>';
    if (product.category) specs += '<li><span>Loại</span><strong>' + product.category + '</strong></li>';
    if (product.dimensions) specs += '<li><span>Kích thước</span><strong>' + product.dimensions + '</strong></li>';
    if (product.price) specs += '<li><span>Giá</span><strong>' + product.price + '</strong></li>';
    if (product.technology) specs += '<li><span>Công nghệ</span><strong>' + product.technology + '</strong></li>';

    var url = product.detailUrl || '#';
    return [
      '<a class="pd-product-card" href="' + url + '">',
      '<div class="pd-product-media">' + media + '</div>',
      '<div class="pd-product-body">',
      '<h3>' + product.title + '</h3>',
      '<span class="pd-product-brand">' + product.brand + ' · ' + product.category + '</span>',
      '<ul class="pd-product-specs">' + specs + '</ul>',
      '</div>',
      '</a>'
    ].join('');
  }

  window.VCProductFilter.init({
    products: products,
    filterKeys: ['brand', 'category', 'rooms'],
    searchFields: ['code', 'title', 'brand', 'category', 'technology', 'dimensions'],
    cardMarkup: cardMarkup,
    initialLimit: 24,
    loadStep: 12,
    gridId: 'pd-grid',
    emptyId: 'pdEmpty',
    countId: 'pdResultCount',
    activeId: 'pdActiveFilters',
    loadMoreId: 'pdLoadMore',
    searchId: 'pdSearch',
    resetId: 'pdReset'
  });
})();
