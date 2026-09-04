# COROS-style UI — design doc

Status: **Phases 1-4 shipped.** Terminology, card primitives, the four real
cards and the responsive grid are all on main. Phase 5 (Body Mass) is not built.

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

### TSB has no COROS equivalent — dropped

COROS never subtracts. It computes the same relationship as a **ratio**, shows
it as a percentage, and gives it named bands. Our TSB and our ACWR are two
views of the identical underlying pair, so showing both is redundant — and the
one to keep is obviously the one the watch uses.

So: **TSB is gone** and Intensity Trend is shown as a percentage with the
COROS bands. The field was removed from `TrainingLoad` entirely rather than
left computed-but-hidden — this kills the confusing number outright instead of
renaming it into something that sounds official but isn't.

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

Our existing reliability guard stays (now `trendReliable`) — with under ~28 days of history the
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

Decided: **build the card system faithfully, populate the 4 real cards, and
omit group B** rather than shipping empty shells. The visual language is what
makes it feel like COROS; the empty cards are what would make it feel broken.

## Desktop

COROS has no desktop app, so there was no layout to copy — this part is ours,
in their style. Shipped: the same cards with the same internals, reflowed into
a 2-up grid from `lg`. Cards keep their exact mobile composition so the two
read as one product. See "What shipped" for why 3-up was rejected.

## Scope

Phase 1 — terminology. Rename CTL/ATL/ACWR, drop TSB, adopt COROS bands.
Touches `training-load.ts`, `coach-client.tsx`, `home-client.tsx`,
`answer-library.ts`. Small, self-contained, shippable alone.

Phase 2 — card primitives. `<StatCard>` shell plus the visualization types
actually needed (bar column, gauge arc, needle gauge).

Phase 3 — the four real cards, mobile column.

Phase 4 — desktop grid + responsive pass.

Phase 5 — optional: Body Mass card with a hand-logged weight table.

Phases merge to main individually as each completes.

## Decisions taken

1. **Scope** — 4 real cards only. No empty shells for the watch-only cards.
2. **Placement** — the cards sit at the top of the existing home screen, above
   the older stat tiles, rather than in a separate tab.
3. **Reordering** — fixed order for now; no Edit screen.
4. **Body Mass** — out of scope (Phase 5, unbuilt).

## What shipped

`src/components/progress/stat-card.tsx` — the card shell and the 3-up
`StatRow` footer. `visuals.tsx` — DayBars, GaugeArc, NeedleGauge.
`src/lib/coach/progress-cards.ts` — the derivations (daily series, suggested
weekly band, running-fitness score). `cards.tsx` — the four cards.

Layout: one column on phones, two from `sm`, three from `xl`.

Three columns first failed — at ~312px the sub-lines ("Suggested 1,081-1,590",
"Intensity Trend") wrapped and knocked the bars out of line with the value. The
cause was fixed-width visuals: a rigid 128px SVG cannot yield, so the text had
to. The fix is CONTAINER queries (`@container` on the card, `@[22rem]:` for the
roomy treatment) rather than viewport breakpoints — each card measures itself,
so a card is compact because IT is narrow, not because the window is. The SVGs
scale with it via viewBox. That keeps the phone layout at full size while the
three-up desktop grid gets a tighter variant of the same card.

Verified in headless Chrome at 500px and 1440px: the widest child sits 17px
inside the card edge on every card, and scrollWidth equals clientWidth, so
nothing overflows and the page never scrolls sideways.

### One number that will not match your watch

Running Fitness is derived from the Riegel marathon prediction and mapped onto
0-100. COROS computes its own Running Fitness from heart-rate data this app
never sees, so the two figures are unrelated and will differ. The card's detail
view says so explicitly rather than letting the shared name imply agreement.

## Heart-rate Efficiency Factor (post-Phase-4 addition)

Running Fitness originally used only the Riegel pace prediction, with an
explicit caveat that it would never match the watch's HR-based number. The
user's response: "maybe fitness can be assessed based on average heart rate
of workouts" — correct, and it turned out the data already existed.

### The gap

`DETAILED_RUNS` (`runs-detailed.ts`) carries `avgHeartRate` on 24 of 26 real
runs (111-177bpm), dictated from the user's own COROS history. But
`run-import.ts` never passed it to `logRun`, `Activity` had no field for it,
and `fit_activities` had no column. It was silently dropped at import.

### What shipped

- `supabase/fit_heart_rate.sql` — `avg_heart_rate smallint` on
  `fit_activities`, same idempotent-migration pattern as `fit_effort.sql`.
  **The user needs to run this once** in the Supabase SQL editor, same as
  every other `fit_*.sql` file, before the column exists live.
- `Activity.avgHeartRate: number | null` threaded through the type, the API
  row mapping, `logRun`, the manual log form (`log-client.tsx`), and the
  import (`run-import.ts`). Re-running the existing import at `/log/import`
  backfills the 24 runs that already have HR dictated.
- `src/lib/coach/efficiency.ts` — Efficiency Factor (pace mph / avg bpm), the
  standard endurance-coaching aerobic-fitness metric. Same run filters as
  `race-predictor.ts`'s `bestReferenceRun` (excludes weekly summaries and
  walks) plus the same 120-day window used elsewhere in `coach/`.
- `runningFitness()` in `progress-cards.ts` now prefers EF over Riegel
  whenever there are 6+ HR-carrying runs in the last 120 days, falling back
  to the pace-only Riegel score otherwise (most historical runs, or any
  future run logged without a watch). The card's `basis` field says which.

### Anchor calibration — caught and fixed before shipping

The first EF-to-0-100 anchor band (0.02-0.09 mph/bpm) was invented from round
numbers with no grounding. Checked against the user's actual 21 HR-carrying
runs (real range: EF 0.022-0.040, median 0.036), it scored their normal
running effort — 9:32/mi at 173bpm — around 10/100, because 0.09 was closer
to elite-marathoner territory than anything a recreational or strong amateur
runner produces. Recalibrated to 0.02-0.055 (an easy jog to a strong-amateur
8:00/mi @ 145bpm), which puts the user's real runs around 45-50/100 — mid-
scale, appropriate for a consistent recreational runner mid-block, with real
headroom above.

### Why EF is still not the same number as COROS's Running Fitness

Structurally closer than Riegel — both EF and the watch's figure are derived
from heart-rate effort rather than pace alone — but COROS layers proprietary
VO2max modeling on top that this app cannot reproduce. The detail view says
so; the card's sub-line shows the efficiency trend (e.g. "+5.3% efficiency
vs 4mo ago") rather than implying parity with the watch.

### Privacy note

`src/lib/social/feed.ts` (friends' activity feed) explicitly sets
`avgHeartRate: null` on every row rather than selecting the column — heart
rate is personal training data, not something a friend's feed card should
show by default.
