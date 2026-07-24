import { getClient } from "@/lib/accounts/client";
import type { OnboardingDraft } from "./types";

export async function getOnboardingStatus(
  userId: string
): Promise<"unknown" | "incomplete" | "complete"> {
  const sb = getClient();
  const { data } = await sb
    .from("fit_profiles")
    .select("onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return "incomplete";
  return data.onboarding_completed_at ? "complete" : "incomplete";
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function submitOnboarding(userId: string, draft: OnboardingDraft) {
  const sb = getClient();

  const isImperial = draft.personal.units === "imperial";
  const rawHeight = toNumberOrNull(draft.personal.height);
  const rawWeight = toNumberOrNull(draft.personal.weight);
  const heightCm = rawHeight === null ? null : isImperial ? rawHeight * 2.54 : rawHeight;
  const weightKg = rawWeight === null ? null : isImperial ? rawWeight * 0.453592 : rawWeight;

  const { error: profileError } = await sb.from("fit_profiles").upsert(
    {
      user_id: userId,
      units: draft.personal.units,
      age: toNumberOrNull(draft.personal.age),
      sex: draft.personal.sex || null,
      height_cm: heightCm,
      weight_kg: weightKg,
      body_fat_pct: toNumberOrNull(draft.personal.bodyFatPct),
      country: draft.personal.country || null,
      occupation: draft.personal.occupation || null,
      experience_level: draft.personal.experienceLevel || null,
      ethnicity: draft.ethnicity || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      onboarding_completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (profileError) throw profileError;

  if (draft.goals.length) {
    const rows = draft.goals.map((goal_key) => ({
      user_id: userId,
      goal_key,
      target_date: draft.targetDate || null,
    }));
    const { error: goalsError } = await sb
      .from("fit_goals")
      .upsert(rows, { onConflict: "user_id,goal_key" });
    if (goalsError) throw goalsError;
  }

  const { error: onboardingError } = await sb.from("fit_onboarding").upsert(
    {
      user_id: userId,
      running: draft.running,
      strength: draft.strength,
      equipment: draft.equipment,
      lifestyle: draft.lifestyle,
      nutrition: draft.nutrition,
      medical: draft.medical,
    },
    { onConflict: "user_id" }
  );
  if (onboardingError) throw onboardingError;
}
