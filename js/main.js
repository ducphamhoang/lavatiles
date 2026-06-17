import { initPartials } from './core/partials.js';
import { heroSlider } from './core/hero-slider.js';
import { sidenav } from './core/sidenav.js';
import { navbarScroll } from './core/navbar-scroll.js';
import { reveal } from './core/reveal.js';
import { catalogueSlider } from './core/catalogue-slider.js';
import { videoModal } from './core/video-modal.js';
import { scrollTop } from './core/scroll-top.js';

initPartials().then(() => {
  sidenav();
  navbarScroll();
  reveal();
  scrollTop();
  heroSlider();
  catalogueSlider();
  videoModal();
});
