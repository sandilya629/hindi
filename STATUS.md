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
(`isThemeMastered`, unchanged — still checks the whole theme, not a
sub-level). Within a theme, the four themes with more than 6 items
(Opposites, Opposites Two, Starter sounds, Numbers) are now split into
4-6-item sub-levels for a single Match-and-Listen round — see "Sub-levels
for larger themes" below.

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

`speakWord(text, language, onDone)` wraps `expo-speech`, for target-
language (Hindi/Tamil) vocabulary only. Current constants (tuned down
three times after tester feedback that speech was too fast/clipped —
don't re-raise these without a specific reason; direct feedback since
confirms these are fine as-is, see below):
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

**Don't conflate `SPEECH_RATE` with UI-prompt speech — this was a real bug,
now fixed.** `speakUIPrompt` (the Reward screen's "Great job!" line, English,
not vocabulary) originally reused `SPEECH_RATE`. That rate is tuned for a
toddler hearing one new *foreign* word slowly and clearly; applying the same
crawl to a full *English* sentence read as unnaturally slow and stilted, not
warm. Direct feedback ("really slow... need to be normal conversational
pace") confirmed this on both mobile and laptop — which also ruled out an
initially-plausible theory that different devices pick different default
TTS voices with different baseline paces for the same `rate` multiplier
(genuinely worth checking first, since `speakWord`/`speakUIPrompt` never
pin an explicit `voice`, only a `language` code — but the per-word vocabulary
audio was confirmed fine everywhere, narrowing it to this one code path).
Fixed with a separate `UI_PROMPT_SPEECH_RATE = 0.95` constant (near-natural
pace, not the toddler-vocabulary crawl) — `SPEECH_RATE`/`SOUND_SPEECH_RATE`
were not touched.

**Follow-up feedback: pace was fixed, but the voice itself still read as
"too computer generated" — wants "softer, more human, warm and
encouraging."** No rate or pitch tweak fixes that; it's the underlying
synthesized voice, not how fast it talks. Added `getPreferredEnglishVoice()`
(cached after first successful lookup), which asks
`Speech.getAvailableVoicesAsync()` for a better-than-default English voice
and points `speakUIPrompt` at it when one exists:
- Prefers `quality === Speech.VoiceQuality.Enhanced` first — meaningful on
  iOS/Android, where expo-speech reports a real quality flag.
- Falls back to a name-keyword heuristic (`/natural|online|neural|enhanced/i`)
  for web, where expo-speech's web module always reports `Default` for
  every voice regardless of actual quality (confirmed by reading the
  installed package source) — browsers/OSes that expose a real neural/cloud
  voice alongside classic robotic ones typically label it this way (e.g.
  Edge on Windows ships "Microsoft `<Name>` Online (Natural)" next to the
  older desktop voices).
- Falls back to no explicit voice (today's unmodified behavior) if nothing
  better is found — can only improve the outcome, never regress it *in
  the voice-selection logic itself*.

**Real bug found and fixed before shipping, not just theorized:** naively
awaiting `getAvailableVoicesAsync()` is unsafe. Read the installed
`expo-speech` web source directly: when the browser's voice list is
empty, it waits on `speechSynthesis.onvoiceschanged` — and that promise
**never resolves** if that event never fires, which is exactly what
happens on a device with zero installed voices. Verified this hang with a
mocked zero-voice browser in a scripted test — the Reward screen's spoken
line went completely silent, hung forever waiting on that lookup. Fixed
with a 400ms timeout race (`Promise.race` against a timer) so a slow or
absent voice list can never block speech from happening at all; a timeout
result isn't cached, so a later call can still pick up voices that load in
after the timeout (many browsers populate the list asynchronously shortly
after page load). Verified both paths with scripted browser tests: a mixed
voice list (robotic defaults + one "Online (Natural)" voice) correctly
picks the Natural one; a zero-voice list correctly falls back to `null`
within the timeout with no hang and no crash.

**Honest ceiling of this fix:** it can only pick a *better system voice*,
if the device actually has one installed. It cannot fabricate warmth a
device's voice pool doesn't have — some browsers/OSes only expose flat,
dated voices with nothing "Natural"/"Enhanced" available at all, and this
falls back to the same default in that case (no worse than before, not
necessarily better either). The only way to guarantee genuine human warmth
regardless of device is a real pre-recorded voice clip for this one fixed
phrase — the same pattern already used for `success.mp3`/`fail-buzz.mp3` —
which needs an actual sourced recording, not something to guess at code-side.
Not done here; worth raising if this code-level improvement isn't enough.

**Lesson learned, don't reintroduce this bug — this note originally
claimed the bug below was fixed; it wasn't, only half of it was.**
`speakWord` always calls `Speech.stop()` before speaking, which is correct
for an explicit "tap to hear again" replay. The first fix (still true)
was that this was also firing from `handleAnswer`'s correct-answer
confirmation replay — a quick correct tap, landing before the question's
initial auto-play finished, would cut the word off mid-syllable (reported
as "doodh" clipping to "doo"). That was fixed by checking
`Speech.isSpeakingAsync()` first: if the initial auto-play is still going,
skip the confirmation speak and let it finish undisturbed.

**What that fix missed:** skipping the confirmation speak isn't enough on
its own — the code still called `advanceToNext()` immediately, which
waits a *fixed* `REACTION_PAUSE_MS` (1800ms) and then moves to the next
question, whose own auto-play effect calls `speakWord` → `Speech.stop()`.
If the still-playing word takes longer than 1800ms to finish — very
possible for a multi-syllable word at this app's deliberately slow rate,
and *more* likely every time the rate was tuned down further, since a
slower word takes longer to finish — the next question's auto-play would
cancel it mid-syllable, reproducing the exact same "doodh → doo" symptom
via a different path than the one originally fixed. This is almost
certainly why the bug kept resurfacing across multiple "slow it down"
tuning passes: each pass made the race *more* likely to reproduce, not
less, since it only ever addressed the utterance's rate, not how long the
app then waited before assuming it was safe to speak the next one.

**Actually fixed now:** `waitForSpeechIdle(maxWaitMs)` polls
`Speech.isSpeakingAsync()` every 120ms until it reports false (bounded by
`MAX_SPEECH_WAIT_MS` as a safety net), instead of guessing a fixed delay.
`handleAnswer` and `handleOppositeAnswer` both call it before advancing
when the check finds speech still in progress, so the next question's
`speakWord` can never fire while the current word is still playing,
regardless of word length or device speech-engine speed. No rate constant
needed to change — the race was never really about how fast/slow the
words *sound*, only about how long the app waited before assuming it was
safe to interrupt them.

**Verified with a reproduction, not just a read of the code:** extended
this file's own documented TTS-mocking method (`speechSynthesis.speak`
monkey-patched to simulate a word that takes 2500ms to finish, longer than
`REACTION_PAUSE_MS`) into a scripted browser test run against real
`npx expo export --platform web` builds of both the pre-fix and post-fix
code. Pre-fix: reproduced the exact bug — "दूध" (doodh) starts speaking,
gets `cancel()`led at ~2000ms (before its own 2500ms finish), "रोटी"
starts immediately after. Post-fix, identical scenario: the word plays
all the way to its own natural `end` event at 2501ms, with no
interrupting cancel. `npx tsc --noEmit` clean.

**Also verified on Starter Sounds and Find the Opposite specifically**
(not just Food/Match-and-Listen), since both go through code that either
looked identical or turned out to be a second, distinct call site:
- **Starter Sounds** (single-letter items, `SOUND_SPEECH_RATE`) — same
  `handleAnswer` function, so this was mostly confirming the fix is
  content-agnostic rather than expecting a different result: seeded
  `localStorage`'s `hindi-quest-progress` with Food/Colors/Opposites/
  Opposites Two/Family all `'known'` (per this file's own testing
  methodology below) to land directly on Starter Sounds without playing
  four unrelated themes first, then ran the same fast-tap-during-auto-play
  scenario. A single mocked letter ("र", "अ", "ल" across runs) played to
  its natural `end` every time, no premature cancel.
- **Find the Opposite** (`handleOppositeAnswer`) — a genuinely separate
  function with its own copy of the same fix, so this needed its own
  check, not an inference from the Match-and-Listen result. Seeded
  Food/Colors as `'known'` to land on Opposites, played through its
  Match-and-Listen round (confirming `handleAnswer` again, this time with
  Opposites' own content — "दिन" completed naturally too), reached Reward,
  opened "Find the Opposite (optional)," then fast-tapped a correct
  opposite ("नीचे" → "ऊपर") during its own mocked auto-play. The captured
  log ended up spanning several consecutive question transitions (into a
  second Find-the-Opposite round) rather than just the one tap checked —
  every single word's `speak` → `end` pair completed naturally before the
  next word's `speak` ever fired, across the whole stretch.

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

## "Less English text" audit (checked, mostly no change; one gap found)

The roadmap item's framing — "lean further on icons, color, and voice
prompts so a non-reading 3-5 year old can navigate unassisted" — assumes
a fully independent, non-reading child navigating the whole app alone.
Checked against `PRODUCT.md` before touching anything, because that's not
this app's model: **"Hindi Quest is built first for a toddler... with a
parent driving the screen alongside them — not a kid navigating
independently. That distinction shapes real design decisions:
instructional text can stay in full English prose (the parent reads it,
not the child), but anything the child is meant to parse — game state,
correctness, how many choices are on screen at once — has to work through
position, color, size, and sound, not reading."**

Checked each named example and the actual bar `PRODUCT.md` sets, against
the real screens in `App.tsx`:

- **"Choose your language," "Show pronunciation help"** — both live on the
  setup screen, operated once by the parent before the child ever touches
  the tablet (`languageMeta`/`adultSupport` toggles). This is precisely the
  "parent reads it, not the child" case `PRODUCT.md` describes on purpose
  — Design Principle 4 even names pronunciation help as adult-only support,
  "not a separate mode." Changing this would work against a documented
  decision, not fix a violation of it. Not done.
- **In-lesson mechanics** (the part `PRODUCT.md` actually requires to be
  non-text) — already audio-led and icon/color-driven: the prompt word is
  spoken (`speakWord`), answer tiles are icon/emoji-first, and correctness
  is shown via tile state, not a text verdict the child must read. The
  Themes screen already replaced "Master X to unlock" prose with a
  position/size/icon-only path for exactly this reason (see the Gameplay
  flow section above) — this principle is already applied where it
  actually matters.
- **The one real gap:** post-lesson navigation — `Continue`, `Play next`,
  `See progress`, and the optional `Find the Opposite (optional)`/`Play
  Memory Pairs (optional)` buttons — is where the child *is* likely to tap
  directly during a shared session (this is squarely "how many choices are
  on screen... which one to tap next," `PRODUCT.md`'s own bar). Right now
  these are plain English button labels; the only non-text cue is size and
  Primary-vs-Secondary color, with no icon and no spoken cue, unlike every
  in-lesson screen. Worth closing, but it's a real design decision (which
  icon fits each button, whether the mascot should voice the label) rather
  than a mechanical fix — not guessed at here; needs a call before doing.

**Follow-up: designed and built.** `PrimaryButton`/`SecondaryButton` now
take an optional `icon` prop (a small emoji glyph rendered before the
label; the components' Pressable carries an explicit `accessibilityLabel`
set to the plain label text, so the decorative icon isn't separately
announced by a screen reader — RN treats an accessible element with an
explicit label as one node, subsuming its children). The top-bar Home/
Progress links (plain `Pressable`s, not the shared button components) got
the same treatment inline. One consistent icon language across every
post-setup screen — repeating an icon for the same destination/action
everywhere it appears, like real wayfinding signage, rather than a
different icon per screen for the same action:

- 🏠 Home, ⭐ Progress — top bar, every screen
- 🗺️ any button that goes to the themes map (`Choose a theme`,
  `Back to themes`)
- ▶️ any button that starts/continues/replays a lesson (`Continue`/
  `Start first lesson`, `Play`, `Play next`, `Review <Theme>`)
- 🧠 `Play Memory Pairs (optional)`, ↔️ `Find the Opposite (optional)`
- **Deliberately no icon:** `Reset prototype` on the Progress screen. It
  wipes all progress — it should look less inviting to tap than the rest,
  not more, so it was left out of the icon system on purpose rather than
  overlooked.

## "Erase all progress" gating (fixed)

Follow-up to the icon-design flag above. `resetPrototype()` was a single,
ungated tap with zero confirmation — `setProgress(initialProgress)` wipes
the shared progress map for *both* Hindi and Tamil (see the Architecture
section's note that both languages share one `Progress` map in
AsyncStorage), with no undo and no cloud backup (client-side storage only,
per the Deployment/Architecture sections). Progress is one of only two
links every screen's top bar exposes, so a child exploring the app could
reach it and permanently erase everything with one accidental tap. This
was a real safety gap, not a style question, so it got fixed rather than
just flagged further:

- Relabeled the trigger from `Reset prototype` (dev jargon, doesn't say
  what it does) to `Erase all progress`.
- Tapping it no longer calls `resetPrototype()` directly — it sets a new
  `confirmingReset` state, which swaps the button for a warning panel:
  "Erase all progress for both Hindi and Tamil? This can't be undone,"
  a `Cancel` button (returns to the plain trigger, touches nothing), and a
  second, explicitly-worded `Yes, erase everything` button that's the only
  one that actually calls `resetPrototype()`.
- That confirm button uses a new `destructiveButton` style filled with
  `#D5565D` — the exact sRGB conversion of `DESIGN.md`'s already-documented
  `--color-berry` token (`oklch(0.620 0.160 20)`), computed the same way as
  the palette audit above. That token existed in the design system but was
  unused anywhere in the app until now; this is its first real use,
  reserved for the one genuinely irreversible action in the whole UI so it
  reads as visually distinct from every other (safe, reversible)
  navigation button.
- Considered `Alert.alert()` (React Native's built-in confirm dialog)
  first and rejected it: `react-native-web`'s implementation is a no-op
  stub (`static alert() {}`, confirmed by reading the installed package
  source) — on this app's actual deployment target, calling it would
  silently do nothing at all, not even show a dialog. A native
  `window.confirm()` fallback would work but renders as a jarring default
  browser popup, inconsistent with the app's own visual language. Built a
  small in-app confirmation panel instead, using existing components.

**Verified end-to-end** with a scripted browser (not just `tsc`): typed
"Erase all progress," confirmed the warning panel text and berry-red
button render; tapped `Cancel` and confirmed the trigger button reappears
untouched (progress unchanged); then tapped through to `Yes, erase
everything` and confirmed it actually lands back on the onboarding screen
reset to defaults. `npx tsc --noEmit` clean.

**Decided:** keep it available in-app, on the Progress screen, as-is.
Raised as an open question — the dev-only `localStorage`-seeding method
above means it isn't *needed* for testing — but the call was to keep it
as a real feature (a family wanting a fresh start, a shared device, etc.)
now that the two-step confirmation actually closes the safety gap. Not
revisiting unless something changes.

**Voice:** added `speakUIPrompt()`, distinct from `speakWord()` — it
always speaks English (`en-US`) since these are UI phrases, not target-
language vocabulary. Wired to exactly one place: a `useEffect` on
`screen === 'reward'` speaks "Great job! Want to play more, or see your
progress?" once per lesson completion, guarded by `Speech.isSpeakingAsync()`
first (same clip-avoidance pattern as the existing `handleAnswer`/
`handleOppositeAnswer` confirmation-replay logic, so it can't cut off a
still-playing correct-answer confirmation). Deliberately **not** added to
Home/Lesson-preview/Progress: each of those already has one obvious
primary action carried by size, color, and now an icon; narrating every
screen transition on every one of many repeat sessions risks becoming the
thing a parent mutes, for no real gain over what's already legible. Reward
is the one screen with an actual branching choice (keep playing vs. the
optional bonus activity vs. check progress), which is where a spoken frame
earns its place.

**Verified**, not just typed-checked: scripted a real headless-Chromium
walkthrough (Playwright, installed locally with `--no-save` and removed
afterward — not a project dependency) through onboarding → home → themes
→ lesson preview → match → reward → progress against a real
`npx expo export --platform web` build, screenshotting each step. No
console errors; icons render correctly sized and laid out (`flexDirection:
'row'` + `gap` on the button/top-link styles, which needed adding — they
were column-centered for a single Text child before). `npx tsc --noEmit`
clean.

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

This only affects the web export (`public/index.html` has no native
equivalent — iOS/Android don't have browser chrome to fight). Verified by
running a real `npx expo export --platform web` and confirming the custom
template's placeholders (`%LANG_ISO_CODE%`/`%WEB_TITLE%`) and `</head>`/
`</body>` injection points still get filled in correctly by Expo's
pipeline.

**Real regression, found and fixed:** this block originally also set
`body { position: fixed; width: 100% }` as an "extra guard against iOS
bounce-scroll." That was wrong to add and has been removed. Reported on an
actual phone: the page loaded pre-scrolled, with the top bar (Home/
Progress — the only way to navigate away from a lesson) off-screen and
unreachable. `position: fixed` directly on `<body>` (rather than a
dedicated wrapper element) is a well-documented risky pattern on mobile
Safari specifically, because of how it interacts with the dynamic
address-bar/viewport-chrome height — confirmed via web search turning up
multiple independent reports of this exact "page loads scrolled, fixed
content off-screen until you touch it" symptom class (see e.g.
[this gist](https://gist.github.com/nicolaskopp/637aa4e20c66fe41a6ea2a0773935f6e)
and [Apple's own developer forums](https://developer.apple.com/forums/thread/744327)
on `position: fixed` breaking after a while on iOS). Could not reproduce
the exact bug in this environment — only Chromium is available here (no
real WebKit/Safari, and fetching one isn't appropriate per this
environment's guidance not to run `playwright install`), and Chromium's
engine doesn't exhibit the same address-bar/fixed-position interaction, so
a scripted mobile-viewport check here came back clean on *both* the buggy
and fixed builds — inconclusive by construction, not evidence either way.
The fix itself doesn't need that inconclusive test to be justified: it
removes the one line in the entire touch-safety change that has this
documented failure mode, on an actual field report that matches the
documented symptom precisely, and `overscroll-behavior: none` (kept)
already covers the original intent — preventing rubber-band overscroll —
via a modern, well-supported property with no such risk. **Confirmed
fixed on an actual phone** — the top bar is reachable and the page no
longer loads pre-scrolled.

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

## Repeated-tap lock after correct answers (fixed)

Source: `BoloBee_Product_Audit.md` (external product/UX audit), finding
CUX-02, rated P0 in its roadmap table ("Lock answer input after correct
taps"). Uploaded and worked from directly — no separate rewrite of the
finding into `ROADMAP.md` was needed since it was fixed the same session.

**The bug:** in both Match-and-Listen (`handleAnswer`) and Find the
Opposite (`handleOppositeAnswer`), the answer tiles were never disabled and
the handlers never checked whether a correct answer was already in
progress. A correct tap starts an async chain — success sound, a word
replay via `speakWord`/`waitForSpeechIdle`, then a `REACTION_PAUSE_MS`
pause — before the next question actually appears. A toddler tapping the
same (or another) tile again during that window re-entered the handler
from scratch: a second, independent `advanceToNext` closure with its own
`advanced` flag and its own `setTimeout`, a second progress write, a second
success sound. Confirmed in the audit's own walkthrough: repeated correct
taps produced progress/reward-copy counts that didn't match (4 known items
vs. "6 words practiced").

**The fix:** two small pieces of state, `answerLocked` and
`oppositeAnswerLocked`, one per screen. Set to `true` the moment a correct
answer is registered; the answer tiles get `disabled={answerLocked}` (resp.
`oppositeAnswerLocked`) so taps are ignored at the `Pressable` level, and
`handleAnswer`/`handleOppositeAnswer` also guard at the top as a second
layer (`if (answerLocked) return;`) in case a tap is already in flight when
the disabled state lands. Both flags reset to `false` at the moment
`advanceToNext`'s timer actually fires — right as the next question, the
review round, or the reward screen takes over — so there's no separate
"unlock" event to keep in sync as new advance branches get added later.

**Deliberately does not touch the wrong-answer path.** A wrong tap has
never cleared `selectedAnswer`/`oppositeSelectedAnswer` on its own — the
existing "Try again" flow depends on the child being able to tap a
*different* tile immediately, and that tap running `handleAnswer` again
right away. Locking on "any answer selected" (as the audit's literal wording
suggested — "ignore additional taps while `selectedAnswer` is set") would
have frozen the game after every wrong answer, since nothing else clears
that flag on the wrong-answer path. Locking specifically on *correct*
answers only was the actual fix needed and preserves the retry flow
byte-for-byte.

Verified with `tsc --noEmit` (clean) after the change; no other screens or
content were touched. Memory Pairs was not in scope for this finding — its
own `handleCardPress` already guards re-flipping a card that's mid-flip or
matched (`matchedCards.includes(...) || flippedCards.some(...)`), so it
didn't share this bug.

## Sub-levels for larger themes (fixed)

Source: `BoloBee_Product_Audit.md`, finding CUX-03, rated P0 ("Split long
rounds to 4-6 prompts"). Second item worked from that audit, after the
repeated-tap lock (CUX-02).

**The problem:** `ANSWER_OPTIONS_CAP` already limits how many tiles show
per question (6), but a full Match-and-Listen round still asked *every*
item in the theme before reaching Reward. Four themes exceed 6 items —
Opposites and Starter sounds (10 each), Numbers (10), Opposites Two (12) —
so a single sitting on one of those asked 10-12 prompts back to back, a lot
for the 2-5-year-old audience even with the per-question tile cap already
in place.

**The fix:** `SUB_LEVEL_MAX_SIZE = 6` and `chunkIntoSubLevels(items,
maxSize)` split a theme's item array into as-even-as-possible groups no
larger than 6. Every current theme size divides cleanly: 10 → 5+5, 12 →
6+6; themes at 6 or fewer items get a single group (unchanged behavior).
`currentSubLevel(themeId, progress, language)` is a pure function of
progress — no separate "which sub-level am I on" state to keep in sync —
that returns the first group not yet fully known, or the last group once
everything is. It's recomputed from progress everywhere it's needed
(lesson preview, starting a round), so it always reflects the latest
state with no extra bookkeeping.

`startLesson()` now asks only the current sub-level's items
(`activeSubLevel.items`) instead of the whole theme; the lesson preview
screen shows only that sub-level's word cards and a "Set 1 of 2" /
"Set 2 of 2" label in the kicker when a theme has more than one sub-level
(nothing extra shown for the themes that don't). `buildAnswerOptions`'s
distractor pool is untouched — it still draws from the *whole* theme
(`themeItems`), so wrong-answer tiles aren't artificially limited to just
the current sub-level's words; only how many *questions* one sitting asks
changed, not the answer-tile variety.

**What stays exactly as it was:**
- `isThemeMastered` (and everything downstream of it — next-theme
  unlocking, `currentThemeId`, the Themes-path mastery badge) still checks
  every item across the *whole* theme, so a theme only unlocks the next
  one once every sub-level is done. Verified: completing Opposites'
  sub-level 1 (5/10) does not unlock Opposites Two; completing sub-level 2
  does, with the existing mastery banner ("You mastered Opposites!
  Opposites Two is now unlocked.") firing at the correct moment.
- The review-round mechanism (missed items re-asked before Reward) needed
  no change — `missedThisLesson` only ever contains ids from whatever
  round is currently running, sub-level or full, so it stays correctly
  scoped automatically.
- The Progress screen's "Review `<Theme>`" button intentionally bypasses
  sub-leveling: `startLesson({ fullReview: true })` asks every item in the
  theme, since "review what I've learned here" reasonably means the whole
  theme, not just whichever sub-level happens to be current (which, once a
  theme is fully mastered, would otherwise silently mean "just the last
  5-6 words," a real gap this explicitly avoids). The normal "Play" button
  from the lesson preview calls `startLesson()` with no options, which
  defaults to the current sub-level.

**One accuracy fix along the way:** the Reward screen's "N words
practiced" line used to read `themeItems.length` (the whole theme) — which
would now overstate the round just played (e.g. showing "10" after a
5-item sub-level). Introduced `roundSize` state, set at `startLesson()`
time to however many items that round actually asked, and used it in the
Reward subtitle instead. Same category of mismatched-count bug the
repeated-tap-lock fix (CUX-02) had already caught once — worth being
deliberate about here rather than reintroducing it.

Verified end-to-end with a scripted browser (seeded progress via
`localStorage` to jump straight to the Opposites theme, since it's several
themes deep in the unlock order): confirmed sub-level 1 of 2 shows 5 items
and "Set 1 of 2"; playing it through reaches Reward reporting "5 words
practiced" (not 10); re-entering the theme lands on sub-level 2 of 2 with
the other 5 items, no repeats/no gaps; completing it triggers the mastery
banner and unlocks Opposites Two, with the Themes screen correctly showing
Opposites at 10/10; "Review Opposites" from the Progress screen starts a
full 10-item round (1/10), not a 5-item one; a single-sub-level theme
(Food, 6 items) shows no "Set" label and all 6 words, unchanged. No
console errors in any of these. `tsc --noEmit` passes clean.

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
