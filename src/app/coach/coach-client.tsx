"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { listActivities } from "@/lib/activities/api";
import { weeklyTrend } from "@/lib/activities/trends";
import { computeTrainingLoad, interpretLoad, type LoadStatus } from "@/lib/coach/training-load";
import { predictRaceTimes } from "@/lib/coach/race-predictor";
import { GOAL_DISTANCE_MI, generateWeekPlan, todayDayLabel, type WeekPlan } from "@/lib/coach/plan";
import { getGoals, getOnboardingWeeklyMileage, primaryRaceGoal } from "@/lib/coach/profile";
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
    return <p className="text-sm text-muted">Loading…</p>;
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

      <section className="rounded-2xl border border-line bg-surface p-5">
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

      <section className="rounded-2xl border border-line bg-surface p-5">
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

      <section className="rounded-2xl border border-line bg-surface p-5">
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

      <section className="rounded-2xl border border-line bg-surface p-5">
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

      <section className="rounded-2xl border border-line bg-surface p-5">
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
