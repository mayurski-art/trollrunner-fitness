import type { HybridProfile } from "./hybrid";

export type Phase = "base" | "build" | "peak" | "taper";

export function todayDayLabel(): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
}

export type DayPlan = { day: string; type: string; detail: string };

export type WeekPlan = {
  phase: Phase;
  phaseWhy: string;
  targetMileage: number;
  weeksUntilGoal: number | null;
  goalLabel: string | null;
  days: DayPlan[];
  recoveryNote: string | null;
  /** Set when the week was rebuilt around a hybrid (run + lift) goal. */
  hybridNote: string | null;
};

/** Running goals this generator can build a race-specific plan for. */
export const GOAL_DISTANCE_MI: Record<string, number> = {
  "Run first 5K": 3.107,
  "Run first half marathon": 13.109,
  "Run first marathon": 26.219,
  "Boston qualifier": 26.219,
  "Sub-3 marathon": 26.219,
  "Ultra marathon": 31,
};

function phaseFor(weeksUntilGoal: number | null): { phase: Phase; why: string } {
  if (weeksUntilGoal === null) {
    return {
      phase: "base",
      why: "No target date set — building general aerobic fitness.",
    };
  }
  if (weeksUntilGoal <= 2) {
    return { phase: "taper", why: `${weeksUntilGoal} week(s) out — cutting volume so you show up fresh.` };
  }
  if (weeksUntilGoal <= 5) {
    return { phase: "peak", why: `${weeksUntilGoal} weeks out — highest-volume, race-specific block.` };
  }
  if (weeksUntilGoal <= 10) {
    return { phase: "build", why: `${weeksUntilGoal} weeks out — adding tempo and interval work on top of base mileage.` };
  }
  return { phase: "base", why: `${weeksUntilGoal} weeks out — plenty of time, building aerobic base first.` };
}

const PHASE_MULTIPLIER: Record<Phase, number> = {
  base: 1.0,
  build: 1.15,
  peak: 1.25,
  taper: 0.55,
};

function dayPlansFor(phase: Phase, targetMileage: number): DayPlan[] {
  const longRun = Math.round(targetMileage * 0.35 * 10) / 10;
  const remaining = Math.max(targetMileage - longRun, 0);
  const easy = Math.round((remaining / 2) * 10) / 10;

  switch (phase) {
    case "taper":
      return [
        { day: "Mon", type: "Rest", detail: "Full rest." },
        { day: "Tue", type: "Easy", detail: `${easy} mi easy.` },
        { day: "Wed", type: "Strides", detail: "20-30 min easy + 4-6 strides." },
        { day: "Thu", type: "Rest", detail: "Full rest." },
        { day: "Fri", type: "Shakeout", detail: "2-3 mi very easy." },
        { day: "Sat", type: "Rest", detail: "Full rest — save it for race day." },
        { day: "Sun", type: "Race / long run", detail: `${longRun} mi at goal effort.` },
      ];
    case "peak":
      return [
        { day: "Mon", type: "Rest", detail: "Full rest or cross-train." },
        { day: "Tue", type: "Race-pace intervals", detail: "6-8 x 800m at goal race pace." },
        { day: "Wed", type: "Easy", detail: `${easy} mi easy.` },
        { day: "Thu", type: "Tempo", detail: "3-5 mi at comfortably hard effort." },
        { day: "Fri", type: "Rest", detail: "Full rest." },
        { day: "Sat", type: "Long run", detail: `${longRun} mi, last few at goal pace.` },
        { day: "Sun", type: "Easy", detail: `${easy} mi recovery.` },
      ];
    case "build":
      return [
        { day: "Mon", type: "Rest", detail: "Full rest or cross-train." },
        { day: "Tue", type: "Tempo", detail: "3-4 mi comfortably hard." },
        { day: "Wed", type: "Easy", detail: `${easy} mi easy.` },
        { day: "Thu", type: "Intervals", detail: "5-6 x 3 min hard, 2 min jog." },
        { day: "Fri", type: "Rest", detail: "Full rest." },
        { day: "Sat", type: "Long run", detail: `${longRun} mi easy pace.` },
        { day: "Sun", type: "Easy", detail: `${easy} mi recovery.` },
      ];
    case "base":
    default:
      return [
        { day: "Mon", type: "Rest", detail: "Full rest or cross-train." },
        { day: "Tue", type: "Easy", detail: `${easy} mi easy.` },
        { day: "Wed", type: "Strength", detail: "Full-body strength session." },
        { day: "Thu", type: "Easy", detail: `${easy} mi easy.` },
        { day: "Fri", type: "Rest", detail: "Full rest." },
        { day: "Sat", type: "Long run", detail: `${longRun} mi conversational pace.` },
        { day: "Sun", type: "Easy", detail: `${easy || 2} mi recovery or cross-train.` },
      ];
  }
}

/**
 * Rewrites the week for a hybrid build: two hard lifting days placed away from
 * the quality run and the long run, so neither quality gets compromised. Easy
 * runs may share a day with lifting (run first, lift after); hard sessions
 * never do.
 *
 * The lower-body day is deliberately placed the day AFTER the long run rather
 * than before it — legs are already fatigued, so the run is protected and the
 * lift becomes the second priority of a hard 48 hours instead of stealing the
 * long run's quality.
 */
function hybridDayPlans(
  phase: Phase,
  runDays: DayPlan[],
  hybrid: HybridProfile
): { days: DayPlan[]; note: string } {
  const byDay = new Map(runDays.map((d) => [d.day, d]));

  // In a race block lifting is maintenance only — the running is the priority,
  // so volume drops and nothing goes to failure with a race close.
  const maintenance = phase === "peak" || phase === "taper";

  const lowerDetail = maintenance
    ? "Maintenance: squat or leg press 2x5 at a comfortable weight, hinge 2x6, calves 2x12. Leave several reps in reserve."
    : hybrid.stalled.length
      ? "Squat or leg press 4x5-8 heavy, hinge 3x6-8, calves 3x10-15. Finish with isometric holds — wall sits and single-leg calf holds change the stimulus on stalled lifts without adding load."
      : "Squat or leg press 4x5-8 heavy, hinge 3x6-8, calves 3x10-15. Finish with single-leg calf holds, 3x30s.";

  // Call out whichever upper-body pattern is actually thin, rather than
  // assuming it is always pull.
  const thinUpper = ["push", "pull", "core"].filter((p) =>
    hybrid.underTrained.includes(p as (typeof hybrid.underTrained)[number])
  );
  const upperDetail = maintenance
    ? "Maintenance: push 2x6, pull 2x8, core 2 sets. Nothing to failure this close to the race."
    : thinUpper.length > 0
      ? `Push 4x6-8, pull 4x6-10, core 3 sets. Lead with ${thinUpper.join(" and ")} — your thinnest pattern${thinUpper.length > 1 ? "s" : ""}. Finish with planks and a bar hang.`
      : "Push 4x6-8, pull 4x6-10, core 3 sets. Finish with planks and a bar hang.";

  // Mon: lower body (legs already tired from Sat/Sun long run, so nothing is
  // stolen from a quality run). Thu: upper body, clear of the weekend.
  //
  // Race week is the exception: loaded legs days before a race cost more than
  // one skipped session gains, so the lower day drops out entirely and only a
  // light upper day stays to keep the routine.
  if (phase !== "taper") {
    byDay.set("Mon", { day: "Mon", type: "Lower strength", detail: lowerDetail });
  }
  byDay.set("Thu", { day: "Thu", type: "Upper strength", detail: upperDetail });

  // The base-phase running week carries its own generic "Strength" day. With
  // two real lifting days now placed, that would make three — so it becomes an
  // easy run and keeps the aerobic side honest.
  const wed = byDay.get("Wed");
  if (wed && wed.type === "Strength") {
    byDay.set("Wed", {
      day: "Wed",
      type: "Easy",
      detail: "Easy 30-40 min, conversational — or full rest if Monday is still in your legs.",
    });
  }

  // Fri was the rest day in every running phase; make it the easy shakeout so
  // the aerobic side does not lose a day to the added lifting. Race week keeps
  // its rest days as written.
  const fri = byDay.get("Fri");
  if (phase !== "taper" && fri && fri.type === "Rest") {
    byDay.set("Fri", {
      day: "Fri",
      type: "Easy",
      detail: "Easy 30-40 min, conversational. Keep it genuinely easy.",
    });
  }

  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = order.map((d) => byDay.get(d)!).filter(Boolean);

  const note =
    phase === "taper"
      ? "Race week: heavy legs are dropped entirely and only a light upper day stays — nothing here should cost you the race."
      : phase === "peak"
        ? "Race block: lifting drops to maintenance — same movements, fewer sets, nothing to failure."
        : "Two lifting days placed away from your quality run and long run, so neither one gets compromised.";

  return { days, note };
}

export function generateWeekPlan({
  goalLabel,
  targetDate,
  baselineWeeklyMileage,
  recoveryMultiplier = 1,
  hybrid = null,
}: {
  goalLabel: string | null;
  targetDate: string | null;
  baselineWeeklyMileage: number;
  recoveryMultiplier?: number;
  /** When set, the week is rebuilt as a run + lift week. */
  hybrid?: HybridProfile | null;
}): WeekPlan {
  const weeksUntilGoal = targetDate
    ? Math.max(1, Math.ceil((new Date(targetDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
    : null;

  const { phase, why } = phaseFor(weeksUntilGoal);
  const baseline = baselineWeeklyMileage > 0 ? baselineWeeklyMileage : 10;
  const targetMileage =
    Math.round(baseline * PHASE_MULTIPLIER[phase] * recoveryMultiplier * 10) / 10;

  const recoveryNote =
    recoveryMultiplier < 1
      ? `Trimmed ${Math.round((1 - recoveryMultiplier) * 100)}% for recent low recovery scores.`
      : null;

  const runDays = dayPlansFor(phase, targetMileage);
  const overlay = hybrid ? hybridDayPlans(phase, runDays, hybrid) : null;

  return {
    phase,
    phaseWhy: why,
    targetMileage,
    weeksUntilGoal,
    goalLabel,
    days: overlay ? overlay.days : runDays,
    recoveryNote,
    hybridNote: overlay ? overlay.note : null,
  };
}
