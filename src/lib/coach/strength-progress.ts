// Turns raw strength history into a compact per-exercise trend summary the
// coach-chat LLM prompt can reason over. Kept deliberately dumb (top set per
// session, direction over the last few sessions) rather than a real
// progression algorithm — the model does the actual reasoning/recommending
// from this data plus whatever the user says, not this module.

import type { Activity } from "@/lib/activities/types";

export type ExerciseTrendSession = {
  date: string;
  topWeightLb: number;
  topReps: number;
  totalSets: number;
};

export type ExerciseTrend = {
  exercise: string;
  sessions: ExerciseTrendSession[];
  /** "up" | "flat" | "down" comparing the most recent top set to the one before it, by weight then reps. */
  direction: "up" | "flat" | "down" | "insufficient data";
};

function direction(sessions: ExerciseTrendSession[]): ExerciseTrend["direction"] {
  if (sessions.length < 2) return "insufficient data";
  const [latest, prior] = sessions;
  if (latest.topWeightLb !== prior.topWeightLb) return latest.topWeightLb > prior.topWeightLb ? "up" : "down";
  if (latest.topReps !== prior.topReps) return latest.topReps > prior.topReps ? "up" : "down";
  return "flat";
}

/** Most recent `sessionsPerExercise` sessions per exercise, newest first. */
export function summarizeStrengthTrends(activities: Activity[], sessionsPerExercise = 5): ExerciseTrend[] {
  const byExercise = new Map<string, ExerciseTrendSession[]>();

  for (const activity of activities) {
    if (activity.type !== "strength" || !activity.sets.length) continue;
    const date = new Date(activity.occurredAt).toLocaleDateString();
    const byExerciseThisSession = new Map<string, { weightLb: number; reps: number }[]>();
    for (const s of activity.sets) {
      if (!s.exercise || s.weight_lb === null || s.reps === null) continue;
      const list = byExerciseThisSession.get(s.exercise) ?? [];
      list.push({ weightLb: s.weight_lb, reps: s.reps });
      byExerciseThisSession.set(s.exercise, list);
    }
    for (const [exercise, sets] of byExerciseThisSession) {
      const top = sets.reduce((best, s) => (s.weightLb > best.weightLb ? s : best), sets[0]);
      const list = byExercise.get(exercise) ?? [];
      list.push({ date, topWeightLb: top.weightLb, topReps: top.reps, totalSets: sets.length });
      byExercise.set(exercise, list);
    }
  }

  return [...byExercise.entries()]
    .map(([exercise, sessions]) => {
      const trimmed = sessions.slice(0, sessionsPerExercise);
      return { exercise, sessions: trimmed, direction: direction(trimmed) };
    })
    .sort((a, b) => a.exercise.localeCompare(b.exercise));
}

/** Plain-text block for a system prompt — one line per exercise, newest session first. */
export function renderStrengthTrendsForPrompt(trends: ExerciseTrend[]): string {
  if (trends.length === 0) return "No strength history logged yet.";
  return trends
    .map((t) => {
      const sessions = t.sessions
        .map((s) => `${s.date}: ${s.topWeightLb}lb x${s.topReps} (${s.totalSets} sets)`)
        .join(" | ");
      return `${t.exercise} [${t.direction}]: ${sessions}`;
    })
    .join("\n");
}
