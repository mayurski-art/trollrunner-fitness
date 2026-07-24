"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { listActivities } from "@/lib/activities/api";
import { currentStreak, weeklyMileage } from "@/lib/activities/stats";
import type { Activity } from "@/lib/activities/types";
import { ActivityCard } from "@/components/activities/activity-card";
import { OnboardingBanner } from "@/components/onboarding-banner";

export function HomeClient() {
  const { status, session } = useSession();
  const [activities, setActivities] = useState<Activity[] | null>(null);

  useEffect(() => {
    if (status !== "authed" || !session) return;
    let cancelled = false;
    void listActivities(session.userId).then((rows) => {
      if (!cancelled) setActivities(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [status, session]);

  const mileage = activities ? weeklyMileage(activities) : null;
  const streak = activities ? currentStreak(activities) : null;

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
      label: "Recovery",
      value: "—",
      note: "Check-ins arrive in Phase 8",
    },
    {
      label: "Fitness score",
      value: "—",
      note: "Coach engine arrives in Phase 6",
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
          Phase 3 · activities
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

      <section
        aria-label="Today's workout"
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <h2 className="text-sm font-semibold">Today&apos;s workout</h2>
        <p className="mt-2 text-sm text-muted">
          Rest day — by default, for now. Once the coach engine (Phase 6)
          lands, this card writes your session for the day and explains why.
        </p>
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
              Sign in to start logging runs and workouts — Strava import
              follows in Phase 5.
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
