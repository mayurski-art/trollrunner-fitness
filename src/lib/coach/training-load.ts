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
function sessionDurationMin(activity: Activity): number {
  if (activity.durationSec) return activity.durationSec / 60;
  if (activity.type === "strength" && activity.sets.length) {
    return activity.sets.length * 4;
  }
  return 0;
}

function sessionLoad(activity: Activity): number {
  const duration = sessionDurationMin(activity);
  const effort = activity.effort ?? 5; // assume moderate effort if unlogged
  return duration * effort;
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

function ewma(series: number[], timeConstantDays: number): number {
  const alpha = 1 / timeConstantDays;
  let value = 0;
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
};

export function computeTrainingLoad(activities: Activity[], asOf = new Date()): TrainingLoad {
  const series = dailyLoadSeries(activities, 42, asOf);
  const ctl = ewma(series, 42);
  const atl = ewma(series.slice(-14), 7);
  const tsb = ctl - atl;
  const acwr = ctl > 0 ? atl / ctl : 0;
  return {
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round(tsb * 10) / 10,
    acwr: Math.round(acwr * 100) / 100,
  };
}

export type LoadStatus = {
  label: string;
  tone: "good" | "warning" | "critical";
  why: string;
};

export function interpretLoad(load: TrainingLoad): LoadStatus {
  if (load.ctl === 0) {
    return {
      label: "No data yet",
      tone: "good",
      why: "Log a few workouts to start building a fitness trend.",
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
      label: "Fatigued",
      tone: "warning",
      why: "Form (TSB) is deeply negative — you're carrying a lot of fatigue relative to fitness. Good for building fitness, not for racing.",
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
