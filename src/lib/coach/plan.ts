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

export function generateWeekPlan({
  goalLabel,
  targetDate,
  baselineWeeklyMileage,
  recoveryMultiplier = 1,
}: {
  goalLabel: string | null;
  targetDate: string | null;
  baselineWeeklyMileage: number;
  recoveryMultiplier?: number;
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

  return {
    phase,
    phaseWhy: why,
    targetMileage,
    weeksUntilGoal,
    goalLabel,
    days: dayPlansFor(phase, targetMileage),
    recoveryNote,
  };
}
