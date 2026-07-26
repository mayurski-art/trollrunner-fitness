import type { Activity } from "./types";

export type AnnualSummary = {
  year: number;
  totalActivities: number;
  totalMileage: number;
  runCount: number;
  strengthCount: number;
  longestRunMi: number;
  busiestMonth: string | null;
};

export function annualSummary(activities: Activity[], year: number): AnnualSummary {
  const inYear = activities.filter((a) => new Date(a.occurredAt).getFullYear() === year);
  const runs = inYear.filter((a) => a.type === "run");
  const strengthSessions = inYear.filter((a) => a.type === "strength");

  const perMonth = new Map<number, number>();
  for (const a of inYear) {
    const m = new Date(a.occurredAt).getMonth();
    perMonth.set(m, (perMonth.get(m) || 0) + 1);
  }
  let busiestMonth: string | null = null;
  let busiestCount = 0;
  for (const [m, count] of perMonth) {
    if (count > busiestCount) {
      busiestCount = count;
      busiestMonth = new Date(year, m, 1).toLocaleDateString(undefined, { month: "long" });
    }
  }

  return {
    year,
    totalActivities: inYear.length,
    totalMileage: Math.round(runs.reduce((s, a) => s + (a.distanceMi || 0), 0) * 10) / 10,
    runCount: runs.length,
    strengthCount: strengthSessions.length,
    longestRunMi: Math.max(0, ...runs.map((a) => a.distanceMi || 0)),
    busiestMonth,
  };
}
