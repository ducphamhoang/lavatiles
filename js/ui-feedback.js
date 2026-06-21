(function () {
  'use strict';

  function showInlineMessage(form, message) {
    var messageNode = form.querySelector('[data-form-feedback]');
    if (!messageNode) {
      messageNode = document.createElement('p');
      messageNode.setAttribute('data-form-feedback', '');
      messageNode.className = 'form-feedback';
      form.appendChild(messageNode);
    }
    messageNode.textContent = message;
  }

  document.querySelectorAll('[data-newsletter-form], #newsletterForm, footer form').forEach(function (form) {
    if (form.dataset.feedbackBound === 'true') return;
    form.dataset.feedbackBound = 'true';
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      form.reset();
      showInlineMessage(form, 'Cảm ơn bạn đã đăng ký nhận thông tin từ Vietceramics.');
    });
  });
})();
