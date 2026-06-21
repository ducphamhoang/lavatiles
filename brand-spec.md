# Lavatiles Reference System

Source: https://vietceramics.com/
Validated against downloaded homepage markup and site CSS on 2026-06-15.

Observed tokens:

```css
:root {
  --bg: oklch(98.1% 0.002 85);
  --surface: oklch(100% 0.000 89.9);
  --fg: oklch(42.4% 0.002 286.3);
  --muted: oklch(64.7% 0.000 89.9);
  --border: oklch(92.5% 0.000 89.9);
  --accent: oklch(44.2% 0.160 25.9);
}
```

Font stacks:

```css
--font-display: "Averta Std", "Avenir Next", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-body: "Averta Std", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--font-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
```

Layout posture:

- Square retail geometry: no rounded cards, no soft shadows, modules defined by crop, spacing, and hairline borders.
- Accent budget is tight: `#981B1E` is the dominant action and state color and should stay sparse.
- Typography is uppercase-heavy in navigation, hero overlays, catalogue labels, and section titles; tracked caps are part of the brand feel.
- Primary experiences are immersive image fields, video-led banners, and showroom stills with dark overlays and centered copy.
- Product discovery uses gridded catalogue cards, editorial whitespace, and occasional dark interstitial bands to reset the rhythm.
- Footer and utility surfaces skew charcoal with compact columns, contact details, and understated borders.
