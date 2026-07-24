import type { Activity } from "./types";

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sunday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export function weeklyMileage(activities: Activity[]): number {
  const weekStart = startOfWeek();
  return activities
    .filter((a) => a.type === "run" && new Date(a.occurredAt) >= weekStart)
    .reduce((sum, a) => sum + (a.distanceMi || 0), 0);
}

export function weeklyStrengthVolume(activities: Activity[]): number {
  const weekStart = startOfWeek();
  return activities
    .filter((a) => a.type === "strength" && new Date(a.occurredAt) >= weekStart)
    .reduce(
      (sum, a) =>
        sum +
        a.sets.reduce((s, set) => s + (set.weight_lb || 0) * (set.reps || 0), 0),
      0
    );
}

/** Consecutive days (ending today or yesterday) with at least one logged activity. */
export function currentStreak(activities: Activity[]): number {
  if (!activities.length) return 0;
  const days = new Set(activities.map((a) => dayKey(a.occurredAt)));
  const today = new Date();
  const cursor = new Date(today);
  // Allow the streak to still "count" if today has no entry yet but yesterday does.
  if (!days.has(dayKey(cursor.toISOString()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor.toISOString()))) return 0;
  }
  let streak = 0;
  while (days.has(dayKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
