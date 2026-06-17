export function reveal() {
  'use strict';
  var elements = document.querySelectorAll('[data-reveal]');
  if (elements.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    elements.forEach(function (el) { el.classList.add('revealed'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(function (el) {
    var dir = el.getAttribute('data-reveal') || 'from-bottom';
    el.classList.add('reveal', dir);
    var stagger = el.getAttribute('data-reveal-stagger');
    if (stagger) {
      el.querySelectorAll('[data-reveal-delay]').forEach(function (child, i) {
        child.classList.add('reveal', 'from-bottom');
        child.style.transitionDelay = (i * parseFloat(stagger)) + 's';
        observer.observe(child);
      });
    }
    observer.observe(el);
  });
};
