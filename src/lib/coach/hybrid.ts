import type { Activity } from "@/lib/activities/types";
import { estOneRepMax } from "@/lib/strength/prs";

/**
 * Hybrid-athlete analysis: reads the ACTUAL logged strength history and turns
 * it into concrete recommendations, rather than the generic "full-body strength
 * session" the running plan used to emit.
 *
 * Deterministic rules only — same contract as the rest of the coach (see
 * CLAUDE.md hard rule 2). Nothing here is medical advice; it is training
 * structure derived from what the user actually lifted.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Movement patterns we care about for a run-compatible strength base. */
export type Pattern =
  | "squat"
  | "hinge"
  | "push"
  | "pull"
  | "calf"
  | "core"
  | "isolation";

type PatternRule = { pattern: Pattern; match: RegExp };

/**
 * Exercise name -> movement pattern. Ordered: the first match wins, so the
 * specific machine names in the user's log resolve before the loose fallbacks.
 */
const PATTERN_RULES: PatternRule[] = [
  { pattern: "calf", match: /calf/i },
  { pattern: "core", match: /crunch|plank|ab\b/i },
  { pattern: "hinge", match: /deadlift|rdl|leg curl|hamstring|good morning|hip thrust/i },
  { pattern: "squat", match: /squat|leg press|lunge|leg extension|step.?up/i },
  { pattern: "pull", match: /row|pulldown|pull.?up|chin.?up|face pull|rear delt|shrug/i },
  { pattern: "push", match: /bench|chest press|shoulder press|overhead press|dip|push.?up/i },
  { pattern: "isolation", match: /curl|tricep|extension|wrist|thigh|abductor|adductor|fly/i },
];

export function patternOf(exercise: string): Pattern {
  for (const rule of PATTERN_RULES) {
    if (rule.match.test(exercise)) return rule.pattern;
  }
  return "isolation";
}

export type PatternSummary = {
  pattern: Pattern;
  sets: number;
  /** Share of all strength sets in the window, 0-1. */
  share: number;
};

export type StalledLift = {
  exercise: string;
  /** Best estimated 1RM in the older half of the window. */
  earlierEstOneRm: number;
  /** Best estimated 1RM in the recent half. */
  recentEstOneRm: number;
  /** Signed percentage change, e.g. -2.4 or 0.8. */
  changePct: number;
  sessions: number;
};

export type HybridProfile = {
  /** Strength sessions per week, averaged over the window. */
  strengthPerWeek: number;
  /** Runs per week, averaged over the window. */
  runsPerWeek: number;
  weeklyMileage: number;
  /** Strength sets by movement pattern, most-trained first. */
  patterns: PatternSummary[];
  /** Patterns with under 8% of total volume — the gaps in the build. */
  underTrained: Pattern[];
  /** Lifts that have not moved in the window despite regular work. */
  stalled: StalledLift[];
  totalStrengthSets: number;
  windowDays: number;
  /** True once there is enough history for the hybrid plan to mean something. */
  hasStrengthBase: boolean;
  /** True when running volume is thin relative to the lifting. */
  runningIsLimiter: boolean;
};

const PATTERN_LABELS: Record<Pattern, string> = {
  squat: "squat / knee-dominant",
  hinge: "hinge / hamstring",
  push: "upper-body push",
  pull: "upper-body pull",
  calf: "calves",
  core: "core",
  isolation: "isolation work",
};

export function patternLabel(p: Pattern): string {
  return PATTERN_LABELS[p];
}

/** Patterns a hybrid runner-lifter needs covered; isolation is optional. */
const REQUIRED_PATTERNS: Pattern[] = ["squat", "hinge", "push", "pull", "calf", "core"];

function weeksIn(days: number): number {
  return Math.max(days / 7, 1);
}

/**
 * Detects a stall: an exercise trained in both halves of the window whose best
 * estimated 1RM improved by less than 2.5%. Needs at least 3 sessions so a
 * couple of scattered logs are not read as a plateau.
 */
function findStalled(strength: Activity[], midpointMs: number): StalledLift[] {
  type Acc = { earlier: number; recent: number; sessions: Set<string>; name: string };
  const byExercise = new Map<string, Acc>();

  for (const a of strength) {
    const t = new Date(a.occurredAt).getTime();
    for (const s of a.sets) {
      if (!s.weight_lb || !s.reps) continue;
      const k = s.exercise.trim().toLowerCase();
      const acc = byExercise.get(k) || {
        earlier: 0,
        recent: 0,
        sessions: new Set<string>(),
        name: s.exercise.trim(),
      };
      const est = estOneRepMax(s.weight_lb, s.reps);
      if (t < midpointMs) acc.earlier = Math.max(acc.earlier, est);
      else acc.recent = Math.max(acc.recent, est);
      acc.sessions.add(a.id);
      byExercise.set(k, acc);
    }
  }

  const stalled: StalledLift[] = [];
  for (const acc of byExercise.values()) {
    if (!acc.earlier || !acc.recent) continue;
    if (acc.sessions.size < 3) continue;
    const changePct = ((acc.recent - acc.earlier) / acc.earlier) * 100;
    if (changePct < 2.5) {
      stalled.push({
        exercise: acc.name,
        earlierEstOneRm: Math.round(acc.earlier * 10) / 10,
        recentEstOneRm: Math.round(acc.recent * 10) / 10,
        changePct: Math.round(changePct * 10) / 10,
        sessions: acc.sessions.size,
      });
    }
  }

  // Most-trained stalls first — those are the ones worth restructuring.
  return stalled.sort((a, b) => b.sessions - a.sessions).slice(0, 5);
}

/** Builds the hybrid picture from logged activities over the last `windowDays`. */
export function analyzeHybrid(activities: Activity[], windowDays = 90): HybridProfile {
  const cutoff = Date.now() - windowDays * DAY_MS;
  const midpointMs = Date.now() - (windowDays / 2) * DAY_MS;
  const recent = activities.filter((a) => new Date(a.occurredAt).getTime() >= cutoff);

  const strength = recent.filter((a) => a.type === "strength");
  const runs = recent.filter((a) => a.type === "run");
  const weeks = weeksIn(windowDays);

  const setsByPattern = new Map<Pattern, number>();
  let totalStrengthSets = 0;
  for (const a of strength) {
    for (const s of a.sets) {
      const p = patternOf(s.exercise);
      setsByPattern.set(p, (setsByPattern.get(p) || 0) + 1);
      totalStrengthSets++;
    }
  }

  const patterns: PatternSummary[] = [...setsByPattern.entries()]
    .map(([pattern, sets]) => ({
      pattern,
      sets,
      share: totalStrengthSets ? sets / totalStrengthSets : 0,
    }))
    .sort((a, b) => b.sets - a.sets);

  const underTrained = REQUIRED_PATTERNS.filter((p) => {
    const found = patterns.find((x) => x.pattern === p);
    return !found || found.share < 0.08;
  });

  const weeklyMileage =
    runs.reduce((sum, r) => sum + (r.distanceMi || 0), 0) / weeks;

  const strengthPerWeek = strength.length / weeks;
  const runsPerWeek = runs.length / weeks;

  return {
    strengthPerWeek: Math.round(strengthPerWeek * 10) / 10,
    runsPerWeek: Math.round(runsPerWeek * 10) / 10,
    weeklyMileage: Math.round(weeklyMileage * 10) / 10,
    patterns,
    underTrained,
    stalled: findStalled(strength, midpointMs),
    totalStrengthSets,
    windowDays,
    hasStrengthBase: strength.length >= 6,
    // Lifting regularly but barely running (or not at all) — for a hybrid goal
    // the aerobic side is what is actually missing.
    runningIsLimiter: strengthPerWeek >= 1.5 && runsPerWeek < 2,
  };
}

export type HybridInsight = {
  title: string;
  detail: string;
  tone: "good" | "warning" | "info";
};

/**
 * Turns the profile into the plain-language notes shown on the Coach page.
 * Every branch is driven by logged data, so an empty log yields an empty list
 * rather than invented advice.
 */
export function hybridInsights(p: HybridProfile): HybridInsight[] {
  const out: HybridInsight[] = [];
  if (!p.hasStrengthBase && p.runsPerWeek < 1) return out;

  if (p.runsPerWeek === 0 && p.hasStrengthBase) {
    out.push({
      title: "No running logged",
      detail: `${p.strengthPerWeek} strength sessions a week and no runs in the last ${p.windowDays} days. The lifting base is there — the aerobic half of a hybrid build is the part that is missing. Start at 3 easy runs a week and let the mileage come up before touching the lifting volume.`,
      tone: "warning",
    });
  } else if (p.runningIsLimiter) {
    out.push({
      title: "Running is the limiter",
      detail: `You average ${p.strengthPerWeek} strength sessions a week but only ${p.runsPerWeek} runs (${p.weeklyMileage} mi). For a hybrid build the aerobic side needs to come up to 3 runs a week — two easy, one long — before adding more lifting volume.`,
      tone: "warning",
    });
  } else if (p.strengthPerWeek < 2 && p.runsPerWeek >= 3) {
    out.push({
      title: "Lifting is the limiter",
      detail: `${p.runsPerWeek} runs a week against ${p.strengthPerWeek} strength sessions. Two full lifting days a week is the floor for holding muscle while running this much.`,
      tone: "warning",
    });
  } else if (p.hasStrengthBase && p.runsPerWeek >= 2) {
    out.push({
      title: "Balance looks right",
      detail: `${p.strengthPerWeek} strength sessions and ${p.runsPerWeek} runs a week is a workable hybrid split. Keep hard runs and heavy legs on separate days.`,
      tone: "good",
    });
  }

  if (p.underTrained.length > 0) {
    out.push({
      title: "Gaps in the build",
      detail: `Barely any volume in: ${p.underTrained.map(patternLabel).join(", ")}. A hybrid physique needs every pattern covered — the missing ones are where the build looks uneven and where injuries start.`,
      tone: "warning",
    });
  }

  const isolationShare = p.patterns.find((x) => x.pattern === "isolation")?.share || 0;
  if (isolationShare > 0.35) {
    out.push({
      title: "Too much isolation work",
      detail: `${Math.round(isolationShare * 100)}% of your sets are isolation movements (curls, machine thigh work, extensions). Compounds carry a hybrid build — shift that volume toward squat, hinge, push and pull patterns.`,
      tone: "warning",
    });
  }

  if (p.stalled.length > 0) {
    out.push({
      title: "Stalled lifts",
      detail: `${p.stalled
        .map((s) => `${s.exercise} (${s.changePct >= 0 ? "+" : ""}${s.changePct}%)`)
        .join(", ")} have not moved over the last ${Math.round(
        p.windowDays / 2
      )} days. Adding reps to the same weight is not progressing them any more — change the stimulus: a harder variation, a longer pause, or a rep range you have not trained.`,
      tone: "info",
    });
  }

  return out;
}
