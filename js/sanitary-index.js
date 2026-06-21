(function () {
  'use strict';

  function scrollTrack(name, direction) {
    var track = document.querySelector('[data-slider-track="' + name + '"]');
    if (!track) return;
    var step = Math.max(320, Math.round(track.clientWidth * 0.78));
    track.scrollBy({
      left: direction * step,
      behavior: 'smooth'
    });
  }

  document.querySelectorAll('[data-slider-prev]').forEach(function (button) {
    button.addEventListener('click', function () {
      scrollTrack(button.getAttribute('data-slider-prev'), -1);
    });
  });

  document.querySelectorAll('[data-slider-next]').forEach(function (button) {
    button.addEventListener('click', function () {
      scrollTrack(button.getAttribute('data-slider-next'), 1);
    });
  });
})();
