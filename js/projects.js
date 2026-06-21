(function () {
  'use strict';

  var feedback = document.getElementById('projectsFeedback');

  function showFeedback(message) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = false;
  }

  document.querySelectorAll('[data-project-placeholder]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      showFeedback('Danh mục chi tiết cho nhóm dự án này chưa được thêm vào bản clone. Khi các trang con sẵn sàng, liên kết sẽ được nối trực tiếp tại đây.');
    });
  });
})();
