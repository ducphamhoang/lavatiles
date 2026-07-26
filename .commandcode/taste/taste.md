# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Workflow
See [workflow/taste.md](workflow/taste.md)
# Assets
- For brand cards on the catalogue page, use images from `assets/images/catalogue/` instead of product-specific images. Confidence: 0.60
- Source brand/product imagery from official manufacturer/vendor websites (external URLs) rather than from local catalogue scans or arbitrary selections — the user will provide the correct URL when they want a specific brand image. When given an external URL, download and crop it properly rather than using it as-is. Confidence: 0.75

# Catalogue
See [catalogue/taste.md](catalogue/taste.md)
# Templates / Pages
- Collection/catalogue detail pages should follow a lightweight template: description + images, a flipbook trigger for the catalogue PDF, and optionally product links — not a heavy product-data-driven template requiring extensive per-product specifications. Confidence: 0.75
- When creating a new content page, reuse the project's existing page patterns, CSS classes, and component structure (e.g., `collection-inspiration-*` sections, site chrome, breadcrumbs) rather than designing from scratch — the user expects visual consistency and prefers leveraging what already works. Confidence: 0.75

# Communication
See [communication/taste.md](communication/taste.md)
# UX / Interactivity
- Proactively audit and fix elements that look clickable/interactive (cards, logos, buttons with `href="#"`, etc.) but don't actually work from a user's perspective. Confidence: 0.65
- Use short, simple, user-friendly placeholder messages (e.g. "Trang đang cập nhật") instead of verbose/technical explanations when content pages are not yet available. Confidence: 0.65
- Hover-only visual effects (scale on hover, overlay on hover, etc.) must be wrapped in `@media (hover: hover)` to prevent them from getting stuck in a `:hover` state on touch devices after tapping — the user notices and reports stuck hover states on touch. Confidence: 0.75

# Layout & Design
- Keep featured/grid sections visually complete — if the grid layout calls for a specific number of cells (e.g., 3×2 = 6 items), fill all cells with content rather than leaving empty slots. When the grid is incomplete, add content to balance it rather than reducing the grid size. Confidence: 0.80
- Featured grid card images should all use the same visual style — clean product/tile photos, not catalogue covers with text/branding overlays — so the grid looks visually consistent at a glance. Confidence: 0.80

# Documentation
- Use the company profile document (Hồ Sơ Năng Lực) as the authoritative source of truth for brand info, contact details, and company facts rather than existing website data. Confidence: 0.85
- Use "Lavatiles" (not "Lavatile") as the official brand name across the project. Confidence: 0.85
- Document reusable procedures/pipelines as runbook-style sections in the project README so they can be referenced and reused later. Confidence: 0.85



 