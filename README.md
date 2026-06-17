# Lavatiles — Static Site

A static, build-free marketing site for Lavatiles. Plain HTML, CSS, and
ES-module JavaScript. Deploys to any static host (or just open `index.html`
in a browser after starting a tiny dev server).

## Project layout

```
.
├── index.html               ← homepage
├── catalogue.html
├── ve-chung-toi.html
├── gach-van-da-marble.html
│
├── partials/                ← shared HTML fragments (loaded by fetch)
│   ├── navbar.html
│   ├── sidenav.html         ← mobile drawer
│   └── footer.html
│
├── css/
│   ├── tokens.css           ← brand tokens (:root variables)
│   ├── style.css            ← orchestrator: @imports the components below
│   ├── base.css             ← reset, layout, typography
│   ├── navbar.css
│   ├── hero.css
│   ├── product-cat.css
│   ├── featured.css
│   ├── achievements.css
│   ├── partners.css
│   ├── projects.css
│   ├── catalogue.css        ← catalogue slider
│   ├── collections.css
│   ├── news.css
│   ├── footer.css
│   ├── reveal.css
│   ├── scroll-top.css
│   ├── product-detail.css
│   ├── about.css
│   ├── responsive.css
│   └── vendor/
│       └── swiper-bundle.min.css
│
├── js/
│   ├── main.js              ← ES-module orchestrator
│   ├── core/                ← per-concern UI modules
│   │   ├── partials.js      ← fetches & injects HTML partials
│   │   ├── hero-slider.js
│   │   ├── sidenav.js
│   │   ├── navbar-scroll.js
│   │   ├── reveal.js
│   │   ├── catalogue-slider.js
│   │   ├── video-modal.js
│   │   └── scroll-top.js
│   ├── catalogue.js         ← page-specific (catalogue tabs)
│   └── product-detail.js    ← page-specific (filter UI)
│
├── assets/
│   ├── images/
│   │   ├── hero/
│   │   ├── categories/
│   │   ├── featured/
│   │   ├── projects/
│   │   ├── collections/
│   │   ├── news/
│   │   └── catalogue/
│   └── brand/
│       ├── logo.svg
│       ├── logo-white.svg
│       └── partners/        ← partner wordmarks
│
├── brand-spec.md            ← canonical brand tokens (mirrors css/tokens.css)
├── archive/                 ← frozen old artefacts (tooling JSON, drafts)
└── .gitignore
```

## How partials work

Each page declares three placeholder `<div>`s where shared chrome goes:

```html
<div data-partial="navbar"></div>
<div data-partial="sidenav"></div>
<div data-partial="footer"></div>
```

`js/core/partials.js` fetches the matching `partials/<name>.html` file,
injects it via `innerHTML`, marks the active nav link by matching
`location.pathname`, then fires a `partial:loaded` event.

`js/main.js` waits for partials to load before bootstrapping UI modules
(navbar scroll-hide, hero slider, etc.) so they can find their DOM targets.

### Adding a new partial

1. Create `partials/<name>.html` with the markup.
2. Add `<div data-partial="<name>"></div>` in the page.

That's it — the loader picks it up automatically.

## How CSS cascade works

`css/style.css` `@import`s every component file in this order:

```
base → navbar → hero → product-cat → featured → achievements →
partners → projects → catalogue → collections → news → footer →
product-detail → about → reveal → scroll-top → responsive
```

`responsive.css` is last so its media queries override component defaults.
`reveal.css` and `scroll-top.css` are placed just before responsive so
they too override component styling where needed.

To add a new component: create `css/<component>.css` and add the
`@import` to `style.css` in the right slot.

## Brand tokens

All design tokens live in `css/tokens.css` as `:root` custom properties
(colour, typography, layout dimensions). The canonical reference is
`brand-spec.md` — keep them in sync if you change one.

## Local dev

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

Or any other static server (`npx serve`, `php -S`, etc.). There is no
build step.

## Deploy

Copy the entire directory to any static host (Netlify, Vercel, S3+CloudFront,
GitHub Pages, etc.). The site is fully static.

## Browser support

Modern evergreen browsers. The site uses:

- ES modules (`<script type="module">`)
- `fetch` + `Promise` (for partial loading)
- `IntersectionObserver` (for reveal animations)
- CSS custom properties
- `oklch()` colour (graceful fallback to sRGB in older browsers)
