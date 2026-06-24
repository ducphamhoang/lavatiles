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

  function clean(value) {
    return text(value).replace(/\s+/g, ' ').trim();
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
      '.collection-inspiration-header, .collection-inspiration-banner, .collection-inspiration-story, .collection-inspiration-gallery, .collection-inspiration-colors, .collection-inspiration-products, .collection-inspiration-actions, .collection-inspiration-search, .collection-detail-related'
    ).forEach(function (section) {
      section.hidden = true;
    });
  }

  function collectionImages(collection) {
    return unique(collection.images && collection.images.length ? collection.images : [collection.image]).filter(Boolean);
  }

  function isTechnicalImage(src) {
    var value = text(src).toLowerCase();
    return /\/mota[-_]/.test(value) || /\/mo-ta[-_]/.test(value) || /\/quy[-_]?cach/.test(value) || /\/packing/.test(value);
  }

  function visualImages(collection) {
    var images = collectionImages(collection);
    var visual = images.filter(function (image) { return !isTechnicalImage(image); });
    return visual.length ? visual : images;
  }

  function technicalImages(collection) {
    return collectionImages(collection).filter(isTechnicalImage);
  }

  function infoValue(collection, keys) {
    var info = collection.productInfo || {};
    for (var i = 0; i < keys.length; i += 1) {
      var value = clean(info[keys[i]]);
      if (value) return value;
    }
    return '';
  }

  function collectionType(collection) {
    return collection.type === 'surface_collection' ? 'Đá nung kết / tấm lớn' : 'Gạch ốp lát';
  }

  function subtitle(collection) {
    var size = infoValue(collection, ['Kích thước']);
    var finish = infoValue(collection, ['Bề mặt men', 'Bề mặt']);
    var parts = [collection.brand || 'Lavatile', collectionType(collection), size, finish].filter(Boolean);
    return parts.join(' / ');
  }

  function productCodes(collection) {
    return collection.productCodes && collection.productCodes.length
      ? collection.productCodes
      : [collection.title];
  }

  function setImage(element, src, alt) {
    if (!element) return;
    if (!src) {
      element.closest('figure').hidden = true;
      return;
    }
    element.src = src;
    element.alt = alt;
  }

  function renderGallery(collection) {
    var target = document.querySelector('[data-collection-gallery]');
    if (!target) return;
    var images = visualImages(collection).slice(0, 10);
    target.innerHTML = images.map(function (image, index) {
      return [
        '<button class="collection-inspiration-gallery-item" type="button" data-collection-image-open data-image-src="' + escapeHtml(image) + '" data-image-title="' + escapeHtml(collection.title) + '" data-image-caption="Thư viện ảnh">',
        '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(collection.title + ' ' + (index + 1)) + '" decoding="async">',
        '</button>'
      ].join('');
    }).join('');
  }

  function renderColorSize(collection) {
    var target = document.querySelector('[data-collection-color-size]');
    if (!target) return;
    var images = visualImages(collection);
    var size = infoValue(collection, ['Kích thước']) || 'Đang cập nhật';
    var finish = infoValue(collection, ['Bề mặt men', 'Bề mặt']) || collectionType(collection);
    var codes = productCodes(collection).slice(0, 8);

    target.innerHTML = codes.map(function (code, index) {
      var image = images[index % Math.max(images.length, 1)] || collection.image || '';
      return [
        '<button class="collection-inspiration-color-card" type="button" data-collection-image-open data-image-src="' + escapeHtml(image) + '" data-image-title="' + escapeHtml(code) + '" data-image-caption="' + escapeHtml(collection.title) + '">',
        '<div class="collection-inspiration-color-copy">',
        '<h3>' + escapeHtml(collection.title) + '</h3>',
        '<p>' + escapeHtml(code) + '</p>',
        '<p>' + escapeHtml(size) + '</p>',
        '<span>' + escapeHtml(finish) + '</span>',
        '</div>',
        '<div class="collection-inspiration-color-media"' + (image ? ' style="background-image:url(' + "'" + escapeHtml(image) + "'" + ');"' : '') + '>',
        '</div>',
        '</button>'
      ].join('');
    }).join('');
  }

  function renderProducts(collection) {
    var target = document.querySelector('[data-collection-products]');
    if (!target) return;
    var images = visualImages(collection);
    var size = infoValue(collection, ['Kích thước']) || 'Đang cập nhật';
    var brand = collection.brand || 'Lavatile';
    var codes = productCodes(collection);

    target.innerHTML = codes.map(function (code, index) {
      var image = images[index % Math.max(images.length, 1)] || collection.image || '';
      var title = collectionType(collection) + ' ' + code;
      return [
        '<button class="collection-inspiration-product-card" type="button" data-collection-image-open data-image-src="' + escapeHtml(image) + '" data-image-title="' + escapeHtml(title) + '" data-image-caption="' + escapeHtml(brand) + '">',
        '<div class="collection-inspiration-product-media"' + (image ? ' style="background-image:url(' + "'" + escapeHtml(image) + "'" + ');"' : '') + '>',
        '</div>',
        '<div class="collection-inspiration-product-body">',
        '<span>' + escapeHtml(brand) + '</span>',
        '<h3>' + escapeHtml(title) + '</h3>',
        '<p>' + escapeHtml(size) + '</p>',
        '</div>',
        '</button>'
      ].join('');
    }).join('');
  }

  function renderSpecs(collection) {
    var target = document.querySelector('[data-collection-specs]');
    if (!target) return;
    var specs = technicalImages(collection);

    if (!specs.length) {
      target.hidden = true;
      target.innerHTML = '';
      return;
    }

    target.hidden = false;
    target.innerHTML = specs.map(function (image) {
      return [
        '<button class="collection-inspiration-spec-card" type="button" data-collection-image-open data-image-src="' + escapeHtml(image) + '" data-image-title="' + escapeHtml(collection.title) + '" data-image-caption="Thông số đóng gói">',
        '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(collection.title + ' thông số đóng gói') + '" decoding="async">',
        '<div>',
        '<span>Thông số đóng gói</span>',
        '<h3>' + escapeHtml(collection.title) + '</h3>',
        '<p>' + escapeHtml(infoValue(collection, ['Mã sản phẩm']) || productCodes(collection).join(', ')) + '</p>',
        '</div>',
        '</button>'
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

  function renderShare(collection) {
    var share = document.querySelector('[data-collection-share]');
    if (!share) return;
    var url = window.location.href;
    share.href = 'https://facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
    share.setAttribute('aria-label', 'Chia sẻ bộ sưu tập ' + collection.title + ' lên Facebook');
  }

  function bindStaticImageTrigger(element, image, title, caption) {
    if (!element || !image) return;
    element.setAttribute('data-collection-image-open', '');
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.dataset.imageSrc = image;
    element.dataset.imageTitle = title;
    element.dataset.imageCaption = caption;
  }

  function openLightbox(src, title, caption) {
    var lightbox = document.querySelector('[data-collection-lightbox]');
    if (!lightbox || !src) return;
    var image = lightbox.querySelector('[data-collection-lightbox-image]');
    var titleNode = lightbox.querySelector('[data-collection-lightbox-title]');
    var captionNode = lightbox.querySelector('[data-collection-lightbox-caption]');

    if (image) {
      image.src = src;
      image.alt = title || '';
    }
    if (titleNode) titleNode.textContent = title || '';
    if (captionNode) captionNode.textContent = caption || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('collection-lightbox-open');
  }

  function closeLightbox() {
    var lightbox = document.querySelector('[data-collection-lightbox]');
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('collection-lightbox-open');
  }

  function renderCollection(collection, collections) {
    var title = collection.title || 'Bộ sưu tập';
    var brand = collection.brand || 'Lavatile';
    var images = visualImages(collection);
    var heroImage = collection.image || images[0] || '';
    var featureImage = images[1] || heroImage;
    var description = collection.description || 'Thông tin chi tiết của bộ sưu tập đang được Lavatile cập nhật.';
    var hero = document.querySelector('[data-collection-hero]');

    document.title = title + ' | Bộ sưu tập gạch ốp lát | Lavatile';
    if (hero && heroImage) {
      hero.style.backgroundImage = "url('" + heroImage.replace(/'/g, "\\'") + "')";
    }

    setText('[data-collection-breadcrumb]', title);
    setText('[data-collection-title]', title);
    setText('[data-collection-subtitle]', subtitle(collection));
    setText('[data-collection-brand]', brand);
    setText('[data-collection-description]', description);
    setImage(document.querySelector('[data-collection-feature-image]'), featureImage, title);
    bindStaticImageTrigger(document.querySelector('.collection-inspiration-story-media'), featureImage, title, 'Câu chuyện cảm hứng');
    renderGallery(collection);
    renderColorSize(collection);
    renderProducts(collection);
    renderSpecs(collection);
    renderShare(collection);
    renderRelated(collection, collections);
  }

  document.addEventListener('click', function (event) {
    var close = event.target.closest('[data-collection-lightbox-close]');
    if (close) {
      closeLightbox();
      return;
    }

    var trigger = event.target.closest('[data-collection-image-open]');
    if (!trigger) return;
    openLightbox(trigger.dataset.imageSrc, trigger.dataset.imageTitle, trigger.dataset.imageCaption);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeLightbox();
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-collection-image-open][role="button"]')) {
      event.preventDefault();
      openLightbox(event.target.dataset.imageSrc, event.target.dataset.imageTitle, event.target.dataset.imageCaption);
    }
  });

  var collections = window.LavatileGeneratedCollections || [];
  var collection = collectionFromQuery(collections);
  if (!collection) {
    showMissing();
    return;
  }
  renderCollection(collection, collections);
})();
