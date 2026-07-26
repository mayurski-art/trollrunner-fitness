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
