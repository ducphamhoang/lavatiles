export function heroSlider() {
  'use strict';
  var track = document.getElementById('heroTrack');
  if (!track) return;
  var slides = Array.prototype.slice.call(track.children);
  var prevBtn = document.getElementById('heroPrev');
  var nextBtn = document.getElementById('heroNext');
  var dots = document.getElementById('heroPagination');
  var dotBtns = dots ? Array.prototype.slice.call(dots.children) : [];
  var total = slides.length;
  if (total === 0) return;

  var current = 0;
  var autoTimer = null;
  var isTransitioning = false;

  function goTo(index, instant) {
    if (isTransitioning && !instant) return;
    index = Math.max(0, Math.min(total - 1, index));
    if (index === current && !instant) return;

    slides.forEach(function (s) {
      s.querySelectorAll('[data-anim]').forEach(function (el) {
        el.classList.remove('anim-in');
      });
    });

    isTransitioning = !instant;
    current = index;
    track.style.transform = 'translateX(-' + (current * 100) + '%)';

    slides.forEach(function (s, i) {
      s.classList.toggle('swiper-slide-active', i === current);
    });

    dotBtns.forEach(function (b, i) {
      b.classList.toggle('active', i === current);
    });

    setTimeout(function () {
      var active = slides[current];
      if (active) {
        var animEls = active.querySelectorAll('[data-anim]');
        animEls.forEach(function (el, i) {
          setTimeout(function () { el.classList.add('anim-in'); }, i * 150);
        });
      }
    }, instant ? 0 : 300);

    if (!instant) {
      setTimeout(function () { isTransitioning = false; }, 700);
    } else {
      isTransitioning = false;
    }
  }

  function prev() { goTo(current - 1); }
  function next() { goTo(current + 1); }
  function startAuto() { stopAuto(); autoTimer = setInterval(next, 6000); }
  function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }
  function resetAuto() { stopAuto(); startAuto(); }

  if (prevBtn) prevBtn.addEventListener('click', function () { prev(); resetAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { next(); resetAuto(); });
  dotBtns.forEach(function (btn, i) {
    btn.addEventListener('click', function () { goTo(i); resetAuto(); });
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.key === 'ArrowLeft') { prev(); resetAuto(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { next(); resetAuto(); e.preventDefault(); }
  });

  var hero = document.getElementById('heroSlider');
  if (hero) {
    hero.addEventListener('mouseenter', stopAuto);
    hero.addEventListener('mouseleave', startAuto);
  }

  var startX = 0;
  var isDragging = false;
  track.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });
  track.addEventListener('touchend', function (e) {
    if (!isDragging) return;
    isDragging = false;
    var diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) { next(); } else { prev(); }
      resetAuto();
    }
  }, { passive: true });

  goTo(0, true);
  startAuto();
};
