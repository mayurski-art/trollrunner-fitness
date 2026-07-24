import type { Activity } from "./types";

export type WeekPoint = { label: string; mileage: number; volume: number };

function startOfWeek(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

/** Last `weeks` calendar weeks (oldest first), each with run mileage + strength volume. */
export function weeklyTrend(activities: Activity[], weeks = 8): WeekPoint[] {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const buckets: WeekPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(thisWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const inWeek = activities.filter((a) => {
      const t = new Date(a.occurredAt);
      return t >= weekStart && t < weekEnd;
    });

    const mileage = inWeek
      .filter((a) => a.type === "run")
      .reduce((sum, a) => sum + (a.distanceMi || 0), 0);
    const volume = inWeek
      .filter((a) => a.type === "strength")
      .reduce(
        (sum, a) =>
          sum +
          a.sets.reduce((s, set) => s + (set.weight_lb || 0) * (set.reps || 0), 0),
        0
      );

    buckets.push({
      label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      mileage: Math.round(mileage * 10) / 10,
      volume: Math.round(volume),
    });
  }

  return buckets;
}

export function monthSummary(activities: Activity[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const inMonth = activities.filter((a) => new Date(a.occurredAt) >= monthStart);
  const runs = inMonth.filter((a) => a.type === "run");
  const strengthSessions = inMonth.filter((a) => a.type === "strength");
  return {
    totalMileage: Math.round(runs.reduce((s, a) => s + (a.distanceMi || 0), 0) * 10) / 10,
    runCount: runs.length,
    strengthCount: strengthSessions.length,
    totalActivities: inMonth.length,
  };
}
