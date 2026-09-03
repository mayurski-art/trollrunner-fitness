"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { listActivities } from "@/lib/activities/api";
import { currentStreak, weeklyMileage } from "@/lib/activities/stats";
import { dailyTrend, monthSummary, monthlyTrend, weeklyTrend } from "@/lib/activities/trends";
import type { Activity } from "@/lib/activities/types";
import { ActivityCard } from "@/components/activities/activity-card";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { WeeklyTrends } from "@/components/analytics/weekly-trends";
import { computeTrainingLoad, interpretLoad } from "@/lib/coach/training-load";
import { generateWeekPlan, todayDayLabel } from "@/lib/coach/plan";
import { getGoals, getOnboardingWeeklyMileage, primaryRaceGoal } from "@/lib/coach/profile";
import { getTodayRecovery, listRecentRecovery } from "@/lib/recovery/api";
import { averageRecentScore, interpretScore, recoveryLoadMultiplier, scoreFor } from "@/lib/recovery/score";
import type { RecoveryLog } from "@/lib/recovery/types";
import { RecoveryCheckin } from "@/components/recovery/checkin-card";
import { getFriendsFeed, type FeedActivity } from "@/lib/social/feed";
import { getKudosInfo, type KudosInfo } from "@/lib/social/kudos";
import { FriendActivityCard } from "@/components/social/friend-activity-card";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import { StatDetailModal, type StatDetail } from "@/components/analytics/stat-detail-modal";

const TODAY_INDEX = todayDayLabel();

export function HomeClient() {
  const { status, session } = useSession();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [ctl, setCtl] = useState<number | null>(null);
  const [loadLabel, setLoadLabel] = useState<string | null>(null);
  const [load, setLoad] = useState<ReturnType<typeof computeTrainingLoad> | null>(null);
  const [recentRecovery, setRecentRecovery] = useState<RecoveryLog[]>([]);
  const [openStat, setOpenStat] = useState<StatDetail | null>(null);
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
      setRecentRecovery(recentRecovery);
      const avgScore = averageRecentScore(recentRecovery, 7);
      setRecoveryScore(avgScore);

      const load = computeTrainingLoad(rows);
      setCtl(load.ctl);
      setLoad(load);
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

  const recoveryTrend = recentRecovery
    .map((log) => ({
      label: log.logDate.slice(5),
      value: scoreFor(log) ?? 0,
    }))
    .reverse();

  const bestWeek = weeks.reduce<{ label: string; mileage: number } | null>(
    (best, w) => (!best || w.mileage > best.mileage ? w : best),
    null
  );

  const stats: {
    label: string;
    value: string;
    note: string;
    detail: StatDetail;
  }[] = [
    {
      label: "This week",
      value: mileage !== null ? `${mileage.toFixed(1)} mi` : "0.0 mi",
      note: "Runs logged this week",
      detail: {
        label: "This week",
        value: mileage !== null ? `${mileage.toFixed(1)} mi` : "0.0 mi",
        explanation:
          "Running miles logged since the start of this week. Cycling and other cross-training are tracked separately, so they never inflate this number.",
        chart: { data: weeks.map((w) => ({ label: w.label, value: w.mileage })), unit: "mi" },
        facts: bestWeek
          ? [
              { label: "Best week", value: `${bestWeek.mileage.toFixed(1)} mi` },
              {
                label: "8-week average",
                value: `${(weeks.reduce((n, w) => n + w.mileage, 0) / (weeks.length || 1)).toFixed(1)} mi`,
              },
            ]
          : undefined,
      },
    },
    {
      label: "Streak",
      value: streak !== null ? `${streak} day${streak === 1 ? "" : "s"}` : "—",
      note: "Consecutive days logged",
      detail: {
        label: "Streak",
        value: streak !== null ? `${streak} day${streak === 1 ? "" : "s"}` : "—",
        explanation:
          "Consecutive days with something logged — a run, a lift or a check-in. The bars show how many sessions you logged each of the last 7 days.",
        chart: {
          data: (activities ? dailyTrend(activities, 7) : []).map((d) => ({
            label: d.label,
            value: d.mileage,
          })),
          unit: "mi",
        },
      },
    },
    {
      label: "Fitness score",
      value: ctl !== null ? String(ctl) : "—",
      note: "42-day training load (CTL)",
      detail: {
        label: "Fitness score",
        value: ctl !== null ? String(ctl) : "—",
        explanation:
          "Chronic Training Load: a 42-day weighted average of everything you do. It rises slowly as you build fitness and falls when you rest. The monthly bars below show the volume driving it.",
        chart: {
          data: (activities ? monthlyTrend(activities, 6) : []).map((m) => ({
            label: m.label,
            value: m.mileage,
          })),
          unit: "mi",
        },
      },
    },
    {
      label: "Training status",
      value: loadLabel ?? "—",
      note: "See the Coach tab for why",
      detail: {
        label: "Training status",
        value: loadLabel ?? "—",
        explanation:
          load
            ? `Fitness (CTL) ${load.ctl}, Fatigue (ATL) ${load.atl}, Form (TSB) ${load.tsb}. Form is fitness minus fatigue — negative means you are carrying training load, which is normal in a build block. ${load.acwrReliable ? "" : "These are still provisional until about six weeks of history builds up."}`.trim()
            : "Log a few sessions to build a training-load trend.",
        chart: {
          data: weeks.map((w) => ({ label: w.label, value: w.mileage })),
          unit: "mi",
        },
      },
    },
    {
      label: "Recovery",
      value: recoveryScore !== null ? recoveryStatus.label : "—",
      note: "7-day average from check-ins",
      detail: {
        label: "Recovery",
        value: recoveryScore !== null ? `${recoveryScore}/100` : "—",
        explanation:
          "Your daily check-in score from sleep, soreness and stress. Higher is better. The coach trims planned volume when this runs low for several days.",
        chart:
          recoveryTrend.length > 0
            ? { data: recoveryTrend, unit: "/100" }
            : null,
      },
    },
  ];

  return (
    <div className="space-y-6">
      {status === "authed" ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Welcome back</p>
            <h1 className="text-2xl font-bold tracking-tight">TrollRunner Fitness</h1>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            Phase 11 · social
          </span>
        </div>
      ) : (
        <Hero />
      )}

      <OnboardingBanner />

      {status === "authed" && (
        <section aria-label="Your stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {activities === null
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card rounded-2xl p-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-6 w-20" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
              ))
            : stats.map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => setOpenStat(stat.detail)}
                  aria-label={`${stat.label}: ${stat.value}. Show trend`}
                  className="card card-interactive rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold">{stat.value}</p>
                  <p className="mt-1.5 text-xs text-muted">{stat.note}</p>
                </button>
              ))}
        </section>
      )}

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

      {status === "authed" && (
        <section aria-label="Today's workout" className="card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Today&apos;s workout</h2>
            <Link href="/coach" className="text-xs font-semibold text-brand">
              Full plan →
            </Link>
          </div>
          {todayWorkout ? (
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
            <Skeleton className="mt-2 h-4 w-2/3" />
          )}
        </section>
      )}

      {status === "authed" && (
        <section aria-label="Recent activities" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent activities</h2>
            <Link href="/log" className="text-xs font-semibold text-brand">
              Log one →
            </Link>
          </div>

          {activities === null ? (
            <SkeletonList count={3} />
          ) : activities.length === 0 ? (
            <div className="card rounded-2xl p-5">
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
      )}

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
        className="card card-interactive flex items-center justify-between rounded-2xl p-4 text-sm"
      >
        <span>📚 Learn — running form, recovery, nutrition, and race-day guides</span>
        <span className="font-semibold text-brand">→</span>
      </Link>

      <StatDetailModal detail={openStat} onClose={() => setOpenStat(null)} />
    </div>
  );
}

function Hero() {
  return (
    <section className="card overflow-hidden rounded-3xl p-8 sm:p-10">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
        Built for actual runners
      </span>
      <h1 className="mt-4 max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">
        Training that adapts to how your week actually goes.
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Log runs and lifts, get a plan built around your goal race, and check
        in on recovery — one account across every TrollRunner site.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/you"
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
        >
          Get started
        </Link>
        <Link
          href="/learn"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-brand"
        >
          See what&apos;s inside
        </Link>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}
