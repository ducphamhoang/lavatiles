(function () {
  'use strict';

  var PAGE_SIZE = 8;
  var loadedCount = 0;

  function scrollTrack(name, direction) {
    var track = document.querySelector('[data-slider-track="' + name + '"]');
    if (!track) return;
    var step = Math.max(320, Math.round(track.clientWidth * 0.78));
    track.scrollBy({
      left: direction * step,
      behavior: 'smooth'
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function collectionCard(collection) {
    var href = collection.detailUrl || '#';
    var codeText = collection.productCodes && collection.productCodes.length
      ? collection.productCodes.slice(0, 2).join(', ')
      : collection.products && collection.products.length
      ? collection.products.length + ' sản phẩm'
      : collection.type === 'surface_collection' ? 'Đá nung kết / tấm lớn' : 'Gạch ốp lát';

    return [
      '<a class="tiles-slide-card" href="' + escapeHtml(href) + '">',
      '<div class="tiles-slide-img" style="background-image:url(' + "'" + escapeHtml(collection.image || '') + "'" + ');"></div>',
      '<span class="tiles-slide-label">' + escapeHtml(collection.brand || 'Bộ sưu tập') + '</span>',
      '<h3>' + escapeHtml(collection.title) + '</h3>',
      '<p>' + escapeHtml(codeText) + '</p>',
      '</a>'
    ].join('');
  }

  function renderCollections() {
    var isVietYTile = window.location.search.indexOf('brand=vietytile') !== -1;
    var collections = isVietYTile
      ? (window.LavatileVietYTileCollections || [])
      : (window.LavatileGeneratedCollections || []);
    var track = document.querySelector('[data-slider-track="collection"]');
    var loadMore = document.getElementById('collectionLoadMore');
    if (!track || !collections.length) return;

    // Store all collections on the track element for later access
    track.__collections = collections;

    // Clear static placeholder cards, then show initial page
    track.innerHTML = '';
    loadedCount = 0;
    appendPage(track, loadMore);
  }

  function appendPage(track, loadMore) {
    var collections = track.__collections || [];
    var next = loadedCount + PAGE_SIZE;
    var page = collections.slice(loadedCount, next);
    if (!page.length) return;

    track.innerHTML += page.map(collectionCard).join('');
    loadedCount = next;

    if (loadMore) {
      loadMore.hidden = loadedCount >= collections.length;
    }
  }

  renderCollections();

  document.querySelectorAll('[data-slider-prev]').forEach(function (button) {
    button.addEventListener('click', function () {
      scrollTrack(button.getAttribute('data-slider-prev'), -1);
    });
  });

  document.querySelectorAll('[data-slider-next]').forEach(function (button) {
    button.addEventListener('click', function () {
      scrollTrack(button.getAttribute('data-slider-next'), 1);
    });
  });

  var loadMore = document.getElementById('collectionLoadMore');
  if (loadMore) {
    loadMore.addEventListener('click', function () {
      var track = document.querySelector('[data-slider-track="collection"]');
      appendPage(track, loadMore);
    });
  }
})();
