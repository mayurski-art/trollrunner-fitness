"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { listActivities } from "@/lib/activities/api";
import { weeklyTrend } from "@/lib/activities/trends";
import { computeTrainingLoad, interpretLoad, type LoadStatus } from "@/lib/coach/training-load";
import { predictRaceTimes } from "@/lib/coach/race-predictor";
import { GOAL_DISTANCE_MI, generateWeekPlan, todayDayLabel, type WeekPlan } from "@/lib/coach/plan";
import { getGoals, getOnboardingWeeklyMileage, primaryRaceGoal, wantsHybrid } from "@/lib/coach/profile";
import { analyzeHybrid, hybridInsights, patternLabel } from "@/lib/coach/hybrid";
import { recommendIsometrics } from "@/lib/strength/isometrics";
import type { GoalRow } from "@/lib/coach/profile";
import { listRecentRecovery } from "@/lib/recovery/api";
import { averageRecentScore, interpretScore, recoveryLoadMultiplier } from "@/lib/recovery/score";
import type { RecoveryLog } from "@/lib/recovery/types";
import { getBodyProfile } from "@/lib/nutrition/profile";
import type { BodyProfile } from "@/lib/nutrition/profile";
import { computeNutritionTargets, type NutritionTargets } from "@/lib/nutrition/targets";
import { postWorkoutTips, preWorkoutTips, raceFuelingTips, supplementNotes } from "@/lib/nutrition/education";
import { CoachChat } from "@/components/coach/coach-chat";
import { COACH_ADMIN_USERNAME } from "@/lib/coach-chat/learned-answers";
import type { Activity } from "@/lib/activities/types";
import Link from "next/link";
import { SkeletonPage } from "@/components/ui/skeleton";

const TONE_STYLES: Record<LoadStatus["tone"], string> = {
  good: "bg-brand-soft text-brand",
  warning: "bg-amber-500/15 text-amber-400",
  critical: "bg-red-500/15 text-red-400",
};

/**
 * Each input loads independently (own state, own effect) instead of behind
 * one Promise.all, so a section can render as soon as its own dependencies
 * are ready rather than every section waiting on the slowest query.
 */
export function CoachClient() {
  const { status, session } = useSession();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [goals, setGoals] = useState<GoalRow[] | null>(null);
  const [onboardingMileage, setOnboardingMileage] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<RecoveryLog[] | null>(null);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile | null>(null);
  // Lazy initializer runs once on mount — avoids calling the impure Date.now()
  // directly during render for the "sessions in the last 7 days" filter below.
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "authed" || !session) return;
    let cancelled = false;
    const userId = session.userId;

    void listActivities(userId, 200).then((v) => !cancelled && setActivities(v));
    void getGoals(userId).then((v) => !cancelled && setGoals(v));
    void getOnboardingWeeklyMileage(userId).then((v) => !cancelled && setOnboardingMileage(v));
    void listRecentRecovery(userId, 7).then((v) => !cancelled && setRecovery(v));
    void getBodyProfile(userId).then((v) => !cancelled && setBodyProfile(v));

    return () => {
      cancelled = true;
    };
  }, [status, session]);

  if (status === "loading") {
    return <SkeletonPage />;
  }
  if (status !== "authed" || !session) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Coach</h1>
        <p className="text-sm text-muted">Sign in to see your training load and plan.</p>
      </div>
    );
  }

  const load = activities ? computeTrainingLoad(activities) : null;
  const loadStatus = load ? interpretLoad(load) : null;
  const predictions = activities ? predictRaceTimes(activities) : null;

  const recoveryScore = recovery ? averageRecentScore(recovery, 7) : null;
  const recoveryStatus = recovery ? interpretScore(recoveryScore) : null;

  // The hybrid read only needs activities, so it renders without waiting on
  // goals/recovery — same progressive-load pattern as the sections above.
  const hybrid = activities ? analyzeHybrid(activities) : null;
  const insights = hybrid ? hybridInsights(hybrid) : [];
  const isometrics = hybrid ? recommendIsometrics(hybrid) : [];

  let plan: WeekPlan | null = null;
  let raceDistanceMi: number | null = null;
  let todayWorkoutType: string | null = null;
  if (activities && goals && recovery && onboardingMileage !== null) {
    const recentWeeks = weeklyTrend(activities, 4);
    const loggedAvg = recentWeeks.reduce((s, w) => s + w.mileage, 0) / (recentWeeks.length || 1);
    const baseline = loggedAvg > 0 ? loggedAvg : onboardingMileage;
    const raceGoal = primaryRaceGoal(goals);
    plan = generateWeekPlan({
      goalLabel: raceGoal?.goal_key || null,
      targetDate: raceGoal?.target_date || null,
      baselineWeeklyMileage: baseline,
      recoveryMultiplier: recoveryLoadMultiplier(recoveryScore),
      hybrid: wantsHybrid(goals) && hybrid?.hasStrengthBase ? hybrid : null,
    });
    raceDistanceMi = raceGoal ? GOAL_DISTANCE_MI[raceGoal.goal_key] ?? null : null;
    todayWorkoutType = plan.days.find((d) => d.day === todayDayLabel())?.type ?? null;
  }

  let nutrition: NutritionTargets | null = null;
  if (bodyProfile && goals && activities) {
    const sessionsPerWeek = activities.filter(
      (a) => new Date(a.occurredAt).getTime() >= nowMs - 7 * 24 * 60 * 60 * 1000
    ).length;
    nutrition = computeNutritionTargets(bodyProfile, goals.map((g) => g.goal_key), sessionsPerWeek);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Coach</h1>
        {session.username === COACH_ADMIN_USERNAME && (
          <Link
            href="/coach/admin"
            className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand hover:underline"
          >
            Unanswered questions
          </Link>
        )}
      </div>

      <CoachChat />

      <section className="card rounded-2xl p-5">
        {load && loadStatus ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Training status</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_STYLES[loadStatus.tone]}`}>
                {loadStatus.label}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Stat label="Fitness (CTL)" value={load.ctl} />
              <Stat label="Fatigue (ATL)" value={load.atl} />
              <Stat label="Form (TSB)" value={load.tsb} />
            </div>
            <p className="mt-3 text-sm text-muted">{loadStatus.why}</p>
          </>
        ) : (
          <SectionSkeleton title="Training status" />
        )}
      </section>

      <section className="card rounded-2xl p-5">
        {recoveryStatus ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recovery</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_STYLES[recoveryStatus.tone]}`}>
                {recoveryStatus.label}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {recoveryScore !== null
                ? `7-day average score: ${recoveryScore}/100, from your daily check-ins.`
                : "Log a daily check-in on the Home tab (sleep, soreness, stress) to unlock this."}
            </p>
          </>
        ) : (
          <SectionSkeleton title="Recovery" />
        )}
      </section>

      <section className="card rounded-2xl p-5">
        {activities ? (
          <>
            <h2 className="text-sm font-semibold">Race predictions</h2>
            {predictions ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {predictions.map((p) => (
                  <div key={p.label} className="rounded-xl border border-line bg-raised p-3 text-center">
                    <p className="text-xs text-muted">{p.label}</p>
                    <p className="mt-1 font-mono text-lg font-semibold">
                      {Math.floor(p.timeSec / 3600) > 0
                        ? `${Math.floor(p.timeSec / 3600)}:${String(Math.floor((p.timeSec % 3600) / 60)).padStart(2, "0")}:${String(Math.round(p.timeSec % 60)).padStart(2, "0")}`
                        : `${Math.floor(p.timeSec / 60)}:${String(Math.round(p.timeSec % 60)).padStart(2, "0")}`}
                    </p>
                    <p className="text-xs text-muted">{p.pace}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Log a timed run (distance + duration) to unlock race predictions, based on the Riegel formula.
              </p>
            )}
          </>
        ) : (
          <SectionSkeleton title="Race predictions" />
        )}
      </section>

      <section className="card rounded-2xl p-5">
        {hybrid ? (
          hybrid.hasStrengthBase || hybrid.weeklyMileage > 0 ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Hybrid build</h2>
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                  last {hybrid.windowDays} days
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Stat label="Lifts / week" value={hybrid.strengthPerWeek} />
                <Stat label="Mi / week" value={hybrid.weeklyMileage} />
                {hybrid.runsPerWeek === null ? (
                  <div className="rounded-xl border border-line bg-raised p-3 text-center">
                    <p className="text-xs text-muted">Runs / week</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-muted">—</p>
                  </div>
                ) : (
                  <Stat label="Runs / week" value={hybrid.runsPerWeek} />
                )}
              </div>

              {hybrid.patterns.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted">
                    Where your {hybrid.totalStrengthSets} sets went
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {hybrid.patterns.map((p) => (
                      <li key={p.pattern} className="flex items-center gap-2 text-xs">
                        <span className="w-36 shrink-0 capitalize text-muted">
                          {patternLabel(p.pattern)}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                          <span
                            className="block h-full rounded-full bg-brand"
                            style={{ width: `${Math.round(p.share * 100)}%` }}
                          />
                        </span>
                        <span className="w-14 shrink-0 text-right font-mono text-muted">
                          {Math.round(p.share * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {insights.map((ins) => (
                    <li
                      key={ins.title}
                      className={`rounded-xl border p-3 ${
                        ins.tone === "warning"
                          ? "border-amber-500/30 bg-amber-500/10"
                          : ins.tone === "good"
                            ? "border-brand/30 bg-brand-soft"
                            : "border-line bg-raised"
                      }`}
                    >
                      <p className="text-xs font-semibold">{ins.title}</p>
                      <p className="mt-1 text-xs text-muted">{ins.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold">Hybrid build</h2>
              <p className="mt-2 text-sm text-muted">
                Log some workouts and this fills in with your movement-pattern balance, stalled
                lifts, and how your lifting and running are trading off.
              </p>
            </>
          )
        ) : (
          <SectionSkeleton title="Hybrid build" />
        )}
      </section>

      {isometrics.length > 0 && (
        <section className="card rounded-2xl p-5">
          <h2 className="text-sm font-semibold">Isometric holds to add</h2>
          <p className="mt-1 text-sm text-muted">
            Static holds build tendon stiffness — which is what returns energy on
            every stride — with far less soreness than heavy eccentrics, so they
            cost your next run almost nothing. Add two or three to the end of a
            lifting day.
          </p>
          <ul className="mt-3 space-y-2">
            {isometrics.map(({ isometric, reason }) => (
              <li key={isometric.name} className="rounded-xl border border-line bg-raised p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold">{isometric.name}</p>
                  <span className="font-mono text-xs text-brand">
                    {isometric.prescription}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{isometric.how}</p>
                <p className="mt-1 text-xs text-muted">{isometric.why}</p>
                <p className="mt-1 text-xs italic text-muted">{reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card rounded-2xl p-5">
        {plan ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">This week&apos;s plan</h2>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold capitalize text-brand">
                {plan.phase}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{plan.phaseWhy}</p>
            <p className="mt-1 text-xs text-muted">
              Target: {plan.targetMileage} mi this week
              {plan.goalLabel ? ` · building toward "${plan.goalLabel}"` : ""}
            </p>
            {plan.recoveryNote && <p className="mt-1 text-xs text-amber-400">{plan.recoveryNote}</p>}
            {plan.hybridNote && <p className="mt-1 text-xs text-brand">{plan.hybridNote}</p>}
            <div className="mt-3 divide-y divide-line">
              {plan.days.map((d) => (
                <div key={d.day} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span className="w-10 shrink-0 font-medium text-muted">{d.day}</span>
                  <span className="flex-1">
                    <span className="font-medium">{d.type}</span>
                    <span className="text-muted"> — {d.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <SectionSkeleton title="This week's plan" />
        )}
      </section>

      <section className="card rounded-2xl p-5">
        {nutrition ? (
          <>
            <h2 className="text-sm font-semibold">Nutrition</h2>
            {!nutrition.hasFullProfile && (
              <p className="mt-1 text-xs text-muted">
                Add your age, sex, height, and weight during onboarding for precise targets — these are
                weight-based estimates until then.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Calories" value={nutrition.calories} />
              <Stat label="Protein (g)" value={nutrition.proteinG} />
              <Stat label="Carbs (g)" value={nutrition.carbsG} />
              <Stat label="Fat (g)" value={nutrition.fatG} />
            </div>
            <p className="mt-2 text-xs text-muted">
              Water target: ~{nutrition.waterOz} oz/day, scaled up on training days.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TipCard title="Before training" tips={preWorkoutTips()} />
              <TipCard title="After training" tips={postWorkoutTips(todayWorkoutType)} />
              <TipCard title="Race fueling" tips={raceFuelingTips(raceDistanceMi)} />
              <TipCard title="Supplements" tips={supplementNotes()} />
            </div>
          </>
        ) : (
          <SectionSkeleton title="Nutrition" />
        )}
      </section>
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="animate-pulse">
      <h2 className="text-sm font-semibold text-muted">{title}</h2>
      <div className="mt-3 h-4 w-2/3 rounded bg-raised" />
    </div>
  );
}

function TipCard({ title, tips }: { title: string; tips: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-raised p-3">
      <p className="text-xs font-semibold">{title}</p>
      <ul className="mt-1.5 space-y-1 text-xs text-muted">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-raised p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
