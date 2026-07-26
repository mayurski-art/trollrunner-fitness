"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { listActivities } from "@/lib/activities/api";
import { currentStreak, weeklyMileage } from "@/lib/activities/stats";
import { monthSummary, weeklyTrend } from "@/lib/activities/trends";
import type { Activity } from "@/lib/activities/types";
import { ActivityCard } from "@/components/activities/activity-card";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { WeeklyTrends } from "@/components/analytics/weekly-trends";
import { computeTrainingLoad, interpretLoad } from "@/lib/coach/training-load";
import { generateWeekPlan } from "@/lib/coach/plan";
import { getGoals, getOnboardingWeeklyMileage, primaryRaceGoal } from "@/lib/coach/profile";

const TODAY_INDEX = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];

export function HomeClient() {
  const { status, session } = useSession();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [ctl, setCtl] = useState<number | null>(null);
  const [loadLabel, setLoadLabel] = useState<string | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<{ type: string; detail: string } | null>(null);

  useEffect(() => {
    if (status !== "authed" || !session) return;
    let cancelled = false;
    (async () => {
      const [rows, goals, onboardingMileage] = await Promise.all([
        listActivities(session.userId, 200),
        getGoals(session.userId),
        getOnboardingWeeklyMileage(session.userId),
      ]);
      if (cancelled) return;
      setActivities(rows);

      const load = computeTrainingLoad(rows);
      setCtl(load.ctl);
      setLoadLabel(interpretLoad(load).label);

      const recentWeeks = weeklyTrend(rows, 4);
      const loggedAvg =
        recentWeeks.reduce((s, w) => s + w.mileage, 0) / (recentWeeks.length || 1);
      const baseline = loggedAvg > 0 ? loggedAvg : onboardingMileage;

      const raceGoal = primaryRaceGoal(goals);
      const plan = generateWeekPlan({
        goalLabel: raceGoal?.goal_key || null,
        targetDate: raceGoal?.target_date || null,
        baselineWeeklyMileage: baseline,
      });
      const today = plan.days.find((d) => d.day === TODAY_INDEX);
      if (today) setTodayWorkout({ type: today.type, detail: today.detail });
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session]);

  const mileage = activities ? weeklyMileage(activities) : null;
  const streak = activities ? currentStreak(activities) : null;
  const weeks = activities ? weeklyTrend(activities) : [];
  const month = activities ? monthSummary(activities) : null;

  const stats = [
    {
      label: "This week",
      value: mileage !== null ? `${mileage.toFixed(1)} mi` : "0.0 mi",
      note: "Runs logged this week",
    },
    {
      label: "Streak",
      value: streak !== null ? `${streak} day${streak === 1 ? "" : "s"}` : "—",
      note: "Consecutive days logged",
    },
    {
      label: "Fitness score",
      value: ctl !== null ? String(ctl) : "—",
      note: "42-day training load (CTL)",
    },
    {
      label: "Training status",
      value: loadLabel ?? "—",
      note: "See the Coach tab for why",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Welcome to</p>
          <h1 className="text-2xl font-bold tracking-tight">TrollRunner Fitness</h1>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Phase 6 · coach engine
        </span>
      </div>

      <OnboardingBanner />

      <section aria-label="Your stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {stat.label}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">{stat.value}</p>
            <p className="mt-1.5 text-xs text-muted">{stat.note}</p>
          </div>
        ))}
      </section>

      {status === "authed" && activities && activities.length > 0 && (
        <>
          <section aria-label="Weekly trends" className="space-y-3">
            <h2 className="text-sm font-semibold">Trends</h2>
            <WeeklyTrends weeks={weeks} />
          </section>

          {month && (
            <section
              aria-label="This month"
              className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            >
              <MiniStat label="Mileage this month" value={`${month.totalMileage} mi`} />
              <MiniStat label="Runs" value={String(month.runCount)} />
              <MiniStat label="Strength sessions" value={String(month.strengthCount)} />
              <MiniStat label="Total activities" value={String(month.totalActivities)} />
            </section>
          )}
        </>
      )}

      <section
        aria-label="Today's workout"
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Today&apos;s workout</h2>
          <Link href="/coach" className="text-xs font-semibold text-brand">
            Full plan →
          </Link>
        </div>
        {status === "authed" && todayWorkout ? (
          <p className="mt-2 text-sm">
            <span className="font-medium">{todayWorkout.type}</span>
            <span className="text-muted"> — {todayWorkout.detail}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {status === "authed"
              ? "Loading your plan…"
              : "Sign in to get a workout prescribed for today."}
          </p>
        )}
      </section>

      <section aria-label="Recent activities" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent activities</h2>
          {status === "authed" && (
            <Link href="/log" className="text-xs font-semibold text-brand">
              Log one →
            </Link>
          )}
        </div>

        {status !== "authed" ? (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Sign in to start logging runs and workouts and get a plan built
              around them.
            </p>
          </div>
        ) : activities === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : activities.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Nothing logged yet.{" "}
              <Link href="/log" className="font-semibold text-brand">
                Log your first activity
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.slice(0, 8).map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}
