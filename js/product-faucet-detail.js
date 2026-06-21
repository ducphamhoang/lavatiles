(function () {
  'use strict';

  var paneTabs = Array.prototype.slice.call(document.querySelectorAll('[data-pane-target]'));
  var panes = Array.prototype.slice.call(document.querySelectorAll('[data-pane]'));
  var wishlistButton = document.getElementById('wishlistButton');
  var feedback = document.getElementById('pfdFeedback');
  var detailToggles = Array.prototype.slice.call(document.querySelectorAll('[data-detail-toggle]'));
  var wishlistKey = 'vietceramics:wishlist:33604_299';

  function showFeedback(message) {
    if (!feedback) {
      return;
    }
    feedback.textContent = message;
    feedback.hidden = false;
    window.clearTimeout(showFeedback._timer);
    showFeedback._timer = window.setTimeout(function () {
      feedback.hidden = true;
    }, 1800);
  }

  function setWishlistState(active, shouldNotify) {
    if (!wishlistButton) {
      return;
    }
    wishlistButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    wishlistButton.textContent = active ? 'Đã lưu vào yêu thích' : 'Thêm vào yêu thích';
    if (shouldNotify) {
      showFeedback(active ? 'Đã thêm sản phẩm vào danh sách yêu thích.' : 'Đã xóa sản phẩm khỏi danh sách yêu thích.');
    }
  }

  function syncDetailToggle(toggle, expanded) {
    if (!toggle) {
      return;
    }
    toggle.textContent = expanded ? 'Thu gọn thông tin chi tiết' : 'Xem thêm thông tin chi tiết';
  }

  function activatePane(target) {
    paneTabs.forEach(function (tab) {
      var active = tab.getAttribute('data-pane-target') === target;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });

    panes.forEach(function (pane) {
      var active = pane.getAttribute('data-pane') === target;
      pane.classList.toggle('is-active', active);
      pane.hidden = !active;
    });
  }

  function initPaneThumbs(pane) {
    var stage = pane.querySelector('.pfd-stage');
    var images = Array.prototype.slice.call(pane.querySelectorAll('.pfd-stage-image'));
    var thumbs = Array.prototype.slice.call(pane.querySelectorAll('.pfd-thumb'));
    var fallback = pane.querySelector('.pfd-stage-fallback');

    function activateImage(index) {
      images.forEach(function (image, imageIndex) {
        image.classList.toggle('is-active', imageIndex === index);
      });

      thumbs.forEach(function (thumb, thumbIndex) {
        var active = thumbIndex === index;
        thumb.classList.toggle('is-active', active);
        thumb.setAttribute('aria-selected', active ? 'true' : 'false');
        thumb.tabIndex = active ? 0 : -1;
      });

      if (stage) {
        stage.setAttribute('aria-busy', images[index] && !images[index].complete ? 'true' : 'false');
      }
    }

    thumbs.forEach(function (thumb, index) {
      thumb.addEventListener('click', function () {
        activateImage(index);
      });

      thumb.addEventListener('keydown', function (event) {
        var nextIndex = index;
        var nextThumb;

        if (event.key !== 'ArrowRight' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowUp') {
          return;
        }

        event.preventDefault();
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          nextIndex = (index + 1) % thumbs.length;
        } else {
          nextIndex = (index - 1 + thumbs.length) % thumbs.length;
        }

        activateImage(nextIndex);
        nextThumb = thumbs[nextIndex];
        if (nextThumb) {
          nextThumb.focus();
        }
      });
    });

    images.forEach(function (image, index) {
      image.addEventListener('load', function () {
        if (stage && image.classList.contains('is-active')) {
          stage.setAttribute('aria-busy', 'false');
        }
        if (fallback && image.classList.contains('is-active')) {
          fallback.hidden = true;
        }
      });

      image.addEventListener('error', function () {
        if (fallback && image.classList.contains('is-active')) {
          fallback.hidden = false;
        }
      });

      if (index === 0) {
        activateImage(0);
      }
    });
  }

  paneTabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      activatePane(tab.getAttribute('data-pane-target'));
    });

    tab.addEventListener('keydown', function (event) {
      var nextIndex = index;
      var nextTab;

      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        return;
      }

      event.preventDefault();
      if (event.key === 'ArrowRight') {
        nextIndex = (index + 1) % paneTabs.length;
      } else {
        nextIndex = (index - 1 + paneTabs.length) % paneTabs.length;
      }

      nextTab = paneTabs[nextIndex];
      activatePane(nextTab.getAttribute('data-pane-target'));
      nextTab.focus();
    });
  });

  panes.forEach(initPaneThumbs);

  if (wishlistButton) {
    try {
      setWishlistState(window.localStorage.getItem(wishlistKey) === '1', false);
    } catch (error) {
      setWishlistState(false, false);
    }
    wishlistButton.addEventListener('click', function () {
      var nextState = wishlistButton.getAttribute('aria-pressed') !== 'true';
      try {
        window.localStorage.setItem(wishlistKey, nextState ? '1' : '0');
      } catch (error) {
        // Continue with the UI state even if storage is unavailable.
      }
      setWishlistState(nextState, true);
    });
  }

  detailToggles.forEach(function (detailToggle) {
    var detailPanel = document.getElementById(detailToggle.getAttribute('aria-controls'));

    if (!detailPanel) {
      return;
    }

    syncDetailToggle(detailToggle, detailToggle.getAttribute('aria-expanded') === 'true');
    detailToggle.addEventListener('click', function () {
      var expanded = detailToggle.getAttribute('aria-expanded') === 'true';
      var nextExpanded = !expanded;
      detailToggle.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
      detailToggle.classList.toggle('is-active', nextExpanded);
      detailPanel.hidden = !nextExpanded;
      syncDetailToggle(detailToggle, nextExpanded);
    });
  });

  activatePane('product');
})();
