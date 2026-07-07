(function () {
  'use strict';

  var products = [
    { code: '33604_299', brand: 'Viglacera', finish: 'Mờ', color: 'Đen', installation: ['Gắn bàn'], shape: 'Tròn/Oval', country: 'Ý', collection: 'GOCCIA', tone: 'matte-black', detailUrl: 'goccia/33604_299.html' },
    { code: '65002_720', brand: 'Viglacera', finish: 'Bóng', color: 'Vàng', installation: ['Gắn bàn'], shape: 'Tròn', country: 'Ý', collection: 'ANTAO', tone: 'warm-brass' },
    { code: '65004_735', brand: 'Viglacera', finish: 'Bóng', color: 'Vàng', installation: ['Đặt sàn'], shape: 'Oval', country: 'Ý', collection: 'ANTAO', tone: 'warm-brass' },
    { code: '65099_031', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Gắn bàn'], shape: 'Tròn', country: 'Ý', collection: 'ANTAO', tone: 'soft-white' },
    { code: 'TVC00046500000', brand: 'Viglacera', finish: 'Bóng', color: 'Màu khác', installation: ['Gắn bàn'], shape: 'Oval', country: 'Trung Quốc', collection: 'METTLACH', tone: 'platinum-grey' },
    { code: 'TVW11200300061', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Gắn tường'], shape: 'Chữ nhật', country: 'Ý', collection: 'INCISO', tone: 'soft-white' },
    { code: 'TVW11200500061', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Gắn bàn'], shape: 'Chữ nhật', country: 'Ý', collection: 'INCISO', tone: 'brushed-chrome' },
    { code: 'TVW11200200061', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Gắn bàn'], shape: 'Vuông', country: 'Ý', collection: 'INCISO', tone: 'soft-white' },
    { code: 'TVW11200700061', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Gắn tường'], shape: 'Vuông', country: 'Ý', collection: 'INCISO', tone: 'brushed-chrome' },
    { code: 'TVW11200400061', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Gắn bàn'], shape: 'Oval', country: 'Ý', collection: 'INCISO', tone: 'soft-white' },
    { code: '59006_299', brand: 'Viglacera', finish: 'Mờ', color: 'Đen', installation: ['Gắn bàn'], shape: 'Vuông', country: 'Thụy Sĩ', collection: 'CONUM', tone: 'matte-black' },
    { code: '59004_149', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Đặt sàn'], shape: 'Tròn', country: 'Thụy Sĩ', collection: 'CONUM', tone: 'platinum-grey' },
    { code: '53004_030', brand: 'Viglacera', finish: 'Bóng', color: 'Đồng', installation: ['Gắn bàn'], shape: 'Oval', country: 'Ý', collection: 'CONUM', tone: 'satin-copper' },
    { code: '53001_706', brand: 'Viglacera', finish: 'Mờ', color: 'Đen', installation: ['Gắn tường'], shape: 'Chữ nhật', country: 'Ý', collection: 'INCISO', tone: 'matte-black' },
    { code: '20001_707', brand: 'Viglacera', finish: 'Mờ', color: 'Đen', installation: ['Gắn bàn'], shape: 'Vuông', country: 'Ý', collection: 'INCISO', tone: 'matte-black' },
    { code: '20002_030', brand: 'Viglacera', finish: 'Bóng', color: 'Đồng', installation: ['Gắn tường'], shape: 'Vuông', country: 'Ý', collection: 'INCISO', tone: 'satin-copper' },
    { code: '20002_149', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Gắn tường'], shape: 'Chữ nhật', country: 'Ý', collection: 'INCISO', tone: 'soft-white' },
    { code: '11924_708', brand: 'Viglacera', finish: 'Bóng', color: 'Đồng', installation: ['Gắn bàn'], shape: 'Tròn', country: 'Ý', collection: 'METTLACH', tone: 'warm-brass' },
    { code: '44836_031', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Gắn bàn'], shape: 'Oval', country: 'Thụy Sĩ', collection: 'CONUM', tone: 'platinum-grey' },
    { code: '20002_706', brand: 'Viglacera', finish: 'Mờ', color: 'Đen', installation: ['Gắn tường'], shape: 'Chữ nhật', country: 'Ý', collection: 'INCISO', tone: 'matte-black' },
    { code: '53002_149', brand: 'Viglacera', finish: 'Bóng', color: 'Trắng', installation: ['Gắn bàn'], shape: 'Tròn', country: 'Ý', collection: 'METTLACH', tone: 'brushed-chrome' }
  ];

  function artMarkup(tone) {
    return [
      '<div class="pf-art pf-tone-' + tone + '">',
      '<div class="pf-spout"></div>',
      '<div class="pf-base"></div>',
      '</div>'
    ].join('');
  }

  function cardMarkup(product) {
    var body = [
      '<div class="pd-product-media">' + artMarkup(product.tone) + '</div>',
      '<div class="pd-product-body">',
      '<div class="pd-product-topline"><span>' + product.brand + ' · ' + product.collection + '</span><strong>' + product.country + '</strong></div>',
      '<h3>' + product.code + '</h3>',
      '<div class="pd-product-meta">',
      '<span>' + product.finish + '</span>',
      '<span>' + product.color + '</span>',
      '</div>',
      '<p class="pd-product-foot">' + product.installation.join(' / ') + ' • ' + product.shape + '</p>',
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
    filterKeys: ['brand', 'finish', 'color', 'installation', 'shape', 'country'],
    searchFields: ['code', 'collection', 'color', 'country', 'shape', 'installation', 'brand'],
    cardMarkup: cardMarkup
  });
})();
