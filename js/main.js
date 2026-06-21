(function () {
  'use strict';

  // ============================================================
  //  HERO SLIDER — Swiper-style with animated text layers
  // ============================================================
  var track = document.getElementById('heroTrack');
  var slides = track ? Array.prototype.slice.call(track.children) : [];
  var prevBtn = document.getElementById('heroPrev');
  var nextBtn = document.getElementById('heroNext');
  var dots = document.getElementById('heroPagination');
  var dotBtns = dots ? Array.prototype.slice.call(dots.children) : [];
  var total = slides.length;
  var current = 0;
  var autoTimer = null;
  var isTransitioning = false;

  if (track && total > 0) {
    // ---- go to slide ----
    function goTo(index, instant) {
      if (isTransitioning && !instant) return;
      index = Math.max(0, Math.min(total - 1, index));
      if (index === current && !instant) return;

      // Reset text animations on all slides
      slides.forEach(function (s) {
        s.querySelectorAll('[data-anim]').forEach(function (el) {
          el.classList.remove('anim-in');
        });
      });

      isTransitioning = !instant;
      current = index;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';

      // Update slide active class
      slides.forEach(function (s, i) {
        s.classList.toggle('swiper-slide-active', i === current);
      });

      // Update dots
      dotBtns.forEach(function (b, i) {
        b.classList.toggle('active', i === current);
      });

      // Trigger text animations on the new active slide after a tiny delay
      setTimeout(function () {
        var active = slides[current];
        if (active) {
          var animEls = active.querySelectorAll('[data-anim]');
          animEls.forEach(function (el, i) {
            setTimeout(function () {
              el.classList.add('anim-in');
            }, i * 150);
          });
        }
      }, instant ? 0 : 300);

      // Allow transition to complete
      if (!instant) {
        setTimeout(function () { isTransitioning = false; }, 700);
      } else {
        isTransitioning = false;
      }
    }

    // ---- navigation helpers ----
    function prev() { goTo(current - 1); }
    function next() { goTo(current + 1); }

    // ---- autoplay ----
    function startAuto() {
      stopAuto();
      autoTimer = setInterval(next, 6000);
    }
    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }
    function resetAuto() { stopAuto(); startAuto(); }

    // ---- bind events ----
    if (prevBtn) prevBtn.addEventListener('click', function () { prev(); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { next(); resetAuto(); });

    dotBtns.forEach(function (btn, i) {
      btn.addEventListener('click', function () { goTo(i); resetAuto(); });
    });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') { prev(); resetAuto(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { next(); resetAuto(); e.preventDefault(); }
    });

    // Pause on hover
    var hero = document.getElementById('heroSlider');
    if (hero) {
      hero.addEventListener('mouseenter', stopAuto);
      hero.addEventListener('mouseleave', startAuto);
    }

    // Touch/swipe support
    var startX = 0;
    var isDragging = false;
    track.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      isDragging = true;
    }, { passive: true });

    track.addEventListener('touchend', function (e) {
      if (!isDragging) return;
      isDragging = false;
      var endX = e.changedTouches[0].clientX;
      var diff = startX - endX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) { next(); } else { prev(); }
        resetAuto();
      }
    }, { passive: true });

    // ---- init ----
    goTo(0, true);
    startAuto();
  }

  // ============================================================
  //  MOBILE NAV
  // ============================================================
  var toggle = document.getElementById('navToggle');
  var sidenav = document.getElementById('sidenav');
  var overlay = document.getElementById('sidenavOverlay');

  if (toggle && sidenav && overlay) {
    toggle.addEventListener('click', function () {
      sidenav.classList.toggle('open');
      overlay.classList.toggle('open');
      document.body.style.overflow = sidenav.classList.contains('open') ? 'hidden' : '';
    });

    overlay.addEventListener('click', function () {
      sidenav.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  // Mobile nav dropdowns
  var sideNavItems = document.querySelectorAll('#sidenav .dropdown > .nav-link');
  sideNavItems.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var menu = this.nextElementSibling;
      if (menu) menu.classList.toggle('open');
    });
  });

  // ============================================================
  //  NAVBAR SCROLL HIDE/SHOW
  // ============================================================
  var nav = document.getElementById('navbar');
  var lastScroll = 0;
  if (nav) {
    window.addEventListener('scroll', function () {
      var st = window.pageYOffset || document.documentElement.scrollTop;
      if (st > lastScroll && st > 120) {
        nav.style.transform = 'translateY(-100%)';
      } else {
        nav.style.transform = 'translateY(0)';
      }
      lastScroll = st;
    }, false);
  }

  // ============================================================
  //  SCROLL-TRIGGERED REVEAL ANIMATIONS
  // ============================================================
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      var dir = el.getAttribute('data-reveal') || 'from-bottom';
      el.classList.add('reveal', dir);
      // Stagger children with data-reveal-delay
      var stagger = el.getAttribute('data-reveal-stagger');
      if (stagger) {
        var children = el.querySelectorAll('[data-reveal-delay]');
        children.forEach(function (child, i) {
          child.classList.add('reveal', 'from-bottom');
          child.style.transitionDelay = (i * parseFloat(stagger)) + 's';
        });
        children.forEach(function (child) { revealObserver.observe(child); });
      }
      revealObserver.observe(el);
    });
  } else {
    // Fallback — reveal everything immediately
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('revealed'); });
  }

  // ============================================================
  //  CATALOGUE SWIPER CAROUSEL
  // ============================================================
  if (typeof Swiper !== 'undefined') {
    new Swiper('.slider-catalogue', {
      slidesPerView: 3,
      spaceBetween: 0,
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
      navigation: {
        nextEl: '.slider-catalogue .swiper-button-next',
        prevEl: '.slider-catalogue .swiper-button-prev',
      },
      pagination: {
        el: '.slider-catalogue .swiper-pagination',
        clickable: true,
      },
      breakpoints: {
        320: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  }

  // ============================================================
  //  VIDEO MODAL (about page)
  // ============================================================
  var videoBtn = document.getElementById('aboutVideoBtn');
  var videoModal = document.getElementById('videoModal');
  var videoClose = document.getElementById('videoModalClose');
  if (videoBtn && videoModal && videoClose) {
    videoBtn.addEventListener('click', function () {
      videoModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    function closeVideo() {
      videoModal.classList.remove('open');
      document.body.style.overflow = '';
    }
    videoClose.addEventListener('click', closeVideo);
    videoModal.addEventListener('click', function (e) {
      if (e.target === videoModal) closeVideo();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && videoModal.classList.contains('open')) closeVideo();
    });
  }

  // ============================================================
  //  SCROLL-TO-TOP BUTTON
  // ============================================================
  var scrollBtn = document.getElementById('scrollTop');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('scroll', function () {
      if (window.pageYOffset > 500) {
        scrollBtn.classList.add('visible');
      } else {
        scrollBtn.classList.remove('visible');
      }
    });
  }
})();
