import type { Activity } from "@/lib/activities/types";
import { isWalk, isWeeklySummary } from "./hybrid";

/**
 * Aerobic Efficiency Factor: pace (mph) divided by average heart rate (bpm).
 *
 * This is the standard endurance-coaching metric for aerobic fitness trend —
 * the same idea Maffetone's MAF method and most HR-based training plans use.
 * As aerobic fitness improves, the body covers more ground per heartbeat, so
 * EF rises at a constant effort even when pace alone looks unchanged. It is
 * also structurally the closest thing this app can compute to what a COROS
 * watch means by "Running Fitness" — both are built from heart-rate-effort
 * data, unlike the pace-only Riegel prediction in race-predictor.ts.
 *
 * Units: mph per bpm. The number is small (usually 0.03-0.06) and only
 * meaningful as a trend for one athlete over time, never compared between
 * people or used as an absolute score — see runningFitnessFromEF below for
 * how it becomes a 0-100 display value.
 */
export type EfficiencyPoint = {
  date: string; // YYYY-MM-DD
  mph: number;
  avgHeartRate: number;
  ef: number;
};

const EF_LOOKBACK_DAYS = 120;
const MIN_DISTANCE_MI = 1;

/**
 * Real runs (not weekly summaries, not walks) with both a device-reported
 * heart rate and a genuine single-session pace, most recent first.
 *
 * The same exclusions as race-predictor's bestReferenceRun, and for the same
 * reason: a weekly-summary row's duration is apportioned across a whole
 * week, so its "pace" is a blend of easy and hard running, and a walk's HR
 * reflects a different effort curve than a run's.
 */
export function efficiencyPoints(
  activities: Activity[],
  asOf: Date = new Date()
): EfficiencyPoint[] {
  const cutoff = asOf.getTime() - EF_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  return activities
    .filter(
      (a) =>
        a.type === "run" &&
        !isWeeklySummary(a) &&
        !isWalk(a) &&
        a.avgHeartRate !== null &&
        a.avgHeartRate >= 30 &&
        a.distanceMi &&
        a.distanceMi >= MIN_DISTANCE_MI &&
        a.durationSec &&
        new Date(a.occurredAt).getTime() >= cutoff
    )
    .map((a) => {
      const hours = a.durationSec! / 3600;
      const mph = a.distanceMi! / hours;
      return {
        date: a.occurredAt.slice(0, 10),
        mph: Math.round(mph * 100) / 100,
        avgHeartRate: a.avgHeartRate!,
        ef: Math.round((mph / a.avgHeartRate!) * 10000) / 10000,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export type EfficiencyTrend = {
  /** Most recent EF, the headline figure. */
  current: number;
  /** Average EF from the oldest third of the sample, for a simple trend read. */
  baseline: number;
  /** current vs baseline, as a percentage; positive means more efficient now. */
  changePct: number;
  points: EfficiencyPoint[];
};

/**
 * Needs at least this many HR-carrying runs before a trend means anything —
 * three-ish points either side of a rolling read is the minimum that isn't
 * just noise from one unusually hot or cold run.
 */
const MIN_POINTS_FOR_TREND = 6;

export function efficiencyTrend(
  activities: Activity[],
  asOf: Date = new Date()
): EfficiencyTrend | null {
  const points = efficiencyPoints(activities, asOf);
  if (points.length < MIN_POINTS_FOR_TREND) return null;

  const current = points[0].ef;
  const oldestThird = points.slice(-Math.ceil(points.length / 3));
  const baseline = oldestThird.reduce((s, p) => s + p.ef, 0) / oldestThird.length;
  const changePct = baseline > 0 ? Math.round(((current - baseline) / baseline) * 1000) / 10 : 0;

  return { current, baseline: Math.round(baseline * 10000) / 10000, changePct, points };
}
