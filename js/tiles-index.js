(function () {
  'use strict';

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

  function renderCollections() {
    var collections = window.LavatileGeneratedCollections || [];
    var track = document.querySelector('[data-slider-track="collection"]');
    if (!track || !collections.length) return;

    track.innerHTML = collections.map(function (collection) {
      var href = collection.detailUrl || '#';
      var codeText = collection.productCodes && collection.productCodes.length
        ? collection.productCodes.slice(0, 2).join(', ')
        : collection.type === 'surface_collection' ? 'Đá nung kết / tấm lớn' : 'Gạch ốp lát';

      return [
        '<a class="tiles-slide-card" href="' + escapeHtml(href) + '">',
        '<div class="tiles-slide-img" style="background-image:url(' + "'" + escapeHtml(collection.image || '') + "'" + ');"></div>',
        '<span class="tiles-slide-label">' + escapeHtml(collection.brand || 'Bộ sưu tập') + '</span>',
        '<h3>' + escapeHtml(collection.title) + '</h3>',
        '<p>' + escapeHtml(codeText) + '</p>',
        '</a>'
      ].join('');
    }).join('');
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
})();
