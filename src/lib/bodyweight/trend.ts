import type { WeightLog } from "./types";

export type WeightTrend = {
  current: number;
  /** Change vs the oldest log within the window, in lb. Positive = gained. */
  changeLb: number;
  windowDays: number;
  /** Chart-ready points, oldest first. */
  points: { label: string; value: number }[];
};

/**
 * Reads the logs (most-recent-first, as listWeightLogs returns them) into a
 * simple trend: current value, and change against the oldest point within
 * `days`. One weigh-in is enough to show a value; two spanning real time are
 * enough to show a trend, so this does not gate on a minimum sample size the
 * way the training-load reliability checks do — weight is legible on sight
 * in a way a ratio isn't.
 */
export function weightTrend(logs: WeightLog[], days = 30): WeightTrend | null {
  if (!logs.length) return null;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const inWindow = logs.filter((l) => new Date(l.loggedAt).getTime() >= cutoff);
  const windowed = inWindow.length ? inWindow : [logs[0]];

  const current = logs[0].weightLb;
  const oldest = windowed[windowed.length - 1].weightLb;

  return {
    current,
    changeLb: Math.round((current - oldest) * 10) / 10,
    windowDays: days,
    points: [...windowed]
      .reverse()
      .map((l) => ({
        label: new Date(l.loggedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        value: l.weightLb,
      })),
  };
}
