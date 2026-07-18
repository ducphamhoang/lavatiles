(function () {
  'use strict';

  var CATALOGUES = window.LAVATILE_CATALOGUES;
  if (!CATALOGUES || !CATALOGUES.length) return;

  var overlay = null;
  var swiperInstance = null;

  // ── Helper: build page image URL ──
  function pageUrl(catalogue, index) {
    var num = index + 1;
    var fmt = catalogue.pageFormat;
    var padded = fmt.replace(/\{(\d+)\}/, function (_, digits) {
      return String(num).padStart(parseInt(digits, 10), '0');
    });
    return catalogue.basePath + '/' + padded;
  }

  // ── Build overlay DOM ──
  function buildOverlay(catalogue) {
    var frag = document.createDocumentFragment();

    overlay = document.createElement('div');
    overlay.className = 'flipbook-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', catalogue.title);

    // Toolbar
    var toolbar = document.createElement('div');
    toolbar.className = 'flipbook-toolbar';
    toolbar.innerHTML =
      '<div class="flipbook-toolbar-left">' +
        '<span class="flipbook-toolbar-brand">' + catalogue.brand + '</span>' +
        '<span class="flipbook-toolbar-title">' + catalogue.title + '</span>' +
      '</div>' +
      '<div class="flipbook-toolbar-right">' +
        '<span class="flipbook-page-indicator" data-flipbook-counter>1 / ' + catalogue.totalPages + '</span>' +
        '<a class="flipbook-download-btn" href="' + catalogue.pdfUrl + '" target="_blank" rel="noopener">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v11"></path><path d="M7 10l5 5 5-5"></path><path d="M5 19h14"></path></svg>' +
          '<span>Tải PDF</span>' +
        '</a>' +
        '<button class="flipbook-close-btn" aria-label="Đóng" data-flipbook-close>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>' +
        '</button>' +
      '</div>';
    overlay.appendChild(toolbar);

    // Viewport
    var viewport = document.createElement('div');
    viewport.className = 'flipbook-viewport';

    // Nav arrows
    var prevBtn = document.createElement('button');
    prevBtn.className = 'flipbook-nav flipbook-nav--prev swiper-button-prev';
    prevBtn.setAttribute('aria-label', 'Trang trước');
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
    viewport.appendChild(prevBtn);

    var nextBtn = document.createElement('button');
    nextBtn.className = 'flipbook-nav flipbook-nav--next swiper-button-next';
    nextBtn.setAttribute('aria-label', 'Trang sau');
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
    viewport.appendChild(nextBtn);

    // Slides
    var wrapper = document.createElement('div');
    wrapper.className = 'swiper-wrapper';
    for (var i = 0; i < catalogue.totalPages; i++) {
      var slide = document.createElement('div');
      slide.className = 'swiper-slide flipbook-slide';

      var img = document.createElement('img');
      img.className = 'flipbook-page-img';
      img.setAttribute('data-page', i + 1);
      img.setAttribute('loading', 'lazy');
      img.src = pageUrl(catalogue, i);
      img.alt = catalogue.title + ' trang ' + (i + 1);
      slide.appendChild(img);

      wrapper.appendChild(slide);
    }
    viewport.appendChild(wrapper);
    overlay.appendChild(viewport);

    // Thumbnail strip
    var thumbsStrip = document.createElement('div');
    thumbsStrip.className = 'flipbook-thumbs';
    thumbsStrip.setAttribute('data-flipbook-thumbs', '');
    for (var j = 0; j < catalogue.totalPages; j++) {
      var thumb = document.createElement('div');
      thumb.className = 'flipbook-thumb' + (j === 0 ? ' is-active' : '');
      thumb.setAttribute('data-flipbook-thumb', j + 1);

      var thumbImg = document.createElement('img');
      thumbImg.className = 'flipbook-thumb-img';
      thumbImg.setAttribute('data-page', j + 1);
      thumbImg.setAttribute('loading', 'lazy');
      thumbImg.src = pageUrl(catalogue, j);
      thumbImg.alt = 'Trang ' + (j + 1);
      thumb.appendChild(thumbImg);
      thumbsStrip.appendChild(thumb);
    }
    overlay.appendChild(thumbsStrip);

    frag.appendChild(overlay);
    return frag;
  }

  // ── Open flipbook ──
  function openFlipbook(catalogue) {
    if (overlay) return;

    var frag = buildOverlay(catalogue);
    document.body.appendChild(frag);
    document.body.style.overflow = 'hidden';
    overlay.getBoundingClientRect();
    overlay.classList.add('is-open');

    // Bind close
    overlay.querySelector('[data-flipbook-close]').addEventListener('click', closeFlipbook);
    document.addEventListener('keydown', onKeyDown);

    // Init Swiper
    swiperInstance = new Swiper(overlay.querySelector('.flipbook-viewport'), {
      slidesPerView: 1,
      spaceBetween: 0,
      speed: 350,
      grabCursor: true,
      navigation: {
        prevEl: overlay.querySelector('.swiper-button-prev'),
        nextEl: overlay.querySelector('.swiper-button-next')
      },
      keyboard: {
        enabled: true,
        onlyInViewport: false
      },
      on: {
        slideChange: function () {
          var index = this.activeIndex;
          updateUI(index, catalogue.totalPages);
          preloadAdjacent(index, catalogue);
        }
      }
    });

    // Preload next page
    preloadAdjacent(0, catalogue);
  }

  // ── Close ──
  function closeFlipbook() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeyDown);

    if (swiperInstance) {
      swiperInstance.destroy(true, true);
      swiperInstance = null;
    }

    var el = overlay;
    el.addEventListener('transitionend', function handler() {
      el.removeEventListener('transitionend', handler);
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 400);
    overlay = null;
  }

  // ── Keyboard ──
  function onKeyDown(e) {
    if (e.key === 'Escape' && overlay) {
      e.preventDefault();
      closeFlipbook();
    }
  }

  // ── Update counter + thumbs ──
  function updateUI(index, total) {
    var counter = overlay && overlay.querySelector('[data-flipbook-counter]');
    if (counter) counter.textContent = (index + 1) + ' / ' + total;

    var strip = overlay && overlay.querySelector('[data-flipbook-thumbs]');
    if (!strip) return;
    var thumbs = strip.children;
    for (var i = 0; i < thumbs.length; i++) {
      thumbs[i].classList.toggle('is-active', i === index);
    }
    if (thumbs[index]) {
      thumbs[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // ── Preload adjacent page images ──
  function preloadAdjacent(index, catalogue) {
    // Preload next 2 pages
    for (var offset = 1; offset <= 2; offset++) {
      var next = index + offset;
      if (next < catalogue.totalPages) {
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = pageUrl(catalogue, next);
        document.head.appendChild(link);
        // Remove after a short delay to avoid piling up
        setTimeout(function (l) { if (l.parentNode) l.parentNode.removeChild(l); }, 1000, link);
      }
    }
  }

  // ── Thumbnail click bind (delegated) ──
  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-flipbook-thumb]');
    if (!thumb || !swiperInstance) return;
    var pageNum = parseInt(thumb.getAttribute('data-flipbook-thumb'), 10);
    if (pageNum > 0) swiperInstance.slideTo(pageNum - 1);
  });

  // ── Bind trigger buttons ──
  document.querySelectorAll('[data-flipbook-trigger]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var id = btn.getAttribute('data-flipbook-id');
      if (!id) return;

      for (var i = 0; i < CATALOGUES.length; i++) {
        if (CATALOGUES[i].id === id) {
          openFlipbook(CATALOGUES[i]);
          break;
        }
      }
    });
  });
})();
