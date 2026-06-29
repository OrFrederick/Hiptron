# hiptron logo assets

Two logo systems extracted for the pitch. All SVGs are colorable.

## Official (from hiptron.care) — solid, two-tone
Brand colors: heart **#34495E** (slate), gear **#687864** (sage).
- `hiptron-official-lockup.svg` — mark + "hiptron" wordmark, horizontal. (wordmark is live text: Segoe UI Semibold w/ sans fallback)
- `hiptron-official-mark.svg` — mark only, two-tone. Recolor via CSS vars: `--heart`, `--gear`.
- `hiptron-official-mark-mono.svg` — mark only, single color via `color:` / `currentColor`.

## Pitch (from problem_slides.pdf) — outline, single color
Color used in deck: royal blue **#232ACF**. All use `currentColor` → set `color:` to recolor.
- `hiptron-logo.svg` — stacked mark + wordmark.
- `hiptron-mark.svg` — outline heart-gear mark only.
- `hiptron-wordmark.svg` — "hiptron" wordmark only (outlined Segoe glyphs, no font dependency).

## Recolor
SVG (currentColor variants): `<img>` won't inherit color — inline the SVG, or set `color` on the svg/parent.
Two-tone: override `--heart` / `--gear` custom properties.
PNG exports are transparent; recolor at export with rsvg-convert by editing the `color`/vars first.
