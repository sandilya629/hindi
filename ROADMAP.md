# Roadmap

What's next for Hindi Quest, roughly in order of how soon it's likely to
happen. See [`STATUS.md`](STATUS.md) for the technical detail behind any
of these — this file is the "what and why," not the "how."

## In progress

- **Tamil native-speaker verification.** The single biggest open item.
  [`tamil-words-for-review.csv`](tamil-words-for-review.csv) and
  [`hindi-words-for-review.csv`](hindi-words-for-review.csv) list every
  word in the app, grouped by theme, with a blank column for corrections —
  handed to a native Tamil speaker for review. Corrections come back into
  the actual content arrays in `App.tsx` once received.

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
  as a default next step.

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
