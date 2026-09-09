# Status

Read this first in a new session — it's the fastest way to get oriented without
replaying the build history. See `PRODUCT.md` for the vision/audience and
`DESIGN.md` for visual style rules.

## What's built

Two languages, both at full content parity: **13 themes each**, unlocked
sequentially in this order:

`Food -> Colors -> Opposites -> Opposites Two -> Family -> Starter sounds -> Animals -> Numbers -> Body -> Clothes -> Transport -> Places -> School`

Per-theme item counts (same for Hindi and Tamil): Food 6, Colors 5,
Opposites 10, Opposites Two 12, Family 5, Starter sounds 10 (letters),
Animals 6, Numbers 10, Body 6, Clothes 6, Transport 6, Places 6, School 6 —
94 items per language, 188 total. Both Opposites themes (day/night, hot/cold,
up/down, big/small, happy/sad; then come/go, sit/stand, start/stop, here/
there, front/back, open/close) came from direct kid feedback after playing
the game — they're plain themes like any other (Match-and-Listen + optional
Memory Pairs, no new game mechanic), using emoji glyphs rather than new icon
assets since these are abstract/relational/action concepts, not concrete
nouns (see Visual design below).

A theme unlocks once every item in the previous theme is marked "known"
(`isThemeMastered`). There are no sub-levels within a theme yet — see
"Discussed but not built" below.

**Tamil caveat:** the Tamil word list is sourced from common vocabulary but
has **not been checked by a native speaker**. Every Tamil content array has a
`NOTE:` comment flagging this. Verify before wider real-family use — this is
the single biggest outstanding item. `hindi-words-for-review.csv` and
`tamil-words-for-review.csv` (repo root) list every word by theme with a
blank column for corrections, meant to be handed to a native speaker
without them needing to touch the code — see `ROADMAP.md`.

## Architecture

- Single file, `App.tsx` (~1,600 lines). No backend — everything is a static
  Expo web export deployed to Vercel. Progress persists client-side only via
  AsyncStorage, no accounts/login.
- Content model: `LessonItem { id, word, language, transliteration, meaning,
  theme, color, emoji, oppositeId? }`. `oppositeId` is only set on
  Opposites/Opposites Two items and points at the paired item's id — powers
  the "Find the Opposite" game (see Gameplay flow below). Each theme has one
  array per language (e.g. `foodItems` / `tamilFoodItems`).
  `itemsForTheme(themeId, language)` is the single dispatch point — add a
  new theme/language combo there.
- Ids are unique across *all* items in *both* languages (they share one
  `Progress` map in AsyncStorage). Where a Hindi and Tamil word happen to
  transliterate to the same string (e.g. both use "car" or "pencil" as a
  loanword), the Tamil id gets a `ta_` prefix purely to avoid collision —
  this is invisible in the UI, which always displays `transliteration`, not
  `id`.
- Progression logic (`isThemeMastered`, `themePlayability`, `currentLevel`)
  all take `language` explicitly and are computed independently per
  language — Hindi and Tamil track progress completely separately, by
  design, so one language can be ahead of the other with no special-casing.
- `themeUnlockOrder`, `themeRewardName`, `themeUnitLabel` are the three
  `Record<ThemeId, ...>` maps to update whenever a new theme is added — the
  compiler enforces all three are exhaustive.
- `currentThemeId(progress, language)` returns the first unmastered theme in
  `themeUnlockOrder` (or the last theme once everything's mastered). The home
  screen's Continue button, stats, and hero copy all derive from this — it
  used to be hardcoded to `'food'`, which meant a returning player who'd
  already mastered Food got dropped back into a finished lesson instead of
  wherever they actually left off. Fixed; don't hardcode a theme id there again.
- `ANSWER_OPTIONS_CAP = 6` caps how many tiles Match-and-Listen shows per
  question via `buildAnswerOptions(correctItem, pool, cap)`, which always
  includes the correct item plus random distractors up to the cap. Themes
  with more than 6 items (Opposites, Opposites Two, Starter sounds, Numbers)
  used to show every item as a simultaneous choice — too much visual scanning
  for a toddler. The answer set is rebuilt fresh per question, not reused
  across the round.

## Gameplay flow (recent changes)

- **Memory Pairs is optional, not mandatory.** Finishing Match-and-Listen
  (plus any review round for missed words) now goes straight to the Reward
  screen. Memory Pairs is offered there as a secondary "Play Memory Pairs
  (optional)" button; finishing it voluntarily routes to Themes rather than
  looping back to Reward. This was a deliberate cut for the 2-3-year-old
  audience: pairs-matching is a harder working-memory task than word
  recognition, and it was a fixed tax on every lesson regardless of theme
  size.
- **Themes screen is a winding path, not a grid.** Locked/current/mastered
  state is now communicated through position, size, and a check/lock icon
  instead of "Master X to unlock" prose (unreadable to this audience anyway).
  Mastered stops are small with a green check badge; the current stop is
  large with the selected mascot marked "is here"; locked stops are muted
  with a lock glyph. Reuses `themePlayability`/`isThemeMastered` — no new
  state.
- **"Find the Opposite" replaces Memory Pairs for the two Opposites
  themes.** Kid feedback: a hidden-card matching game didn't fit
  Opposites/Opposites Two as well as a direct "find the opposite word"
  mechanic would. Each item in those two themes (both languages) now has
  an `oppositeId` field pointing at its pair. The new `'opposite'` screen
  reuses the Match-and-Listen pattern exactly (hear/see a word, tap the
  right tile from a capped 6-tile set via `buildAnswerOptions`) but the
  correct answer is `currentOppositeItem.oppositeId`, not the same item —
  no new mastery/progress tracking, purely a bonus round like Memory Pairs
  was. The Reward screen's optional-activity button is theme-aware:
  `isOppositesTheme` picks "Find the Opposite (optional)" for Opposites/
  Opposites Two and "Play Memory Pairs (optional)" for every other theme.

## Visual design (recent change)

Vocabulary tiles (`FoodVisual` component, used in the lesson preview, Match
and Listen, Memory Pairs, and the Progress list) show a large icon inside a
colored circle:

- **Food/Family/Animals/Body/Clothes/Transport/Places/School** (the 8
  concrete-noun themes) render a bundled PNG from `assets/icons/`, looked up
  by the item's English `meaning` (not id) — so one icon is shared by the
  matching Hindi and Tamil word automatically. See `assets/icons/CREDIT.md`.
- **Colors/Numbers/Starter sounds** still render the literal `emoji` field as
  large text (a color swatch, a numeral-in-box, or an actual Devanagari/Tamil
  letter aren't things you can "photograph").

**Important lesson learned, don't redo this mistake:** the icons were
originally sourced as real stock photos (Pexels). That was reverted — many
came back as moody/macro/artsy adult stock photography (extreme close-ups of
eyes and lips, a lion's face, a dim hospital building, grayscale product
shots), which reads as unsettling rather than friendly for the toddler
audience this app targets. The icons are now large renders of the *same*
emoji already chosen for each item (Twemoji, CC-BY 4.0), which guarantees a
consistent, simple, bright, unambiguous style with zero photo-curation risk.
**If asked to add or improve pictures again: default to Twemoji (or another
open-licensed flat-illustration set), not real photos, unless explicitly told
otherwise.**

## Audio

`speakWord(text, language, onDone)` wraps `expo-speech`. Current constants
(tuned down three times now after tester feedback that speech was too fast/
clipped — don't re-raise these without a specific reason):
- `SPEECH_RATE = 0.32` (normal words)
- `SOUND_SPEECH_RATE = 0.22` (single-character Starter-sounds letters —
  stretched out further since one syllable at normal rate is too short to
  hear/repeat)
- `MAX_SPEECH_WAIT_MS = 5500` — safety-net timeout in the Match-and-Listen
  answer flow, in case a device has no voice installed for the language and
  speech synthesis silently stalls. Keep this proportional to `SPEECH_RATE`
  if you slow speech down further — it must stay longer than the slowest
  real utterance takes to play, or the app will advance while audio is still
  playing.

**Lesson learned, don't reintroduce this bug:** `speakWord` always calls
`Speech.stop()` before speaking, which is correct for an explicit "tap to
hear again" replay but was also firing from `handleAnswer`'s correct-answer
confirmation replay — so a quick correct tap, landing before the question's
initial auto-play finished, would cut the word off mid-syllable (reported as
"doodh" clipping to "doo") and restart it. Fixed by checking
`Speech.isSpeakingAsync()` first: if the initial auto-play is still going,
skip the confirmation speak entirely and just let it finish undisturbed
before advancing; only replay-as-confirmation when nothing is already
playing. Verified in the browser by forcing `speechSynthesis.speaking` to
`true` and confirming no interrupting `cancel()`/`speak()` pair fires.

## Palette audit (checked, no change made)

The roadmap's "warmer palette pass" item started from the outside
analysis's claim that the live site reads as a "monotone brown/navy
theme." Checked by measurement rather than by re-looking at a screenshot:
converted `DESIGN.md`'s OKLCH tokens to sRGB (Python, standard OKLab
matrices — no network/library needed), pulled the actual hex values out of
`App.tsx`'s `StyleSheet`, converted those back to OKLCH for a fair
lightness/chroma/hue comparison, and rendered both sets as swatches to
look at directly rather than trust the numbers alone:

- `primaryButton` fill `#B9780D` → OKLCH L=0.626 C=0.132 H=70.9° — sits
  almost exactly between the documented `color-primary` (L=0.720 C=0.149
  H=79.9°) and `color-primary-strong` (L=0.562 C=0.120 H=73.0°) tokens,
  with chroma at or above both. Not desaturated/muddy relative to the
  design system's own tokens — it's a legitimate mid-tone honey-gold.
- Header/hero background wash `#F7F1DF` is essentially identical to the
  documented `color-surface` (`#F9F6ED`) — a warm cream, not brown.
- The one real finding: `#24324C`, used as a text-ink color throughout (as
  intended — it's close to the documented `color-ink` token, just
  lightened for legibility), is *also* used as a solid background fill on
  three chrome elements: the active language/track segment toggle, the
  level badge, and the face-down Memory Pairs card. That pattern existed
  in three places independently but was never written down — now added to
  `DESIGN.md`'s Components list as a named "dark accent fill," so it stays
  one deliberate accent rather than draws in a fourth ad hoc color over
  time. This is a documentation fix, not a color change.

**Conclusion: the palette is not objectively drab.** It's the
deliberately restrained, non-neon palette `PRODUCT.md`/`DESIGN.md` chose on
purpose — their own anti-references explicitly rule out "harsh neon
colors" and "overly childish baby-toy styling." The outside analysis's
suggested repaint (saffron/mango/sky-blue/mint) would reverse a documented
brand decision, not fix a defect it never actually measured — it was
written off a live screenshot, without access to the design rationale.
No `App.tsx` colors were changed.

## Web touch-safety (toddler UX polish, in progress)

`public/index.html` overrides Expo's default web export template (Expo
resolves `public/index.html` before falling back to its own — confirmed
against the installed SDK 57 `@expo/cli` source, since `docs.expo.dev` is
unreachable from this environment's network policy). It adds, on top of
the stock `react-native-web` reset:
- A locked viewport meta (`maximum-scale=1, user-scalable=no`) plus
  `touch-action: pan-y` on `html`/`body` — kills pinch-zoom and
  double-tap-zoom while deliberately keeping vertical panning, because the
  app has real `ScrollView`s (Themes path, Progress list); `touch-action:
  none` (as literally suggested in the source analysis this came from)
  would have silently broken scrolling there.
- `overscroll-behavior: none` to kill pull-to-refresh/rubber-band
  overscroll, and `-webkit-touch-callout`/`user-select: none` to kill the
  long-press text-selection callout — a toddler resting palms on a tablet
  triggers all three by accident.
- `position: fixed` on `body` as an extra guard against iOS bounce-scroll,
  consistent with the existing reset's `body { overflow: hidden }`.

This only affects the web export (`public/index.html` has no native
equivalent — iOS/Android don't have browser chrome to fight). Verified by
running a real `npx expo export --platform web` and confirming the custom
template's placeholders (`%LANG_ISO_CODE%`/`%WEB_TITLE%`) and `</head>`/
`</body>` injection points still get filled in correctly by Expo's
pipeline; not yet verified live in a browser against actual tablet
touch/pinch input — do that before calling this item done.

**Landscape orientation lock was in the same source recommendation but was
deliberately NOT done here** — `app.json`'s `orientation` is `"portrait"`
and `DESIGN.md` explicitly says "Design for portrait mobile first." Locking
to landscape would reverse an established design decision, not just add a
touch-safety fix; flagged for a separate decision rather than folded in
silently.

## Non-punitive wrong-answer feedback (audited, partially fixed)

The roadmap item guessed the wrong-answer sound was "likely already mostly
true" given the speech-clipping fixes already made. Checked instead of
assumed: `App.tsx` plays a literal `fail-buzz.mp3` on every wrong tap
(Match-and-Listen, Find the Opposite, Memory Pairs). Since neither
`ffmpeg`/`sox` nor a network path to fetch them was available in this
environment, the actual waveform was decoded and measured directly
(`pip install miniaudio numpy`, no external binary needed) rather than
judged by ear or by filename alone:

- `fail-buzz.mp3`: 0.55s, a **sustained ~131Hz drone** (flat RMS envelope
  across nearly its whole length — a held tone, not a short blip),
  RMS 0.408, peak 0.786, crest factor 1.93.
- `success.mp3`: 2.09s, a bright ~1319Hz chime with a natural decay tail,
  RMS 0.034, peak 0.307, crest factor 9.14.

The fail sound is roughly **12x louder on average and 2.5x louder at peak**
than the success sound, and its low, flat, sustained shape reads as a
classic game-show "wrong buzzer" — the opposite of `PRODUCT.md`'s "mistakes
should invite retry, not shame" and its anti-reference against "punitive
mistake states." This wasn't a vague tone judgment; the numbers confirm it.

**Fixed the loudness, not the timbre.** `FAIL_SOUND_VOLUME = 0.4` (set via
`failPlayer.volume` in a `useEffect`, `expo-audio`'s per-player volume
control) brings its peak amplitude down to roughly the success chime's
peak, without needing a new sound asset. This still leaves the same buzzy
131Hz drone underneath, just quieter — replacing the asset with something
genuinely warmer (a soft "boop"/marimba blip) is a separate, larger call
that needs an actual sourced sound to audition against real kids, not a
guess made sight-unseen. Flagged in `ROADMAP.md`, not done here.

## Deployment

- GitHub: `sandilya629/hindi`, branch `main`.
- Vercel: project `hindi-quest`, scope `sandilyas629`, live at
  https://hindi-quest.vercel.app
- **Deploy recipe** (the project has no backend/API routes — pure static
  export):
  ```
  npx expo export --platform web
  cp -r .vercel dist/.vercel   # dist/ is regenerated each export, losing the link
  cd dist && vercel deploy --prod --yes --scope sandilyas629
  ```
  Deploying from the repo root instead of `dist/` has previously produced a
  broken "no framework detected" build — always deploy from `dist/`.

## Testing methodology used throughout this project

- Local dev: `npx expo start --web --port <N>` (background), then drive it
  with the Claude_Browser tools.
- To test progression/unlock states without replaying lessons: seed
  `localStorage` directly with `hindi-quest-progress` (JSON map of item id ->
  `'known'|'practice'|'new'`) and `hindi-quest-language` (`'hi'|'ta'`), then
  reload.
- To verify TTS behavior: monkey-patch `speechSynthesis.speak` before
  navigating, log `{text, rate, lang}` for each call.
- Windows-environment quirk: `curl` needs `-k` (insecure) in this shell due
  to a local TLS/schannel revocation-check failure — unrelated to the actual
  target server.

## Discussed but not built (raised in planning conversations, no code yet)

See `ROADMAP.md` for the product-facing version of this list (including
launch/wider-audience thinking) — this section stays focused on the
technical implementation angle.

- **Sub-levels within a theme.** Four themes now sit at 10+ items (Opposites
  10, Opposites Two 12, Starter sounds 10, Numbers 10) — the Match-and-Listen
  *answer grid* is already capped at 6 tiles (see `ANSWER_OPTIONS_CAP`
  above), but the *round itself* still asks every question in one sitting,
  which is a lot for a toddler in one go, more so now that Opposites Two is
  12 questions long. The plan discussed: add a `level` field, batch ~5-6
  words per level, and decide broad-first (unlock level 1 of every theme
  before any level 2) vs deep-first (finish all levels of one theme first)
  unlock order. Recommended: broad-first (spiral curriculum).
- **Splitting content out of App.tsx.** At ~230 content lines across 26
  arrays (13 themes x 2 languages) this is still manageable inline, but if
  it keeps growing, move to `content/hi/<theme>.ts` / `content/ta/<theme>.ts`
  modules instead of one giant file. Not a database — this is static,
  rarely-changing, curated content; a real backend would be solving a
  problem this app doesn't have.
- **Next themes beyond the current 13** haven't been chosen yet. Both
  Opposites themes came from direct kid feedback rather than a planning
  conversation — worth staying open to that channel for future theme ideas.
