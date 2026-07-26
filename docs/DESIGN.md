# fitness.trollrunner.net — Design Doc (v1, for approval)

**Status: APPROVED 2026-07-24 — all 4 decisions locked: (1) Vercel free
tier, (2) reuse TrollRunner Supabase accounts, (3) hybrid rules-first AI
coach, (4) nutrition built in-app. Building from Phase 0.**

A premium AI fitness platform: Strava-grade activity tracking + an adaptive
coach for running, strength, recovery, and nutrition. Polished SaaS look
(dark-first, orange accent) — deliberately NOT the pixel aesthetic used
elsewhere on TrollRunner.

---

## 1. The one big architectural fact

The master prompt asks for Next.js + TypeScript + Server Actions + Strava
OAuth + an AI coach. **GitHub Pages cannot run any of that** — it serves
static files only, and Strava's OAuth token exchange requires a server-side
secret. Every other TrollRunner site is static on Pages; this one can't be
(without gutting the requirements).

### Decision 1 — Hosting — **LOCKED: A (Vercel free tier)**

| Option | How it works | Trade-off |
|---|---|---|
| **A. Vercel (recommended)** | Repo stays on GitHub; Vercel imports it, auto-deploys every push to main; `fitness.trollrunner.net` DNS points at Vercel instead of Pages. Free Hobby tier is plenty. | Full Next.js (Server Actions, API routes, webhooks, secrets). One-time setup by you: import repo in Vercel + change one DNS record. |
| B. GitHub Pages static export | `next export` static build; all server work (Strava token exchange, webhooks, AI calls) moves into Supabase Edge Functions. | Stays on Pages like siblings, but loses Server Actions/SSR, needs a second deploy pipeline for functions, webhooks are clunkier. |
| C. Static vanilla like siblings | Abandon Next.js requirement. | Contradicts the master prompt; not recommended. |

The existing `CNAME` file in this repo implies Pages; with Option A it gets
retired and DNS does the work instead.

### Decision 2 — Accounts — **LOCKED: A (reuse TrollRunner Supabase)**

| Option | Trade-off |
|---|---|
| **A. Reuse the TrollRunner Supabase project (recommended)** | Same login as trollrunner.net / TrollChat / games (username + password, X linking already configured). Fitness tables live in the same Postgres with a `fit_` prefix + RLS. Cross-ecosystem XP becomes possible. |
| B. Fresh dedicated Supabase project | Clean isolation, separate quotas — but a second account system and no shared identity. |

### Decision 3 — What powers the "AI" coach — **LOCKED: A (hybrid, rules-first)**

| Option | Trade-off |
|---|---|
| **A. Hybrid, rules-first (recommended)** | Core coach = deterministic sports-science engine (training load CTL/ATL/TSB, ACWR overtraining detection, Riegel/VDOT race prediction, progressive-overload + deload logic). Free, instant, explainable, no API key. A Claude-powered conversational coach layers on top in a later phase, flag-gated. |
| B. LLM from day one | Real Claude API behind every recommendation. Needs an API key + per-request cost immediately; slower; harder to keep consistent. |
| C. Rules engine only | Zero cost forever, but no conversational coach — loses the flagship feel. |

### Decision 4 — Nutrition module vs nutrition.trollrunner.net — **LOCKED: A (in-app)**

| Option | Trade-off |
|---|---|
| **A. Build nutrition into the fitness app (recommended)** | Targets, fueling, and race nutrition are computed from the same profile/training data — they belong in-app. nutrition.trollrunner.net can link here (or host recipes/longform later). |
| B. Link out to the nutrition site | Keeps sites separate but splits the experience and the data. |

---

## 2. Tech stack (per master prompt)

Next.js 15 (App Router) · React · TypeScript · Tailwind CSS 4 ·
Framer Motion · Supabase (Auth + Postgres + RLS + Realtime + Storage) ·
Recharts · TanStack Query · Zod · Server Actions · PWA manifest.

Fonts: Inter (UI) + a mono for stats. Accent orange `#FF5A1F` (deliberately
not Strava's `#FC5200`). Dark mode first, light mode supported.

## 3. Wearable/platform sync — **DROPPED 2026-07-24: manual logging only**

Strava's API now gates developer app registration behind a paid Strava
subscription (a change from when this doc was first written), and Coros's
API access is enterprise/partner-gated rather than open self-serve. Rather
than block the roadmap on either, **Phase 5 (wearable sync) is cut**. The
app is manual-logging-only, permanently, unless one of these opens up
later or the user decides to pay for Strava API access.

This is a low-cost cut: Phase 3 already shipped full manual logging (runs
+ strength, `fit_activities`/`fit_strength_sets`) that works identically
for every user regardless of what watch or app they use — nobody is
blocked from using the product. The `source` column on `fit_activities`
(native | strava) stays in the schema unused, cheap to activate later if
an integration ever becomes viable.

**Look and feel note (still applies):** the UI recreates Strava's
*patterns* (layout, nav, feed, stats hierarchy) with 100% original assets
— no Strava logos, icons, screenshots, or copy — independent of whether
their API is ever connected.

## 4. Data model sketch (all `fit_` prefixed, RLS on everything)

- `fit_profiles` — units, experience, measurements, timezone, flags
- `fit_goals` — multi-select goals with target dates (BQ, sub-3, first 5K…)
- `fit_onboarding` — questionnaire answers (running/strength/lifestyle/
  nutrition/medical), JSONB sections, versioned
- `fit_activities` — runs/rides/lifts; `source` = native | strava;
  distance, time, pace, HR, elevation, splits JSONB
- `fit_strength_sets` — exercise, weight×reps, RPE, per-workout
- `fit_prs` — auto-detected records (lifts + race distances), timeline
- `fit_plans` / `fit_plan_workouts` — generated training plans, per-day
  prescriptions, completion status, adaptation log
- `fit_recovery_logs` — sleep, soreness, stress, HRV; daily recovery score
- `fit_nutrition_targets` — calories/macros/hydration, recalc triggers
- `fit_strava_connections` — athlete id, tokens (server-only), scopes
- `fit_follows`, `fit_kudos`, `fit_comments`, `fit_challenges`,
  `fit_challenge_members` — social layer (native activities only)
- `fit_badges`, `fit_xp_events` — gamification (bridges to TrollRunner XP
  if Decision 2 = reuse)

## 5. Coach engine v1 (the deterministic core)

- **Training load**: TRIMP per activity → exponentially-weighted CTL
  (42-day fitness) / ATL (7-day fatigue) / TSB (form). This is the
  "Fitness Score" + "Training Load" on the dashboard.
- **Overtraining guard**: acute:chronic workload ratio + recovery-log
  trends → automatic down-week recommendation.
- **Race prediction**: Riegel exponent + VDOT tables from recent efforts.
- **Plan generator**: goal + weeks-out + current mileage → periodized
  weekly plan (base/build/peak/taper) using standard workout types (easy,
  long, tempo, threshold, intervals, hills, strides). Adapts weekly from
  actual completed load, not the theoretical plan.
- **Strength**: template progressions (PPL, UL, full-body, powerlifting,
  running-strength), double-progression + auto-deload on stalls.

Every recommendation carries a human-readable "why" string. The later LLM
coach (Phase 13) narrates and answers questions but never overrides the
engine's safety rails.

## 6. Phase plan (each phase = merged to main + deployed, per standing rule)

| # | Phase | Contents |
|---|---|---|
| 0 | Scaffold + deploy | Next.js + TS + Tailwind, brand tokens, dark theme, app shell, Vercel pipeline live at fitness.trollrunner.net |
| 1 | Auth | Supabase login/signup (existing TrollRunner accounts), session handling, profile stub |
| 2 | Onboarding | Conversational multi-step questionnaire (all master-prompt sections), progress bar, celebrations, writes profile/goals |
| 3 | Activities + feed | Manual run/strength logging, Strava-style activity cards, personal feed, streaks |
| 4 | Dashboard v1 | Today's workout, weekly mileage/volume, stat cards, first Recharts |
| 5 | ~~Wearable sync~~ | **DROPPED** — see §3. Manual logging (Phase 3) is the only entry path. |
| 6 | Coach engine (run) | CTL/ATL/TSB, race predictor, adaptive 5K→marathon plan generator |
| 7 | Strength module | Programs, logging w/ rest timers, PR detection, progression + deloads |
| 8 | Recovery | Daily check-ins, recovery score, auto load reduction |
| 9 | Nutrition | Targets, meal timing, race fueling (per Decision 4) |
| 10 | Analytics | PR timeline, trends, filters (week/month/year/custom), annual summary |
| 11 | Social | Follows, kudos, comments, clubs, challenges, leaderboards (native data only) |
| 12 | Gamification + personality | XP, badges, streak rewards, confetti, troll humor (toggleable) |
| 13 | AI Coach chat | Claude-powered conversational coach, plateau narratives, plan Q&A — flag-gated, native data only |
| 14 | Education + polish | Education hub articles, PWA install, a11y pass, OG/SEO |

## 7. Secrets + env

Supabase URL/anon key are public by design (RLS enforces privilege).
Server-only env on the host: Strava client secret, Strava webhook verify
token, Claude API key (Phase 13). Nothing secret ever lands in the repo.

## 8. Medical + safety copy

Onboarding and coach surfaces carry clear "educational, not medical advice"
messaging; medical-history answers bias the engine conservative (never
prescriptive treatment). Ethnicity stays optional with the exact framing
from the master prompt: personalization only, individual data always wins,
no assumptions.
