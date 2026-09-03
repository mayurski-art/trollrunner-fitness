import { getClient } from "@/lib/accounts/client";
import { logStrength } from "@/lib/activities/api";
import { BACKLOG, type BacklogWorkout } from "./backlog";

/**
 * A backlog workout is "already imported" when the signed-in user has a
 * strength activity with the same title on the same calendar day. That pair is
 * unique across the backlog (the two 8/11/2026 sessions have different titles),
 * so re-running the import skips what already landed instead of duplicating it.
 */
export type ImportProgress = {
  done: number;
  total: number;
  current: string;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  failed: { workout: string; message: string }[];
};

/**
 * Midday local time, then to ISO the same way the log forms do. Noon keeps the
 * row on the intended calendar day once the timezone offset is applied.
 */
function occurredAtFor(date: string): string {
  return new Date(`${date}T12:00`).toISOString();
}

type ExistingRow = { title: string; occurred_at: string };

async function fetchExisting(userId: string): Promise<Set<string>> {
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_activities")
    .select("title, occurred_at")
    .eq("user_id", userId)
    .eq("type", "strength");
  if (error) throw error;
  const keys = new Set<string>();
  for (const row of (data as ExistingRow[]) || []) {
    keys.add(`${row.occurred_at.slice(0, 10)}::${row.title}`);
  }
  return keys;
}

function keyFor(w: BacklogWorkout): string {
  return `${w.date}::${w.title}`;
}

/**
 * Writes the backlog through the normal logStrength() path so PRs, XP and the
 * feed behave exactly as they do for hand-logged workouts. Safe to re-run:
 * anything already present is skipped.
 */
export async function importBacklog(
  userId: string,
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
  const existing = await fetchExisting(userId);
  const result: ImportResult = { imported: 0, skipped: 0, failed: [] };

  for (let i = 0; i < BACKLOG.length; i++) {
    const workout = BACKLOG[i];
    const label = `${workout.date} — ${workout.title}`;
    onProgress?.({ done: i, total: BACKLOG.length, current: label });

    if (existing.has(keyFor(workout))) {
      result.skipped++;
      continue;
    }

    try {
      await logStrength(userId, {
        type: "strength",
        title: workout.title,
        occurredAt: occurredAtFor(workout.date),
        effort: null,
        notes: workout.notes,
        sets: workout.sets,
      });
      result.imported++;
    } catch (err) {
      result.failed.push({
        workout: label,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  onProgress?.({ done: BACKLOG.length, total: BACKLOG.length, current: "" });
  return result;
}
