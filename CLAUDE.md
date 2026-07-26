# TrollRunner Fitness — project instructions

## What this is
Strava-style AI fitness platform at fitness.trollrunner.net. The
architecture, locked decisions, and 15-phase build plan are in
docs/DESIGN.md — read it before starting a phase. All 4 decisions are
locked (Vercel, shared accounts, rules-first coach, in-app nutrition);
don't reopen them without being asked.

## Stack + conventions
- Next.js App Router + TypeScript + Tailwind v4. Design tokens live in
  src/app/globals.css (@theme); use token utilities (bg-surface,
  text-muted, bg-brand…) — no ad-hoc hex values in components.
- Look: premium dark-first SaaS, Inter, orange #FF5A1F. NOT the pixel
  aesthetic used on the other TrollRunner sites.
- Supabase = the SHARED TrollRunner project (same auth as trollrunner.net).
  Fitness tables use a fit_ prefix, RLS on everything. The anon key is
  public by design; real secrets only in Vercel env vars, never in-repo.

## Hard rules
1. No wearable/platform sync (Strava, Coros, etc.) — dropped 2026-07-24,
   see docs/DESIGN.md §3. Manual logging (Phase 3, fit_activities) is the
   only way activity data enters the app. Don't build an OAuth connect
   flow unless the user explicitly revives this.
2. The coach is a deterministic rules engine first; LLM features only in
   Phase 13, flag-gated.
3. Recreate Strava's patterns, never its assets — no Strava logos, icons,
   copy, or exact colors (their orange is #FC5200; ours is #FF5A1F).
4. Health guidance stays educational, never medical; medical-history
   answers bias the engine conservative.
5. Accessibility is not optional: keyboard nav, aria labels, don't rely
   on color alone.

## Workflow
- Vercel auto-deploys main. Merge each completed phase to main and push
  immediately (standing rule); verify with `npm run build` first.
