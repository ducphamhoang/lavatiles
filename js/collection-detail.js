(function () {
  'use strict';

  function text(value) {
    return String(value == null ? '' : value);
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.textContent = text(value);
  }

  function unique(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  function collectionFromQuery(collections) {
    var params = new URLSearchParams(window.location.search);
    var source = params.get('source') || '';
    var slug = params.get('collection') || params.get('slug') || '';
    return collections.find(function (collection) {
      return collection.source === source && collection.slug === slug;
    });
  }

  function showMissing() {
    var empty = document.querySelector('[data-collection-empty]');
    if (empty) empty.hidden = false;
    document.querySelectorAll(
      '.collection-detail-hero, .collection-detail-intro, .collection-detail-products, .collection-detail-gallery, .collection-detail-related'
    ).forEach(function (section) {
      section.hidden = true;
    });
  }

  function renderSpecs(collection) {
    var specs = document.querySelector('[data-collection-specs]');
    if (!specs) return;
    var info = collection.productInfo || {};
    var entries = Object.keys(info)
      .filter(function (key) { return text(info[key]).trim(); })
      .map(function (key) {
        return '<div><dt>' + escapeHtml(key) + '</dt><dd>' + escapeHtml(info[key]) + '</dd></div>';
      });

    if (!entries.length) {
      entries = [
        '<div><dt>Thương hiệu</dt><dd>' + escapeHtml(collection.brand || 'Lavatile') + '</dd></div>',
        '<div><dt>Dòng sản phẩm</dt><dd>' + escapeHtml(collection.type === 'surface_collection' ? 'Đá nung kết / tấm lớn' : 'Gạch ốp lát') + '</dd></div>'
      ];
    }

    specs.innerHTML = entries.join('');
  }

  function renderCodes(collection) {
    var target = document.querySelector('[data-collection-codes]');
    if (!target) return;
    var codes = collection.productCodes && collection.productCodes.length
      ? collection.productCodes
      : [collection.title];
    target.innerHTML = codes.map(function (code) {
      return '<span>' + escapeHtml(code) + '</span>';
    }).join('');
  }

  function renderGallery(collection) {
    var target = document.querySelector('[data-collection-gallery]');
    if (!target) return;
    var images = unique(collection.images && collection.images.length ? collection.images : [collection.image]).slice(0, 12);
    target.innerHTML = images.map(function (image, index) {
      return [
        '<figure class="collection-detail-gallery-item">',
        '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(collection.title + ' ' + (index + 1)) + '" loading="lazy" decoding="async">',
        '</figure>'
      ].join('');
    }).join('');
  }

  function renderRelated(collection, collections) {
    var target = document.querySelector('[data-collection-related]');
    if (!target) return;
    var related = collections.filter(function (item) {
      return item !== collection && item.source === collection.source && item.image;
    }).slice(0, 4);

    if (!related.length) {
      target.closest('.collection-detail-related').hidden = true;
      return;
    }

    target.innerHTML = related.map(function (item) {
      return [
        '<a class="tiles-slide-card collection-detail-related-card" href="' + escapeHtml(item.detailUrl || '#') + '">',
        '<div class="tiles-slide-img" style="background-image:url(' + "'" + escapeHtml(item.image || '') + "'" + ');"></div>',
        '<span class="tiles-slide-label">' + escapeHtml(item.brand || 'Bộ sưu tập') + '</span>',
        '<h3>' + escapeHtml(item.title) + '</h3>',
        '</a>'
      ].join('');
    }).join('');
  }

  function renderCollection(collection, collections) {
    var title = collection.title || 'Bộ sưu tập';
    var brand = collection.brand || 'Lavatile';
    var hero = document.querySelector('[data-collection-hero]');
    var heroImage = collection.image || (collection.images && collection.images[0]) || '';
    var description = collection.description || 'Thông tin chi tiết của bộ sưu tập đang được Lavatile cập nhật.';

    document.title = title + ' | Bộ sưu tập gạch ốp lát | Lavatile';
    if (hero && heroImage) {
      hero.style.backgroundImage = "url('" + heroImage.replace(/'/g, "\\'") + "')";
    }

    setText('[data-collection-breadcrumb]', title);
    setText('[data-collection-brand]', brand);
    setText('[data-collection-title]', title);
    setText('[data-collection-description]', description);
    renderSpecs(collection);
    renderCodes(collection);
    renderGallery(collection);
    renderRelated(collection, collections);
  }

  var collections = window.LavatileGeneratedCollections || [];
  var collection = collectionFromQuery(collections);
  if (!collection) {
    showMissing();
    return;
  }
  renderCollection(collection, collections);
})();
