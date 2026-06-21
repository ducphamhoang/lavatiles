Refactor goal: clean redundant menu/footer markup and duplicated CSS/JS while preserving the current static-site behavior.

Step-by-step plan:

1. `js/site-chrome.js`
   - Treat this as the single source of truth for global navigation and footer.
   - Keep page-specific root/active state driven by `data-site-root` and `data-active-nav`.
   - Ensure generated newsletter forms use shared feedback handling instead of inline handlers.

2. `gach-van-da-marble.html`
   - Replace the hard-coded navbar, sidenav, and footer with `data-site-header` and `data-site-footer` placeholders.
   - Load `js/site-chrome.js` before `js/main.js` so generated navigation exists before event binding.
   - Load `js/ui-feedback.js` for the generated footer newsletter form.

3. `js/main.js`
   - Keep only global interaction behavior here.
   - Guard global behaviors so pages without a generated navbar do not throw scroll-time errors.

4. `js/product-filter.js`
   - Add one reusable product-list filter helper for search, checkbox filters, chip filters, load-more, active-token rendering, and reset behavior.

5. `js/product-detail.js`
   - Keep marble-specific data and card/tone markup.
   - Delegate duplicated filter/render/event logic to `js/product-filter.js`.

6. `js/product-faucet.js`
   - Keep faucet-specific data and card/art markup.
   - Delegate duplicated filter/render/event logic to `js/product-filter.js`.

7. Product listing HTML pages
   - Add `js/product-filter.js` before each page-specific product listing script.
   - Keep page-specific scripts after the shared helper.

8. Verification
   - Search for remaining hard-coded duplicated chrome.
   - Check script ordering on affected pages.
   - Run JavaScript syntax checks for changed scripts.
