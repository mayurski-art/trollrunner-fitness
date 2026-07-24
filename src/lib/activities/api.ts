import { getClient } from "@/lib/accounts/client";
import type { Activity, NewRunActivity, NewStrengthActivity } from "./types";

type ActivityRow = {
  id: string;
  type: Activity["type"];
  title: string;
  notes: string;
  occurred_at: string;
  distance_mi: number | null;
  duration_sec: number | null;
  elevation_ft: number | null;
  fit_strength_sets: { exercise: string; weight_lb: number | null; reps: number | null }[];
};

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    notes: row.notes,
    occurredAt: row.occurred_at,
    distanceMi: row.distance_mi,
    durationSec: row.duration_sec,
    elevationFt: row.elevation_ft,
    sets: row.fit_strength_sets || [],
  };
}

export async function listActivities(userId: string, limit = 30): Promise<Activity[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_activities")
    .select(
      "id, type, title, notes, occurred_at, distance_mi, duration_sec, elevation_ft, fit_strength_sets(exercise, weight_lb, reps)"
    )
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as unknown as ActivityRow[]) || []).map(toActivity);
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function logRun(userId: string, input: NewRunActivity) {
  const sb = getClient();
  const durationMin = toNumberOrNull(input.durationMin);
  const { error } = await sb.from("fit_activities").insert({
    user_id: userId,
    type: "run",
    title: input.title || "Run",
    notes: input.notes,
    occurred_at: input.occurredAt,
    distance_mi: toNumberOrNull(input.distanceMi),
    duration_sec: durationMin !== null ? Math.round(durationMin * 60) : null,
    elevation_ft: toNumberOrNull(input.elevationFt),
  });
  if (error) throw error;
}

export async function logStrength(userId: string, input: NewStrengthActivity) {
  const sb = getClient();
  const { data: activity, error: activityError } = await sb
    .from("fit_activities")
    .insert({
      user_id: userId,
      type: "strength",
      title: input.title || "Strength workout",
      notes: input.notes,
      occurred_at: input.occurredAt,
    })
    .select("id")
    .single();
  if (activityError) throw activityError;

  const rows = input.sets
    .filter((s) => s.exercise.trim())
    .map((s, i) => ({
      activity_id: activity.id,
      user_id: userId,
      set_order: i,
      exercise: s.exercise.trim(),
      weight_lb: toNumberOrNull(s.weightLb),
      reps: toNumberOrNull(s.reps),
    }));
  if (rows.length) {
    const { error: setsError } = await sb.from("fit_strength_sets").insert(rows);
    if (setsError) throw setsError;
  }
}
