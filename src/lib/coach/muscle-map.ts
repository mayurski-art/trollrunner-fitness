import type { Activity } from "@/lib/activities/types";
import { analyzeHybrid, patternLabel, patternOf, type HybridProfile, type Pattern } from "./hybrid";
import { ISOMETRICS } from "@/lib/strength/isometrics";

/**
 * Maps hybrid.ts's 6 trainable movement patterns onto clickable body-map
 * regions. "isolation" (curls, triceps, flys — a grab-bag with no single
 * anatomical home) is deliberately not a region: its sets are folded into
 * whichever pattern they accessory in practice, via ISOLATION_HOME below.
 */
export type MuscleRegion = "chest_shoulders" | "upper_back" | "quads" | "hamstrings" | "calves" | "core";

export const REGION_PATTERN: Record<MuscleRegion, Pattern> = {
  chest_shoulders: "push",
  upper_back: "pull",
  quads: "squat",
  hamstrings: "hinge",
  calves: "calf",
  core: "core",
};

export const REGION_LABEL: Record<MuscleRegion, string> = {
  chest_shoulders: "Chest & shoulders",
  upper_back: "Upper back",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
  core: "Core",
};

/**
 * Isolation work is real volume but has no single region on the map. Curls
 * and rear-delt/face-pull work accessory a pull day; triceps and most flys
 * accessory a push day; everything else (thigh/wrist/abductor machines) is
 * closest to the squat pattern's leg work. Approximate on purpose — the
 * point is that isolation sets are not simply invisible on the map, not that
 * this mapping is anatomically precise.
 */
function isolationHome(exercise: string): MuscleRegion {
  if (/curl|tricep|rear delt|face pull|shrug/i.test(exercise)) {
    return /tricep/i.test(exercise) ? "chest_shoulders" : "upper_back";
  }
  if (/fly/i.test(exercise)) return "chest_shoulders";
  return "quads";
}

function regionOf(exercise: string): MuscleRegion {
  const pattern = patternOf(exercise);
  if (pattern === "isolation") return isolationHome(exercise);
  const region = (Object.entries(REGION_PATTERN) as [MuscleRegion, Pattern][]).find(
    ([, p]) => p === pattern
  );
  return region ? region[0] : "quads";
}

export type RecentSet = {
  date: string; // YYYY-MM-DD
  exercise: string;
  weightLb: number | null;
  reps: number | null;
};

export type RegionDetail = {
  region: MuscleRegion;
  label: string;
  /** Share of all strength-set volume in the window, 0-1. */
  share: number;
  underTrained: boolean;
  /** Most recent sets touching this region, newest first. */
  recentSets: RecentSet[];
  /** A stalled lift in this region, if hybrid.ts flagged one. */
  stalledExercise: string | null;
  /** One concrete, actionable line — an isometric recommendation when one
   * fits, otherwise a volume-gap nudge. Never empty when there is any
   * strength history at all. */
  tip: string;
};

const MAX_RECENT_SETS = 5;

/**
 * Builds the full click-through detail for one region: volume share, gap
 * status, recent sets, a stalled-lift callout, and one tip — entirely from
 * hybrid.ts's existing analysis plus a fresh pass over recent sets for the
 * per-exercise history a HybridProfile does not itself retain.
 */
export function regionDetail(
  region: MuscleRegion,
  activities: Activity[],
  profile: HybridProfile,
  windowDays = 90
): RegionDetail {
  const pattern = REGION_PATTERN[region];
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  const recentSets: RecentSet[] = [];
  for (const a of activities) {
    if (a.type !== "strength") continue;
    if (new Date(a.occurredAt).getTime() < cutoff) continue;
    for (const s of a.sets) {
      if (regionOf(s.exercise) !== region) continue;
      recentSets.push({
        date: a.occurredAt.slice(0, 10),
        exercise: s.exercise,
        weightLb: s.weight_lb,
        reps: s.reps,
      });
    }
  }
  recentSets.sort((a, b) => (a.date < b.date ? 1 : -1));

  const summary = profile.patterns.find((p) => p.pattern === pattern);
  const share = summary?.share ?? 0;
  const underTrained = profile.underTrained.includes(pattern);

  const stalled = profile.stalled.find((s) => regionOf(s.exercise) === region);

  const isoMatch = ISOMETRICS.find((i) => i.pattern === pattern);
  let tip: string;
  if (underTrained && isoMatch) {
    tip = `${isoMatch.name} (${isoMatch.prescription}) — ${REGION_LABEL[region]} is under-trained in your log; this fills the gap without adding a new heavy lift.`;
  } else if (stalled) {
    tip = `${stalled.exercise} has been flat (${stalled.changePct >= 0 ? "+" : ""}${stalled.changePct}% over the window) — try a rep-range change or a pause rep before adding more weight.`;
  } else if (underTrained) {
    tip = `${REGION_LABEL[region]} is under-trained — add one more working set here per week.`;
  } else if (recentSets.length) {
    tip = `Trending fine — ${recentSets.length} set${recentSets.length === 1 ? "" : "s"} logged here in the last ${windowDays} days. Keep the frequency up.`;
  } else {
    tip = `No ${patternLabel(pattern)} work logged in the last ${windowDays} days — log a session here to get a specific read.`;
  }

  return {
    region,
    label: REGION_LABEL[region],
    share,
    underTrained,
    recentSets: recentSets.slice(0, MAX_RECENT_SETS),
    stalledExercise: stalled?.exercise ?? null,
    tip,
  };
}

export type MuscleMapData = {
  profile: HybridProfile;
  regions: Record<MuscleRegion, RegionDetail>;
};

/** Builds detail for all 6 regions at once — what the card needs to render. */
export function buildMuscleMap(activities: Activity[], windowDays = 90): MuscleMapData | null {
  const profile = analyzeHybrid(activities, windowDays);
  if (!profile.hasStrengthBase) return null;

  const regions = {} as Record<MuscleRegion, RegionDetail>;
  for (const region of Object.keys(REGION_PATTERN) as MuscleRegion[]) {
    regions[region] = regionDetail(region, activities, profile, windowDays);
  }
  return { profile, regions };
}
