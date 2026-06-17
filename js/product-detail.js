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
  var state = { search: '', finish: [], color: [], size: [], placement: [], limit: 8 };
  var grid = document.getElementById('pd-grid');
  var empty = document.getElementById('pdEmpty');
  var count = document.getElementById('pdResultCount');
  var active = document.getElementById('pdActiveFilters');
  var loadMore = document.getElementById('pdLoadMore');
  var search = document.getElementById('pdSearch');
  var reset = document.getElementById('pdReset');
  if (!grid || !empty || !count || !active || !loadMore || !search || !reset) return;
  function hasMatch(product, key) {
    if (!state[key].length) return true;
    if (Array.isArray(product[key])) return state[key].some(function (value) { return product[key].indexOf(value) !== -1; });
    return state[key].indexOf(product[key]) !== -1;
  }
  function passesSearch(product) {
    if (!state.search) return true;
    return [product.code, product.collection, product.color, product.size, product.country].join(' ').toLowerCase().indexOf(state.search) !== -1;
  }
  function filteredProducts() {
    return products.filter(function (product) {
      return passesSearch(product) && hasMatch(product, 'finish') && hasMatch(product, 'color') && hasMatch(product, 'size') && hasMatch(product, 'placement');
    });
  }
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
  function renderActiveFilters() {
    var tokens = [];
    ['finish', 'color', 'size', 'placement'].forEach(function (key) {
      state[key].forEach(function (value) { tokens.push(value); });
    });
    if (state.search) tokens.push('Tìm: ' + state.search);
    active.innerHTML = tokens.map(function (token) { return '<span class="pd-active-token">' + token + '</span>'; }).join('');
  }
  function render() {
    var matches = filteredProducts();
    var visible = matches.slice(0, state.limit);
    count.textContent = String(matches.length);
    grid.innerHTML = visible.map(cardMarkup).join('');
    empty.hidden = matches.length !== 0;
    loadMore.hidden = visible.length >= matches.length;
    renderActiveFilters();
  }
  document.querySelectorAll('input[data-filter-group]').forEach(function (input) {
    input.addEventListener('change', function () {
      var key = input.getAttribute('data-filter-group');
      state[key] = Array.prototype.slice.call(document.querySelectorAll('input[data-filter-group="' + key + '"]:checked')).map(function (el) { return el.value; });
      state.limit = 8;
      render();
    });
  });
  document.querySelectorAll('.pd-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var key = chip.getAttribute('data-filter-group');
      var value = chip.getAttribute('data-filter-value');
      var idx = state[key].indexOf(value);
      if (idx === -1) {
        state[key].push(value);
        chip.classList.add('is-active');
      } else {
        state[key].splice(idx, 1);
        chip.classList.remove('is-active');
      }
      state.limit = 8;
      render();
    });
  });
  search.addEventListener('input', function () {
    state.search = search.value.trim().toLowerCase();
    state.limit = 8;
    render();
  });
  loadMore.addEventListener('click', function () {
    state.limit += 4;
    render();
  });
  reset.addEventListener('click', function () {
    state.search = '';
    state.finish = [];
    state.color = [];
    state.size = [];
    state.placement = [];
    state.limit = 8;
    search.value = '';
    document.querySelectorAll('input[data-filter-group]').forEach(function (input) { input.checked = false; });
    document.querySelectorAll('.pd-chip').forEach(function (chip) { chip.classList.remove('is-active'); });
    render();
  });
  render();
})();
