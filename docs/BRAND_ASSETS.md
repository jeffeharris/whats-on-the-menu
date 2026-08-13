# Brand assets

The launch identity is built around a plate-and-check mark: the plate represents
the family menu, while the check represents each child making a choice from the
options their parent approved.

## Palette

| Role | Color |
|---|---|
| Parent blue | `#5B8DEE` |
| Kid coral | `#FF6B6B` |
| Kid teal | `#4ECDC4` |
| Accent yellow | `#FFE66D` |
| Brand ink | `#233047` |
| Warm cream | `#FFF9F0` |

DM Sans remains the display and wordmark typeface. Product-name lettering is
rendered as live text rather than baked into the logo SVG.

## Source assets

- `public/brand/mark.svg` — generated as true vector paths with Recraft V4 Pro
  Vector (`recraft:v4-pro@vector`). The app icons, touch icon, and PNG favicon
  are raster derivatives of this source.
- `public/brand/hero-family.svg` — generated as true vector paths with Recraft
  V4 Vector (`recraft:v4@vector`).
- `public/brand/social-card.jpg` — selected from two Ideogram 4.0
  (`ideogram:4@0`) typography candidates and cropped to the Open Graph
  `1200x630` standard. The selected generation seed was `213796029`.

The Runware calls were schema-checked with dry runs before generation. Total
generation cost was `$0.58`: `$0.30` for the mark, `$0.08` for the hero, and
`$0.20` for two social-card candidates. One social candidate was rejected
because its headline duplicated a word.

Both SVG sources contain editable vector geometry and no embedded raster image.
Keep the palette and DM Sans typography consistent when adding derivatives.
