import { getClient } from "@/lib/accounts/client";
import { GOAL_DISTANCE_MI } from "./plan";

export type GoalRow = { goal_key: string; target_date: string | null };

export async function getGoals(userId: string): Promise<GoalRow[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_goals")
    .select("goal_key, target_date")
    .eq("user_id", userId);
  if (error) throw error;
  return data || [];
}

/** The most specific running-race goal with a known target distance, if any. */
export function primaryRaceGoal(goals: GoalRow[]): GoalRow | null {
  return goals.find((g) => g.goal_key in GOAL_DISTANCE_MI) || null;
}

/**
 * Goals that imply a run + lift build. "Hybrid athlete" states it outright;
 * the others are muscle goals that, paired with a running goal, mean the plan
 * has to serve both sides rather than treating strength as an afterthought.
 */
const HYBRID_GOALS = new Set([
  "Hybrid athlete",
  "Gain muscle",
  "Body recomposition",
  "Hypertrophy",
  "Strength",
]);

/** True when the user's goals call for a combined run + lift plan. */
export function wantsHybrid(goals: GoalRow[]): boolean {
  const keys = goals.map((g) => g.goal_key);
  if (keys.includes("Hybrid athlete")) return true;
  const hasStrengthGoal = keys.some((k) => HYBRID_GOALS.has(k));
  const hasRunGoal = keys.some(
    (k) => k in GOAL_DISTANCE_MI || k === "Increase endurance" || k === "Improve VO2 max"
  );
  return hasStrengthGoal && hasRunGoal;
}

export async function getOnboardingWeeklyMileage(userId: string): Promise<number> {
  const sb = getClient();
  const { data } = await sb
    .from("fit_onboarding")
    .select("running")
    .eq("user_id", userId)
    .maybeSingle();
  const raw = (data?.running as { weeklyMileage?: string } | null)?.weeklyMileage;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}
