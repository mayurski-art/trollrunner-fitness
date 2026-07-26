"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { listActivities } from "@/lib/activities/api";
import { weeklyTrend } from "@/lib/activities/trends";
import { computeTrainingLoad, interpretLoad, type LoadStatus, type TrainingLoad } from "@/lib/coach/training-load";
import { predictRaceTimes, type RacePrediction } from "@/lib/coach/race-predictor";
import { GOAL_DISTANCE_MI, generateWeekPlan, todayDayLabel, type WeekPlan } from "@/lib/coach/plan";
import { getGoals, getOnboardingWeeklyMileage, primaryRaceGoal } from "@/lib/coach/profile";
import { listRecentRecovery } from "@/lib/recovery/api";
import { averageRecentScore, interpretScore, recoveryLoadMultiplier, type RecoveryStatus } from "@/lib/recovery/score";
import { getBodyProfile } from "@/lib/nutrition/profile";
import { computeNutritionTargets, type NutritionTargets } from "@/lib/nutrition/targets";
import { postWorkoutTips, preWorkoutTips, raceFuelingTips, supplementNotes } from "@/lib/nutrition/education";

type CoachData = {
  load: TrainingLoad;
  status: LoadStatus;
  predictions: RacePrediction[] | null;
  plan: WeekPlan;
  recoveryScore: number | null;
  recoveryStatus: RecoveryStatus;
  nutrition: NutritionTargets;
  raceDistanceMi: number | null;
  todayWorkoutType: string | null;
};

const TONE_STYLES: Record<LoadStatus["tone"], string> = {
  good: "bg-brand-soft text-brand",
  warning: "bg-amber-500/15 text-amber-400",
  critical: "bg-red-500/15 text-red-400",
};

export function CoachClient() {
  const { status, session } = useSession();
  const [data, setData] = useState<CoachData | null>(null);

  useEffect(() => {
    if (status !== "authed" || !session) return;
    let cancelled = false;
    (async () => {
      const [activities, goals, onboardingMileage, recentRecovery, bodyProfile] = await Promise.all([
        listActivities(session.userId, 200),
        getGoals(session.userId),
        getOnboardingWeeklyMileage(session.userId),
        listRecentRecovery(session.userId, 7),
        getBodyProfile(session.userId),
      ]);
      if (cancelled) return;

      const load = computeTrainingLoad(activities);
      const loadStatus = interpretLoad(load);
      const predictions = predictRaceTimes(activities);
      const recoveryScore = averageRecentScore(recentRecovery, 7);
      const recoveryStatus = interpretScore(recoveryScore);

      const recentWeeks = weeklyTrend(activities, 4);
      const loggedAvg =
        recentWeeks.reduce((s, w) => s + w.mileage, 0) / (recentWeeks.length || 1);
      const baseline = loggedAvg > 0 ? loggedAvg : onboardingMileage;

      const raceGoal = primaryRaceGoal(goals);
      const plan = generateWeekPlan({
        goalLabel: raceGoal?.goal_key || null,
        targetDate: raceGoal?.target_date || null,
        baselineWeeklyMileage: baseline,
        recoveryMultiplier: recoveryLoadMultiplier(recoveryScore),
      });

      const sessionsPerWeek = activities.filter(
        (a) => new Date(a.occurredAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length;
      const nutrition = computeNutritionTargets(
        bodyProfile,
        goals.map((g) => g.goal_key),
        sessionsPerWeek
      );
      const raceDistanceMi = raceGoal ? GOAL_DISTANCE_MI[raceGoal.goal_key] ?? null : null;
      const todayWorkoutType = plan.days.find((d) => d.day === todayDayLabel())?.type ?? null;

      setData({
        load,
        status: loadStatus,
        predictions,
        plan,
        recoveryScore,
        recoveryStatus,
        nutrition,
        raceDistanceMi,
        todayWorkoutType,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session]);

  if (status === "loading" || (status === "authed" && !data)) {
    return <p className="text-sm text-muted">Loading your coach…</p>;
  }
  if (status !== "authed" || !data) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Coach</h1>
        <p className="text-sm text-muted">Sign in to see your training load and plan.</p>
      </div>
    );
  }

  const {
    load,
    status: loadStatus,
    predictions,
    plan,
    recoveryScore,
    recoveryStatus,
    nutrition,
    raceDistanceMi,
    todayWorkoutType,
  } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Coach</h1>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Phase 6 · coach engine
        </span>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
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
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
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
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
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
            Log a timed run (distance + duration) to unlock race predictions,
            based on the Riegel formula.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
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
        {plan.recoveryNote && (
          <p className="mt-1 text-xs text-amber-400">{plan.recoveryNote}</p>
        )}
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
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Nutrition</h2>
        {!nutrition.hasFullProfile && (
          <p className="mt-1 text-xs text-muted">
            Add your age, sex, height, and weight during onboarding for
            precise targets — these are weight-based estimates until then.
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
      </section>
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
