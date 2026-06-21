Goal: read the current static site files and establish a cleaner repository structure without breaking existing public routes.

Completed first pass:

- Kept active public pages at their current paths so direct static browsing still works.
- Kept compatibility redirect pages at the root:
  - `du-an-page.html`
  - `vietceramics-about-us.html`
- Moved generated `.artifact.json` sidecars into `archive/artifacts/`.
- Moved scratch `mq*` exports into `archive/scratch/`.
- Added `docs/repo-structure.md` with the route map, page conventions, asset conventions, and brand guardrails.
- Added `archive/README.md` so archived generated files are clearly labeled.

Current organization:

```text
.
├── active route HTML files
├── assets/
├── css/
├── js/
├── tmp/
├── san-pham/
├── du-an/
├── tin-tuc/
├── archive/
├── docs/
└── tasks/
```

Next organization candidates:

1. Review `tmp/css/` and promote only still-needed vendor CSS into a clearer `vendor/` or `assets/vendor/` folder.
2. Normalize remaining placeholder links (`href="#"`) once destination pages exist.
3. Add a tiny link-check script for local static pages before larger route changes.
4. Split large page data arrays out of page behavior scripts if product/news/project content grows.
