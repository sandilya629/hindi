# Status

Read this first in a new session — it's the fastest way to get oriented without
replaying the build history. See `PRODUCT.md` for the vision/audience and
`DESIGN.md` for visual style rules.

## What's built

Two languages, both at full content parity: **11 themes each**, unlocked
sequentially in this order:

`Food -> Colors -> Family -> Starter sounds -> Animals -> Numbers -> Body -> Clothes -> Transport -> Places -> School`

Per-theme item counts (same for Hindi and Tamil): Food 6, Colors 5, Family 5,
Starter sounds 10 (letters), Animals 6, Numbers 10, Body 6, Clothes 6,
Transport 6, Places 6, School 6 — 72 items per language, 144 total.

A theme unlocks once every item in the previous theme is marked "known"
(`isThemeMastered`). There are no sub-levels within a theme yet — see
"Discussed but not built" below.

**Tamil caveat:** the Tamil word list is sourced from common vocabulary but
has **not been checked by a native speaker**. Every Tamil content array has a
`NOTE:` comment flagging this. Verify before wider real-family use — this is
the single biggest outstanding item.

## Architecture

- Single file, `App.tsx` (~1,600 lines). No backend — everything is a static
  Expo web export deployed to Vercel. Progress persists client-side only via
  AsyncStorage, no accounts/login.
- Content model: `LessonItem { id, word, language, transliteration, meaning,
  theme, color, emoji }`. Each theme has one array per language (e.g.
  `foodItems` / `tamilFoodItems`). `itemsForTheme(themeId, language)` is the
  single dispatch point — add a new theme/language combo there.
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
(tuned down twice already after tester feedback that speech was too fast/
clipped — don't re-raise these without a specific reason):
- `SPEECH_RATE = 0.4` (normal words)
- `SOUND_SPEECH_RATE = 0.26` (single-character Starter-sounds letters —
  stretched out further since one syllable at normal rate is too short to
  hear/repeat)
- `MAX_SPEECH_WAIT_MS = 4500` — safety-net timeout in the Match-and-Listen
  answer flow, in case a device has no voice installed for the language and
  speech synthesis silently stalls. Keep this proportional to `SPEECH_RATE`
  if you slow speech down further — it must stay longer than the slowest
  real utterance takes to play, or the app will advance while audio is still
  playing.

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

- **Sub-levels within a theme.** If any theme's word count grows much past 6
  (some already discussed at 10-12), doing them all in one sitting is a lot
  for a toddler. The plan discussed: add a `level` field, batch ~5-6 words
  per level, and decide broad-first (unlock level 1 of every theme before
  any level 2) vs deep-first (finish all levels of one theme first) unlock
  order. Recommended: broad-first (spiral curriculum).
- **Splitting content out of App.tsx.** At ~150 content lines across 22
  arrays (11 themes x 2 languages) this is still manageable inline, but if
  it keeps growing, move to `content/hi/<theme>.ts` / `content/ta/<theme>.ts`
  modules instead of one giant file. Not a database — this is static,
  rarely-changing, curated content; a real backend would be solving a
  problem this app doesn't have.
- **Next themes beyond the current 11** haven't been chosen yet.
