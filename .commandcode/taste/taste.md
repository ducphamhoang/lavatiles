# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Workflow
- Parallelize independent work phases by spawning sub-agents rather than executing sequentially to keep each agent's context clean and unpolluted. Confidence: 0.87
- For static websites, serve locally with Python's built-in HTTP server (`python -m http.server <port>`) instead of complex project exploration. Confidence: 0.75
- Verify and test implementation end-to-end before marking tasks complete; do not rely on passing initial superficial checks. Confidence: 0.70
- When content/data is incomplete for a page (e.g., missing images, descriptions), create the page structure with placeholders and add the content later rather than blocking development. Confidence: 0.65

# Assets
- For brand cards on the catalogue page, use images from `assets/images/catalogue/` instead of product-specific images. Confidence: 0.60

# Catalogue
- For presenting PDF catalogues on the web, use a full-page flipbook viewer using extracted page images rather than attempting product-level image extraction. Confidence: 0.65
- Pre-convert PDF catalogues to optimized images stored in `/assets/pdf/` with a proper lookup index, rather than rendering pages on-demand from PDF at runtime. Confidence: 0.70
- When implementing a flipbook page viewer, pre-optimize/compress extracted page images to avoid slow per-page loading times on large documents. Confidence: 0.65

# Communication
- Explain reasoning and considerations before jumping into execution when asked about a complex approach. Confidence: 0.80
- Stay focused on exactly what the user asked for — do not make unrelated changes or fix other issues without asking first. Confidence: 0.75

# Documentation
- Use the company profile document (Hồ Sơ Năng Lực) as the authoritative source of truth for brand info, contact details, and company facts rather than existing website data. Confidence: 0.85
- Use "Lavatiles" (not "Lavatile") as the official brand name across the project. Confidence: 0.85



 