(function () {
  'use strict';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-catalogue-tab]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-catalogue-panel]'));
  var feedback = document.getElementById('catalogueFeedback');
  if (!tabs.length || !panels.length) return;

  tabs.forEach(function (tab) {
    var id = tab.getAttribute('data-catalogue-tab');
    tab.setAttribute('id', 'tab-' + id);
    tab.setAttribute('aria-controls', 'panel-' + id);
  });

  panels.forEach(function (panel) {
    var id = panel.getAttribute('data-catalogue-panel');
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
      var active = tab.getAttribute('data-catalogue-tab') === id;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
    });

    panels.forEach(function (panel) {
      var active = panel.getAttribute('data-catalogue-panel') === id;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    try {
      var url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState({}, '', url);
    } catch (_) {}
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateTab(tab.getAttribute('data-catalogue-tab'));
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
      activateTab(tabs[nextIndex].getAttribute('data-catalogue-tab'));
    });
  });

  document.querySelectorAll('[data-catalogue-jump]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var id = link.getAttribute('data-catalogue-jump');
      if (!id) return;
      event.preventDefault();
      activateTab(id);
      var targetTab = tabs.find(function (tab) {
        return tab.getAttribute('data-catalogue-tab') === id;
      });
      if (targetTab) {
        targetTab.focus();
      }
    });
  });

  document.querySelectorAll('[data-download-placeholder]').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      showFeedback('Bản PDF của mục này chưa được thêm vào bản clone. Khi có file, liên kết tải sẽ được nối trực tiếp tại đây.');
    });
  });

  document.querySelectorAll('footer form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      showFeedback('Cảm ơn bạn đã đăng ký. Biểu mẫu email hiện đang là bản trình diễn trong clone này.');
    });
  });

  var initial = window.location.hash ? window.location.hash.replace('#', '') : '';
  var valid = tabs.some(function (tab) { return tab.getAttribute('data-catalogue-tab') === initial; });
  activateTab(valid ? initial : tabs[0].getAttribute('data-catalogue-tab'));
})();
