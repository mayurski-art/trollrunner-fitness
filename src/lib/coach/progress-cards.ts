import type { Activity } from "@/lib/activities/types";
import { dailyLoadSeries } from "./training-load";
import { predictRaceTimes, formatTime } from "./race-predictor";
import { efficiencyTrend } from "./efficiency";

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
  /**
   * Which computation produced the score. "efficiency" is the closer analogue
   * to what COROS itself computes (both are heart-rate-effort based); "pace"
   * is the Riegel fallback used when there isn't enough heart-rate history
   * yet. The card and its detail view read this to phrase the caveat.
   */
  basis: "efficiency" | "pace";
  /** Only set when basis is "efficiency" — the underlying trend read. */
  changePct?: number;
};

/**
 * A 0-100 running-fitness score, preferring heart-rate Efficiency Factor when
 * there's enough HR history and falling back to a pace-only Riegel estimate
 * otherwise.
 *
 * Neither will match a COROS watch exactly — COROS has proprietary VO2max
 * modeling this app doesn't — but the EF path is structurally the closer
 * analogue: both it and the watch derive fitness from heart-rate effort
 * rather than pace alone. The pace-only fallback exists because most
 * historical runs here predate heart-rate logging (see fit_heart_rate.sql)
 * and a run logged without a watch still deserves a fitness read.
 *
 * Returns null when neither computation has enough to work with, rather than
 * inventing a score.
 */
export function runningFitness(activities: Activity[]): RunningFitness | null {
  const predictions = predictRaceTimes(activities);
  const marathon = predictions?.find((p) => p.label === "Marathon");
  const marathonLabel = marathon ? formatTime(marathon.timeSec) : null;

  const ef = efficiencyTrend(activities);
  if (ef) {
    // EF trend needs an anchor to become a 0-100 figure. Chosen against real
    // logged runs rather than invented round numbers: an initial 0.03-0.09
    // band scored a 9:32/mi effort at 173bpm around 10/100, because 0.09 was
    // closer to elite territory than anything a recreational or strong
    // amateur runner logging on a phone app will ever produce. 0.020 mph/bpm
    // covers an easy recovery jog or walk-run; 0.055 is a strong amateur
    // effort (roughly 8:00/mi at 145bpm) — the band a dedicated hobbyist
    // spans, not an elite one.
    const LOW = 0.02;
    const HIGH = 0.055;
    const frac = (ef.current - LOW) / (HIGH - LOW);
    const score = Math.max(0, Math.min(100, frac * 100));
    return {
      score: Math.round(score * 10) / 10,
      marathon: marathonLabel,
      basis: "efficiency",
      changePct: ef.changePct,
    };
  }

  if (!marathon) return null;

  const SLOW_SEC = 6 * 3600; // 6:00:00 -> 0
  const FAST_SEC = 2.5 * 3600; // 2:30:00 -> 100
  const frac = (SLOW_SEC - marathon.timeSec) / (SLOW_SEC - FAST_SEC);
  const score = Math.max(0, Math.min(100, frac * 100));

  return {
    score: Math.round(score * 10) / 10,
    marathon: marathonLabel,
    basis: "pace",
  };
}
