export function scrollTop() {
  'use strict';
  var btn = document.getElementById('scrollTop');
  if (!btn) return;

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.pageYOffset > 500);
  });
};
