# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Workflow
See [workflow/taste.md](workflow/taste.md)
# Assets
- For brand cards on the catalogue page, use images from `assets/images/catalogue/` instead of product-specific images. Confidence: 0.60

# Catalogue
- Keep the catalogue section on index.html in sync with the actual catalogue page — only show items/cards that exist on catalogue.html. Confidence: 0.75
- "Xem thêm" buttons on catalogue cards should directly open the flipbook viewer (via data-flipbook-trigger), not navigate to a separate catalogue listing page. Confidence: 0.80
- For presenting PDF catalogues on the web, use a full-page flipbook viewer using extracted page images rather than attempting product-level image extraction. Confidence: 0.65
- Pre-convert PDF catalogues to optimized images stored in `/assets/pdf/` with a proper lookup index, rather than rendering pages on-demand from PDF at runtime. Confidence: 0.70
- When implementing a flipbook page viewer, pre-optimize/compress extracted page images to avoid slow per-page loading times on large documents. Confidence: 0.65

# Communication
- Explain reasoning and considerations before jumping into execution when asked about a complex approach. Confidence: 0.80
- Stay focused on exactly what the user asked for — do not make unrelated changes or fix other issues without asking first. Confidence: 0.75
- Report bugs by observable user-facing symptoms (what the user sees/experiences) rather than by code-level analysis. Confidence: 0.60

# Documentation
- Use the company profile document (Hồ Sơ Năng Lực) as the authoritative source of truth for brand info, contact details, and company facts rather than existing website data. Confidence: 0.85
- Use "Lavatiles" (not "Lavatile") as the official brand name across the project. Confidence: 0.85



 