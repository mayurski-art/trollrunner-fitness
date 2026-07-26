import { getClient } from "@/lib/accounts/client";
import type { NewRecoveryLog, RecoveryLog } from "./types";

type RecoveryRow = {
  log_date: string;
  sleep_hours: number | null;
  soreness: number | null;
  stress: number | null;
  notes: string;
};

function toLog(row: RecoveryRow): RecoveryLog {
  return {
    logDate: row.log_date,
    sleepHours: row.sleep_hours,
    soreness: row.soreness,
    stress: row.stress,
    notes: row.notes,
  };
}

function todayDate(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export async function listRecentRecovery(userId: string, days = 14): Promise<RecoveryLog[]> {
  const sb = getClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await sb
    .from("fit_recovery_logs")
    .select("log_date, sleep_hours, soreness, stress, notes")
    .eq("user_id", userId)
    .gte("log_date", since.toISOString().slice(0, 10))
    .order("log_date", { ascending: false });
  if (error) throw error;
  return ((data as RecoveryRow[]) || []).map(toLog);
}

export async function getTodayRecovery(userId: string): Promise<RecoveryLog | null> {
  const sb = getClient();
  const { data } = await sb
    .from("fit_recovery_logs")
    .select("log_date, sleep_hours, soreness, stress, notes")
    .eq("user_id", userId)
    .eq("log_date", todayDate())
    .maybeSingle();
  return data ? toLog(data as RecoveryRow) : null;
}

export async function logRecovery(userId: string, input: NewRecoveryLog) {
  const sb = getClient();
  const sleepHours = input.sleepHours.trim() ? Number(input.sleepHours) : null;
  const { error } = await sb.from("fit_recovery_logs").upsert(
    {
      user_id: userId,
      log_date: todayDate(),
      sleep_hours: Number.isFinite(sleepHours) ? sleepHours : null,
      soreness: input.soreness,
      stress: input.stress,
      notes: input.notes,
    },
    { onConflict: "user_id,log_date" }
  );
  if (error) throw error;
}
