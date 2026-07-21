# Design

## Style Summary

Hindi Quest is a pleasant, playful product UI for short family learning sessions. The physical scene is a bright kitchen-table learning moment: a child and parent sharing a quick game after school, with warm sunlight, friendly color, and calm focus.

## Color Strategy

Use a restrained product palette with playful accents. The base surface stays clean and readable while honey-gold, leaf green, sky blue, and berry accents carry the child-friendly energy.

```css
:root {
  --color-bg: oklch(1.000 0.000 0);
  --color-surface: oklch(0.972 0.012 92);
  --color-ink: oklch(0.230 0.045 248);
  --color-muted: oklch(0.475 0.034 248);
  --color-primary: oklch(0.720 0.150 80);
  --color-primary-strong: oklch(0.560 0.135 78);
  --color-accent: oklch(0.640 0.135 154);
  --color-sky: oklch(0.760 0.112 224);
  --color-berry: oklch(0.620 0.160 20);
  --color-success: oklch(0.560 0.130 150);
  --color-warning: oklch(0.720 0.150 80);
  --color-border: oklch(0.885 0.020 92);
}
```

## Typography

Use the React Native system font stack for performance and familiarity. Devanagari and Tamil script text should render with the platform's script-capable system fallback. Keep headings friendly but not oversized. Buttons and labels use clear sentence case.

## Components

- App shell: bright white background with soft color bands and generous spacing.
- Primary button: honey-gold fill, dark ink text only on pale fills; white text on stronger saturated fills.
- Secondary button: white surface, visible border, dark text.
- Lesson cards: compact, rounded, colored, and image-led. Radius should stay moderate, not pill-like except for chips. Keep the card frame itself small (tight padding) and let the icon be the dominant element — see Vocabulary Icons below.
- Game tiles: large touch targets with clear selected/correct/needs-retry states.
- Mithu mascot: simple 2D parrot built from rounded shapes; expressive but calm.
- Progress chips: short labels with strong contrast and simple status language.

## Vocabulary Icons

Every concrete-noun word (Food, Family, Animals, Body, Clothes, Transport,
Places, School) shows a large icon inside a colored circle (`FoodVisual` in
App.tsx). **Use flat, bright, open-licensed icon illustrations (Twemoji or
similar) — not real photographs.** This was tried and reverted: real stock
photos (sourced from Pexels) kept surfacing as moody, macro, or otherwise
adult-toned (extreme close-ups, intense animal faces, dim/grayscale shots),
which reads as unsettling rather than friendly for a toddler audience. A
simple cartoon icon is never scary, is always unambiguous at a glance, and
stays visually consistent across all 70+ vocabulary items in a way that
photos curated one-by-one can't. Colors/Numbers/Starter sounds keep their
symbolic emoji/glyph treatment (a color swatch, a numeral, an actual letter)
rather than an "icon" — there's no real-world object to depict for those.

## Layout

Design for portrait mobile first. Keep the main action above the fold. Use full-width panels only where they organize a task; avoid nested cards. Screen content should remain scannable and playable with one hand.

## Motion

Use quick 150-220 ms state feedback only: tile press, correct answer highlight, reward reveal. Avoid long page-load sequences. Reduced motion should still show clear state changes with color, text, and layout.

## Accessibility

Touch targets should be at least 48 px. Text contrast should meet WCAG AA. Correctness should use text and shape/state, not color alone. Audio replay controls must have clear labels.
