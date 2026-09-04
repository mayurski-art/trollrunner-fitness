import type { Activity } from "@/lib/activities/types";
import { dailyLoadSeries } from "./training-load";
import { predictRaceTimes, formatTime } from "./race-predictor";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export type DaySeries = {
  values: number[];
  labels: string[];
  /** Index of today within the series — rendered highlighted. */
  todayIndex: number;
  total: number;
  peak: number;
};

/**
 * The last `days` days of training load, ending today, with weekday letters.
 *
 * COROS shows this as a bar column beside the week's total. The series always
 * ends on today so the rightmost bar is the current day, which is what makes
 * the highlighted label meaningful.
 */
export function recentLoadDays(
  activities: Activity[],
  days = 7,
  asOf: Date = new Date()
): DaySeries {
  const values = dailyLoadSeries(activities, days, asOf).map((v) => Math.round(v));
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(asOf);
    d.setDate(d.getDate() - i);
    labels.push(DAY_LETTERS[d.getDay()]);
  }
  return {
    values,
    labels,
    todayIndex: days - 1,
    total: values.reduce((a, b) => a + b, 0),
    peak: Math.max(...values, 0),
  };
}

/**
 * Suggested weekly load band, as COROS shows under its Weekly Training Load.
 *
 * Derived from Base Fitness: a 42-day average daily load of B implies a
 * sustainable week of about 7B, and the watch brackets that with roughly
 * -15%/+25% headroom. This is our arithmetic, not a figure COROS publishes,
 * so it is presented as a suggestion rather than a target.
 */
export function suggestedWeeklyLoad(baseFitness: number): { low: number; high: number } | null {
  if (baseFitness <= 0) return null;
  const week = baseFitness * 7;
  return { low: Math.round(week * 0.85), high: Math.round(week * 1.25) };
}

export type RunningFitness = {
  /** 0-100, comparable in spirit to the watch's Running Fitness figure. */
  score: number;
  /** Predicted marathon time, the sub-line COROS puts under the score. */
  marathon: string | null;
};

/**
 * A 0-100 running-fitness score derived from predicted marathon time.
 *
 * COROS computes its own Running Fitness from heart-rate-based effort data we
 * never see, so this is NOT the same number and will not match the watch. It
 * is an honest local analogue: the Riegel prediction already in the app,
 * mapped onto a 0-100 scale anchored at two reference marathons — 6:00 at the
 * bottom, 2:30 at the top — which spans the range of finishers this app is
 * ever likely to serve.
 *
 * Returns null when there is no run good enough to predict from, rather than
 * inventing a score.
 */
export function runningFitness(activities: Activity[]): RunningFitness | null {
  const predictions = predictRaceTimes(activities);
  const marathon = predictions?.find((p) => p.label === "Marathon");
  if (!marathon) return null;

  const SLOW_SEC = 6 * 3600; // 6:00:00 -> 0
  const FAST_SEC = 2.5 * 3600; // 2:30:00 -> 100
  const frac = (SLOW_SEC - marathon.timeSec) / (SLOW_SEC - FAST_SEC);
  const score = Math.max(0, Math.min(100, frac * 100));

  return {
    score: Math.round(score * 10) / 10,
    marathon: formatTime(marathon.timeSec),
  };
}
