export function sidenav() {
  'use strict';
  var toggle = document.getElementById('navToggle');
  var sidenav = document.getElementById('sidenav');
  var overlay = document.getElementById('sidenavOverlay');
  if (!sidenav) return;

  function close() {
    sidenav.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (toggle && overlay) {
    toggle.addEventListener('click', function () {
      sidenav.classList.toggle('open');
      overlay.classList.toggle('open');
      document.body.style.overflow = sidenav.classList.contains('open') ? 'hidden' : '';
    });
    overlay.addEventListener('click', close);
  }

  sidenav.querySelectorAll('.dropdown > .nav-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var menu = this.nextElementSibling;
      if (menu) menu.classList.toggle('open');
    });
  });

  sidenav.querySelectorAll('.nav-item:not(.dropdown) > .nav-link').forEach(function (link) {
    link.addEventListener('click', close);
  });
};
