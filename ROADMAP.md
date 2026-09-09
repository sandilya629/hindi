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
  - **Warmer palette pass.** The analysis (working only from a live
    screenshot, not `DESIGN.md`) flagged the current theme as reading
    "monotone brown/navy" and suggested warmer saffron/mango/sky-blue/mint
    tones instead. Worth a sanity check against the actual design
    rationale in `DESIGN.md` before changing anything — if the critique
    holds up, it's a token/color-value change, not a structural one.
  - **Less English text in onboarding/UI chrome.** Where a toggle or label
    currently requires English reading literacy (e.g. language/
    pronunciation toggles), lean further on icons, color, and voice
    prompts so a non-reading 3-5 year old can navigate unassisted.
    Complements work already done on audio pacing (see `SPEECH_RATE`
    history in `STATUS.md`).
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
