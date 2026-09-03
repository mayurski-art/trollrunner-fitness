import type { Activity } from "@/lib/activities/types";
import { deviceLoadFrom, sessionLoadBand } from "@/lib/coach/training-load";

export const EFFORT_EMOJI: Record<number, string> = {
  1: "😴", 2: "😴", 3: "🙂", 4: "🙂", 5: "😅", 6: "😅", 7: "😤", 8: "😤", 9: "🥵", 10: "🥵",
};

function formatPace(distanceMi: number | null, durationSec: number | null): string | null {
  if (!distanceMi || !durationSec) return null;
  const secPerMi = durationSec / distanceMi;
  const min = Math.floor(secPerMi / 60);
  const sec = Math.round(secPerMi % 60);
  return `${min}:${String(sec).padStart(2, "0")}/mi`;
}

function formatDuration(durationSec: number | null): string | null {
  if (!durationSec) return null;
  const min = Math.round(durationSec / 60);
  return `${min} min`;
}

function topSet(activity: Activity): string | null {
  if (!activity.sets.length) return null;
  const best = activity.sets.reduce((a, b) =>
    (a.weight_lb || 0) * (a.reps || 0) > (b.weight_lb || 0) * (b.reps || 0) ? a : b
  );
  if (!best.weight_lb && !best.reps) return null;
  return `${best.exercise} · ${best.weight_lb ?? "—"} lb × ${best.reps ?? "—"}`;
}

export function activityIcon(activity: Activity): string {
  return activity.type === "run" ? "🏃" : activity.type === "strength" ? "🏋️" : "⭐";
}

export function activityStats(activity: Activity): string[] {
  const stats: string[] = [];
  if (activity.type === "run") {
    if (activity.distanceMi) stats.push(`${activity.distanceMi.toFixed(1)} mi`);
    const dur = formatDuration(activity.durationSec);
    if (dur) stats.push(dur);
    const pace = formatPace(activity.distanceMi, activity.durationSec);
    if (pace) stats.push(pace);
    if (activity.elevationFt) stats.push(`${activity.elevationFt} ft gain`);
  } else if (activity.type === "strength") {
    stats.push(`${activity.sets.length} set${activity.sets.length === 1 ? "" : "s"}`);
    const top = topSet(activity);
    if (top) stats.push(top);
  }
  return stats;
}

export function activityWhen(activity: Activity): string {
  return new Date(activity.occurredAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ActivityCard({ activity }: { activity: Activity }) {
  const stats = activityStats(activity);

  const deviceLoad = deviceLoadFrom(activity);
  const band = sessionLoadBand(deviceLoad ?? 0);
  // The load is shown as its own badge, so drop it from the notes line rather
  // than printing the same number twice.
  const displayNotes = deviceLoad === null
    ? activity.notes
    : activity.notes.replace(/,?s*training load d+(?:.d+)?/i, "").replace(/s{2,}/g, " ").trim();

  return (
    <article className="card flex gap-3 rounded-2xl p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-raised text-lg">
        {activityIcon(activity)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold">
            {activity.title}
            {activity.effort && (
              <span className="ml-1.5" title={`Effort ${activity.effort}/10`}>
                {EFFORT_EMOJI[activity.effort]}
              </span>
            )}
          </p>
          <p className="shrink-0 text-xs text-muted">{activityWhen(activity)}</p>
        </div>
        {stats.length > 0 && (
          <p className="mt-0.5 font-mono text-sm text-muted">{stats.join(" · ")}</p>
        )}
        {deviceLoad !== null && (
          <p className="mt-1 text-xs">
            <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-muted">
              load {deviceLoad} · {band.level}
            </span>
            <span className="ml-1.5 text-muted">{band.impact}</span>
          </p>
        )}
        {displayNotes && (
          <p className="mt-1 text-sm text-muted">{displayNotes}</p>
        )}
      </div>
    </article>
  );
}
