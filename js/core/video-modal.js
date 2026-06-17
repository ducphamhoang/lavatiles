export function videoModal() {
  'use strict';
  var videoBtn = document.getElementById('aboutVideoBtn');
  var modal = document.getElementById('videoModal');
  var closeBtn = document.getElementById('videoModalClose');
  if (!videoBtn || !modal || !closeBtn) return;

  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  videoBtn.addEventListener('click', function () {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
};
