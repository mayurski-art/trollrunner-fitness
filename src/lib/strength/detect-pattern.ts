// Detects the strength split the athlete is *actually* running, from their
// own logged history — day-of-week -> muscle groups trained that day — plus
// which major muscle groups never come up at all, and (if there's an open
// rest day) which day would fit a missing group best. This is deliberately
// separate from lib/strength/programs.ts's canned templates: those are
// starting points for someone with no history yet, this reads what a real
// person with a real routine is already doing and reflects it back, gaps
// and all.

import type { Activity } from "@/lib/activities/types";
import { classifyExercise, MUSCLE_GROUPS, type MuscleGroup } from "./muscle-groups";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export type DayOfWeek = (typeof DAY_LABELS)[number];

/** Two months — long enough to smooth out a missed week, short enough that an old, abandoned split doesn't linger. */
const LOOKBACK_DAYS = 56;
/** One session on a given weekday could be a one-off; two or more is a real weekly slot. */
const MIN_SESSIONS_FOR_PATTERN = 2;

export type DetectedDay = {
  day: DayOfWeek;
  sessionCount: number;
  groups: MuscleGroup[];
  label: string;
  exercises: string[];
};

export type SplitPattern = {
  trainedDays: DetectedDay[];
  restDays: DayOfWeek[];
  missingGroups: MuscleGroup[];
  suggestedDay: DayOfWeek | null;
};

function labelFor(groups: MuscleGroup[]): string {
  if (groups.length === 0) return "Mixed";
  return groups.slice(0, 2).join(" & ");
}

/** How good a rest day is for slotting in a new session: sandwiched between two trained days beats a lone gap, and a weekday beats a weekend as a tie-break. */
function restDayScore(day: DayOfWeek, trainedSet: Set<DayOfWeek>): number {
  const idx = DAY_LABELS.indexOf(day);
  const before = DAY_LABELS[(idx + 6) % 7];
  const after = DAY_LABELS[(idx + 1) % 7];
  let score = (trainedSet.has(before) ? 1 : 0) + (trainedSet.has(after) ? 1 : 0);
  if (idx >= 1 && idx <= 5) score += 0.5; // Mon-Fri
  return score;
}

export function detectSplitPattern(activities: Activity[]): SplitPattern | null {
  const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const sessions = activities.filter(
    (a) => a.type === "strength" && a.sets.length > 0 && new Date(a.occurredAt).getTime() >= cutoff
  );
  if (sessions.length < MIN_SESSIONS_FOR_PATTERN) return null;

  const byDay = new Map<DayOfWeek, Activity[]>();
  for (const s of sessions) {
    const day = DAY_LABELS[new Date(s.occurredAt).getDay()];
    const list = byDay.get(day) ?? [];
    list.push(s);
    byDay.set(day, list);
  }

  const allGroupsSeen = new Set<MuscleGroup>();
  const detectedDays: DetectedDay[] = [];
  const restDays: DayOfWeek[] = [];

  for (const day of DAY_LABELS) {
    const daySessions = (byDay.get(day) ?? []).sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
    if (daySessions.length < MIN_SESSIONS_FOR_PATTERN) {
      restDays.push(day);
      continue;
    }

    const groupCounts = new Map<MuscleGroup, number>();
    for (const session of daySessions) {
      const distinctExercises = new Set(session.sets.map((s) => s.exercise));
      for (const exercise of distinctExercises) {
        const group = classifyExercise(exercise);
        if (!group) continue;
        groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
        allGroupsSeen.add(group);
      }
    }
    const rankedGroups = [...groupCounts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
    const mostRecentExercises = [...new Set(daySessions[0].sets.map((s) => s.exercise))].slice(0, 5);

    detectedDays.push({
      day,
      sessionCount: daySessions.length,
      groups: rankedGroups,
      label: labelFor(rankedGroups),
      exercises: mostRecentExercises,
    });
  }

  if (detectedDays.length === 0) return null;

  const missingGroups = MUSCLE_GROUPS.filter((g) => !allGroupsSeen.has(g));
  const trainedSet = new Set(detectedDays.map((d) => d.day));

  let suggestedDay: DayOfWeek | null = null;
  if (missingGroups.length > 0 && restDays.length > 0) {
    suggestedDay = [...restDays].sort((a, b) => restDayScore(b, trainedSet) - restDayScore(a, trainedSet))[0];
  }

  return { trainedDays: detectedDays, restDays, missingGroups, suggestedDay };
}
