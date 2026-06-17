export function catalogueSlider() {
  'use strict';
  if (typeof Swiper === 'undefined') return;
  if (!document.querySelector('.slider-catalogue')) return;

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
};
