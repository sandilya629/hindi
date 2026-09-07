# Hindi Quest

A small, audio-first vocabulary game for toddlers learning **Hindi** or
**Tamil** alongside a parent. Hear a word, tap the right tile, unlock the
next stop on the path.

**Play it:** https://hindi-quest.vercel.app

## What it is

Hindi Quest teaches vocabulary through one simple loop: a word is spoken
slowly and clearly, the child taps the matching tile from a small set of
choices, and correct answers move a winding progress path forward. There
are no accounts, no ads, and no data collection — progress lives only in
the browser.

- **13 themes**, from Food and Colors through two Opposites themes,
  Family, Numbers, Animals, Body, Clothes, Transport, Places, and School —
  94 words per language, 188 total.
- **Two fully independent languages** — Hindi and Tamil each have their
  own content and their own progress, selected once at the start.
- **Two game mechanics**: Match-and-Listen (hear it, tap it) is the core
  of every lesson; an optional second activity follows — Memory Pairs for
  most themes, or **Find the Opposite** for the two Opposites themes,
  where the correct tile is the *opposite* word rather than the same one.
- **Twemoji-based icons**, not photos — flat, bright, and unambiguous at a
  glance for a 2-3-year-old audience. See [`DESIGN.md`](DESIGN.md) for why.

## Who it's for

Built first for toddlers (roughly 2-3 years old) with a parent driving the
screen alongside them — see [`PRODUCT.md`](PRODUCT.md) for the full
picture of the audience and design principles this produces.

## Tech stack

- [Expo](https://expo.dev) / React Native, exported as a static web build
- `expo-speech` for text-to-speech, `expo-audio` for sound effects
- No backend — progress is stored client-side via `AsyncStorage`
- Deployed as a static site on [Vercel](https://vercel.com)

The whole app is one file, [`App.tsx`](App.tsx) — see
[`STATUS.md`](STATUS.md) for why that's still the right call at this size,
and the architecture notes for anyone picking this up.

## Getting started

```bash
npm install
npx expo start --web
```

That starts a local dev server (defaults to `http://localhost:8081`,
override with `--port`). No environment variables or backend setup needed.

## Deploying

Static export, deployed to Vercel:

```bash
npx expo export --platform web
cp -r .vercel dist/.vercel   # dist/ is regenerated each export, losing the link
cd dist && vercel deploy --prod
```

Deploy from `dist/`, not the repo root — see `STATUS.md` for why.

## Project docs

| File | What it covers |
| --- | --- |
| [`PRODUCT.md`](PRODUCT.md) | Audience, product purpose, brand, design principles |
| [`DESIGN.md`](DESIGN.md) | Visual style, color, icon strategy |
| [`STATUS.md`](STATUS.md) | Current build state, architecture, lessons learned — read this first if you're picking up the project |
| [`ROADMAP.md`](ROADMAP.md) | What's next, and how "wider audience" launch is being thought about |

## Content status

The Hindi word list is the primary, most-used content. The **Tamil word
list has not yet been verified by a native speaker** — it's sourced from
common vocabulary but flagged for review throughout the codebase. Two
plain-language review sheets covering every word in both languages —
[`hindi-words-for-review.csv`](hindi-words-for-review.csv) and
[`tamil-words-for-review.csv`](tamil-words-for-review.csv) — are in the
repo root if you'd like to help check them.

## Credits

Vocabulary icons are [Twemoji](https://github.com/twitter/twemoji)
(CC-BY 4.0) — see [`assets/icons/CREDIT.md`](assets/icons/CREDIT.md).
