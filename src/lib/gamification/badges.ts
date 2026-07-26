import type { Activity } from "@/lib/activities/types";
import { currentStreak } from "@/lib/activities/stats";
import { computePRTimeline } from "@/lib/strength/prs";

export type Badge = {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
};

function totalMileage(activities: Activity[]): number {
  return activities
    .filter((a) => a.type === "run")
    .reduce((sum, a) => sum + (a.distanceMi || 0), 0);
}

export function computeBadges(activities: Activity[]): Badge[] {
  const runCount = activities.filter((a) => a.type === "run").length;
  const strengthCount = activities.filter((a) => a.type === "strength").length;
  const mileage = totalMileage(activities);
  const streak = currentStreak(activities);
  const prCount = computePRTimeline(activities).length;
  const longestRun = Math.max(0, ...activities.filter((a) => a.type === "run").map((a) => a.distanceMi || 0));

  return [
    { id: "first_log", label: "First activity logged", emoji: "🧌", earned: activities.length >= 1 },
    { id: "ten_logs", label: "10 activities logged", emoji: "📈", earned: activities.length >= 10 },
    { id: "fifty_logs", label: "50 activities logged", emoji: "🏅", earned: activities.length >= 50 },
    { id: "first_run", label: "First run", emoji: "🏃", earned: runCount >= 1 },
    { id: "ten_runs", label: "10 runs", emoji: "🏃‍♂️", earned: runCount >= 10 },
    { id: "hundred_miles", label: "100 total miles", emoji: "💯", earned: mileage >= 100 },
    { id: "long_run", label: "Ran 10+ miles in one go", emoji: "🦵", earned: longestRun >= 10 },
    { id: "first_strength", label: "First strength workout", emoji: "🏋️", earned: strengthCount >= 1 },
    { id: "ten_strength", label: "10 strength workouts", emoji: "💪", earned: strengthCount >= 10 },
    { id: "first_pr", label: "First PR", emoji: "🏆", earned: prCount >= 1 },
    { id: "five_prs", label: "5 PRs", emoji: "🥇", earned: prCount >= 5 },
    { id: "streak_7", label: "7-day streak", emoji: "🔥", earned: streak >= 7 },
    { id: "streak_30", label: "30-day streak", emoji: "🌋", earned: streak >= 30 },
    { id: "streak_100", label: "100-day streak", emoji: "👹", earned: streak >= 100 },
  ];
}

/** Streak lengths worth a bigger celebration moment when just crossed. */
export const STREAK_MILESTONES = [7, 30, 100];
