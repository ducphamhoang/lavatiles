# Repository Structure

This is a static Vietceramics-style website. Keep public route files stable so pages can be opened directly from disk or served by any static host.

## Active Source

```text
.
├── index.html                         # Home
├── ve-chung-toi.html                  # About
├── du-an.html                         # Projects landing
├── catalogue.html                     # Catalogue listing
├── tin-tuc.html                       # News listing and category view
├── gach-van-da-marble.html            # Marble tile listing
├── du-an/                             # Project detail/category routes
├── tin-tuc/                           # News article/category routes
├── san-pham/                          # Product taxonomy routes
├── assets/                            # Curated local imagery used by active pages
├── css/                               # Global and page-level styles
├── js/                                # Global and page-level behavior
├── tmp/                               # Downloaded vendor/reference assets still used by pages
├── archive/                           # Generated metadata and scratch exports
├── tasks/                             # Work specs
└── docs/                              # Project documentation
```

Compatibility redirect pages such as `du-an-page.html` and `vietceramics-about-us.html` stay at the root because they preserve old URLs.

## Page Conventions

- Put user-facing route files where their URL should live. Example: `san-pham/thiet-bi-ve-sinh/voi-nuoc.html` maps to the faucet category page.
- Every full page should include `css/style.css`, then its page-specific stylesheet when needed.
- Every full page should use `<div data-site-header ...></div>` and `<div data-site-footer ...></div>` for shared chrome.
- Load scripts in this order when present: `js/site-chrome.js`, `js/main.js`, `js/ui-feedback.js`, shared helpers, then page-specific scripts.
- Use `data-site-root` for nested pages so generated header/footer links resolve correctly.
- Keep page-specific CSS and JS named after the route or feature, for example `css/product-faucet.css` and `js/product-faucet.js`.

## Asset Conventions

- Keep curated, active images in `assets/`.
- Keep third-party or downloaded vendor assets in `tmp/` until they are replaced or promoted.
- Keep generated `.artifact.json` files and one-off exports in `archive/`, not next to active pages.
- Do not move active route files into `archive/`; archive only files that are not linked from active HTML.

## Brand Guardrails

Follow `brand-spec.md` for visual decisions:

- Square retail geometry, minimal rounding, and hairline borders.
- Sparse use of the red accent.
- Image-led modules and showroom/product photography as primary visual signals.
- Uppercase, tracked labels for navigation, hero overlays, and section titles.
