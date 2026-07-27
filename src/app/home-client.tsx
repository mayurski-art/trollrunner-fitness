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
import { generateWeekPlan, todayDayLabel } from "@/lib/coach/plan";
import { getGoals, getOnboardingWeeklyMileage, primaryRaceGoal } from "@/lib/coach/profile";
import { getTodayRecovery, listRecentRecovery } from "@/lib/recovery/api";
import { averageRecentScore, interpretScore, recoveryLoadMultiplier } from "@/lib/recovery/score";
import type { RecoveryLog } from "@/lib/recovery/types";
import { RecoveryCheckin } from "@/components/recovery/checkin-card";
import { getFriendsFeed, type FeedActivity } from "@/lib/social/feed";
import { getKudosInfo, type KudosInfo } from "@/lib/social/kudos";
import { FriendActivityCard } from "@/components/social/friend-activity-card";

const TODAY_INDEX = todayDayLabel();

export function HomeClient() {
  const { status, session } = useSession();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [ctl, setCtl] = useState<number | null>(null);
  const [loadLabel, setLoadLabel] = useState<string | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<{ type: string; detail: string; note: string | null } | null>(null);
  const [todayRecovery, setTodayRecovery] = useState<RecoveryLog | null>(null);
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null);
  const [recoveryRefresh, setRecoveryRefresh] = useState(0);
  const [friendsFeed, setFriendsFeed] = useState<FeedActivity[] | null>(null);
  const [kudosMap, setKudosMap] = useState<Map<string, KudosInfo>>(new Map());

  useEffect(() => {
    if (status !== "authed" || !session) return;
    let cancelled = false;
    (async () => {
      const [rows, goals, onboardingMileage, recentRecovery, today] = await Promise.all([
        listActivities(session.userId, 200),
        getGoals(session.userId),
        getOnboardingWeeklyMileage(session.userId),
        listRecentRecovery(session.userId, 7),
        getTodayRecovery(session.userId),
      ]);
      if (cancelled) return;

      setActivities(rows);
      setTodayRecovery(today);
      const avgScore = averageRecentScore(recentRecovery, 7);
      setRecoveryScore(avgScore);

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
        recoveryMultiplier: recoveryLoadMultiplier(avgScore),
      });
      const todayPlan = plan.days.find((d) => d.day === TODAY_INDEX);
      if (todayPlan) {
        setTodayWorkout({ type: todayPlan.type, detail: todayPlan.detail, note: plan.recoveryNote });
      }

      const feed = await getFriendsFeed(session.userId);
      if (cancelled) return;
      setFriendsFeed(feed);
      if (feed.length) {
        setKudosMap(await getKudosInfo(feed.map((a) => a.id), session.userId));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session, recoveryRefresh]);

  const mileage = activities ? weeklyMileage(activities) : null;
  const streak = activities ? currentStreak(activities) : null;
  const weeks = activities ? weeklyTrend(activities) : [];
  const month = activities ? monthSummary(activities) : null;
  const recoveryStatus = interpretScore(recoveryScore);

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
    {
      label: "Recovery",
      value: recoveryScore !== null ? recoveryStatus.label : "—",
      note: "7-day average from check-ins",
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
          Phase 11 · social
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

      {status === "authed" && session && (
        <section aria-label="Recovery check-in">
          <RecoveryCheckin
            userId={session.userId}
            today={todayRecovery}
            onLogged={() => setRecoveryRefresh((n) => n + 1)}
          />
        </section>
      )}

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
          <>
            <p className="mt-2 text-sm">
              <span className="font-medium">{todayWorkout.type}</span>
              <span className="text-muted"> — {todayWorkout.detail}</span>
            </p>
            {todayWorkout.note && (
              <p className="mt-1 text-xs text-amber-400">{todayWorkout.note}</p>
            )}
          </>
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

      {status === "authed" && session && friendsFeed && friendsFeed.length > 0 && (
        <section aria-label="Friends' activity" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Friends&apos; activity</h2>
            <Link href="/you" className="text-xs font-semibold text-brand">
              Find people →
            </Link>
          </div>
          <div className="space-y-2">
            {friendsFeed.map((a) => (
              <FriendActivityCard
                key={a.id}
                activity={a}
                kudos={kudosMap.get(a.id)}
                currentUserId={session.userId}
              />
            ))}
          </div>
        </section>
      )}

      <Link
        href="/learn"
        className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 text-sm transition-colors hover:border-brand"
      >
        <span>📚 Learn — running form, recovery, nutrition, and race-day guides</span>
        <span className="font-semibold text-brand">→</span>
      </Link>
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
