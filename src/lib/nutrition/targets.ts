import type { BodyProfile } from "./profile";

export type NutritionTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterOz: number;
  hasFullProfile: boolean;
};

/** Mifflin-St Jeor. Sex unspecified/other averages the male/female formulas. */
function bmr({ age, sex, heightCm, weightKg }: BodyProfile): number | null {
  if (!age || !heightCm || !weightKg) return null;
  const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const s = (sex || "").trim().toLowerCase();
  if (s.startsWith("m")) return male;
  if (s.startsWith("f")) return female;
  return (male + female) / 2;
}

/** Activity multiplier (PAL) from how many days/week you've actually trained recently. */
function activityMultiplier(sessionsPerWeek: number): number {
  if (sessionsPerWeek >= 6) return 1.725;
  if (sessionsPerWeek >= 4) return 1.55;
  if (sessionsPerWeek >= 2) return 1.375;
  return 1.2;
}

const MUSCLE_GOALS = ["Gain muscle", "Hypertrophy", "Strength"];
const CUT_GOALS = ["Lose weight", "Body recomposition"];
const ENDURANCE_GOALS = [
  "Run first 5K",
  "Run first half marathon",
  "Run first marathon",
  "Boston qualifier",
  "Sub-3 marathon",
  "Ultra marathon",
  "Ironman",
  "Increase endurance",
];

export function computeNutritionTargets(
  profile: BodyProfile,
  goals: string[],
  sessionsPerWeek: number
): NutritionTargets {
  const base = bmr(profile);
  const weightKg = profile.weightKg ?? 70; // reasonable default so a target always renders

  if (base === null) {
    // No body-measurement profile yet — fall back to weight-based rules of thumb.
    const proteinG = Math.round(weightKg * 1.8);
    return {
      calories: Math.round(weightKg * 30),
      proteinG,
      carbsG: Math.round((weightKg * 30 * 0.45) / 4),
      fatG: Math.round((weightKg * 30 * 0.25) / 9),
      waterOz: Math.round((weightKg * 2.2) / 2),
      hasFullProfile: false,
    };
  }

  const tdee = base * activityMultiplier(sessionsPerWeek);
  let calories = tdee;
  if (goals.some((g) => CUT_GOALS.includes(g))) calories -= 500;
  else if (goals.some((g) => MUSCLE_GOALS.includes(g))) calories += 300;

  const proteinPerKg = goals.some((g) => MUSCLE_GOALS.includes(g) || CUT_GOALS.includes(g))
    ? 2.0
    : goals.some((g) => ENDURANCE_GOALS.includes(g))
      ? 1.4
      : 1.6;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbCalories = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.round(Math.max(carbCalories, 0) / 4);

  return {
    calories: Math.round(calories),
    proteinG,
    carbsG,
    fatG,
    waterOz: Math.round((weightKg * 2.2) / 2 + sessionsPerWeek * 6),
    hasFullProfile: true,
  };
}
