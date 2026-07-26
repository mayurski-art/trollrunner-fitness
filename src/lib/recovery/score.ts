import type { RecoveryLog } from "./types";

const SLEEP_TARGET_HOURS = 8;

/** 0-100: sleep up to 40 pts, soreness up to 30 (inverted), stress up to 30 (inverted). */
export function scoreFor(log: RecoveryLog): number | null {
  if (log.sleepHours === null && log.soreness === null && log.stress === null) {
    return null;
  }
  const sleepScore =
    log.sleepHours !== null
      ? Math.min(log.sleepHours / SLEEP_TARGET_HOURS, 1) * 40
      : 30; // neutral default if unlogged
  const sorenessScore = log.soreness !== null ? ((6 - log.soreness) / 5) * 30 : 22;
  const stressScore = log.stress !== null ? ((6 - log.stress) / 5) * 30 : 22;
  return Math.round(sleepScore + sorenessScore + stressScore);
}

export type RecoveryStatus = { label: string; tone: "good" | "warning" | "critical" };

export function interpretScore(score: number | null): RecoveryStatus {
  if (score === null) return { label: "No check-in", tone: "good" };
  if (score >= 80) return { label: "Great", tone: "good" };
  if (score >= 60) return { label: "Good", tone: "good" };
  if (score >= 40) return { label: "Fair", tone: "warning" };
  return { label: "Poor", tone: "critical" };
}

/** Average score over the most recent logs (falls back gracefully with fewer entries). */
export function averageRecentScore(logs: RecoveryLog[], days = 7): number | null {
  const scored = logs
    .slice(0, days)
    .map(scoreFor)
    .filter((s): s is number => s !== null);
  if (!scored.length) return null;
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
}

/** Scales training volume down when recovery has been trending poor. */
export function recoveryLoadMultiplier(avgScore: number | null): number {
  if (avgScore === null) return 1;
  if (avgScore < 40) return 0.7;
  if (avgScore < 60) return 0.85;
  return 1;
}
