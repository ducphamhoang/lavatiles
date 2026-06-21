(function () {
  'use strict';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-news-tab]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-news-panel]'));
  var feedback = document.getElementById('newsFeedback');
  var activeCategory = document.getElementById('newsActiveCategory');

  if (!tabs.length || !panels.length) return;

  tabs.forEach(function (tab) {
    var id = tab.getAttribute('data-news-tab');
    tab.setAttribute('id', 'tab-' + id);
    tab.setAttribute('aria-controls', 'panel-' + id);
  });

  panels.forEach(function (panel) {
    var id = panel.getAttribute('data-news-panel');
    panel.setAttribute('id', 'panel-' + id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + id);
  });

  function showFeedback(message) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = false;
  }

  function activateTab(id) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-news-tab') === id;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
      if (active && activeCategory) {
        activeCategory.textContent = tab.textContent.trim();
      }
    });

    panels.forEach(function (panel) {
      var active = panel.getAttribute('data-news-panel') === id;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    try {
      var url = new URL(window.location.href);
      url.searchParams.set('category_id', id);
      window.history.replaceState({}, '', url);
    } catch (_) {}
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateTab(tab.getAttribute('data-news-tab'));
    });

    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      var currentIndex = tabs.indexOf(tab);
      var nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex].getAttribute('data-news-tab'));
    });
  });

  document.querySelectorAll('[data-news-placeholder]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      showFeedback('Trang chi tiết của bài viết này chưa được thêm vào bản clone. Khi các trang bài viết sẵn sàng, liên kết sẽ được nối trực tiếp tại đây.');
    });
  });

  document.querySelectorAll('[data-news-more]').forEach(function (button) {
    button.addEventListener('click', function () {
      var panelId = button.getAttribute('data-news-more');
      var panel = panels.find(function (item) {
        return item.getAttribute('data-news-panel') === panelId;
      });
      if (!panel) return;
      panel.querySelectorAll('.is-extra').forEach(function (card) {
        card.hidden = false;
      });
      button.hidden = true;
    });
  });

  var initial = 'cam-hung-thiet-ke';
  try {
    var url = new URL(window.location.href);
    var requested = url.searchParams.get('category_id');
    var valid = tabs.some(function (tab) {
      return tab.getAttribute('data-news-tab') === requested;
    });
    if (valid) initial = requested;
  } catch (_) {}

  activateTab(initial);
})();
