(function () {
  'use strict';

  // Try catalogue data first, fallback to hardcoded curated products
  var products;

  if (window.LAVATILE_SANITARY) {
    var FAUCET_CATEGORIES = [
      'Vòi bếp', 'Vòi lạnh', 'Vòi chậu', 'Vòi chậu cao',
      'Vòi chậu cảm ứng', 'Vòi rửa bát', 'Vòi bồn tắm',
      'Sen tắm', 'Bồn tắm',
    ];

    products = window.LAVATILE_SANITARY.filter(function (p) {
      return FAUCET_CATEGORIES.indexOf(p.category) !== -1;
    });
  }

  if (!products || !products.length) {
    // Fallback: no catalogue data available
    return;
  }

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

    var body = [
      '<div class="pd-product-media">' + media + '</div>',
      '<div class="pd-product-body">',
      '<h3>' + product.title + '</h3>',
      '<span class="pd-product-brand">' + product.brand + ' · ' + product.category + '</span>',
      '<ul class="pd-product-specs">' + specs + '</ul>',
      '</div>'
    ].join('');

    if (product.detailUrl) {
      body = '<a class="pd-product-link" href="' + product.detailUrl + '">' + body + '</a>';
    }

    return [
      '<article class="pd-product-card pd-product-card--faucet">',
      body,
      '</article>'
    ].join('');
  }

  if (!window.VCProductFilter) return;

  window.VCProductFilter.init({
    products: products,
    filterKeys: ['brand', 'category'],
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
