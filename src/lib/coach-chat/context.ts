import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity } from "@/lib/activities/types";
import { weeklyMileage, currentStreak } from "@/lib/activities/stats";
import { computeTrainingLoad, interpretLoad, type LoadStatus, type TrainingLoad } from "@/lib/coach/training-load";
import { predictRaceTimes, type RacePrediction } from "@/lib/coach/race-predictor";
import { generateWeekPlan, GOAL_DISTANCE_MI, todayDayLabel, type WeekPlan } from "@/lib/coach/plan";
import { computeNutritionTargets, type NutritionTargets } from "@/lib/nutrition/targets";
import { averageRecentScore, interpretScore, recoveryLoadMultiplier, type RecoveryStatus } from "@/lib/recovery/score";
import { weeklyTrend } from "@/lib/activities/trends";

type ActivityRow = {
  id: string;
  type: Activity["type"];
  title: string;
  notes: string;
  occurred_at: string;
  distance_mi: number | null;
  duration_sec: number | null;
  elevation_ft: number | null;
  effort: number | null;
  fit_strength_sets: { exercise: string; weight_lb: number | null; reps: number | null }[];
};

export type CoachFacts = {
  goals: string[];
  weeklyMileage: number;
  streak: number;
  load: TrainingLoad;
  loadStatus: LoadStatus;
  predictions: RacePrediction[] | null;
  recoveryScore: number | null;
  recoveryStatus: RecoveryStatus;
  plan: WeekPlan;
  todayWorkout: { type: string; detail: string } | null;
  nutrition: NutritionTargets;
  recentActivities: { type: string; title: string; date: string }[];
};

/**
 * Every fetch here is scoped to source='native' where it touches
 * fit_activities — Strava-compliance rule from docs/DESIGN.md §3. Since
 * wearable sync was dropped (§3), every row is native anyway, but the
 * filter stays so reviving sync later can't silently leak imported data
 * into the coach's answers.
 */
async function fetchActivities(sb: SupabaseClient, userId: string): Promise<Activity[]> {
  const { data } = await sb
    .from("fit_activities")
    .select(
      "id, type, title, notes, occurred_at, distance_mi, duration_sec, elevation_ft, effort, fit_strength_sets(exercise, weight_lb, reps)"
    )
    .eq("user_id", userId)
    .eq("source", "native")
    .order("occurred_at", { ascending: false })
    .limit(200);
  return ((data as unknown as ActivityRow[]) || []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    notes: row.notes,
    occurredAt: row.occurred_at,
    distanceMi: row.distance_mi,
    durationSec: row.duration_sec,
    elevationFt: row.elevation_ft,
    effort: row.effort,
    sets: row.fit_strength_sets || [],
  }));
}

export async function buildCoachFacts(sb: SupabaseClient, userId: string): Promise<CoachFacts> {
  const [activities, { data: goals }, { data: profile }, { data: recoveryRows }] = await Promise.all([
    fetchActivities(sb, userId),
    sb.from("fit_goals").select("goal_key, target_date").eq("user_id", userId),
    sb
      .from("fit_profiles")
      .select("age, sex, height_cm, weight_kg")
      .eq("user_id", userId)
      .maybeSingle(),
    sb
      .from("fit_recovery_logs")
      .select("sleep_hours, soreness, stress")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .limit(7),
  ]);

  const load = computeTrainingLoad(activities);
  const loadStatus = interpretLoad(load);
  const predictions = predictRaceTimes(activities);
  const recoveryLogs = (recoveryRows || []).map((r) => ({
    logDate: "",
    sleepHours: r.sleep_hours,
    soreness: r.soreness,
    stress: r.stress,
    notes: "",
  }));
  const recoveryScore = averageRecentScore(recoveryLogs, 7);
  const recoveryStatus = interpretScore(recoveryScore);

  const recentWeeks = weeklyTrend(activities, 4);
  const loggedAvg = recentWeeks.reduce((s, w) => s + w.mileage, 0) / (recentWeeks.length || 1);
  const goalRows = goals || [];
  const raceGoal = goalRows.find((g) => g.goal_key in GOAL_DISTANCE_MI) || null;
  const plan = generateWeekPlan({
    goalLabel: raceGoal?.goal_key || null,
    targetDate: raceGoal?.target_date || null,
    baselineWeeklyMileage: loggedAvg,
    recoveryMultiplier: recoveryLoadMultiplier(recoveryScore),
  });
  const todayPlan = plan.days.find((d) => d.day === todayDayLabel()) || null;

  const nutrition = computeNutritionTargets(
    {
      age: profile?.age ?? null,
      sex: profile?.sex ?? null,
      heightCm: profile?.height_cm ?? null,
      weightKg: profile?.weight_kg ?? null,
    },
    goalRows.map((g) => g.goal_key),
    activities.filter((a) => new Date(a.occurredAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000).length
  );

  return {
    goals: goalRows.map((g) => g.goal_key),
    weeklyMileage: weeklyMileage(activities),
    streak: currentStreak(activities),
    load,
    loadStatus,
    predictions,
    recoveryScore,
    recoveryStatus,
    plan,
    todayWorkout: todayPlan ? { type: todayPlan.type, detail: todayPlan.detail } : null,
    nutrition,
    recentActivities: activities
      .slice(0, 8)
      .map((a) => ({ type: a.type, title: a.title, date: new Date(a.occurredAt).toLocaleDateString() })),
  };
}
