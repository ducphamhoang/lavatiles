export function navbarScroll() {
  'use strict';
  var nav = document.getElementById('navbar');
  if (!nav) return;
  var lastScroll = 0;
  window.addEventListener('scroll', function () {
    var st = window.pageYOffset || document.documentElement.scrollTop;
    if (st > lastScroll && st > 120) {
      nav.style.transform = 'translateY(-100%)';
    } else {
      nav.style.transform = 'translateY(0)';
    }
    lastScroll = st;
  }, false);
};
