import type { Activity } from "@/lib/activities/types";

/**
 * Session load via the session-RPE method (Foster et al.): duration (min) ×
 * effort (RPE 1-10). No heart-rate data exists in manual logging, so this is
 * the standard HR-free substitute for TRIMP.
 *
 * Runs carry a real duration. Strength sessions don't collect one (Phase 3
 * scope), so duration is estimated at ~4 min/set (work + rest) — a documented
 * heuristic, not a precise figure.
 */
/**
 * Strength sessions do not record a duration (Phase 3 scope), so it is
 * estimated from set count.
 *
 * 2.5 min/set — a working set plus its rest — matches machine and accessory
 * work, which is what most logged sessions are. An earlier 4 min/set figure
 * made a 25-set session score as 100 minutes, outweighing an 8-mile run and
 * pushing training load into false "overreaching" territory. The cap keeps a
 * high-volume day from dominating the series: past about two hours the marginal
 * sets are short isolation work, not more systemic fatigue.
 */
const STRENGTH_MIN_PER_SET = 2.5;
const STRENGTH_MAX_MIN = 120;

function sessionDurationMin(activity: Activity): number {
  if (activity.durationSec) return activity.durationSec / 60;
  if (activity.type === "strength" && activity.sets.length) {
    return Math.min(activity.sets.length * STRENGTH_MIN_PER_SET, STRENGTH_MAX_MIN);
  }
  return 0;
}

/**
 * Estimates RPE when it was not logged — which is every imported activity.
 *
 * A flat "assume 5" treats a 20 min/mi recovery walk as the same intensity as a
 * threshold run, which is what made imported history read as overreaching. Pace
 * is the best proxy available without heart rate: runs get an RPE from how fast
 * they were, and strength work sits at a moderate default because sets-to-
 * failure and warmups are not distinguishable in the data.
 */
function estimatedEffort(activity: Activity): number {
  if (activity.effort !== null) return activity.effort;

  if (activity.type === "run" && activity.distanceMi && activity.durationSec) {
    const paceMinPerMi = activity.durationSec / 60 / activity.distanceMi;
    if (paceMinPerMi >= 16) return 2; // walking
    if (paceMinPerMi >= 13) return 3; // very easy / recovery jog
    if (paceMinPerMi >= 11) return 4; // easy aerobic
    if (paceMinPerMi >= 10) return 6; // steady
    if (paceMinPerMi >= 9) return 7; // moderately hard
    return 8; // fast for this athlete
  }

  if (activity.type === "other") return 3; // cross-training, typically easy
  return 5; // strength: moderate by default
}

function sessionLoad(activity: Activity): number {
  return sessionDurationMin(activity) * estimatedEffort(activity);
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function dailyLoadSeries(activities: Activity[], days: number, asOf: Date): number[] {
  const loadByDay = new Map<string, number>();
  for (const a of activities) {
    const key = dayKey(a.occurredAt);
    loadByDay.set(key, (loadByDay.get(key) || 0) + sessionLoad(a));
  }
  const series: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(asOf);
    d.setDate(d.getDate() - i);
    series.push(loadByDay.get(dayKey(d.toISOString())) || 0);
  }
  return series;
}

/**
 * Exponentially weighted moving average.
 *
 * Seeded with the series mean rather than zero. Seeding at zero means the
 * average has to climb out of a hole it was never in: a 42-day EWMA fed exactly
 * 42 points reaches only ~64% of the true value, so CTL reads low and every
 * ratio against it reads high. An athlete training identically every single day
 * scored ACWR 1.39 — flagged as "ramping up fast" while doing nothing of the
 * sort. Seeding at the mean makes a steady series return that steady value.
 */
function ewma(series: number[], timeConstantDays: number): number {
  if (!series.length) return 0;
  const alpha = 1 / timeConstantDays;
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  let value = mean;
  for (const load of series) {
    value = value + (load - value) * alpha;
  }
  return value;
}

export type TrainingLoad = {
  ctl: number; // "Fitness" — 42-day exponentially weighted load
  atl: number; // "Fatigue" — 7-day exponentially weighted load
  tsb: number; // "Form" — ctl - atl
  acwr: number; // acute:chronic workload ratio (atl / ctl proxy)
  /**
   * Days between the first and last logged activity in the window. CTL is a
   * 42-day average, so with less history than that it is still filling up and
   * reads artificially low — which makes ACWR read artificially high.
   */
  historyDays: number;
  /** True once there is enough history for ACWR to mean anything. */
  acwrReliable: boolean;
};

/** Days spanned by the activities inside the window, oldest to newest. */
function historySpanDays(activities: Activity[], asOf: Date, windowDays: number): number {
  const cutoff = asOf.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const times = activities
    .map((a) => new Date(a.occurredAt).getTime())
    .filter((t) => t >= cutoff && t <= asOf.getTime());
  if (!times.length) return 0;
  return Math.round((asOf.getTime() - Math.min(...times)) / (24 * 60 * 60 * 1000));
}

export function computeTrainingLoad(activities: Activity[], asOf = new Date()): TrainingLoad {
  const series = dailyLoadSeries(activities, 42, asOf);
  const ctl = ewma(series, 42);
  const atl = ewma(series.slice(-14), 7);
  const tsb = ctl - atl;
  const acwr = ctl > 0 ? atl / ctl : 0;
  const historyDays = historySpanDays(activities, asOf, 42);
  return {
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round(tsb * 10) / 10,
    acwr: Math.round(acwr * 100) / 100,
    historyDays,
    // 42 days is a full CTL time constant. Below ~28 the chronic average is
    // still converging and any ratio against it overstates the acute side.
    acwrReliable: historyDays >= 28,
  };
}

export type LoadStatus = {
  label: string;
  tone: "good" | "warning" | "critical";
  why: string;
};

/**
 * A training-status reading from the user's watch, used to sanity-check ours.
 *
 * The device has the user's complete history; this app has only what has been
 * imported. When the two disagree, the device is the better evidence, and our
 * own number is the one to doubt.
 */
export type DeviceStatus = {
  /** COROS intensity trend %, where 100-149 is "Optimized". */
  intensityTrendPct: number;
  label: string;
  baseFitness: number;
  loadImpact: number;
  /** How old the reading is; a stale one should not override a live warning. */
  ageDays: number;
};

/** Device readings older than this stop being evidence about training now. */
const DEVICE_STATUS_MAX_AGE_DAYS = 21;

function deviceSaysProductive(device: DeviceStatus): boolean {
  return (
    device.ageDays <= DEVICE_STATUS_MAX_AGE_DAYS &&
    device.intensityTrendPct >= 100 &&
    device.intensityTrendPct < 150
  );
}

export function interpretLoad(load: TrainingLoad, device?: DeviceStatus | null): LoadStatus {
  if (load.ctl === 0) {
    return {
      label: "No data yet",
      tone: "good",
      why: "Log a few workouts to start building a fitness trend.",
    };
  }

  // With under four weeks of history the 42-day chronic average has not
  // converged, so ACWR is inflated by the maths rather than by training. Saying
  // "overreaching" here would be telling someone who feels fine to back off on
  // the strength of an artefact — report the uncertainty instead.
  if (!load.acwrReliable) {
    return {
      label: "Still calibrating",
      tone: "good",
      why: `Only ${load.historyDays} days of logged history so far. Fitness (CTL) is a 42-day average, so it reads low until about six weeks in, which makes the load ratio look higher than it is. Treat these numbers as provisional — how you actually feel is the better guide right now.`,
    };
  }

  // The watch sees the user's whole training history; this app sees only what
  // has been imported, so a partial history can manufacture a high ACWR. When
  // the device says the load is productive, say so and flag the disagreement
  // rather than telling someone who feels good to back off.
  // Bounded on purpose: a device reading can explain a moderately high ratio
  // that a partial history inflated, but past ~1.7 the acute load is extreme
  // enough that a days-old snapshot is not good enough evidence to wave it
  // through. Beyond that the warning stands.
  if (device && deviceSaysProductive(device) && load.acwr > 1.3 && load.acwr <= 1.7) {
    return {
      label: device.label,
      tone: "good",
      why: `Our ratio reads high (ACWR ${load.acwr}), but your watch has your full history and puts you at ${device.intensityTrendPct}% intensity trend — productive training, base fitness ${device.baseFitness}. Trust the watch here: this app only sees imported sessions, so its chronic average is understated. Worth a second look if you actually start feeling run down.`,
    };
  }

  if (load.acwr > 1.5) {
    return {
      label: "Overreaching",
      tone: "critical",
      why: `Your recent load is ${load.acwr}x your chronic average — the ACWR "danger zone" (>1.5) linked to higher injury risk. Consider an easier week.`,
    };
  }
  if (load.acwr > 1.3) {
    return {
      label: "Ramping up fast",
      tone: "warning",
      why: `Load is rising quickly (ACWR ${load.acwr}). Fine short-term, but don't stack another big week on top of it.`,
    };
  }
  if (load.tsb < -20) {
    return {
      label: "Building",
      tone: "good",
      why: "Form (TSB) is negative — you're carrying fatigue relative to fitness, which is exactly what a build block looks like. Fine while you feel good; it just means you're not race-fresh. Trust how you actually feel over this number.",
    };
  }
  if (load.tsb > 10) {
    return {
      label: "Fresh",
      tone: "good",
      why: "Form (TSB) is positive — you're well recovered relative to your training. Good window for a hard effort or race.",
    };
  }
  return {
    label: "On track",
    tone: "good",
    why: "Fitness and fatigue are balanced — steady, sustainable training load.",
  };
}
