import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity } from "@/lib/activities/types";
import { weeklyMileage, currentStreak } from "@/lib/activities/stats";
import { computeTrainingLoad, interpretLoad } from "@/lib/coach/training-load";
import { predictRaceTimes } from "@/lib/coach/race-predictor";
import { generateWeekPlan, GOAL_DISTANCE_MI, todayDayLabel } from "@/lib/coach/plan";
import { computeNutritionTargets } from "@/lib/nutrition/targets";
import { averageRecentScore, interpretScore, recoveryLoadMultiplier } from "@/lib/recovery/score";
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

/**
 * Every fetch here is scoped to source='native' where it touches
 * fit_activities — Strava-compliance rule from docs/DESIGN.md §3. Since
 * wearable sync was dropped (§3), every row is native anyway, but the
 * filter stays so reviving sync later can't silently leak imported data
 * into the LLM context.
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

export async function buildCoachContext(sb: SupabaseClient, userId: string): Promise<string> {
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
  const todayPlan = plan.days.find((d) => d.day === todayDayLabel());

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

  const lines = [
    `Goals: ${goalRows.length ? goalRows.map((g) => g.goal_key).join(", ") : "none set"}`,
    `This week's mileage: ${weeklyMileage(activities).toFixed(1)} mi`,
    `Current logging streak: ${currentStreak(activities)} day(s)`,
    `Training status: ${loadStatus.label} — ${loadStatus.why}`,
    `Fitness (CTL) ${load.ctl}, Fatigue (ATL) ${load.atl}, Form (TSB) ${load.tsb}`,
    predictions
      ? `Race predictions: ${predictions.map((p) => `${p.label} ~${p.pace}`).join(", ")}`
      : "No race predictions yet (needs a logged timed run).",
    `Recovery: ${recoveryScore !== null ? `${recoveryStatus.label} (${recoveryScore}/100)` : "no check-ins logged"}`,
    `This week's training phase: ${plan.phase} — target ${plan.targetMileage} mi${plan.recoveryNote ? ` (${plan.recoveryNote})` : ""}`,
    todayPlan ? `Today's prescribed workout: ${todayPlan.type} — ${todayPlan.detail}` : null,
    `Nutrition targets: ${nutrition.calories} kcal, ${nutrition.proteinG}g protein, ${nutrition.carbsG}g carbs, ${nutrition.fatG}g fat`,
    `Recent activities (most recent first): ${
      activities
        .slice(0, 8)
        .map((a) => `${a.type} "${a.title}" on ${new Date(a.occurredAt).toLocaleDateString()}`)
        .join("; ") || "none logged yet"
    }`,
  ].filter(Boolean);

  return lines.join("\n");
}
