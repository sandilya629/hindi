# Roadmap

What's next for Hindi Quest, roughly in order of how soon it's likely to
happen. See [`STATUS.md`](STATUS.md) for the technical detail behind any
of these — this file is the "what and why," not the "how."

An external AI brainstorming document ("Optimizing Hindi Quest Edtech
App") proposed a much larger reimagining of the product at one point — a
rebrand, a dual-track (ages 3–5 vs. 6+) architecture, multi-child
profiles, a parent gate, microphone-based speech-echo games,
subscriptions, and native app store packaging on a different tech stack
(Vite + Capacitor instead of Expo). That fuller reimagining was reviewed
and explicitly not adopted: it's a speculative brand/business roadmap
generated without visibility into this repo, it assumes a tech stack that
duplicates what Expo already gives us (EAS Build already reaches both app
stores; no Capacitor needed), and it skips past the validation step this
roadmap already calls for below ("stay web-only, share the link wider"
before investing in anything bigger). It also proposed three different
brand names in one sitting with no trademark/domain check — not something
to act on mid-build. What did survive that review is folded into "Next
up" below; the rest is recorded under "Deferred pending real signal" so
the reasoning isn't lost if it comes up again.

## In progress

- **Tamil native-speaker verification.** The single biggest open item.
  [`tamil-words-for-review.csv`](tamil-words-for-review.csv) and
  [`hindi-words-for-review.csv`](hindi-words-for-review.csv) list every
  word in the app, grouped by theme, with a blank column for corrections —
  handed to a native Tamil speaker for review. Corrections come back into
  the actual content arrays in `App.tsx` once received. Underway now,
  running alongside the toddler UX polish below: gameplay/UX verification
  is being done primarily in the Hindi build, while this word-content
  review covers Tamil — the two tracks are independent and neither blocks
  the other.

## Next up (discussed, not started)

- **Sub-levels within larger themes.** Four themes now sit at 10+ items
  (Opposites, Opposites Two, Starter sounds, Numbers), and asking all of
  them in one sitting is a lot for a toddler even with the answer grid
  capped at 6 tiles. Plan: batch each into ~5-6-word levels, broad-first
  across themes (spiral curriculum) rather than finishing one theme deep
  before starting the next.
- **New themes.** No specific list yet — the two Opposites themes both
  came directly from a kid who played the game asking for them, not from
  a planning session, so the plan is to keep staying open to that channel
  rather than pre-deciding a fixed content roadmap.
- **Toddler-friendly UX polish**, cherry-picked from the BoloBee/rebrand
  analysis above as low-risk, no-architecture-change ideas — additive to
  `App.tsx` as it exists today, meant to be tried and evaluated against
  real usage before going further, not committed to as a package:
  - **Tablet touch-safety lock — done (web), pending live-device check.**
    Pinch-zoom, pull-to-refresh, and text-selection callouts disabled via a
    custom `public/index.html` (see `STATUS.md`). Landscape orientation
    lock, also proposed in the source analysis, was deliberately **not**
    done — it would reverse `DESIGN.md`'s explicit "portrait mobile first"
    call, so it's a separate decision, not a touch-safety fix.
  - **Warmer palette pass — checked, no repaint warranted.** Measured the
    actual colors (converted `DESIGN.md`'s OKLCH tokens to sRGB, extracted
    the real hex values from `App.tsx`'s `StyleSheet`, compared both
    numerically and as rendered swatches — see `STATUS.md`) rather than
    trusting the "monotone brown/navy" read off a live screenshot. Verdict:
    the primary button's gold sits squarely between the two documented
    gold tokens (comparable or higher chroma, not desaturated/muddy), and
    the warm cream backgrounds match `color-surface` almost exactly — this
    is the deliberately restrained, non-neon, non-babyish palette
    `PRODUCT.md`/`DESIGN.md` chose on purpose (their own anti-references
    rule out "harsh neon colors" and "overly childish baby-toy styling").
    Repainting to the suggested saffron/mango/mint would undo a documented
    brand decision, not fix a defect — not done. The one real (small, non-
    urgent) gap found: a dark-navy fill close to the `ink` text token is
    used as a *background* on three elements (active segment toggle, level
    badge, memory-card back) without ever being written down as a
    component pattern — now documented in `DESIGN.md` under Components so
    it stays a deliberate, single accent rather than drifting further.
    No color values changed.
  - **Less English text in onboarding/UI chrome — checked, premise mostly
    doesn't hold; one narrower gap found instead.** The named examples
    ("Choose your language," "Show pronunciation help") are on the setup
    screen a parent operates before handing the tablet over — and
    `PRODUCT.md` explicitly designs for exactly that split: "instructional
    text can stay in full English prose (the parent reads it, not the
    child)... not a kid navigating independently." Changing those would
    work against a documented product decision, not fix a gap; not done.
    `PRODUCT.md`'s actual bar — "anything the child is meant to parse...
    has to work through position, color, size, and sound, not reading" —
    is already met in-lesson (audio-led prompts, icon tiles, and the
    Themes path's position/icon-only wayfinding, per `STATUS.md`).
    The one real gap: the post-lesson navigation buttons a child does tap
    directly during a shared session (Continue, Play next, See progress,
    the optional Find-the-Opposite/Memory-Pairs buttons) are plain English
    labels with only Primary/Secondary color-and-size for a non-text cue —
    no icon, no spoken cue, unlike the in-lesson screens. **Done:** every
    post-setup navigation button (top-bar Home/Progress, Home screen,
    Lesson preview, Reward, Progress) now carries a small consistent emoji
    icon — the same icon always means the same destination (🏠 Home,
    ⭐ Progress, 🗺️ the themes map, ▶️ play/continue/replay, 🧠 Memory
    Pairs, ↔️ Find the Opposite) — plus one spoken cue, on the Reward
    screen only (see `STATUS.md` for why only that screen). Verified by
    scripting an actual browser through onboarding → home → themes →
    lesson → match → reward → progress and screenshotting each step; no
    console errors, no layout breakage. See `STATUS.md` for the full
    design writeup.
  - **"Erase all progress" gating — fixed; whether it should exist at all
    is still open.** Found while excluding it from the icon system above:
    it was a single ungated tap that wiped both languages' entire progress
    with no confirmation, no undo, and no cloud backup — reachable by a
    child, since Progress is one of two links every screen's top bar
    exposes. Now requires an explicit second tap on a clearly-worded,
    visually distinct (berry-red) confirm button; `Cancel` returns to the
    plain trigger untouched. Verified end-to-end with a scripted browser,
    not just typed. Still open: `STATUS.md`'s own testing section already
    documents a dev-only way to reset state (seed `localStorage` directly)
    that needs no in-app button — worth deciding whether this control
    belongs in production at all, not assumed here.
  - **Non-punitive wrong-answer feedback — audited, loudness fixed, tone
    still open.** Turned out not to be "likely already fine": measuring the
    actual waveform (see `STATUS.md`) confirmed the bundled `fail-buzz.mp3`
    is a sustained, ~131Hz drone playing roughly 12x louder (average) and
    2.5x louder (peak) than the success chime — a real game-show "wrong
    buzzer," contradicting `PRODUCT.md`'s "mistakes should invite retry,
    not shame." `FAIL_SOUND_VOLUME` now scales it down to match the
    success sound's peak loudness. Still open: the sound is quieter but
    still the same buzzy tone underneath — swapping in a genuinely warmer
    "oops" sound (a soft boop/marimba blip) needs an actual sourced sound
    file to audition against real kids, not a guess; worth doing before
    calling this item fully closed.

  Sequencing: these are being worked in parallel with Tamil verification,
  not behind it — playtesting/verification of these changes happens
  primarily in the Hindi build, but every change here lands in the shared
  `App.tsx` UI/interaction layer, not language-specific content, so Tamil
  gets each change for free and must stay at parity: no Hindi-only
  implementation of any item in this list. Tried in the existing web build
  with a few families before any larger direction (new interaction
  templates, dual-track, rebrand) is considered.

## Launch / wider audience

Nothing here is committed yet — these are the options on the table,
evaluated but not chosen:

- **Stay web-only, share the link wider.** Zero additional cost or
  infrastructure; the current Vercel static hosting handles more traffic
  with no changes. Lowest-effort way to test whether "wider" interest is
  real before spending on anything else.
- **A privacy policy page.** Worth having regardless of distribution
  choice — the app collects nothing (no accounts, no analytics, no ads),
  which makes this an easy, honest page to write.
- **A custom domain**, instead of the `vercel.app` subdomain, if sharing
  more broadly — mostly a credibility/shareability improvement, not a
  technical necessity.
- **App Store / Play Store distribution.** Real reach for the "parents
  searching an app store" audience, but a distinct scope of work: Apple
  Developer ($99/yr) and Google Play ($25 one-time) accounts, store
  listing assets, and specific compliance requirements under Apple's Kids
  Category and Google Play's Families Policy (no behavioral ads,
  restricted external links, explicit data-collection disclosures) — the
  app is already compliant in spirit with zero data collection, but this
  has to be demonstrated in the listing, not just true in the code. Worth
  doing once there's a specific reason to want app-store discovery, not
  as a default next step. Note: Expo's own EAS Build path reaches both
  app stores from the current codebase — no platform migration needed to
  get here.

## Longer-term / not scoped yet

- **Splitting content out of `App.tsx`.** At ~230 content lines across 26
  arrays (13 themes x 2 languages), still manageable inline. Worth
  revisiting as `content/hi/<theme>.ts` / `content/ta/<theme>.ts` modules
  if it keeps growing — not a database; this is static, rarely-changing,
  curated content, so a real backend would be solving a problem the app
  doesn't have.
- **A feedback channel for a wider audience.** Right now feedback comes
  directly from a kid playing the app and telling a parent. That doesn't
  scale past people you know — no plan yet for what replaces it (an email
  link is the simplest option, doesn't require the analytics/tracking
  this app has deliberately avoided).

## Deferred pending real signal (from the BoloBee analysis, not adopted)

Recorded here for reference so the reasoning isn't lost, not as committed
work:

- Rebrand (name/mascot restructuring), multi-child profiles with avatar
  builder, parent gate (math-wall), screen-time controls, microphone-based
  "repeat after me" echo games, freemium subscriptions, 5-language
  expansion, and a full dual-track (3-5 vs. 6+) game-engine split.
- All of these are legitimate ideas for a later, larger commercial push —
  but they assume install/retention numbers this project doesn't have yet,
  and several (rebrand, subscriptions, native packaging) are expensive to
  reverse. Revisit only after the "share wider" test above shows real
  demand, and re-evaluate the tech stack question fresh at that point
  rather than assuming Vite/Capacitor — Expo already covers most of what
  that stack was proposed to solve.
