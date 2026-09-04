import { getClient } from "@/lib/accounts/client";
import { logOther, logRun, logStrength } from "@/lib/activities/api";
import { BACKLOG } from "./backlog";
import { RUN_BACKLOG, type BacklogRun } from "./run-backlog";
import {
  CROSS_TRAINING,
  DETAILED_RUNS,
  SUPERSEDED_SUMMARY_WEEKS,
  type DetailedRun,
} from "./runs-detailed";

/**
 * Detailed runs are titled by distance so they read naturally in the feed and
 * stay distinct from the "Week of ... — running total" summary rows.
 */
function titleForDetailedRun(run: DetailedRun): string {
  return run.title ?? `${run.distanceMi} mi run`;
}

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

type ExistingRow = { title: string; occurred_at: string; type: string };

async function fetchExisting(
  userId: string,
  type: "strength" | "run" | "other"
): Promise<Set<string>> {
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_activities")
    .select("title, occurred_at, type")
    .eq("user_id", userId)
    .eq("type", type);
  if (error) throw error;
  const keys = new Set<string>();
  for (const row of (data as ExistingRow[]) || []) {
    keys.add(`${row.occurred_at.slice(0, 10)}::${row.title}`);
  }
  return keys;
}

function keyFor(w: { date: string; title: string }): string {
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
  const existing = await fetchExisting(userId, "strength");
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

/**
 * Writes the weekly running summaries through the normal logRun() path. Same
 * idempotency contract as the strength import: a run row is "already there"
 * when a run with the same title exists on the same calendar day.
 */
export async function importRunBacklog(
  userId: string,
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
  // Stored as 'other', not 'run': these weekly rows cover ALL activity types
  // (running, cycling, everything), so counting them as running mileage would
  // overstate it by whatever the cross-training was that week.
  //
  // Both types are checked for existing rows. These were once written as runs
  // titled "running total"; matching only the current title/type would treat an
  // already-imported week as missing and write a duplicate — which is exactly
  // what happened once already.
  const existing = await fetchExisting(userId, "other");
  const existingAsRuns = await fetchExisting(userId, "run");
  const result: ImportResult = { imported: 0, skipped: 0, failed: [] };

  for (let i = 0; i < RUN_BACKLOG.length; i++) {
    const week: BacklogRun = RUN_BACKLOG[i];
    const label = `${week.date} — ${week.distanceMi} mi`;
    onProgress?.({ done: i, total: RUN_BACKLOG.length, current: label });

    const legacyKey = `${week.date}::Week of ${week.date} — running total`;
    if (
      existing.has(keyFor(week)) ||
      existingAsRuns.has(keyFor(week)) ||
      existingAsRuns.has(legacyKey) ||
      existing.has(legacyKey)
    ) {
      result.skipped++;
      continue;
    }

    try {
      await logOther(userId, {
        type: "other",
        title: week.title,
        occurredAt: occurredAtFor(week.date),
        distanceMi: week.distanceMi,
        durationMin: week.durationMin,
        effort: null,
        notes: week.notes,
      });
      result.imported++;
    } catch (err) {
      result.failed.push({
        workout: label,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  onProgress?.({ done: RUN_BACKLOG.length, total: RUN_BACKLOG.length, current: "" });
  return result;
}

/**
 * Deletes the weekly-summary rows that detailed runs have replaced, so the same
 * mileage is not counted twice. Only touches rows this importer created (matched
 * on the summary title), never anything hand-logged.
 */
async function removeSupersededSummaries(userId: string): Promise<number> {
  if (!SUPERSEDED_SUMMARY_WEEKS.length) return 0;
  const sb = getClient();
  const titles = SUPERSEDED_SUMMARY_WEEKS.map(
    (week) => `Week of ${week} — running total`
  );
  const { data, error } = await sb
    .from("fit_activities")
    .delete()
    .eq("user_id", userId)
    .eq("type", "run")
    .in("title", titles)
    .select("id");
  if (error) throw error;
  return (data || []).length;
}

/**
 * Writes the individual Aug-Sep runs, then clears any weekly summary they
 * supersede. Idempotent on date + title like the other imports.
 */
export async function importDetailedRuns(
  userId: string,
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult & { supersededRemoved: number }> {
  const existing = await fetchExisting(userId, "run");
  const result: ImportResult = { imported: 0, skipped: 0, failed: [] };

  for (let i = 0; i < DETAILED_RUNS.length; i++) {
    const run = DETAILED_RUNS[i];
    const title = titleForDetailedRun(run);
    const label = `${run.date} — ${run.distanceMi} mi`;
    onProgress?.({ done: i, total: DETAILED_RUNS.length, current: label });

    if (existing.has(`${run.date}::${title}`)) {
      result.skipped++;
      continue;
    }

    try {
      await logRun(userId, {
        type: "run",
        title,
        occurredAt: occurredAtFor(run.date),
        distanceMi: run.distanceMi,
        durationMin: run.durationMin,
        elevationFt: run.elevationFt,
        avgHeartRate: run.avgHeartRate !== undefined ? String(run.avgHeartRate) : undefined,
        effort: null,
        notes: run.notes,
      });
      result.imported++;
    } catch (err) {
      result.failed.push({
        workout: label,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Cross-training rides along with the runs — same dictation session, and it
  // goes in as type 'other' so its distance stays out of running mileage.
  const existingOther = await fetchExisting(userId, "other");
  for (const session of CROSS_TRAINING) {
    if (existingOther.has(`${session.date}::${session.title}`)) {
      result.skipped++;
      continue;
    }
    try {
      await logOther(userId, {
        type: "other",
        title: session.title,
        occurredAt: occurredAtFor(session.date),
        distanceMi: session.distanceMi,
        durationMin: session.durationMin,
        effort: null,
        notes: session.notes,
      });
      result.imported++;
    } catch (err) {
      result.failed.push({
        workout: `${session.date} — ${session.title}`,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Only clear summaries once the detailed runs actually landed.
  const supersededRemoved =
    result.failed.length === 0 ? await removeSupersededSummaries(userId) : 0;

  onProgress?.({ done: DETAILED_RUNS.length, total: DETAILED_RUNS.length, current: "" });
  return { ...result, supersededRemoved };
}

/** A legacy summary row found in the database, before deleting anything. */
export type LegacySummaryRow = {
  id: string;
  title: string;
  occurredAt: string;
  distanceMi: number | null;
};

/**
 * Finds weekly-summary rows stored as type 'run'. These double-count twice over:
 * they overlap the individual runs for the same weeks, and the COROS chart they
 * came from covers ALL activities, so they include cycling mileage too.
 *
 * Both generated titles are matched. The rows were first written as "running
 * total"; retitling them to "training total" meant a re-import did not recognise
 * the originals as already-present (the dedupe key includes the title), so a
 * second copy landed. Anyone who ran both imports has two rows per week.
 *
 * Only these exact generated titles match, so nothing hand-logged is at risk.
 */
export async function findLegacySummaryRuns(
  userId: string
): Promise<LegacySummaryRow[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_activities")
    .select("id, title, occurred_at, distance_mi")
    .eq("user_id", userId)
    .eq("type", "run")
    .or("title.like.Week of % — running total,title.like.Week of % — training total");
  if (error) throw error;
  return ((data as { id: string; title: string; occurred_at: string; distance_mi: number | null }[]) || []).map(
    (r) => ({
      id: r.id,
      title: r.title,
      occurredAt: r.occurred_at,
      distanceMi: r.distance_mi,
    })
  );
}

/**
 * Deletes the legacy summary rows found above. Takes explicit ids so the caller
 * shows the user what will go before anything is removed.
 */
export async function deleteLegacySummaryRuns(
  userId: string,
  ids: string[]
): Promise<number> {
  if (!ids.length) return 0;
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_activities")
    .delete()
    .eq("user_id", userId)
    .in("id", ids)
    .select("id");
  if (error) throw error;
  return (data || []).length;
}
