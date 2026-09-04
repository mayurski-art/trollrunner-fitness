import { getClient } from "@/lib/accounts/client";
import type { NewWeightLog, WeightLog } from "./types";

type WeightRow = {
  id: string;
  logged_at: string;
  weight_lb: number;
};

function toLog(row: WeightRow): WeightLog {
  return { id: row.id, loggedAt: row.logged_at, weightLb: row.weight_lb };
}

/** Most recent first. Used for both the current value and the trend chart. */
export async function listWeightLogs(userId: string, limit = 30): Promise<WeightLog[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_body_weight")
    .select("id, logged_at, weight_lb")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as WeightRow[]) || []).map(toLog);
}

export async function logWeight(userId: string, input: NewWeightLog) {
  const sb = getClient();
  const weightLb = Number(input.weightLb);
  if (!Number.isFinite(weightLb) || weightLb <= 0) {
    throw new Error("Enter a weight in pounds.");
  }
  const { error } = await sb.from("fit_body_weight").insert({
    user_id: userId,
    weight_lb: weightLb,
  });
  if (error) throw error;
}
