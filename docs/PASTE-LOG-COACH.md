# Paste-to-log + progression coach — design doc

## Problem
Today, logging strength work means clicking through the manual form
(exercise dropdown, then weight/reps per set, one set at a time). The
user's actual workflow is a freeform paste like:

    Hack squat: x2 35 lbs each side 8 reps. x1 35 lbs each side 11 reps.
    Prone leg curls: x3 65 lbs 11 reps. Last set felt like losing strength.
    ...

`backlog.ts` looks like it does this but doesn't: it's a one-time,
hand-transcribed TS array for historical import (its own header says so),
edited by a human, read once by `/log/import`. There's no parser, and
nothing that turns pasted text into rows.

`coach-chat` also looks like a real assistant but isn't: `route.ts` calls
`findAnswer()` against a fixed set of canned/learned Q&A rows. No LLM
call, no memory of your actual lifts beyond a few pre-baked "facts", no
tool use. It can't parse a paste or reason about progression.

## Decisions (confirmed with the user)
1. Paste-and-parse ships in **two places**: a paste box on `/log`, and as
   something you can also just paste into coach chat. Both go through the
   same parser + confirm step — one code path, two entry points.
2. Progression is **analysis + recommendations**, not just a computed
   number on the log form: the coach looks at real history and tells you
   what to work on (imbalances, stalled lifts, volume gaps), the way the
   existing `aerobic-base.ts` / training-load coach logic already does for
   running — same idea, applied to strength, delivered conversationally.

## What this requires that doesn't exist yet
Both pieces need actual LLM calls (freeform text is too irregular for
regex — "35 lbs each side" vs "70 lbs total" vs "to failure" all need to
be read, not pattern-matched). That means:

- A `ANTHROPIC_API_KEY` in this repo's env (Vercel + `.env.local`) — none
  is configured today. This is a new, real, metered dependency on the
  **Anthropic API** billing account (separate from claude.ai billing).
- coach-chat's route stops being FAQ-only and starts making a real model
  call, with a tool it can invoke to log a parsed workout.

Flagging this explicitly before building it, since it's a new cost
surface and a new secret, not just new code.

## Shape of the build

### 1. Shared parser (`src/lib/activities/import/parse-workout.ts`)
`parseWorkoutText(raw: string, knownExercises: string[]): ParsedWorkout`
- Calls Claude (server-side only) with the pasted text plus the list of
  exercise names already seen in the user's history (`listActivities` ->
  distinct `exercise` strings across all strength sets — there's no fixed
  catalog; `STRENGTH_EXERCISE_PRESETS` is just 8 generic starter names).
- Output: `{ title, notes, sets: [{exercise, weightLb, reps}], warnings }`.
  `warnings` flags anything the model wasn't confident mapping to a known
  exercise name (new exercise vs. typo) so the confirm screen can ask.
- Weight convention matches existing logs: total load, not per-side (a
  "35 lbs each side" hack squat becomes weightLb "70", matching how
  9/3's and 9/7's entries are already logged).

### 2. API route (`src/app/api/parse-workout/route.ts`)
Same auth pattern as `coach-chat/route.ts` (bearer token, `getServerClient`,
`sb.auth.getUser`). Takes `{ text }`, returns the parsed workout. Doesn't
write to the DB itself — parsing and saving stay separate steps so the
user always sees a confirm/edit screen before anything is logged.

### 3. Log page paste mode (`src/app/log/log-client.tsx`)
Third mode alongside `run` / `strength`: `paste`. Textarea → "Parse" →
renders the same set-row editor the manual form already uses, prefilled
from the parse result, warnings inline, editable before save. Save calls
the existing `logStrength()` — no new write path, so PRs/XP/feed behave
identically to hand-logged or manual-form workouts.

### 4. Coach chat gets real + gets the same parser
- `coach-chat/route.ts` calls the Claude API instead of `findAnswer()`
  when the message doesn't match a canned/learned Q&A, with
  `buildCoachFacts()` (already exists) as context and two tools:
  `parse_workout` (paste-in-chat case) and `get_lift_history` (for
  progression questions).
- A pasted workout in chat gets parsed and shown as the same confirm
  card as the log-page flow — chat doesn't silently write to the DB
  either.
- "Analyze my workouts and recommend what to improve" becomes a real
  question the coach can answer: pull N weeks of strength sets, look for
  stalled exercises (weight/reps flat or down across sessions — the
  backlog notes already call several out by hand: prone leg curl, outer
  thigh, hammer curls), muscle-group imbalances, and volume trends, and
  narrate it back.
- Canned/learned Q&A stays as a fast-path (skip the model call when a
  stored answer already matches) rather than being thrown away.

## Open items before/while building
- Confirm the `ANTHROPIC_API_KEY` gets provisioned (Vercel env +
  `.env.local`) — nothing here can go live without it.
- Model choice: reuse whatever the terminal app already standardizes on
  server-side (check `trollrunner-terminal`) unless there's a reason to
  diverge.
- Exercise-name canonicalization: build the "known exercises" list from
  actual logged history (distinct names via existing activities API)
  rather than expanding the static 8-item preset array.

## Not in scope here
- Auto-applying suggested progression to future logged weights without
  the user seeing/confirming it first (analysis + recommendation only,
  not an autopilot).
- Running-workout parsing (this doc is strength-only; running already
  has GPS/Strava-style import paths).
