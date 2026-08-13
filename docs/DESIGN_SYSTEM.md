# Product design foundations

The UI is intentionally split into a shared brand and two product themes:

- **Parent:** calm, compact, and operational.
- **Kid:** warm, tactile, and playful.

Both themes use the same semantic token and component APIs. A component should
not need separate parent and kid markup merely to change its visual treatment.

## CSS architecture

`src/index.css` is an import manifest. Keep implementation in these layers:

1. `styles/tokens.css` — primitive brand values and semantic `--ui-*` aliases.
2. `styles/base.css` — document defaults, safe areas, and platform normalization.
3. `styles/components.css` — reusable component recipes and visual states.
4. `styles/motion.css` — named motion patterns and reduced-motion behavior.

Use Tailwind utilities for layout and one-off responsive composition. Use a
component recipe when a visual pattern has states, appears more than once, or is
part of the product identity.

## Theme boundary

Wrap each authenticated product view in `AppShell`:

```tsx
<AppShell mode="parent" className="h-full flex flex-col">
  ...
</AppShell>
```

The shell sets `data-theme` and supplies semantic values such as:

- `--ui-color-canvas`
- `--ui-color-surface`
- `--ui-color-text`
- `--ui-color-border`
- `--ui-color-action`
- `--ui-color-secondary`
- `--ui-card-radius`
- `--ui-card-shadow`

New component recipes should consume these aliases, not parent- or kid-specific
hex values. Brand primitives such as `--color-brand-coral` are appropriate only
when that exact brand color is the meaning.

## Shared primitives

| Primitive | Responsibility |
|---|---|
| `AppShell` | Establishes the parent or kid semantic theme. |
| `Button` | Owns action variants, sizes, focus, disabled, and pressed states. |
| `Card` | Owns surface, padding, selection, and interactive elevation states. |
| `SectionHeading` | Provides consistent section hierarchy and separators. |
| `BrandMark` | Renders the shared product mark. |

Variant state is exposed to CSS with `data-*` attributes. This keeps React
components small, makes states inspectable, and avoids assembling long variant
class strings in every call site.

## Adding a component

1. Name the component for its role, not its current color or page.
2. Use semantic tokens for color, radius, elevation, and focus.
3. Put layout owned by the component in its recipe; let callers supply external
   layout with utilities.
4. Expose finite variants through typed props and `data-*` attributes.
5. Include hover, active, focus-visible, disabled, and selected states where
   relevant.
6. Verify both theme scopes and `prefers-reduced-motion`.

Avoid raw hex colors in TSX, page-named selectors, and selectors that depend on
deep DOM structure. If the same utility bundle appears repeatedly, promote it to
a recipe or a shared React primitive.

## Accessibility baseline

Solid actions use the deeper parent blue and kid coral tokens so white labels
meet contrast expectations. Teal status controls use the deeper teal token.
Interactive recipes share a visible focus treatment, touch targets are at least
44px where practical, and all decorative motion is disabled by the global
reduced-motion query.
