import type { Activity } from "@/lib/activities/types";

/** Epley formula — the standard estimate from a single working set. */
export function estOneRepMax(weightLb: number, reps: number): number {
  return weightLb * (1 + reps / 30);
}

function key(exercise: string): string {
  return exercise.trim().toLowerCase();
}

export type ExerciseBest = {
  exercise: string;
  estOneRm: number;
  weightLb: number;
  reps: number;
};

/** Best (highest estimated 1RM) set per exercise across all logged strength activities. */
export function computeBests(activities: Activity[]): Map<string, ExerciseBest> {
  const bests = new Map<string, ExerciseBest>();
  for (const a of activities) {
    if (a.type !== "strength") continue;
    for (const s of a.sets) {
      if (!s.weight_lb || !s.reps) continue;
      const estOneRm = estOneRepMax(s.weight_lb, s.reps);
      const k = key(s.exercise);
      const prior = bests.get(k);
      if (!prior || estOneRm > prior.estOneRm) {
        bests.set(k, { exercise: s.exercise, estOneRm, weightLb: s.weight_lb, reps: s.reps });
      }
    }
  }
  return bests;
}

export type PrEvent = ExerciseBest & { achievedAt: string };

/** Full PR history: every time a set beat the prior best for its exercise, oldest first. */
export function computePRTimeline(activities: Activity[]): PrEvent[] {
  const sorted = [...activities].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );
  const bests = new Map<string, ExerciseBest>();
  const timeline: PrEvent[] = [];

  for (const a of sorted) {
    if (a.type !== "strength") continue;
    for (const s of a.sets) {
      if (!s.weight_lb || !s.reps) continue;
      const estOneRm = estOneRepMax(s.weight_lb, s.reps);
      const k = key(s.exercise);
      const prior = bests.get(k);
      if (!prior || estOneRm > prior.estOneRm) {
        const entry = { exercise: s.exercise, estOneRm, weightLb: s.weight_lb, reps: s.reps };
        bests.set(k, entry);
        timeline.push({ ...entry, achievedAt: a.occurredAt });
      }
    }
  }

  return timeline.reverse(); // newest first
}

export type NewSetInput = { exercise: string; weightLb: string; reps: string };

/** Which of the just-logged sets beat the prior best for that exercise. */
export function findNewPRs(
  priorActivities: Activity[],
  newSets: NewSetInput[]
): ExerciseBest[] {
  const bests = computeBests(priorActivities);
  const found: ExerciseBest[] = [];
  const bestInBatch = new Map<string, ExerciseBest>();

  for (const s of newSets) {
    const weightLb = Number(s.weightLb);
    const reps = Number(s.reps);
    if (!s.exercise.trim() || !weightLb || !reps) continue;
    const estOneRm = estOneRepMax(weightLb, reps);
    const k = key(s.exercise);
    const prior = bests.get(k);
    const seenThisBatch = bestInBatch.get(k);
    if ((!prior || estOneRm > prior.estOneRm) && (!seenThisBatch || estOneRm > seenThisBatch.estOneRm)) {
      const candidate = { exercise: s.exercise.trim(), estOneRm, weightLb, reps };
      bestInBatch.set(k, candidate);
    }
  }
  found.push(...bestInBatch.values());
  return found;
}
