# COROS-style UI — design doc

Status: **awaiting decisions.** No code written yet.

## Why

"CTL / ATL / TSB is just confusing to me. Just use the terms that COROS uses."
Plus: "we are going to build the UI for desktop and mobile to be pretty much
the exact same as in COROS."

Two separate jobs, and the first one is unambiguous:

1. **Terminology** — rename our metrics to the watch's names. Settled, no
   decisions needed.
2. **Card-based UI** — restructure the home screen into COROS's card system.
   This is the part with open questions.

## Part 1 — Terminology (settled)

The screenshots contain COROS's own definitions, which resolve the naming
question exactly. From the "Learn more about Training Status" panel:

> **Base Fitness:** the amount of training load your body has been under for
> the last 42 days
> **Load Impact:** the amount of training load your body has been under for
> the last 7 days
> **Intensity Trend:** Load Impact / Base Fitness

Mapped against `src/lib/coach/training-load.ts`:

| Ours | COROS name | Same maths? |
|---|---|---|
| CTL (42-day EWMA) | **Base Fitness** | Yes — identical definition |
| ATL (7-day EWMA) | **Load Impact** | Yes — identical definition |
| ACWR (atl / ctl) | **Intensity Trend** | Yes, but shown as a **percentage** |
| TSB (ctl − atl) | *(no equivalent)* | COROS divides instead of subtracting |

Three renames are clean swaps. The fourth is the interesting one.

### TSB has no COROS equivalent — proposal: drop it

COROS never subtracts. It computes the same relationship as a **ratio**, shows
it as a percentage, and gives it named bands. Our TSB and our ACWR are two
views of the identical underlying pair, so showing both is redundant — and the
one to keep is obviously the one the watch uses.

So: **delete TSB from the UI** and show Intensity Trend as a percentage with
the COROS bands. `tsb` stays in the `TrainingLoad` type (harmless, already
computed) but stops being displayed. This kills the confusing number outright
rather than renaming it into something that sounds official but isn't.

Your `-10.4` becomes **Intensity Trend 119%** — same information, watch's
framing, and a band name ("Optimized") instead of a bare negative number.

### The status bands come from the watch too

Replaces our invented "Overreaching / Ramping up fast / Building / Fresh /
On track" ladder in `interpretLoad()`:

| Band | Range | COROS's own description |
|---|---|---|
| Excessive | ≥150% | Recent training may be overreaching or excessive |
| Optimized | 100–149% | Productive training is increasing Base Fitness |
| Maintaining | 80–99% | Moderate recent Training Load, maintaining Base Fitness |
| Resuming/Performance | 50–79% | Increased load improving fitness / ready for effort |
| Decreasing | 0–49% | Low recent Training Load, Base Fitness declining |

Our existing `acwrReliable` guard stays — with under ~28 days of history the
42-day average hasn't converged and the percentage reads high for arithmetic
reasons rather than training ones. That caveat is ours to keep; the watch
doesn't need it because it has your whole history.

## Part 2 — The card UI

COROS's home screen is a single scrolling column of self-contained cards. The
grammar is consistent across all 11:

```
┌────────────────────────────────────────┐
│ [icon] Card Name                       │   <- 15px semibold, colored glyph
│                                        │
│ 222                    ▁▂▃▁▄▂▁         │   <- huge number left, viz right
│ Suggested 525-788      M T W T F S S   │   <- muted sub-line under number
└────────────────────────────────────────┘
```

- Big value: ~40px, tabular, white, always top-left.
- Unit/qualifier: small muted text immediately right of or under the value.
- Visualization: right half — bar column, gauge arc, sparkline, or range bar.
- Some cards add a 3-up stat footer (Training Status: Load Impact / Base
  Fitness / Intensity Trend).
- Dark card on near-black page, ~16px radius, generous padding.

Our theme in `globals.css` is already dark with a `.card` surface, so this is
a layout and composition change, not a re-theme. The orange brand
(`--brand: #ff5a1f`) sits close to COROS's own orange accent.

### Which cards can we actually fill?

This is the crux, and it's where the plan has to be honest. Cards split three
ways:

**A. Real data — build these (4)**

| Card | Source | Notes |
|---|---|---|
| Weekly Training Load | `dailyLoadSeries()` | 7 daily bars + week total. Have it. |
| Training Status | `computeTrainingLoad()` | Band + 3-up footer. Have it. |
| Recovery | `src/lib/recovery/score.ts` | 0–100 score, gauge arc. Have it. |
| Running Fitness | `src/lib/coach/race-predictor.ts` | Has a marathon predictor already. |

**B. Watch-only, we cannot compute (6)**

Heart Rate, Resting Heart Rate, Sleep, Stress, Overnight HRV, Wellness Check.

Every one of these needs continuous optical-sensor data. The app has no
wearable sync — that's hard rule 1 in CLAUDE.md, and these screenshots are
manual transcriptions, not a feed. We cannot fill these cards.

**C. Partial (1)**

Body Mass — we have no weight log table today, but unlike group B this is
*loggable by hand*. It'd need a small schema addition. The muscle heatmap
beside it, though, is a COROS render we can't reproduce.

So: 4 of 11 cards have real data, 1 is addable with work, 6 are impossible
without hardware sync.

### The honesty problem

A pixel-faithful COROS clone would show 11 cards, 6 of them permanently empty
or fabricated. That's a worse product than 4 good cards — and filling them
with placeholder numbers would break the thing this app has been careful about
all along: every number traceable to something you actually logged.

Recommended: **build the card system faithfully, populate the 4 real cards,
and omit group B** rather than shipping empty shells. The visual language is
what makes it feel like COROS; the empty cards are what would make it feel
broken.

## Desktop

COROS has no desktop app, so there's no layout to copy — this part is ours to
invent in their style. Proposal: same cards, same internals, reflowed into a
2-up (≥900px) or 3-up (≥1300px) masonry grid, max-width ~1200px centered.
Cards keep their exact mobile composition so the two read as one product.

## Scope

Phase 1 — terminology. Rename CTL/ATL/ACWR, drop TSB, adopt COROS bands.
Touches `training-load.ts`, `coach-client.tsx`, `home-client.tsx`,
`answer-library.ts`. Small, self-contained, shippable alone.

Phase 2 — card primitives. `<StatCard>` shell plus the four visualization
types (bar column, gauge arc, sparkline, range bar).

Phase 3 — the four real cards, mobile column.

Phase 4 — desktop grid + responsive pass.

Phase 5 — optional: Body Mass card with a hand-logged weight table.

Phases merge to main individually as each completes.

## Open decisions

1. **Scope of the clone** — 4 real cards only, or also build empty shells for
   the watch-only cards?
2. **Where does this live** — replace the current home screen, or add a new
   "Progress" tab beside it?
3. **Card reordering** — COROS has an Edit screen for sorting/removing cards.
   Worth building, or fixed order for now?
4. **Body Mass** — in or out of scope?
