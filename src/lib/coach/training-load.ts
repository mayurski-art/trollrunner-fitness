import type { Activity } from "@/lib/activities/types";

/**
 * Training load, in COROS TRIMP units.
 *
 * A session's load comes from the device wherever one recorded it — COROS
 * computes TRIMP from heart rate and duration, which beats anything derivable
 * here. Sessions without a device figure (strength work) fall back to
 * session-RPE (Foster et al.: duration x RPE), scaled onto the same units.
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
 * A device-computed TRIMP training load recorded in an activity's notes, e.g.
 * "training load 422". COROS derives it from heart rate and duration, which is
 * strictly better evidence than anything this app can infer from pace alone —
 * so when it is present it is used directly instead of being re-estimated.
 *
 * COROS bands, for reference: Low 0-111 (recovery), Medium 112-218 (tempo /
 * threshold), High 218+ (HIIT or long slow distance).
 */
const DEVICE_LOAD_RE = /training load (\d+(?:\.\d+)?)/i;

export function deviceLoadFrom(activity: Activity): number | null {
  const match = activity.notes?.match(DEVICE_LOAD_RE);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 ? value : null;
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

/**
 * Converts a session-RPE score into the same units as COROS TRIMP.
 *
 * Measured against 23 sessions that carry both numbers, TRIMP is about 0.39x
 * our duration x RPE score (median). The two are not the same shape — TRIMP is
 * non-linear in intensity, so the per-session ratio ranges roughly 0.22-0.69 —
 * but without heart rate a single factor is the honest approximation. It exists
 * only so estimated sessions (strength work) sit on the same scale as measured
 * ones; mixing raw values would let whichever kind is more common dominate the
 * series for no physiological reason.
 */
const RPE_TO_TRIMP = 0.39;

function sessionLoad(activity: Activity): number {
  // A device-measured TRIMP beats anything inferred here — it is built from
  // heart rate, which this app never sees.
  const measured = deviceLoadFrom(activity);
  if (measured !== null) return measured;

  return sessionDurationMin(activity) * estimatedEffort(activity) * RPE_TO_TRIMP;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function dailyLoadSeries(activities: Activity[], days: number, asOf: Date = new Date()): number[] {
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
 * 42 points reaches only ~64% of the true value, so Base Fitness reads low and
 * every ratio against it reads high. An athlete training identically every
 * single day scored an Intensity Trend of 139% — flagged as overreaching while
 * doing nothing of the sort. Seeding at the mean makes a steady series return that steady value.
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

/**
 * Named to match the user's COROS watch, whose own definitions are:
 *
 *   Base Fitness:    training load your body has been under for the last 42 days
 *   Load Impact:     training load your body has been under for the last 7 days
 *   Intensity Trend: Load Impact / Base Fitness
 *
 * Those are exactly the quantities computed here, so the app uses the watch's
 * vocabulary rather than the TrainingPeaks acronyms (CTL/ATL/TSB) it used
 * before — the user reads these numbers next to the watch that produced the
 * concept, and two names for one thing is what made them confusing.
 *
 * There is deliberately no "Form"/TSB field. COROS never subtracts fitness
 * from fatigue; it divides, and reports the ratio as Intensity Trend. Keeping
 * both would be two views of one relationship, so only the watch's survives.
 */
export type TrainingLoad = {
  /** "Base Fitness" — 42-day exponentially weighted load. */
  baseFitness: number;
  /** "Load Impact" — 7-day exponentially weighted load. */
  loadImpact: number;
  /** "Intensity Trend" — loadImpact / baseFitness, as a percentage. */
  intensityTrendPct: number;
  /**
   * Days between the first and last logged activity in the window. Base
   * Fitness is a 42-day average, so with less history than that it is still
   * filling up and reads artificially low — which makes Intensity Trend read
   * artificially high.
   */
  historyDays: number;
  /** True once there is enough history for Intensity Trend to mean anything. */
  trendReliable: boolean;
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
  const baseFitness = ewma(series, 42);
  const loadImpact = ewma(series.slice(-14), 7);
  const intensityTrend = baseFitness > 0 ? loadImpact / baseFitness : 0;
  const historyDays = historySpanDays(activities, asOf, 42);
  return {
    baseFitness: Math.round(baseFitness * 10) / 10,
    loadImpact: Math.round(loadImpact * 10) / 10,
    intensityTrendPct: Math.round(intensityTrend * 100),
    historyDays,
    // 42 days is a full Base Fitness time constant. Below ~28 the 42-day
    // average is still converging and any ratio against it overstates the
    // 7-day side.
    trendReliable: historyDays >= 28,
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

/**
 * The five COROS Training Status bands, with the watch's own thresholds and
 * descriptions. These replace an earlier invented ladder ("Overreaching",
 * "Ramping up fast", "Building", "Fresh") so the app and the watch never
 * disagree about what to call the same training state.
 */
export function interpretLoad(load: TrainingLoad, device?: DeviceStatus | null): LoadStatus {
  if (load.baseFitness === 0) {
    return {
      label: "No data yet",
      tone: "good",
      why: "Log a few workouts to start building a Base Fitness trend.",
    };
  }

  // With under four weeks of history the 42-day average has not converged, so
  // Intensity Trend is inflated by the maths rather than by training. Saying
  // "Excessive" here would be telling someone who feels fine to back off on
  // the strength of an artefact — report the uncertainty instead.
  if (!load.trendReliable) {
    return {
      label: "Still calibrating",
      tone: "good",
      why: `Only ${load.historyDays} days of logged history so far. Base Fitness is a 42-day average, so it reads low until about six weeks in, which makes Intensity Trend look higher than it is. Treat these numbers as provisional — how you actually feel is the better guide right now.`,
    };
  }

  // The watch sees the user's whole training history; this app sees only what
  // has been imported, so a partial history can manufacture a high Intensity
  // Trend. When the device says the load is productive, say so and flag the
  // disagreement rather than telling someone who feels good to back off.
  // Bounded on purpose: a device reading can explain a moderately high ratio
  // that a partial history inflated, but past ~170% the recent load is extreme
  // enough that a days-old snapshot is not good enough evidence to wave it
  // through. Beyond that the warning stands.
  if (
    device &&
    deviceSaysProductive(device) &&
    load.intensityTrendPct > 130 &&
    load.intensityTrendPct <= 170
  ) {
    return {
      label: device.label,
      tone: "good",
      why: `Ours reads ${load.intensityTrendPct}%, but your watch has your full history and puts you at ${device.intensityTrendPct}% — productive training, Base Fitness ${device.baseFitness}. Trust the watch here: this app only sees imported sessions, so its 42-day average is understated. Worth a second look if you actually start feeling run down.`,
    };
  }

  // COROS bands, verbatim from the watch's own Training Status screen.
  if (load.intensityTrendPct >= 150) {
    return {
      label: "Excessive",
      tone: "critical",
      why: `Intensity Trend ${load.intensityTrendPct}% — recent training may be overreaching or excessive. Your last 7 days are running well above your 42-day base. Consider an easier week.`,
    };
  }
  if (load.intensityTrendPct >= 100) {
    return {
      label: "Optimized",
      tone: "good",
      why: `Intensity Trend ${load.intensityTrendPct}% — productive training is increasing Base Fitness. This is the band you want to live in during a build block.`,
    };
  }
  if (load.intensityTrendPct >= 80) {
    return {
      label: "Maintaining",
      tone: "good",
      why: `Intensity Trend ${load.intensityTrendPct}% — moderate recent Training Load, maintaining Base Fitness. Holding steady rather than building.`,
    };
  }
  if (load.intensityTrendPct >= 50) {
    return {
      label: "Resuming/Performance",
      tone: "good",
      why: `Intensity Trend ${load.intensityTrendPct}% — either increased load is improving your fitness, or you're rested and ready to take on significant physical effort. A good window for a hard session or a race.`,
    };
  }
  return {
    label: "Decreasing",
    tone: "warning",
    why: `Intensity Trend ${load.intensityTrendPct}% — low recent Training Load, Base Fitness declining. Fine if this is a deliberate rest week; worth addressing if it isn't.`,
  };
}

/**
 * COROS training-load bands for a single session, from their documentation.
 * Used to describe a workout the way the user's watch describes it.
 */
export type SessionLoadBand = {
  level: "Low" | "Medium" | "High";
  impact: string;
};

export function sessionLoadBand(load: number): SessionLoadBand {
  if (load <= 111) {
    return { level: "Low", impact: "Helps with recovery or maintaining fitness, like a recovery run." };
  }
  if (load <= 218) {
    return { level: "Medium", impact: "Improves fitness — tempo or threshold training." };
  }
  return { level: "High", impact: "Improves fitness efficiently — HIIT or long slow distance." };
}
