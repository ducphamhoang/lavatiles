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
  function toneMarkup(tone) {
    return '<div class="pd-tile-art pd-tone-' + tone + '"><div class="pd-tile-shine"></div></div>';
  }
  function cardMarkup(product) {
    return [
      '<article class="pd-product-card">',
      '<div class="pd-product-media">' + toneMarkup(product.tone) + '</div>',
      '<div class="pd-product-body">',
      '<div class="pd-product-topline"><span>' + product.collection + '</span><strong>' + product.country + '</strong></div>',
      '<h3>' + product.code + '</h3>',
      '<ul class="pd-product-specs">',
      '<li><span>Bề mặt</span><strong>' + product.finish + '</strong></li>',
      '<li><span>Màu sắc</span><strong>' + product.color + '</strong></li>',
      '<li><span>Kích thước</span><strong>' + product.size + '</strong></li>',
      '<li><span>Vị trí</span><strong>' + product.placement.join(' / ') + '</strong></li>',
      '</ul>',
      '</div>',
      '</article>'
    ].join('');
  }

  if (!window.VCProductFilter) return;

  window.VCProductFilter.init({
    products: products,
    filterKeys: ['finish', 'color', 'size', 'placement'],
    searchFields: ['code', 'collection', 'color', 'size', 'country'],
    cardMarkup: cardMarkup
  });
})();
